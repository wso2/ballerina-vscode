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

import { EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { toggleMark, setBlockType, wrapIn, lift } from "prosemirror-commands";
import { wrapInList, liftListItem } from "prosemirror-schema-list";
import { MarkType, NodeType } from "prosemirror-model";
import { undo, redo } from "prosemirror-history";

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
