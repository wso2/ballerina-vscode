/*
 *  Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com)
 *
 *  WSO2 LLC. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 */

package org.ballerinalang.langserver.commons;

import io.ballerina.projects.Package;
import io.ballerina.projects.PackageCompilation;
import org.eclipse.lsp4j.jsonrpc.CancelChecker;

import java.util.concurrent.CancellationException;
import java.util.concurrent.locks.ReentrantLock;

import javax.annotation.Nonnull;

/**
 * Serializes direct compiler package compilation requests that can initialize shared compiler-plugin state.
 *
 * @since 1.7.0
 */
public final class CompilerCompilationGuard {
    private static final ReentrantLock COMPILATION_LOCK = new ReentrantLock();

    private CompilerCompilationGuard() {
    }

    /**
     * Returns the package compilation under the shared compiler compilation guard.
     *
     * @param ballerinaPackage package to compile
     * @return guarded package compilation
     */
    public static @Nonnull PackageCompilation getCompilation(@Nonnull Package ballerinaPackage) {
        return getCompilation(ballerinaPackage, null);
    }

    /**
     * Returns the package compilation under the shared compiler compilation guard.
     *
     * @param ballerinaPackage package to compile
     * @param cancelChecker cancellation checker for request-scoped callers
     * @return guarded package compilation
     */
    public static @Nonnull PackageCompilation getCompilation(@Nonnull Package ballerinaPackage,
                                                             CancelChecker cancelChecker) {
        checkCancellation(cancelChecker);
        lock();
        try {
            checkCancellation(cancelChecker);
            PackageCompilation compilation = ballerinaPackage.getCompilation();
            checkCancellation(cancelChecker);
            return compilation;
        } finally {
            COMPILATION_LOCK.unlock();
        }
    }

    private static void lock() {
        try {
            COMPILATION_LOCK.lockInterruptibly();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new CancellationException("Package compilation cancelled while waiting for compiler guard");
        }
    }

    private static void checkCancellation(CancelChecker cancelChecker) {
        if (cancelChecker != null) {
            cancelChecker.checkCanceled();
        }
        if (Thread.currentThread().isInterrupted()) {
            throw new CancellationException("Package compilation cancelled");
        }
    }
}
