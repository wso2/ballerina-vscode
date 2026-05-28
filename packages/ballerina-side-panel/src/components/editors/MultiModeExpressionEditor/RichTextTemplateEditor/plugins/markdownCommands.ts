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

    // Exit code block: Enter on an empty last line creates a paragraph after it
    if ($from.parent.type.name === "code_block") {
        const codeBlock = $from.parent;
        const text = codeBlock.textContent;
        const offset = $from.parentOffset;

        // Check if cursor is at the end and the last line is empty
        const isAtEnd = offset === text.length;
        const endsWithNewline = text.endsWith("\n") || text === "";

        if (isAtEnd && endsWithNewline) {
            if (dispatch) {
                const start = $from.before();
                const end = $from.after();
                const tr = state.tr as any;

                // Build a new code block without the trailing newline, plus a paragraph
                const trimmedText = text.endsWith("\n") ? text.slice(0, -1) : text;
                const newCodeBlock = trimmedText
                    ? state.schema.nodes.code_block.create(null, state.schema.text(trimmedText))
                    : state.schema.nodes.code_block.create();
                const paragraph = state.schema.nodes.paragraph.create();

                tr.replaceWith(start, end, Fragment.from([newCodeBlock, paragraph]));
                // Cursor in the new paragraph (after code block)
                tr.setSelection(Selection.near(tr.doc.resolve(start + newCodeBlock.nodeSize + 1)));
                dispatch(tr.scrollIntoView());
            }
            return true;
        }
        return false;
    }

    // Only handle remaining shortcuts when cursor is in a paragraph
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

    // Check if the cursor currently has code mark active
    const storedMarks = state.storedMarks || $from.marks();
    const hasCode = storedMarks.some((m: any) => m.type === codeMark);
    if (!hasCode) return false;

    const parent = $from.parent;
    const offsetInParent = $from.parentOffset;

    // At a mark boundary (end of code span, more text follows)
    if (offsetInParent < parent.content.size) {
        const after = parent.childAfter(offsetInParent);
        const afterHasCode = after?.node?.marks.some((m: any) => m.type === codeMark) ?? false;

        if (!afterHasCode) {
            if (dispatch) {
                // Move cursor one position right and clear code mark
                const tr = state.tr;
                tr.setSelection(Selection.near(state.doc.resolve($from.pos + 1)));
                tr.setStoredMarks([]);
                dispatch(tr.scrollIntoView());
            }
            return true;
        }
    }

    // At end of parent — code span is the last thing in the paragraph
    if (offsetInParent === parent.content.size) {
        if (dispatch) {
            // Just clear stored marks — cursor is already at the edge
            const tr = state.tr.setStoredMarks([]);
            dispatch(tr);
        }
        return true;
    }

    return false;
};

