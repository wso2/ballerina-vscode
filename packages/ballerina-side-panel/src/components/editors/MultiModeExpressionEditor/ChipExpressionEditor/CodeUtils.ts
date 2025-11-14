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

import { StateEffect, StateField, RangeSet, Transaction, SelectionRange, Annotation } from "@codemirror/state";
import { WidgetType, Decoration, ViewPlugin, EditorView, ViewUpdate } from "@codemirror/view";
import { ParsedToken, filterCompletionsByPrefixAndType, getParsedExpressionTokens, getWordBeforeCursor, getWordBeforeCursorPosition } from "./utils";
import { defaultKeymap, historyKeymap } from "@codemirror/commands";
import { CompletionItem } from "@wso2/ui-toolkit";
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";

export type TokenStream = number[];

export type CursorInfo = {
    top: number;
    left: number;
    position: SelectionRange;
}

export type TokenType = 'variable' | 'property' | 'parameter';

export const ProgrammerticSelectionChange = Annotation.define<boolean>();

export function createChip(text: string, type: TokenType, start: number, end: number, view: EditorView) {
    class ChipWidget extends WidgetType {
        constructor(readonly text: string, readonly type: TokenType, readonly start: number, readonly end: number, readonly view: EditorView) {
            super();
        }
        toDOM() {
            const span = document.createElement("span");
            span.textContent = this.type === 'parameter' && /^\$\d+$/.test(this.text) ? '  ' : this.text;

            let backgroundColor = "rgba(0, 122, 204, 0.3)";
            let color = "white";
            switch (this.type) {
                case 'variable':
                case 'property':
                    backgroundColor = "rgba(0, 122, 204, 0.3)";
                    color = "white";
                    break;
                case 'parameter':
                    backgroundColor = "#70c995";
                    color = "#000000"; // Dark color for light background
                    break;
                default:
                    backgroundColor = "rgba(0, 122, 204, 0.3)";
                    color = "white";
            }
            span.style.background = backgroundColor;
            span.style.color = color;
            span.style.borderRadius = "4px";
            span.style.padding = "2px 10px";
            span.style.margin = "2px 0px";
            span.style.display = "inline-block";
            span.style.cursor = "pointer";
            span.style.fontSize = "12px";
            span.style.minHeight = "20px";
            span.style.minWidth = "25px";
            span.style.transition = "all 0.2s ease";
            span.style.outline = "none";
            span.style.verticalAlign = "middle";
            span.style.userSelect = "none";
            // Add click handler to select the chip text
            span.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.view.dispatch({
                    selection: { anchor: this.start, head: this.end }
                });
                this.view.focus();
            });

            return span;
        }
        ignoreEvent() {
            return false;
        }
        eq(other: ChipWidget) {
            return other.text === this.text && other.start === this.start && other.end === this.end;
        }
    }
    return Decoration.replace({
        widget: new ChipWidget(text, type, start, end, view),
        inclusive: false,
        block: false
    });
}

export const chipTheme = EditorView.theme({
    "&": {
        backgroundColor: "var(--vscode-input-background)"
    },
    ".cm-content": {
        caretColor: "#ffffff",
        paddingRight: "40px"
    },
    "&.cm-editor .cm-cursor, &.cm-editor .cm-dropCursor": {
        borderLeftColor: "#ffffff"
    }
});

export const completionTheme = EditorView.theme({
    ".cm-tooltip.cm-tooltip-autocomplete": {
        backgroundColor: "#2d2d30",
        border: "1px solid #454545",
        borderRadius: "3px",
        padding: "2px 0px",
        maxHeight: "300px",
        overflow: "auto",
        animation: "fadeInUp 0.3s ease forwards",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul": {
        fontFamily: "var(--vscode-font-family)",
        fontSize: "13px",
        listStyle: "none",
        margin: "0",
        padding: "0",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
        height: "25px",
        display: "flex",
        alignItems: "center",
        padding: "0px 5px",
        color: "var(--vscode-input-foreground, #ffffff)",
        cursor: "pointer",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
        backgroundColor: "var(--vscode-list-activeSelectionBackground, #094771)",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li:hover": {
        backgroundColor: "#3e3e42",
    },
    ".cm-completionLabel": {
        flex: "1",
    },
    ".cm-completionDetail": {
        fontStyle: "italic",
        color: "#858585",
        fontSize: "12px",
    },
});

