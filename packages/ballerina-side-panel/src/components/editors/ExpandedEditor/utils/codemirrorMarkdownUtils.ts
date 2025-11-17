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

import { EditorView } from "@codemirror/view";

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

    // Check if the selection is already formatted
    const isAlreadyFormatted =
        selectedText.startsWith(prefix) &&
        selectedText.endsWith(suffix) &&
        selectedText.length >= prefix.length + suffix.length;

    let newText: string;
    let newSelectionStart: number;
    let newSelectionEnd: number;

    if (isAlreadyFormatted) {
        // Remove formatting
        newText = selectedText.slice(prefix.length, selectedText.length - suffix.length);
        newSelectionStart = from;
        newSelectionEnd = from + newText.length;
    } else {
        // Check if formatting exists around the selection
        const beforeSelection = view.state.sliceDoc(Math.max(0, from - prefix.length), from);
        const afterSelection = view.state.sliceDoc(to, Math.min(view.state.doc.length, to + suffix.length));

        if (beforeSelection === prefix && afterSelection === suffix) {
            // Remove surrounding formatting
            newText = selectedText;
            view.dispatch({
                changes: [
                    { from: from - prefix.length, to: from, insert: '' },
                    { from: to, to: to + suffix.length, insert: '' }
                ],
                selection: {
                    anchor: from - prefix.length,
                    head: to - prefix.length
                }
            });
            view.focus();
            return;
        }

        // Add formatting
        newText = `${prefix}${selectedText}${suffix}`;
        newSelectionStart = from + prefix.length;
        newSelectionEnd = from + prefix.length + selectedText.length;
    }

    view.dispatch({
        changes: {
            from,
            to,
            insert: newText
        },
        selection: {
            anchor: newSelectionStart,
            head: newSelectionEnd
        }
    });

    view.focus();
};

/**
 * Toggles markdown header at the current line
 */
