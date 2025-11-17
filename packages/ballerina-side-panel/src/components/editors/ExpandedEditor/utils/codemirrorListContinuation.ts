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
import { EditorState } from "@codemirror/state";
import { KeyBinding } from "@codemirror/view";

/**
 * Handles Enter key to automatically continue lists (similar to GitHub comments)
 * This function checks the current line for list markers and either continues the list
 * or exits list mode if the current item is empty
 */
export const handleEnterForListContinuation = (view: EditorView): boolean => {
    const state = view.state;
    const selection = state.selection.main;

    // Only handle if there's no selection (just a cursor)
    if (selection.from !== selection.to) {
        return false;
    }

    const cursorPosition = selection.from;
    const line = state.doc.lineAt(cursorPosition);
    const lineText = line.text;

    // Check if cursor is at the end of the line or in the middle
    const cursorInLine = cursorPosition - line.from;

    // Check for task list (- [ ] or - [x])
    const taskMatch = lineText.match(/^(\s*)([-*])\s+\[([ x])\]\s+(.*)$/);
    if (taskMatch) {
        const [, indent, marker, , content] = taskMatch;

        // If the task item is empty, remove it and exit list mode
        if (!content.trim()) {
            view.dispatch({
                changes: {
                    from: line.from,
                    to: line.to,
                    insert: ''
                },
                selection: {
                    anchor: line.from
                }
            });
            return true;
        }

        // Continue the task list with unchecked box
        const textBeforeCursor = lineText.substring(0, cursorInLine);
        const textAfterCursor = lineText.substring(cursorInLine);
        const newListItem = indent + marker + ' [ ] ';

        view.dispatch({
            changes: {
                from: line.from,
                to: line.to,
                insert: textBeforeCursor + '\n' + newListItem + textAfterCursor
            },
            selection: {
                anchor: line.from + textBeforeCursor.length + 1 + newListItem.length
            }
        });
        return true;
    }

    // Check for unordered list (- or *)
    const unorderedMatch = lineText.match(/^(\s*)([-*])\s+(.*)$/);
    if (unorderedMatch) {
        const [, indent, marker, content] = unorderedMatch;

        // If the list item is empty (just the marker), remove it and exit list mode
        if (!content.trim()) {
            view.dispatch({
                changes: {
                    from: line.from,
                    to: line.to,
                    insert: ''
                },
                selection: {
                    anchor: line.from
                }
            });
            return true;
        }

        // Continue the list
        const textBeforeCursor = lineText.substring(0, cursorInLine);
        const textAfterCursor = lineText.substring(cursorInLine);
        const newListItem = indent + marker + ' ';

        view.dispatch({
            changes: {
                from: line.from,
                to: line.to,
                insert: textBeforeCursor + '\n' + newListItem + textAfterCursor
            },
            selection: {
                anchor: line.from + textBeforeCursor.length + 1 + newListItem.length
            }
        });
        return true;
    }

    // Check for ordered list (1., 2., etc.)
    const orderedMatch = lineText.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
        const [, indent, number, content] = orderedMatch;

        // If the list item is empty (just the number), remove it and exit list mode
        if (!content.trim()) {
            view.dispatch({
                changes: {
                    from: line.from,
                    to: line.to,
                    insert: ''
                },
                selection: {
                    anchor: line.from
                }
            });
            return true;
        }

        // Continue the list with incremented number
        const textBeforeCursor = lineText.substring(0, cursorInLine);
        const textAfterCursor = lineText.substring(cursorInLine);
        const nextNumber = parseInt(number, 10) + 1;
        const newListItem = indent + nextNumber + '. ';

        view.dispatch({
            changes: {
                from: line.from,
                to: line.to,
                insert: textBeforeCursor + '\n' + newListItem + textAfterCursor
            },
            selection: {
                anchor: line.from + textBeforeCursor.length + 1 + newListItem.length
            }
        });
        return true;
    }

    // Not a list, use default Enter behavior
    return false;
};

/**
 * KeyBinding for automatic list continuation on Enter
 */
export const listContinuationKeymap: KeyBinding[] = [
    {
        key: "Enter",
        run: handleEnterForListContinuation
    }
];