// ArrowDown at the end of a code block (or any last block) creates a paragraph
// below and moves the cursor there. Without this, users get trapped in trailing
// code blocks, tables, or blockquotes.
export const exitBlockOnArrowDown: Command = (state, dispatch) => {
    if (!state.selection.empty) return false;

    const { $from } = state.selection;

    // Check if cursor is at the very end of the document content
    const topLevelNode = $from.node(1);
    const isLastBlock = state.doc.lastChild === topLevelNode;
    const atEndOfBlock = $from.parentOffset === $from.parent.content.size;

    if (isLastBlock && atEndOfBlock) {
        // Only act on blocks where you can get "trapped" (not paragraphs)
        const blockType = topLevelNode?.type.name;
        if (blockType === "code_block" || blockType === "table" || blockType === "blockquote") {
            if (dispatch) {
                const endOfDoc = state.doc.content.size;
                const paragraph = state.schema.nodes.paragraph.create();
                const tr = (state.tr as any).insert(endOfDoc, paragraph);
                tr.setSelection(Selection.near(tr.doc.resolve(endOfDoc + 1)));
                dispatch(tr.scrollIntoView());
            }
            return true;
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

    // "- " or "* " at start of paragraph → bullet list
    if (schema.nodes.bullet_list && schema.nodes.list_item) {
        rules.push(new InputRule(
            /^[-*]\s$/,
            (_state, _match, start, _end) => {
                const $from = _state.doc.resolve(start);
                // Only in a top-level paragraph (not already in a list)
                if ($from.parent.type !== schema.nodes.paragraph) return null;
                for (let d = $from.depth - 1; d >= 0; d--) {
                    if ($from.node(d).type === schema.nodes.list_item) return null;
                }
                const listItem = schema.nodes.list_item.create(null, schema.nodes.paragraph.create());
                const list = schema.nodes.bullet_list.create(null, listItem);
                const tr = (_state.tr as any).replaceWith($from.before(), $from.after(), list);
                tr.setSelection(Selection.near(tr.doc.resolve($from.before() + 3)));
                return tr;
            }
        ));
    }

    // "1. " at start of paragraph → ordered list
    if (schema.nodes.ordered_list && schema.nodes.list_item) {
        rules.push(new InputRule(
            /^1\.\s$/,
            (_state, _match, start, _end) => {
                const $from = _state.doc.resolve(start);
                if ($from.parent.type !== schema.nodes.paragraph) return null;
                for (let d = $from.depth - 1; d >= 0; d--) {
                    if ($from.node(d).type === schema.nodes.list_item) return null;
                }
                const listItem = schema.nodes.list_item.create(null, schema.nodes.paragraph.create());
                const list = schema.nodes.ordered_list.create(null, listItem);
                const tr = (_state.tr as any).replaceWith($from.before(), $from.after(), list);
                tr.setSelection(Selection.near(tr.doc.resolve($from.before() + 3)));
                return tr;
            }
        ));
    }

    // "> " at start of paragraph → blockquote
    if (schema.nodes.blockquote) {
        rules.push(new InputRule(
            /^>\s$/,
            (_state, _match, start, _end) => {
                const $from = _state.doc.resolve(start);
                if ($from.parent.type !== schema.nodes.paragraph) return null;
                // Don't trigger inside lists or blockquotes
                for (let d = $from.depth - 1; d >= 0; d--) {
                    const ancestor = $from.node(d).type.name;
                    if (ancestor === "list_item" || ancestor === "blockquote") return null;
                }
                const paragraph = schema.nodes.paragraph.create();
                const blockquote = schema.nodes.blockquote.create(null, paragraph);
                const tr = (_state.tr as any).replaceWith($from.before(), $from.after(), blockquote);
                tr.setSelection(Selection.near(tr.doc.resolve($from.before() + 2)));
                return tr;
            }
        ));
    }

    // "# " through "###### " at start of paragraph → heading
    if (schema.nodes.heading) {
        rules.push(new InputRule(
            /^(#{1,6})\s$/,
            (_state, _match, start, _end) => {
                const $from = _state.doc.resolve(start);
                if ($from.parent.type !== schema.nodes.paragraph) return null;
                for (let d = $from.depth - 1; d >= 0; d--) {
                    if ($from.node(d).type.name === "list_item") return null;
                }
                const level = _match[1].length;
                const heading = schema.nodes.heading.create({ level });
                const tr = (_state.tr as any).replaceWith($from.before(), $from.after(), heading);
                tr.setSelection(Selection.near(tr.doc.resolve($from.before() + 1)));
                return tr;
            }
        ));
    }

    // **text** → bold
    if (schema.marks.strong) {
        rules.push(new InputRule(
            /\*\*([^*]+)\*\*$/,
            (state, match, start, end) => {
                const mark = schema.marks.strong.create();
                const tr = (state.tr as any).delete(start, end);
                tr.insertText(match[1], start);
                tr.addMark(start, start + match[1].length, mark);
                tr.setStoredMarks([]);
                return tr;
            }
        ));
    }

    // *text* → italic (but not **text**)
    if (schema.marks.em) {
        rules.push(new InputRule(
            /(?<!\*)\*([^*]+)\*$/,
            (state, match, start, end) => {
                const mark = schema.marks.em.create();
                const tr = (state.tr as any).delete(start, end);
                tr.insertText(match[1], start);
                tr.addMark(start, start + match[1].length, mark);
                tr.setStoredMarks([]);
                return tr;
            }
        ));
    }

    return inputRules({ rules });
}
