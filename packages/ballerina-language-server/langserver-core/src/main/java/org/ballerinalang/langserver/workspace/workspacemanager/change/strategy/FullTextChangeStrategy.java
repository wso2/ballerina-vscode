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

package org.ballerinalang.langserver.workspace.workspacemanager.change.strategy;

import io.ballerina.projects.Document;
import org.eclipse.lsp4j.TextDocumentContentChangeEvent;

import java.util.List;

/**
 * {@link ContentChangeStrategy} for LSP {@code TextDocumentSyncKind.Full}.
 *
 * <p>In full-text sync mode the client always sends the complete document content with every
 * notification. Each event supersedes all previous ones, so only the last event in the list
 * is relevant. The current document content is not needed.
 *
 * <p>This is the default strategy used by the Ballerina language server.
 *
 * @since 1.7.0
 */
public class FullTextChangeStrategy implements ContentChangeStrategy {

    /** Shared singleton — this class is stateless. */
    public static final FullTextChangeStrategy INSTANCE = new FullTextChangeStrategy();

    private FullTextChangeStrategy() {
    }

    /**
     * Returns the text of the last change event, which contains the full updated document content.
     * The caller guarantees {@code changes} is non-empty.
     *
     * @param document the compiler document (not used — full-text events carry the complete content)
     * @param changes  ordered list of LSP content change events; must not be empty
     * @return the text of the last event
     */
    @Override
    public String computeContent(Document document, List<TextDocumentContentChangeEvent> changes) {
        return changes.get(changes.size() - 1).getText();
    }
}
