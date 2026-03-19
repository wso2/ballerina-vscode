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
import org.eclipse.lsp4j.Range;

import java.util.List;
import java.util.Map;

/**
 * Strategy for applying text document changes to the compiler's content model.
 * <p>
 * Implementations handle different scenarios:
 * <ul>
 *   <li>Single document in a single module</li>
 *   <li>Multiple documents in the same module</li>
 *   <li>Multiple modules with different documents</li>
 * </ul>
 *
 * The LS supports full-text document sync mode, so all changes are applied
 * via {@code document.modify().withContent(fullText).apply()}.
 *
 * @since 1.7.0
 */
public interface ChangeApplicationStrategy {

    /**
     * Applies changes clustered by module to the compiler's content model.
     *
     * @param changesByModule changes organized by module and document
     */
    void apply(Map<Module, Map<Document, List<TextDocumentContentChangeEvent>>> changesByModule);
}
