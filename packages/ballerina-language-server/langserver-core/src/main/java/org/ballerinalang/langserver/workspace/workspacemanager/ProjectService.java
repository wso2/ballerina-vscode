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

import io.ballerina.projects.Module;
import io.ballerina.projects.Project;
import org.eclipse.lsp4j.jsonrpc.CancelChecker;

import java.nio.file.Path;
import java.util.Collection;

/**
 * Project context service contract.
 *
 * @since 1.7.0
 */
public interface ProjectService {

    /**
     * Loads or creates a project for the provided path.
     *
     * @param path path to resolve
     * @param cancelChecker cancel checker
     * @return resolved project
     */
    Project loadOrCreate(Path path, CancelChecker cancelChecker);

    /**
     * Returns all known projects.
     *
     * @return projects collection
     */
    Collection<Project> allProjects();

    /**
     * Resolves the module for a path.
     *
     * @param path path to resolve
     * @param cancelChecker cancel checker
     * @return resolved module
     */
    Module module(Path path, CancelChecker cancelChecker);

    /**
     * Sets the runtime locking mode.
     *
     * @param mode locking mode
     * @param authority source authority
     */
    void setLockingMode(LockingMode mode, LockingModeAuthority authority);

    /**
     * Returns the current locking mode.
     *
     * @return current locking mode
     */
    LockingMode getLockingMode();
}
