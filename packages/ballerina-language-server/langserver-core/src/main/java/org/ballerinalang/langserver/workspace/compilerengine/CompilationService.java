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

package org.ballerinalang.langserver.workspace.compilerengine;

import org.eclipse.lsp4j.jsonrpc.CancelChecker;

import java.nio.file.Path;
import javax.annotation.Nonnull;

/**
 * Compilation context service contract.
 *
 * @since 1.7.0
 */
public interface CompilationService {

    /**
     * Returns the stable snapshot for a path.
     *
     * @param path source path
     * @param cancelChecker cancel checker
     * @return stable snapshot
     */
    StableSnapshot stableSnapshot(@Nonnull Path path, CancelChecker cancelChecker);

    /**
     * Returns the latest available snapshot view for a path.
     *
     * <p>This prefers an active in-progress snapshot when compilation is running,
     * and otherwise falls back to the last published stable snapshot.
     *
     * @param path source path
     * @param cancelChecker cancel checker
     * @return latest available snapshot view
     */
    SnapshotView latestSnapshot(@Nonnull Path path, CancelChecker cancelChecker);
}