export const tokensChangeEffect = StateEffect.define<TokenStream>();
export const removeChipEffect = StateEffect.define<number>(); // contains token ID

export const tokenField = StateField.define<ParsedToken[]>({
    create() {
        return [];
    },
    update(oldTokens, tr) {

        oldTokens = oldTokens.map(token => ({
            ...token,
            start: tr.changes.mapPos(token.start, 1),
            end: tr.changes.mapPos(token.end, -1)
        }));

        for (let effect of tr.effects) {
            if (effect.is(tokensChangeEffect)) {
                const tokenObjects = getParsedExpressionTokens(effect.value, tr.newDoc.toString());
                return tokenObjects;
            }
            if (effect.is(removeChipEffect)) {
                const removingTokenId = effect.value;
                return oldTokens.filter(token => token.id !== removingTokenId);
            }
        }
        return oldTokens;
    }
});

export const chipPlugin = ViewPlugin.fromClass(
    class {
        decorations: RangeSet<Decoration>;
        constructor(view: EditorView) {
            this.decorations = this.buildDecorations(view);
        }
        update(update: ViewUpdate) {
            const hasTokensChangeEffect = update.transactions.some(tr =>
                tr.effects.some(e => e.is(tokensChangeEffect))
            );
            const hasDocOrViewportChange = update.docChanged || update.viewportChanged;
            if (hasDocOrViewportChange || hasTokensChangeEffect) {
                this.decorations = this.buildDecorations(update.view);
            }
        }
        buildDecorations(view: EditorView) {
            const widgets = [];
            const tokens = view.state.field(tokenField);

            for (const token of tokens) {
                const text = view.state.doc.sliceString(token.start, token.end);
                widgets.push(createChip(text, token.type, token.start, token.end, view).range(token.start, token.end));
            }

            return Decoration.set(widgets, true);
        }
    },
    {
        decorations: v => v.decorations
    }
);

export const expressionEditorKeymap = [
    {
        key: "Backspace",
        run: (view) => {
            const state = view.state;
            const tokens = state.field(tokenField, false);
            if (!tokens) return false;

            const cursor = state.selection.main.head;

            const affectedToken = tokens.find(token => token.start < cursor && token.end >= cursor);

            if (affectedToken) {
                view.dispatch({
                    effects: removeChipEffect.of(affectedToken.id),
                    changes: { from: affectedToken.start, to: affectedToken.end, insert: '' }
                });
                return true;
            }
            return false;
        }
    },
    ...defaultKeymap,
    ...historyKeymap
];

// this always returns the cursor position with correction for helper pane width overflow
// make sure all the dropdowns that use this handle has the same width
export const buildOnFocusListner = (onTrigger: (cursor: CursorInfo) => void) => {
    const shouldOpenHelperPaneListner = EditorView.updateListener.of((update) => {
        if (update.focusChanged) {
            if (!update.view.hasFocus) {
                return;
            }

            const cursorPosition = update.view.state.selection.main;
            const coords = update.view.coordsAtPos(cursorPosition.to);

            if (coords && coords.top && coords.left) {
                const editorRect = update.view.dom.getBoundingClientRect();
                //+5 is to position a little be below the cursor
                //otherwise it overlaps with the cursor
                let relativeTop = coords.bottom - editorRect.top + 5;
                let relativeLeft = coords.left - editorRect.left;

                const HELPER_PANE_WIDTH = 300;
                const viewportWidth = window.innerWidth;
                const absoluteLeft = coords.left;
                const overflow = absoluteLeft + HELPER_PANE_WIDTH - viewportWidth;

                if (overflow > 0) {
                    relativeLeft -= overflow;
                }

                onTrigger({ top: relativeTop, left: relativeLeft, position: cursorPosition });
            }
        }
    });
    return shouldOpenHelperPaneListner;
};

