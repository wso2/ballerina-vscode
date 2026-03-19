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
 * Strategy for applying changes to a single document.
 * <p>
 * This is the most direct path: obtains the final full text and calls
 * {@code document.modify().withContent(fullText).apply()}.
 *
 * @since 1.7.0
 */
public class SingleDocumentStrategy implements ChangeApplicationStrategy {

    /**
     * Applies changes to the single document via {@code document.modify()}.
     *
     * @param changesByModule map containing exactly one module with one document
     */
    @Override
    public void apply(Map<Module, Map<Document, List<TextDocumentContentChangeEvent>>> changesByModule) {
        Module module = changesByModule.keySet().iterator().next();
        Document doc = changesByModule.get(module).keySet().iterator().next();
        List<TextDocumentContentChangeEvent> changes = changesByModule.get(module).get(doc);

        String content = computeFullText(doc, changes);
        doc.modify()
                .withContent(content)
                .apply();
    }

    /**
     * Computes the final full text by applying LSP changes in sequence.
     * <p>
     * Since the LS uses full-text document sync mode, most changes will have
     * {@code range == null}, meaning the change text replaces the entire document.
     * Range-based edits are also supported for incremental updates.
     *
     * @param doc     the document providing the base content
     * @param changes the ordered list of content change events
     * @return the resulting full text
     */
    private String computeFullText(Document doc, List<TextDocumentContentChangeEvent> changes) {
        String content = doc.textDocument().toString();
        for (TextDocumentContentChangeEvent change : changes) {
            if (change.getRange() == null) {
                // Full-text replacement
                content = change.getText();
            } else {
                // Range-based incremental edit
                content = applyRangeEdit(content, change);
            }
        }
        return content;
    }

    /**
     * Applies a range-based text edit to the content string.
     *
     * @param content the current content
     * @param change  the change event with range and replacement text
     * @return the content with the edit applied
     */
    private String applyRangeEdit(String content, TextDocumentContentChangeEvent change) {
        String[] lines = content.split("\n", -1);
        int startOffset = lineCharToOffset(lines, change.getRange().getStart().getLine(),
                change.getRange().getStart().getCharacter());
        int endOffset = lineCharToOffset(lines, change.getRange().getEnd().getLine(),
                change.getRange().getEnd().getCharacter());
        return content.substring(0, startOffset) + change.getText() + content.substring(endOffset);
    }

    /**
     * Converts an LSP line/character position to a linear string offset.
     *
     * @param lines     the content split into lines (without newline characters)
     * @param line      0-based line number
     * @param character 0-based character offset within the line
     * @return the offset from the start of the content string
     */
    private int lineCharToOffset(String[] lines, int line, int character) {
        int offset = 0;
        for (int i = 0; i < line && i < lines.length; i++) {
            offset += lines[i].length() + 1; // +1 for the '\n'
        }
        if (line < lines.length) {
            offset += Math.min(character, lines[line].length());
        }
        return offset;
    }
}
