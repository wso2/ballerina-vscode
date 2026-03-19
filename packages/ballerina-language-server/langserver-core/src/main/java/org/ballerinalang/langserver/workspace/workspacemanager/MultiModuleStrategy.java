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

import io.ballerina.projects.Document;
import io.ballerina.projects.Module;
import org.eclipse.lsp4j.TextDocumentContentChangeEvent;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Strategy for applying changes across multiple modules.
 * <p>
 * Delegates to {@link MultiDocumentStrategy} for each module.
 *
 * TODO: When package.modify() becomes public in the compiler API, batch all modules
 * into a single package.modify() call for better performance.
 *
 * @since 1.7.0
 */
public class MultiModuleStrategy implements ChangeApplicationStrategy {

    private final MultiDocumentStrategy multiDocStrategy = new MultiDocumentStrategy();

    /**
     * Applies changes across modules by delegating to the multi-document strategy.
     *
     * @param changesByModule map with multiple modules, each with their documents
     */
    @Override
    public void apply(Map<Module, Map<Document, List<TextDocumentContentChangeEvent>>> changesByModule) {
        // Apply each module's documents sequentially
        for (Map.Entry<Module, Map<Document, List<TextDocumentContentChangeEvent>>> moduleEntry :
                changesByModule.entrySet()) {
            Module module = moduleEntry.getKey();
            Map<Document, List<TextDocumentContentChangeEvent>> docChanges = moduleEntry.getValue();

            // Delegate to multi-document strategy for each module
            Map<Module, Map<Document, List<TextDocumentContentChangeEvent>>> moduleMap = new HashMap<>();
            moduleMap.put(module, docChanges);
            multiDocStrategy.apply(moduleMap);
        }
    }
}
