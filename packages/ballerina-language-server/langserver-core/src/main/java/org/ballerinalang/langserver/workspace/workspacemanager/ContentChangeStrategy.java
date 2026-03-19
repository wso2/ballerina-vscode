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
import org.eclipse.lsp4j.TextDocumentContentChangeEvent;

import java.util.List;

/**
 * Strategy for computing the new content of a document given a list of LSP content change events.
 * Implementations correspond to LSP {@code TextDocumentSyncKind} values.
 *
 * @since 1.7.0
 */
public interface ContentChangeStrategy {

    /**
     * Computes the resulting document content by applying the given change events.
     *
     * @param document the compiler document whose content serves as the baseline
     * @param changes  ordered list of LSP content change events to apply
     * @return the document content after all changes have been applied
     */
    String computeContent(Document document, List<TextDocumentContentChangeEvent> changes);
}
