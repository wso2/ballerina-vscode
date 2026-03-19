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

import java.util.List;
import java.util.Map;

/**
 * Strategy for applying changes to multiple documents in the same module.
 * <p>
 * Applies each document's changes via {@code document.modify()}.
 *
 * TODO: When module.modify() becomes public in the compiler API, batch all documents
 * into a single module.modify() call for better performance.
 *
 * @since 1.7.0
 */
public class MultiDocumentStrategy implements ChangeApplicationStrategy {

    private final SingleDocumentStrategy singleDocStrategy = new SingleDocumentStrategy();

    /**
     * Applies changes to each document in the module via {@code document.modify()}.
     *
     * @param changesByModule map containing exactly one module with multiple documents
     */
    @Override
    public void apply(Map<Module, Map<Document, List<TextDocumentContentChangeEvent>>> changesByModule) {
        Module module = changesByModule.keySet().iterator().next();
        Map<Document, List<TextDocumentContentChangeEvent>> docChanges = changesByModule.get(module);

        // Apply each document's changes sequentially
        for (Map.Entry<Document, List<TextDocumentContentChangeEvent>> entry : docChanges.entrySet()) {
            Document doc = entry.getKey();
            List<TextDocumentContentChangeEvent> changes = entry.getValue();

            // Delegate to single-document strategy for each document
            Map<Module, Map<Document, List<TextDocumentContentChangeEvent>>> singleDocMap =
                    Map.of(module, Map.of(doc, changes));
            singleDocStrategy.apply(singleDocMap);
        }
    }
}
