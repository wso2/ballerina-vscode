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
import org.eclipse.lsp4j.Range;
import org.eclipse.lsp4j.TextDocumentContentChangeEvent;

import java.util.List;

/**
 * {@link ContentChangeStrategy} for LSP {@code TextDocumentSyncKind.Incremental}.
 *
 * <p>In incremental sync mode the client sends a sequence of range-based edits per notification.
 * Each edit is applied in order to the running content, with {@code range == null} interpreted as
 * a full-document replacement (as permitted by the LSP specification).
 *
 * @since 1.7.0
 */
public class IncrementalChangeStrategy implements ContentChangeStrategy {

    /** Shared singleton — this class is stateless. */
    public static final IncrementalChangeStrategy INSTANCE = new IncrementalChangeStrategy();

    private IncrementalChangeStrategy() {
    }

    /**
     * Applies each change event in order to the document's current content.
     * Events with {@code range == null} replace the entire content; events with a range
     * replace only the specified substring.
     *
     * @param document the compiler document providing the baseline content
     * @param changes  ordered list of LSP incremental change events; must not be empty
     * @return the content after all edits have been applied
     */
    @Override
    public String computeContent(Document document, List<TextDocumentContentChangeEvent> changes) {
        String content = document.textDocument().toString();
        for (TextDocumentContentChangeEvent change : changes) {
            if (change.getRange() == null) {
                content = change.getText();
            } else {
                content = applyRangeEdit(content, change.getRange(), change.getText());
            }
        }
        return content;
    }

    /**
     * Applies a single range-based text replacement.
     * Converts LSP line/character positions (0-based, UTF-16 code units) to string offsets.
     *
     * @param content     the current content string
     * @param range       the LSP range to replace
     * @param replacement the replacement text
     * @return the content with the specified range replaced
     */
    private String applyRangeEdit(String content, Range range, String replacement) {
        String[] lines = content.split("\n", -1);
        int startOffset = lineCharToOffset(lines, range.getStart().getLine(), range.getStart().getCharacter());
        int endOffset = lineCharToOffset(lines, range.getEnd().getLine(), range.getEnd().getCharacter());
        return content.substring(0, startOffset) + replacement + content.substring(endOffset);
    }

    /**
     * Converts a line/character position to a linear string offset.
     * Line numbers and character offsets are 0-based (LSP convention).
     *
     * @param lines     the content split into lines (without trailing newline characters)
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
