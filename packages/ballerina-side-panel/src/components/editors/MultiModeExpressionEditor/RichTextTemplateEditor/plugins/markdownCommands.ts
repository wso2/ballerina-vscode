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

import { EditorState, Transaction, Selection, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { toggleMark, setBlockType, wrapIn, lift } from "prosemirror-commands";
import { wrapInList, liftListItem } from "prosemirror-schema-list";
import { MarkType, NodeType, Fragment, Schema } from "prosemirror-model";
import { undo, redo } from "prosemirror-history";
import { InputRule, inputRules } from "prosemirror-inputrules";

export type Command = (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView) => boolean;

export const toggleBold: Command = (state, dispatch, view) => {
    return toggleMark(state.schema.marks.strong)(state, dispatch, view);
};

export const toggleItalic: Command = (state, dispatch, view) => {
    return toggleMark(state.schema.marks.em)(state, dispatch, view);
};

export const toggleCode: Command = (state, dispatch, view) => {
    return toggleMark(state.schema.marks.code)(state, dispatch, view);
};

export const toggleLink = (href?: string, title?: string): Command => {
    return (state, dispatch) => {
        const linkMarkType = state.schema.marks.link;
        const { from, to } = state.selection;

        // If there's a selection and it already has a link, remove it
        if (from !== to && state.doc.rangeHasMark(from, to, linkMarkType)) {
            if (dispatch) {
                dispatch((state.tr as any).removeMark(from, to, linkMarkType));
            }
            return true;
        }

        // Can't add a link without an href
        if (!href) return false;

        if (dispatch) {
            const mark = linkMarkType.create({ href });
            const tr = state.tr;

            if (from === to) {
                // No selection: insert new text with link
                const linkText = title || href;
                const textNode = state.schema.text(linkText, [mark]);
                tr.replaceSelectionWith(textNode, false);
            } else {
                // Has selection: wrap selection with link
                (tr as any).addMark(from, to, mark);
            }

            dispatch(tr);
        }
        return true;
    };
};

export const toggleHeading = (level: number): Command => {
    return (state, dispatch, view) => {
        const { schema } = state;
        const isActive = isNodeActive(state, schema.nodes.heading, { level });

        if (isActive) {
            return setBlockType(schema.nodes.paragraph)(state, dispatch, view);
        }
        return setBlockType(schema.nodes.heading, { level })(state, dispatch, view);
    };
};

export const setParagraph: Command = (state, dispatch, view) => {
    return setBlockType(state.schema.nodes.paragraph)(state, dispatch, view);
};

export const toggleBlockquote: Command = (state, dispatch, view) => {
    const blockquote = state.schema.nodes.blockquote;
    if (isNodeActive(state, blockquote)) {
        return lift(state, dispatch);
    }
    return wrapIn(blockquote)(state, dispatch, view);
};

const convertListType = (state: EditorState, dispatch: ((tr: Transaction) => void) | undefined, fromListType: NodeType, toListType: NodeType): boolean => {
    if (!dispatch) return true;

    const { $from } = state.selection;
    for (let d = $from.depth; d >= 0; d--) {
        if ($from.node(d).type === fromListType) {
            const pos = $from.before(d);
            const node = $from.node(d);
            const tr = (state.tr as any).replaceWith(pos, pos + node.nodeSize, toListType.create(node.attrs, node.content));
            dispatch(tr.setSelection(state.selection.map(tr.doc, tr.mapping)));
            return true;
        }
    }
    return false;
};

export const toggleBulletList: Command = (state, dispatch, view) => {
    const { bullet_list, ordered_list, list_item } = state.schema.nodes;

    if (isListActive(state, bullet_list)) {
        return liftListItem(list_item)(state, dispatch, view);
    }

    if (isListActive(state, ordered_list)) {
        return convertListType(state, dispatch, ordered_list, bullet_list);
    }

    return wrapInList(bullet_list)(state, dispatch, view);
};

export const toggleOrderedList: Command = (state, dispatch, view) => {
    const { bullet_list, ordered_list, list_item } = state.schema.nodes;

    if (isListActive(state, ordered_list)) {
        return liftListItem(list_item)(state, dispatch, view);
    }

    if (isListActive(state, bullet_list)) {
        return convertListType(state, dispatch, bullet_list, ordered_list);
    }

    return wrapInList(ordered_list)(state, dispatch, view);
};

export const isMarkActive = (state: EditorState, type: MarkType): boolean => {
    const { from, to, $from, empty } = state.selection;
    if (empty) {
        return !!type.isInSet(state.storedMarks || $from.marks());
    }
    return state.doc.rangeHasMark(from, to, type);
};

export const isNodeActive = (state: EditorState, type: NodeType, attrs?: Record<string, any>): boolean => {
    const { $from } = state.selection;
    for (let d = $from.depth; d >= 0; d--) {
        const node = $from.node(d);
        if (node.type === type) {
            if (!attrs) return true;
            return Object.keys(attrs).every(key => node.attrs[key] === attrs[key]);
        }
    }
    return false;
};

export const isListActive = (state: EditorState, listType: NodeType): boolean => {
    const { $from } = state.selection;
    for (let d = $from.depth; d >= 0; d--) {
        const node = $from.node(d);
        if (node.type.name === 'list_item') {
            if (d > 0) {
                const parent = $from.node(d - 1);
                if (parent.type === listType) {
                    return true;
                }
            }
        }
    }
    return false;
};

export const undoCommand: Command = (state, dispatch) => {
    return undo(state, dispatch);
};

export const redoCommand: Command = (state, dispatch) => {
    return redo(state, dispatch);
};

export const canUndo = (state: EditorState): boolean => {
    return undo(state);
};

export const canRedo = (state: EditorState): boolean => {
    return redo(state);
};

// Converts "---" on a line to a horizontal rule, or "```" to a code block,
// when Enter is pressed. Returns false to let other Enter handlers run.
export const handleMarkdownShortcutEnter: Command = (state, dispatch) => {
    const { $from } = state.selection;
    // Only handle when cursor is in a paragraph
    if ($from.parent.type.name !== "paragraph") return false;

    const text = $from.parent.textContent;

    // --- → horizontal_rule
    if (text === "---" || text === "***" || text === "___") {
        const hrType = state.schema.nodes.horizontal_rule;
        if (!hrType) return false;
        if (dispatch) {
            const start = $from.before();
            const end = $from.after();
            const nodes = Fragment.from([
                hrType.create(),
                state.schema.nodes.paragraph.create()
            ]);
            const tr = (state.tr as any).replaceWith(start, end, nodes);
            tr.setSelection(Selection.near(tr.doc.resolve(start + hrType.create().nodeSize + 1)));
            dispatch(tr.scrollIntoView());
        }
        return true;
    }

    // ``` → code_block
    if (text === "```") {
        const codeBlockType = state.schema.nodes.code_block;
        if (!codeBlockType) return false;
        if (dispatch) {
            const start = $from.before();
            const end = $from.after();
            const tr = (state.tr as any).replaceWith(start, end, codeBlockType.create());
            tr.setSelection(Selection.near(tr.doc.resolve(start + 1)));
            dispatch(tr.scrollIntoView());
        }
        return true;
    }

    return false;
};

// When the cursor is at the right edge of an inline code span and the user
// presses ArrowRight, clear stored marks so subsequent typing is unstyled.
// This mirrors the behavior of Notion, Google Docs, and other rich editors.
export const exitInlineCodeOnArrowRight: Command = (state, dispatch) => {
    if (!state.selection.empty) return false;

    const { $from } = state.selection;
    const codeMark = state.schema.marks.code;
    if (!codeMark) return false;

    // Check if cursor is at the end of a code mark
    const parent = $from.parent;
    const offsetInParent = $from.parentOffset;

    // Not at end of parent — check if this position is at a mark boundary
    if (offsetInParent < parent.content.size) {
        // Check if the character before has code mark but the character after doesn't
        const before = offsetInParent > 0 ? parent.childAfter(offsetInParent - 1) : null;
        const after = parent.childAfter(offsetInParent);

        const beforeHasCode = before?.node?.marks.some((m: any) => m.type === codeMark) ?? false;
        const afterHasCode = after?.node?.marks.some((m: any) => m.type === codeMark) ?? false;

        if (beforeHasCode && !afterHasCode) {
            // At the right edge of a code span — clear stored marks and move cursor
            if (dispatch) {
                const tr = state.tr.setStoredMarks([]);
                dispatch(tr);
            }
            // Return false to let default ArrowRight also move the cursor
            return false;
        }
    }

    // At end of parent — check if last content has code mark
    if (offsetInParent === parent.content.size && parent.content.size > 0) {
        const lastChild = parent.lastChild;
        if (lastChild?.marks.some((m: any) => m.type === codeMark)) {
            if (dispatch) {
                const tr = state.tr.setStoredMarks([]);
                dispatch(tr);
            }
            return false;
        }
    }

    return false;
};

// Input rule: typing `text` (backtick-wrapped) converts to inline code mark.
export function createMarkdownInputRulesPlugin(schema: Schema): Plugin {
    const rules: InputRule[] = [];

    if (schema.marks.code) {
        rules.push(new InputRule(
            /`([^`]+)`$/,
            (state, match, start, end) => {
                const codeMark = schema.marks.code.create();
                const tr = (state.tr as any).delete(start, end);
                tr.insertText(match[1], start);
                tr.addMark(start, start + match[1].length, codeMark);
                tr.setStoredMarks([]);
                return tr;
            }
        ));
    }

    return inputRules({ rules });
}
