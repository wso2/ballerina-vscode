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

package org.ballerinalang.langserver.workspace.workspacemanager;

import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * Per-project read/write lock wrapping a {@link ReentrantReadWriteLock}.
 *
 * <p><b>ADR-009 lock-ordering constraint:</b> This lock must be acquired
 * <em>only after</em> any registry-level operation has completed. It must
 * never be acquired while holding the registry lock, and must never be
 * acquired during {@link Project} construction.</p>
 *
 * @since 1.7.0
 */
public final class ProjectLock {

    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();

    /**
     * Returns the read lock. Multiple threads may hold the read lock simultaneously.
     *
     * @return read lock
     */
    public Lock readLock() {
        return lock.readLock();
    }

    /**
     * Returns the write lock. Exclusive; no read or write lock may be held concurrently.
     *
     * @return write lock
     */
    public Lock writeLock() {
        return lock.writeLock();
    }
}