// this always returns the cursor position with correction for helper pane width overflow
// make sure all the dropdowns that use this handle has the same width
export const buildOnSelectionChange = (onTrigger: (cursor: CursorInfo) => void) => {
    const selectionListener = EditorView.updateListener.of((update) => {
        if (!update.selectionSet) return;
        if (update.docChanged) return;
        if (!update.view.hasFocus) return;

        if (update.transactions.some(tr => tr.annotation(ProgrammerticSelectionChange))) {
            return;
        }

        const cursorPosition = update.state.selection.main;
        const coords = update.view.coordsAtPos(cursorPosition.to);

        if (coords && coords.top && coords.left) {
            const editorRect = update.view.dom.getBoundingClientRect();
            //+5 is to position a little be below the cursor
            //otherwise it overlaps with the cursor
            let relativeTop = coords.bottom - editorRect.top + 5;
            let relativeLeft = coords.left - editorRect.left;

            const HELPER_PANE_WIDTH = 300;
            const viewportWidth = window.innerWidth;
            const absoluteLeft = coords.left;
            const overflow = absoluteLeft + HELPER_PANE_WIDTH - viewportWidth;

            if (overflow > 0) {
                relativeLeft -= overflow;
            }

            onTrigger({ top: relativeTop, left: relativeLeft, position: cursorPosition });
        }
    });
    return selectionListener;
};

export const buildOnFocusOutListner = (onTrigger: () => void) => {
    const shouldOpenHelperPaneListner = EditorView.updateListener.of((update) => {
        if (update.focusChanged) {
            if (update.view.hasFocus) return;
            onTrigger();
        }
    });
    return shouldOpenHelperPaneListner;
};

export const buildNeedTokenRefetchListner = (onTrigger: () => void) => {
    const needTokenRefetchListner = EditorView.updateListener.of((update) => {
        const userEvent = update.transactions[0]?.annotation(Transaction.userEvent);
        if (update.docChanged && (
            userEvent === "input.type" ||
            userEvent === "input.paste" ||
            userEvent === "delete.backward" ||
            userEvent === "delete.forward" ||
            userEvent === "delete.cut"
        )) {
            update.changes.iterChanges((_fromA, _toA, _fromB, _toB, inserted) => {
                const insertedText = inserted.toString();
                if (insertedText.endsWith(' ')) {
                    onTrigger();
                }
            });
        }
    });
    return needTokenRefetchListner;
}

export const buildOnChangeListner = (onTrigeer: (newValue: string, cursor: CursorInfo) => void) => {
    const onChangeListner = EditorView.updateListener.of((update) => {
        const cursorPos = update.view.state.selection.main;
        const coords = update.view.coordsAtPos(cursorPos.to);

        if (!coords || coords.top === null || coords.left === null) {
            throw new Error("Could not get cursor coordinates");
        }
        const userEvent = update.transactions[0]?.annotation(Transaction.userEvent);
        if (update.docChanged) {
            const editorRect = update.view.dom.getBoundingClientRect();
            //+5 is to position a little be below the cursor
            //otherwise it overlaps with the cursor
            let relativeTop = coords.bottom - editorRect.top + 5;
            let relativeLeft = coords.left - editorRect.left;

            const HELPER_PANE_WIDTH = 300;
            const viewportWidth = window.innerWidth;
            const absoluteLeft = coords.left;
            const overflow = absoluteLeft + HELPER_PANE_WIDTH - viewportWidth;

            if (overflow > 0) {
                relativeLeft -= overflow;
            }

            const newValue = update.view.state.doc.toString();
            const cursorInfo = {
                top: relativeTop,
                left: relativeLeft,
                position: cursorPos
            };
            onTrigeer(newValue, cursorInfo);
        }
    });
    return onChangeListner;
}

export const buildCompletionSource = (getCompletions: () => CompletionItem[]) => {
    return (context: CompletionContext): CompletionResult | null => {
        const word = context.matchBefore(/\w*/);
        if (!word || (word.from === word.to && !context.explicit)) {
            return null;
        }

        const textBeforeCursor = context.state.doc.toString().slice(0, context.pos);
        const lastNonSpaceChar = textBeforeCursor.trimEnd().slice(-1);

        // Don't show completions for trigger characters
        if (lastNonSpaceChar === '+' || lastNonSpaceChar === ':') {
            return null;
        }

        const completions = getCompletions();
        const prefix = word.text;
        const filteredCompletions = filterCompletionsByPrefixAndType(completions, prefix);

        if (filteredCompletions.length === 0) {
            return null;
        }

        return {
            from: word.from,
            options: filteredCompletions.map(item => ({
                label: item.label,
                type: item.kind || "variable",
                detail: item.description,
                apply: item.value,
            }))
        };
    };
};

export const buildHelperPaneKeymap = (getIsHelperPaneOpen: () => boolean, onClose: () => void) => {
    return [
        {
            key: "Escape",
            run: (_view) => {
                if (!getIsHelperPaneOpen()) return false;
                onClose();
                return true;
            }
        }
    ];
};