export const insertMarkdownHeader = (view: EditorView | null, level: number = 3) => {
    if (!view) return;

    const { from } = view.state.selection.main;
    const line = view.state.doc.lineAt(from);
    const lineText = line.text;

    // Check for existing header markers
    const headerMatch = lineText.match(/^(#{1,6})\s*/);
    const existingLevel = headerMatch ? headerMatch[1].length : 0;
    const textWithoutHeader = headerMatch ? lineText.slice(headerMatch[0].length) : lineText;

    let newText: string;

    // If header exists at the same level, remove it (toggle off)
    // Otherwise, add/update to the specified level
    if (existingLevel === level) {
        newText = textWithoutHeader;
    } else {
        const headerPrefix = '#'.repeat(level) + ' ';
        newText = headerPrefix + textWithoutHeader;
    }

    view.dispatch({
        changes: {
            from: line.from,
            to: line.to,
            insert: newText
        },
        selection: {
            anchor: line.from + newText.length
        }
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

    // Check if selection is already a link [text](url)
    const linkMatch = selectedText.match(/^\[(.+?)\]\((.+?)\)$/);

    if (linkMatch) {
        // Remove link formatting, keep only the link text
        const linkText = linkMatch[1];
        view.dispatch({
            changes: {
                from,
                to,
                insert: linkText
            },
            selection: {
                anchor: from,
                head: from + linkText.length
            }
        });
    } else {
        // Check if link surrounds the selection
        const beforeText = view.state.sliceDoc(Math.max(0, from - 1), from);
        const afterStart = view.state.sliceDoc(to, Math.min(view.state.doc.length, to + 2));

        if (beforeText === '[' && afterStart.startsWith('](')) {
            // Find the end of the URL
            const textAfter = view.state.sliceDoc(to, Math.min(view.state.doc.length, to + 200));
            const urlEndMatch = textAfter.match(/^\]\((.+?)\)/);

            if (urlEndMatch) {
                // Remove surrounding link
                const urlLength = urlEndMatch[0].length;
                view.dispatch({
                    changes: [
                        { from: from - 1, to: from, insert: '' },
                        { from: to - 1, to: to - 1 + urlLength, insert: '' }
                    ],
                    selection: {
                        anchor: from - 1,
                        head: to - 1
                    }
                });
                view.focus();
                return;
            }
        }

        // Add link formatting
        const linkText = selectedText || 'link text';
        const linkUrl = 'url';
        const insert = `[${linkText}](${linkUrl})`;

        view.dispatch({
            changes: {
                from,
                to,
                insert
            },
            selection: {
                // Select the URL part
                anchor: from + linkText.length + 3,
                head: from + linkText.length + 3 + linkUrl.length
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

    if (selection.includes('\n')) {
        // Multi-line selection: toggle "> " on each line
        const lines = selection.split('\n');
        const allQuoted = lines.every(line => line.trim() === '' || line.startsWith('> '));

        const processedLines = allQuoted
            ? lines.map(line => line.startsWith('> ') ? line.slice(2) : line)
            : lines.map(line => line.startsWith('> ') ? line : `> ${line}`);

        const insert = processedLines.join('\n');

        view.dispatch({
            changes: { from, to, insert },
            selection: { anchor: from, head: from + insert.length }
        });
    } else {
        // Single line or no selection: toggle "> " on current line
        const line = view.state.doc.lineAt(from);
        const lineText = line.text;
        const newText = lineText.startsWith('> ') ? lineText.slice(2) : `> ${lineText}`;

        view.dispatch({
            changes: {
                from: line.from,
                to: line.to,
                insert: newText
            },
            selection: { anchor: line.from + newText.length }
        });
    }

    view.focus();
};

/**
 * Toggles markdown unordered list
 */
export const insertMarkdownUnorderedList = (view: EditorView | null) => {
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const selection = view.state.sliceDoc(from, to);

    if (selection.includes('\n')) {
        // Multi-line selection: toggle "- " on each line
        const lines = selection.split('\n');
        const allListed = lines.every(line => {
            const trimmed = line.trim();
            return trimmed === '' || trimmed.startsWith('- ') || trimmed.startsWith('* ');
        });

        const listLines = allListed
            ? lines.map(line => {
                const indent = line.match(/^\s*/)?.[0] || '';
                const trimmed = line.trim();
                if (trimmed.startsWith('- ')) return indent + trimmed.slice(2);
                if (trimmed.startsWith('* ')) return indent + trimmed.slice(2);
                return line;
            })
            : lines.map(line => {
                const indent = line.match(/^\s*/)?.[0] || '';
                const trimmed = line.trim();
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return line;
                return `${indent}- ${trimmed}`;
            });

        const insert = listLines.join('\n');

        view.dispatch({
            changes: { from, to, insert },
            selection: { anchor: from, head: from + insert.length }
        });
    } else {
        // Single line or no selection
        const line = view.state.doc.lineAt(from);
        const lineText = line.text;
        const indent = lineText.match(/^\s*/)?.[0] || '';
        const trimmed = lineText.trim();

        let newText: string;
        if (trimmed.startsWith('- ')) {
            newText = indent + trimmed.slice(2);
        } else if (trimmed.startsWith('* ')) {
            newText = indent + trimmed.slice(2);
        } else {
            newText = `${indent}- ${trimmed}`;
        }

        view.dispatch({
            changes: {
                from: line.from,
                to: line.to,
                insert: newText
            },
            selection: { anchor: line.from + newText.length }
        });
    }

    view.focus();
};

/**
 * Toggles markdown ordered list
 */
export const insertMarkdownOrderedList = (view: EditorView | null) => {
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const selection = view.state.sliceDoc(from, to);

    if (selection.includes('\n')) {
        // Multi-line selection: toggle numbered list on each line
        const lines = selection.split('\n');
        const allListed = lines.every(line => {
            const trimmed = line.trim();
            return trimmed === '' || /^\d+\.\s/.test(trimmed);
        });

        const listLines = allListed
            ? lines.map(line => {
                const indent = line.match(/^\s*/)?.[0] || '';
                const trimmed = line.trim();
                const numberMatch = trimmed.match(/^\d+\.\s(.*)$/);
                return numberMatch ? indent + numberMatch[1] : line;
            })
            : lines.map((line, index) => {
                const indent = line.match(/^\s*/)?.[0] || '';
                const trimmed = line.trim();
                const numberMatch = trimmed.match(/^\d+\.\s/);
                if (numberMatch) return line;
                return `${indent}${index + 1}. ${trimmed}`;
            });

        const insert = listLines.join('\n');

        view.dispatch({
            changes: { from, to, insert },
            selection: { anchor: from, head: from + insert.length }
        });
    } else {
        // Single line or no selection
        const line = view.state.doc.lineAt(from);
        const lineText = line.text;
        const indent = lineText.match(/^\s*/)?.[0] || '';
        const trimmed = lineText.trim();

        let newText: string;
        const numberMatch = trimmed.match(/^\d+\.\s(.*)$/);
        if (numberMatch) {
            newText = indent + numberMatch[1];
        } else {
            newText = `${indent}1. ${trimmed}`;
        }

        view.dispatch({
            changes: {
                from: line.from,
                to: line.to,
                insert: newText
            },
            selection: { anchor: line.from + newText.length }
        });
    }

    view.focus();
};

/**
 * Toggles markdown task list
 */
export const insertMarkdownTaskList = (view: EditorView | null) => {
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const selection = view.state.sliceDoc(from, to);

    if (selection.includes('\n')) {
        // Multi-line selection: toggle "- [ ] " on each line
        const lines = selection.split('\n');
        const allTasks = lines.every(line => {
            const trimmed = line.trim();
            return trimmed === '' || /^-\s\[[ x]\]\s/.test(trimmed);
        });

        const taskLines = allTasks
            ? lines.map(line => {
                const indent = line.match(/^\s*/)?.[0] || '';
                const trimmed = line.trim();
                const taskMatch = trimmed.match(/^-\s\[[ x]\]\s(.*)$/);
                return taskMatch ? indent + taskMatch[1] : line;
            })
            : lines.map(line => {
                const indent = line.match(/^\s*/)?.[0] || '';
                const trimmed = line.trim();
                if (trimmed.match(/^-\s\[[ x]\]\s/)) return line;
                return `${indent}- [ ] ${trimmed}`;
            });

        const insert = taskLines.join('\n');

        view.dispatch({
            changes: { from, to, insert },
            selection: { anchor: from, head: from + insert.length }
        });
    } else {
        // Single line or no selection
        const line = view.state.doc.lineAt(from);
        const lineText = line.text;
        const indent = lineText.match(/^\s*/)?.[0] || '';
        const trimmed = lineText.trim();

        let newText: string;
        const taskMatch = trimmed.match(/^-\s\[[ x]\]\s(.*)$/);
        if (taskMatch) {
            newText = indent + taskMatch[1];
        } else {
            newText = `${indent}- [ ] ${trimmed}`;
        }

        view.dispatch({
            changes: {
                from: line.from,
                to: line.to,
                insert: newText
            },
            selection: { anchor: line.from + newText.length }
        });
    }

    view.focus();
};
