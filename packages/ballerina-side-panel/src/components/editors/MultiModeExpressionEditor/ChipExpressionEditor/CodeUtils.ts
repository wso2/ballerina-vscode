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
import { filterCompletionsByPrefixAndType, getParsedExpressionTokens, detectTokenPatterns, ParsedToken, mapRawToSanitized } from "./utils";
import { defaultKeymap, historyKeymap } from "@codemirror/commands";
import { CompletionItem } from "@wso2/ui-toolkit";
import { ThemeColors } from "@wso2/ui-toolkit";
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { TokenType, TokenMetadata, CompoundTokenSequence } from "./types";
import {
    DOCUMENT_CHIP_STYLES,
    DOCUMENT_ICON_STYLES,
    CHIP_TEXT_STYLES,
    STANDARD_CHIP_STYLES,
    getDocumentIconClass,
    getTokenTypeColor,
    getChipDisplayContent
} from "./chipStyles";

export type TokenStream = number[];

export type TokensChangePayload = {
    tokens: TokenStream;
    rawValue?: string;      // Raw expression (e.g., `${var}`)
    sanitizedValue?: string; // Sanitized expression (e.g., ${var})
};

export type CursorInfo = {
    top: number;
    left: number;
    position: SelectionRange;
}

export const ProgrammerticSelectionChange = Annotation.define<boolean>();

export const SyncDocValueWithPropValue = Annotation.define<boolean>();


