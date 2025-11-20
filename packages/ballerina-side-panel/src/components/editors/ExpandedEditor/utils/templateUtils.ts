/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EditorView, KeyBinding } from "@codemirror/view";

/**
 * Inserts or removes markdown formatting around selected text (toggles)
 */
export const insertMarkdownFormatting = (
    view: EditorView | null,
    prefix: string,
    suffix: string = prefix
) => {
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to);

    // Check if the selection itself is wrapped
    const isInternallyFormatted =
        selectedText.startsWith(prefix) &&
        selectedText.endsWith(suffix) &&
        selectedText.length >= prefix.length + suffix.length;

    if (isInternallyFormatted) {
        // Unwrap selection
        const newText = selectedText.slice(prefix.length, selectedText.length - suffix.length);
        view.dispatch({
            changes: { from, to, insert: newText },
            selection: { anchor: from, head: from + newText.length }
        });
        view.focus();
        return;
    }

    // Check if the surrounding text is wrapped
    const beforeSelection = view.state.sliceDoc(Math.max(0, from - prefix.length), from);
    const afterSelection = view.state.sliceDoc(to, Math.min(view.state.doc.length, to + suffix.length));

    if (beforeSelection === prefix && afterSelection === suffix) {
        // Unwrap surrounding
        view.dispatch({
            changes: [
                { from: from - prefix.length, to: from, insert: '' },
                { from: to, to: to + suffix.length, insert: '' }
            ],
            selection: { anchor: from - prefix.length, head: to - prefix.length }
        });
    } else {
        // Wrap selection
        const newText = `${prefix}${selectedText}${suffix}`;
        view.dispatch({
            changes: { from, to, insert: newText },
            selection: { anchor: from + prefix.length, head: from + prefix.length + selectedText.length }
        });
    }

    view.focus();
};

/**
 * Toggles markdown header at the current line
 */
export const insertMarkdownHeader = (view: EditorView | null, level: number = 3) => {
    if (!view) return;

    const { from } = view.state.selection.main;
    const line = view.state.doc.lineAt(from);
    const match = line.text.match(/^(#{1,6})\s*/);

    const existingLevel = match ? match[1].length : 0;
    const cleanText = match ? line.text.slice(match[0].length) : line.text;

    // If same level, toggle off (remove). Otherwise, update level.
    const newText = existingLevel === level ? cleanText : '#'.repeat(level) + ' ' + cleanText;

    view.dispatch({
        changes: { from: line.from, to: line.to, insert: newText },
        selection: { anchor: line.from + newText.length }
    });

    view.focus();
};

/**
 * Toggles markdown link
 */
export const insertMarkdownLink = (view: EditorView | null) => {
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to);
    const linkMatch = selectedText.match(/^\[(.+?)\]\((.+?)\)$/);

    if (linkMatch) {
        // Unwrap existing link: [text](url) -> text
        const linkText = linkMatch[1];
        view.dispatch({
            changes: { from, to, insert: linkText },
            selection: { anchor: from, head: from + linkText.length }
        });
    } else {
        // Check surrounding context for existing link
        const before = view.state.sliceDoc(Math.max(0, from - 1), from);
        const afterStart = view.state.sliceDoc(to, Math.min(view.state.doc.length, to + 2));

        // Simple heuristic for surrounding link
        if (before === '[' && afterStart.startsWith('](')) {
            const textAfter = view.state.sliceDoc(to, Math.min(view.state.doc.length, to + 200));
            const urlMatch = textAfter.match(/^\]\((.+?)\)/);

            if (urlMatch) {
                const urlLen = urlMatch[0].length;
                view.dispatch({
                    changes: [
                        { from: from - 1, to: from, insert: '' },
                        { from: to, to: to + urlLen - 1, insert: '' } // -1 to keep the ')' logic aligned
                    ],
                    selection: { anchor: from - 1, head: to - 1 }
                });
                view.focus();
                return;
            }
        }

        // Create new link
        const label = selectedText || 'link text';
        const url = 'url';
        view.dispatch({
            changes: { from, to, insert: `[${label}](${url})` },
            selection: {
                // Highlight the URL portion
                anchor: from + label.length + 3,
                head: from + label.length + 3 + url.length
            }
        });
    }
    view.focus();
};

/**
 * Toggles markdown blockquote
 */
export const insertMarkdownBlockquote = (view: EditorView | null) => {
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const selection = view.state.sliceDoc(from, to);

    // Handle both single line (cursor only) and multiline selection
    // If cursor is just on a line, treat it as that line being selected
    let workingSelection = selection;
    let startPos = from;

    if (from === to) {
        const line = view.state.doc.lineAt(from);
        workingSelection = line.text;
        startPos = line.from;
    }

    const lines = workingSelection.split('\n');
    const allQuoted = lines.every(l => l.trim() === '' || l.startsWith('> '));

    const newLines = lines.map(line => {
        if (allQuoted) return line.startsWith('> ') ? line.slice(2) : line;
        return line.startsWith('> ') ? line : `> ${line}`;
    });

    const insert = newLines.join('\n');

    view.dispatch({
        changes: { from: startPos, to: startPos + workingSelection.length, insert },
        selection: { anchor: startPos, head: startPos + insert.length }
    });

    view.focus();
};

