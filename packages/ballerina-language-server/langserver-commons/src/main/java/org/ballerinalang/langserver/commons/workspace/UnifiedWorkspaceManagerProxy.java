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

package org.ballerinalang.langserver.commons.workspace;

import java.util.Objects;

/**
 * A {@link WorkspaceManagerProxy} implementation that delegates all calls to a single unified workspace manager.
 *
 * <p>Multi-scheme URI routing (e.g. {@code expr://}, {@code ai://}, {@code untitled:}) is handled internally
 * by the workspace manager facade, so both {@link #get()} and {@link #get(String)} return the same instance
 * regardless of URI scheme.
 *
 * <p>This class exists to satisfy the legacy {@link WorkspaceManagerProxy} contract expected by
 * {@code ExtendedLanguageServerService} implementations, bridging the old proxy-based API with the
 * unified workspace manager facade introduced in 1.7.0.
 *
 * @since 1.7.0
 */
public final class UnifiedWorkspaceManagerProxy implements WorkspaceManagerProxy {

    private final WorkspaceManager workspaceManager;

    /**
     * Creates a proxy that wraps the given workspace manager.
     *
     * @param workspaceManager the unified workspace manager facade; must not be null
     */
    public UnifiedWorkspaceManagerProxy(WorkspaceManager workspaceManager) {
        this.workspaceManager = Objects.requireNonNull(workspaceManager, "workspaceManager must not be null");
    }

    /**
     * Returns the unified workspace manager.
     *
     * @return the workspace manager
     */
    @Override
    public WorkspaceManager get() {
        return workspaceManager;
    }

    /**
     * Returns the unified workspace manager regardless of the URI scheme.
     * Scheme-specific routing is handled internally by the facade.
     *
     * @param fileUri file URI (ignored for routing purposes)
     * @return the workspace manager
     */
    @Override
    public WorkspaceManager get(String fileUri) {
        return workspaceManager;
    }
}