export function createChip(text: string, type: TokenType, start: number, end: number, view: EditorView, metadata?: TokenMetadata) {
    class ChipWidget extends WidgetType {
        constructor(
            readonly text: string,
            readonly type: TokenType,
            readonly start: number,
            readonly end: number,
            readonly view: EditorView,
            readonly metadata?: TokenMetadata
        ) {
            super();
        }
        toDOM() {
            const span = document.createElement("span");

            if (this.type === TokenType.DOCUMENT && this.metadata?.documentType) {
                this.createDocumentChip(span);
            } else {
                this.createStandardChip(span);
            }

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

        private createDocumentChip(span: HTMLSpanElement) {
            Object.assign(span.style, {
                ...DOCUMENT_CHIP_STYLES,
                cursor: "pointer"
            });

            const icon = this.createDocumentIcon();
            const textSpan = this.createTextSpan(this.metadata?.content || this.text);

            span.appendChild(icon);
            span.appendChild(textSpan);
        }

        private createDocumentIcon(): HTMLElement {
            const icon = document.createElement("i");
            Object.assign(icon.style, DOCUMENT_ICON_STYLES);

            if (this.metadata?.documentType) {
                icon.className = getDocumentIconClass(this.metadata.documentType);
            }
            return icon;
        }

        private createTextSpan(text: string): HTMLSpanElement {
            const textSpan = document.createElement("span");
            textSpan.textContent = text;
            Object.assign(textSpan.style, CHIP_TEXT_STYLES);
            return textSpan;
        }

        private createStandardChip(span: HTMLSpanElement) {
            span.textContent = getChipDisplayContent(this.type, this.text);

            const colors = getTokenTypeColor(this.type);
            Object.assign(span.style, {
                ...STANDARD_CHIP_STYLES,
                background: colors.background,
                border: `1px solid ${colors.border}`,
                cursor: "pointer"
            });
        }

        ignoreEvent() {
            return false;
        }
        eq(other: ChipWidget) {
            return other.text === this.text && other.start === this.start && other.end === this.end;
        }
    }
    return Decoration.replace({
        widget: new ChipWidget(text, type, start, end, view, metadata),
        inclusive: false,
        block: false
    });
}

export const chipTheme = EditorView.theme({
    "&": {
        backgroundColor: "var(--vscode-input-background)"
    },
    ".cm-content": {
        caretColor: ThemeColors.ON_SURFACE,
        padding: "1px",
        paddingRight: "40px"
    },
    ".cm-editor": {
        padding: "1px",
    },
    ".cm-scroller": {
        paddingTop: "1px",
        paddingBottom: "1px",
    },
    "&.cm-editor .cm-cursor, &.cm-editor .cm-dropCursor": {
        borderLeftColor: ThemeColors.ON_SURFACE
    }
});

export const completionTheme = EditorView.theme({
    ".cm-tooltip.cm-tooltip-autocomplete": {
        backgroundColor: ThemeColors.SURFACE_BRIGHT,
        border: `1px solid ${ThemeColors.OUTLINE}`,
        borderRadius: "3px",
        padding: "2px 0px",
        maxHeight: "300px",
        overflow: "auto",
        zIndex: "3000",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
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
        color: ThemeColors.ON_SURFACE,
        cursor: "pointer",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
        backgroundColor: "rgba(0, 122, 204, 0.5)",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li:hover": {
        backgroundColor: ThemeColors.OUTLINE_VARIANT,
    },
    ".cm-completionLabel": {
        flex: "1",
    },
    ".cm-completionDetail": {
        fontStyle: "italic",
        color: ThemeColors.ON_SURFACE_VARIANT,
        fontSize: "12px",
    },
});

export const tokensChangeEffect = StateEffect.define<TokensChangePayload>();
export const removeChipEffect = StateEffect.define<number>(); // contains token ID

export type TokenFieldState = {
    tokens: ParsedToken[];
    compounds: CompoundTokenSequence[];
};

export const tokenField = StateField.define<TokenFieldState>({
    create() {
        return { tokens: [], compounds: [] };
    },
    update(oldState, tr) {
        // Map existing positions through changes
        let tokens = oldState.tokens.map(token => ({
            ...token,
            start: tr.changes.mapPos(token.start, 1),
            end: tr.changes.mapPos(token.end, -1)
        }));

        let compounds = oldState.compounds.map(compound => ({
            ...compound,
            start: tr.changes.mapPos(compound.start, 1),
            end: tr.changes.mapPos(compound.end, -1)
        }));

        for (let effect of tr.effects) {
            if (effect.is(tokensChangeEffect)) {
                const payload = effect.value;
                const sanitizedDoc = tr.newDoc.toString();

                // Parse tokens using the raw value if provided, otherwise use sanitized
                const valueForParsing = payload.rawValue || sanitizedDoc;
                tokens = getParsedExpressionTokens(payload.tokens, valueForParsing);

                // If we have both raw and sanitized values, map positions
                if (payload.rawValue && payload.sanitizedValue) {
                    tokens = tokens.map(token => ({
                        ...token,
                        start: mapRawToSanitized(token.start, payload.rawValue!, payload.sanitizedValue!),
                        end: mapRawToSanitized(token.end, payload.rawValue!, payload.sanitizedValue!)
                    }));
                }

                // Detect compounds once when tokens change
                compounds = detectTokenPatterns(tokens, sanitizedDoc);

                return { tokens, compounds };
            }
            if (effect.is(removeChipEffect)) {
                const removingTokenId = effect.value;
                tokens = tokens.filter(token => token.id !== removingTokenId);

                // Recompute compounds after token removal
                const docText = tr.newDoc.toString();
                compounds = detectTokenPatterns(tokens, docText);

                return { tokens, compounds };
            }
        }
        return { tokens, compounds };
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
            const { tokens, compounds } = view.state.field(tokenField);
            const docLength = view.state.doc.length;

            // Create a set of token indices that are part of compounds
            const compoundTokenIndices = new Set<number>();
            for (const compound of compounds) {
                for (let i = compound.startIndex; i <= compound.endIndex; i++) {
                    compoundTokenIndices.add(i);
                }
            }

            // Render compound tokens as single chips
            for (const compound of compounds) {
                // Validate compound range
                if (compound.start < 0 || compound.end > docLength || compound.start >= compound.end) {
                    continue;
                }

                const chipType: TokenType = compound.tokenType;
                widgets.push(
                    createChip(
                        compound.displayText,
                        chipType,
                        compound.start,
                        compound.end,
                        view,
                        compound.metadata
                    ).range(compound.start, compound.end)
                );
            }

            // Render individual tokens that are not part of compounds
            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];

                // Skip tokens that are part of compound sequences
                if (compoundTokenIndices.has(i)) {
                    continue;
                }

                // Skip START_EVENT and END_EVENT tokens
                if (token.type === TokenType.START_EVENT || token.type === TokenType.END_EVENT) {
                    continue;
                }

                // Validate token range
                if (token.start < 0 || token.end > docLength || token.start >= token.end) {
                    continue;
                }

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
        run: (view: EditorView) => {
            const state = view.state;
            const tokenState = state.field(tokenField, false);
            if (!tokenState) return false;

            const { tokens, compounds } = tokenState;
            const cursor = state.selection.main.head;

            // Check if cursor is within a compound token
            const affectedCompound = compounds.find(
                compound => compound.start < cursor && compound.end >= cursor
            );

            if (affectedCompound) {
                // Delete all tokens in the compound sequence
                const effects = [];
                for (let i = affectedCompound.startIndex; i <= affectedCompound.endIndex; i++) {
                    effects.push(removeChipEffect.of(tokens[i].id));
                }

                view.dispatch({
                    effects,
                    changes: { from: affectedCompound.start, to: affectedCompound.end, insert: '' }
                });
                return true;
            }

            // Check for individual tokens
            const affectedToken = tokens.find((token: ParsedToken) => token.start < cursor && token.end >= cursor);

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
                const editorWidth = editorRect.width;
                const relativeRight = relativeLeft + HELPER_PANE_WIDTH;
                const overflow = relativeRight - editorWidth;

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
            const editorWidth = editorRect.width;
            const relativeRight = relativeLeft + HELPER_PANE_WIDTH;
            const overflow = relativeRight - editorWidth;

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

        if (update.docChanged && (userEvent === "undo" || userEvent === "redo")) {
            onTrigger();
            return;
        }

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

        if (update.transactions.some(tr => tr.annotation(SyncDocValueWithPropValue))) {
            return;
        }

        if (!coords || coords.top === null || coords.left === null) {
            throw new Error("Could not get cursor coordinates");
        }
        if (update.docChanged) {
            const editorRect = update.view.dom.getBoundingClientRect();
            //+5 is to position a little be below the cursor
            //otherwise it overlaps with the cursor
            let relativeTop = coords.bottom - editorRect.top + 5;
            let relativeLeft = coords.left - editorRect.left;

            const HELPER_PANE_WIDTH = 300;
            const editorWidth = editorRect.width;
            const relativeRight = relativeLeft + HELPER_PANE_WIDTH;
            const overflow = relativeRight - editorWidth;

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
            run: (_view: EditorView) => {
                if (!getIsHelperPaneOpen()) return false;
                onClose();
                return true;
            }
        }
    ];
};
