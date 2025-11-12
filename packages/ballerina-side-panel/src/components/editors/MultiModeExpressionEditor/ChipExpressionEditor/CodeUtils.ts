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

import { StateEffect, StateField, RangeSet, Transaction } from "@codemirror/state";
import { WidgetType, Decoration, ViewPlugin, EditorView, ViewUpdate, keymap } from "@codemirror/view";
import { ParsedToken, filterCompletionsByPrefixAndType, getParsedExpressionTokens, getWordBeforeCursor, getWordBeforeCursorPosition } from "./utils";
import { defaultKeymap, historyKeymap } from "@codemirror/commands";
import { CompletionItem } from "@wso2/ui-toolkit";

export type TokenStream = number[];

export function createChip(text: string) {
    class ChipWidget extends WidgetType {
        constructor(readonly text: string) {
            super();
        }
        toDOM() {
            const span = document.createElement("span");
            span.textContent = this.text;
            span.style.background = "#007bff";
            span.style.color = "white";
            span.style.borderRadius = "12px";
            span.style.padding = "2px 8px";
            span.style.margin = "0 2px";
            span.style.display = "inline-block";
            span.style.cursor = "pointer";
            return span;
        }
        ignoreEvent() {
            return true;
        }
        eq(other: ChipWidget) {
            return other.text === this.text;
        }
    }
    return Decoration.replace({
        widget: new ChipWidget(text),
        inclusive: false,
        block: false
    });
}

export const chipTheme = EditorView.theme({
    ".cm-content": {
        caretColor: "#ffffff"
    },
    "&.cm-editor .cm-cursor, &.cm-editor .cm-dropCursor": {
        borderLeftColor: "#ffffff"
    }

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
                widgets.push(createChip(text).range(token.start, token.end));
            }

            return Decoration.set(widgets, true);
        }
    },
    {
        decorations: v => v.decorations
    }
);

export const expressionEditorKeymap = keymap.of([
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
]);

export const shouldOpenCompletionsListner = (onTrigger: (state: boolean, top: number, left: number, filteredCompletions: CompletionItem[]) => void, completions: CompletionItem[]) => {
    const shouldOpenCompletionsListner = EditorView.updateListener.of((update) => {
        const cursorPosition = update.view.state.selection.main.head;
        const currentValue = update.view.state.doc.toString();
        const textBeforeCursor = currentValue.slice(0, cursorPosition);

        const wordBeforeCursor = getWordBeforeCursorPosition(textBeforeCursor);
        if (update.docChanged && wordBeforeCursor.length > 0) {
            const coords = update.view.coordsAtPos(cursorPosition);
            if (coords && coords.top && coords.left) {
                const newFilteredCompletions = filterCompletionsByPrefixAndType(completions, wordBeforeCursor);
                onTrigger(true, coords.top, coords.left, newFilteredCompletions);
            }
        }
    })

    return shouldOpenCompletionsListner;
}

export const shouldOpenHelperPaneState = (onTrigger: (state: boolean, top: number, left: number) => void) => {
    const shouldOpenHelperPaneListner = EditorView.updateListener.of((update) => {
        const cursorPosition = update.view.state.selection.main.head;
        const currentValue = update.view.state.doc.toString();
        const textBeforeCursor = currentValue.slice(0, cursorPosition);
        const triggerToken = textBeforeCursor.trimEnd().slice(-1);
        const coords = update.view.coordsAtPos(cursorPosition);

        if (!update.view.hasFocus) {
            onTrigger(false, 0, 0);
            return;
        }
        if (coords && coords.top && coords.left && (update.view.hasFocus || triggerToken === '+' || triggerToken === ':')) {
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

            onTrigger(true, relativeTop, relativeLeft);
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

export const buildOnChangeListner = (onTrigeer: (newValue: string, cursorPosition: number) => void) => {
    const onChangeListner = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
            const newValue = update.view.state.doc.toString();
            onTrigeer(newValue, update.view.state.selection.main.head);
        }
    });
    return onChangeListner;
}

// export const cursorListener = EditorView.updateListener.of((update) => {
//     if (update.selectionSet || update.docChanged) {
//         console.log("Cursor or document changed");
//     }
// });

// export const focusOutListener = EditorView.updateListener.of((update) => {
//     if (update.focusChanged && !update.view.hasFocus) {
//         console.log("Editor lost focus");
//     }
// });

// export const focusInListener = EditorView.updateListener.of((update) => {
//     if (update.focusChanged && update.view.hasFocus) {
//         console.log("Editor gained focus");
//     }
// });

// export const onChangeListener = EditorView.updateListener.of((update) => {
//     if (update.docChanged) {
//         const newValue = update.view.state.doc.toString();
//         console.log("Document changed:", newValue);
//     }
// });

// export const cursorPositionedAfterTriggerListener = EditorView.updateListener.of((update) => {
//     if (update.selectionSet || update.docChanged) {
//         const cursorPos = update.state.selection.main.head;
//         const docText = update.state.doc.toString();
//         if (cursorPos > 0 && docText[cursorPos - 1] === '') {
//             console.log("Cursor positioned after trigger character '#'");
//         }
//     }
// });