// --- List Logic ---

type ListConfig = {
    isListed: (trimmed: string) => boolean;
    strip: (trimmed: string) => string;
    add: (trimmed: string, index: number) => string;
};

const toggleList = (view: EditorView | null, config: ListConfig) => {
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const selection = view.state.sliceDoc(from, to);

    const isMultiLine = selection.includes("\n");
    const hasSelection = from !== to; // Check if user actually selected text

    // If single line/cursor, expand to full line content
    // Note: We use the line boundaries for calculation but keep track of original 'from'
    let lines = isMultiLine ? selection.split("\n") : [view.state.doc.lineAt(from).text];
    let startOffset = isMultiLine ? from : view.state.doc.lineAt(from).from;

    const allListed = lines.every(line => {
        const trimmed = line.trim();
        return trimmed === "" || config.isListed(trimmed);
    });

    const processedLines = lines.map((line, index) => {
        const indent = line.match(/^\s*/)?.[0] ?? "";
        const trimmed = line.trim();

        if (allListed) {
            // Strip formatting
            return config.isListed(trimmed) ? indent + config.strip(trimmed) : line;
        }
        // Add formatting
        if (config.isListed(trimmed)) return line;
        return indent + config.add(trimmed, index);
    });

    const insert = processedLines.join("\n");
    const endOffset = startOffset + insert.length;

    view.dispatch({
        changes: {
            from: startOffset,
            to: startOffset + (isMultiLine ? selection.length : lines[0].length),
            insert
        },
        selection: hasSelection
            ? { anchor: startOffset, head: endOffset } // Preserve selection range for toggling
            : { anchor: endOffset }                    // Move cursor to end for typing
    });

    view.focus();
};

export const insertMarkdownUnorderedList = (view: EditorView | null) => {
    toggleList(view, {
        isListed: t => t.startsWith("- ") || t.startsWith("* "),
        strip: t => t.replace(/^[-*]\s/, ""),
        add: t => `- ${t}`
    });
};

export const insertMarkdownOrderedList = (view: EditorView | null) => {
    toggleList(view, {
        isListed: t => /^\d+\.\s/.test(t),
        strip: t => t.replace(/^\d+\.\s/, ""),
        add: (t, i) => `${i + 1}. ${t}`
    });
};

export const insertMarkdownTaskList = (view: EditorView | null) => {
    toggleList(view, {
        isListed: t => /^-\s\[[ x]\]\s/.test(t),
        strip: t => t.replace(/^-\s\[[ x]\]\s/, ""),
        add: t => `- [ ] ${t}`
    });
};

// --- List Continuation on Enter ---

interface ListPattern {
    regex: RegExp;
    nextMarker: (match: RegExpMatchArray) => string;
}

const LIST_PATTERNS: ListPattern[] = [
    {
        // Task List: "- [ ] " or "- [x] "
        regex: /^(\s*)([-*])\s+\[([ x])\]\s+(.*)$/,
        nextMarker: (m) => `${m[1]}${m[2]} [ ] `
    },
    {
        // Unordered List: "- " or "* "
        regex: /^(\s*)([-*])\s+(.*)$/,
        nextMarker: (m) => `${m[1]}${m[2]} `
    },
    {
        // Ordered List: "1. "
        regex: /^(\s*)(\d+)\.\s+(.*)$/,
        nextMarker: (m) => `${m[1]}${parseInt(m[2], 10) + 1}. `
    }
];

export const handleEnterForListContinuation = (view: EditorView): boolean => {
    const { state } = view;
    const selection = state.selection.main;

    if (!selection.empty) return false;

    const line = state.doc.lineAt(selection.from);
    const lineText = line.text;
    const cursorInLine = selection.from - line.from;

    for (const pattern of LIST_PATTERNS) {
        const match = lineText.match(pattern.regex);
        if (!match) continue;

        // content matches the last capture group in all patterns above
        const content = match[match.length - 1];

        if (!content.trim()) {
            // Empty list item -> Exit list (delete the line content)
            view.dispatch({
                changes: { from: line.from, to: line.to, insert: '' },
                selection: { anchor: line.from }
            });
            return true;
        }

        // Split line at cursor and insert new list item
        const textBeforeCursor = lineText.substring(0, cursorInLine);
        const textAfterCursor = lineText.substring(cursorInLine);
        const newItemMarker = pattern.nextMarker(match);

        view.dispatch({
            changes: {
                from: line.from,
                to: line.to,
                insert: `${textBeforeCursor}\n${newItemMarker}${textAfterCursor}`
            },
            selection: {
                // Cursor placed after the new marker
                anchor: line.from + textBeforeCursor.length + 1 + newItemMarker.length
            }
        });
        return true;
    }

    return false;
};

export const listContinuationKeymap: KeyBinding[] = [
    {
        key: "Enter",
        run: handleEnterForListContinuation
    }
];
