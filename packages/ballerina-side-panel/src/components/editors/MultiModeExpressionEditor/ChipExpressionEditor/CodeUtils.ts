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
import { filterCompletionsByPrefixAndType, getParsedExpressionTokens, detectTokenPatterns, ParsedToken } from "./utils";
import { defaultKeymap, historyKeymap } from "@codemirror/commands";
import { CompletionItem, FnSignatureDocumentation } from "@wso2/ui-toolkit";
import { ThemeColors } from "@wso2/ui-toolkit";
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { TokenType, TokenMetadata, CompoundTokenSequence } from "./types";
import {
    CHIP_TEXT_STYLES,
    BASE_CHIP_STYLES,
    BASE_ICON_STYLES,
    getTokenIconClass,
    getTokenTypeColor,
    getChipDisplayContent
} from "./chipStyles";
import React from "react";

export type TokenStream = number[];

export type TokensChangePayload = {
    tokens: TokenStream;
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
            this.createChip(span);

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

        private createChip(span: HTMLSpanElement) {
            let displayText = getChipDisplayContent(this.type, this.text);
            if (this.type === TokenType.DOCUMENT) {
                displayText = this.metadata?.content || this.text;
            }

            const colors = getTokenTypeColor(this.type);

            // Apply base styles to the chip container
            Object.assign(span.style, {
                ...BASE_CHIP_STYLES,
                background: colors.background,
                border: `1px solid ${colors.border}`,
                marginRight: "2px",
                marginLeft: "2px",
            });

            // Create icon element for standard chip
            const icon = document.createElement("i");
            let iconClass = getTokenIconClass(this.type, this.metadata?.documentType);
            if (iconClass) {
                icon.className = iconClass;
            }
            Object.assign(icon.style, {
                ...BASE_ICON_STYLES,
                color: colors.icon
            });

            // Create text span with ellipsis handling
            const textSpan = document.createElement("span");
            textSpan.textContent = displayText;
            Object.assign(textSpan.style, CHIP_TEXT_STYLES);

            span.appendChild(icon);
            span.appendChild(textSpan);
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
        maxWidth: "300px",
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
                const currentValue = tr.newDoc.toString();

                tokens = getParsedExpressionTokens(payload.tokens, currentValue);

                // Detect compounds once when tokens change
                compounds = detectTokenPatterns(tokens, currentValue);

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

export const iterateTokenStream = (
    tokens: ParsedToken[],
    compounds: CompoundTokenSequence[],
    content: string,
    callbacks: {
        onCompound: (compound: CompoundTokenSequence) => void;
        onToken: (token: ParsedToken, text: string) => void;
    }
) => {
    const docLength = content.length;

    const compoundsByStartIndex = new Map<number, CompoundTokenSequence[]>();
    const compoundTokenIndices = new Set<number>();

    for (const compound of compounds) {
        // Validate compound range
        if (compound.start < 0 || compound.end > docLength || compound.start >= compound.end) {
            continue;
        }

        // Group compounds by their starting token index
        const existing = compoundsByStartIndex.get(compound.startIndex) || [];
        existing.push(compound);
        compoundsByStartIndex.set(compound.startIndex, existing);

        // Mark all indices within this compound as consumed
        for (let i = compound.startIndex; i <= compound.endIndex; i++) {
            compoundTokenIndices.add(i);
        }
    }

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        // Check if any compounds begin at this token index
        const startingCompounds = compoundsByStartIndex.get(i);
        if (startingCompounds) {
            // Trigger callback for each compound starting here
            for (const compound of startingCompounds) {
                callbacks.onCompound(compound);
            }
        }

        // Check if the individual token is consumed by a compound
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

        const text = content.slice(token.start, token.end);
        callbacks.onToken(token, text);
    }
};

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
            const widgets: any[] = []; // Type as any[] to allow pushing Range<Decoration>
            const { tokens, compounds } = view.state.field(tokenField);
            const docContent = view.state.doc.toString();

            iterateTokenStream(tokens, compounds, docContent, {
                onCompound: (compound) => {
                    const compoundText = docContent.slice(compound.start, compound.end);
                    if (compoundText.includes('\n')) {
                        return;
                    }

                    widgets.push(
                        createChip(
                            compound.displayText,
                            compound.tokenType,
                            compound.start,
                            compound.end,
                            view,
                            compound.metadata
                        ).range(compound.start, compound.end)
                    );
                },
                onToken: (token, text) => {
                    if (text.includes('\n')) {
                        return;
                    }

                    widgets.push(
                        createChip(
                            text,
                            token.type,
                            token.start,
                            token.end,
                            view
                        ).range(token.start, token.end)
                    );
                }
            });

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

export const buildCompletionSource = (getCompletions: () => Promise<CompletionItem[]>) => {
    return async (context: CompletionContext): Promise<CompletionResult | null> => {
        const textBeforeCursor = context.state.doc.toString().slice(0, context.pos);
        const lastNonSpaceChar = textBeforeCursor.trimEnd().slice(-1);

        const word = context.matchBefore(/\w*/);
        if (lastNonSpaceChar !== '.' && (
            !word || (word.from === word.to && !context.explicit)
        )) {
            return null;
        }

        // Don't show completions for trigger characters
        if (lastNonSpaceChar === '+') {
            return null;
        }

        const completions = await getCompletions();
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

export const buildHelperPaneKeymap = (getIsHelperPaneOpen: () => boolean, onClose: () => void, onToggle?: () => void) => {
    return [
        {
            key: "Escape",
            run: (_view: EditorView) => {
                if (!getIsHelperPaneOpen()) return false;
                onClose();
                return true;
            }
        },
        ...(onToggle ? [{
            key: "Ctrl-/",
            mac: "Cmd-/",
            run: (_view: EditorView) => {
                onToggle();
                return true;
            }
        }] : [])
    ];
};


export const extractTextContent = (content: any): string => {
    if (typeof content === 'string') {
        return content;
    }
    if (React.isValidElement(content)) {
        const props = (content as any).props;
        if (props) {
            if (typeof props.children === 'string') {
                return props.children;
            }
            if (Array.isArray(props.children)) {
                return props.children
                    .map((child: any) => extractTextContent(child))
                    .filter(Boolean)
                    .join(' ');
            }
            if (props.children && typeof props.children === 'object') {
                return extractTextContent(props.children);
            }
        }
    }
    if (Array.isArray(content)) {
        return content
            .map((item: any) => extractTextContent(item))
            .filter(Boolean)
            .join(' ');
    }
    return '';
};

export const parseMarkdownToDOM = (text: string, container: HTMLElement, codeBackground: string) => {
    const parseInline = (str: string, parent: HTMLElement) => {
        let remaining = str;

        while (remaining.length > 0) {
            const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
            const codeMatch = remaining.match(/^`([^`]+?)`/);

            if (boldMatch) {
                const bold = document.createElement('strong');
                bold.style.fontWeight = '600';
                parseInline(boldMatch[1], bold);
                parent.appendChild(bold);
                remaining = remaining.slice(boldMatch[0].length);
            } else if (codeMatch) {
                const code = document.createElement('code');
                code.textContent = codeMatch[1];
                code.style.cssText = `
                    background: ${codeBackground};
                    color: ${ThemeColors.PRIMARY};
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-family: var(--vscode-editor-font-family);
                    font-size: 11px;
                    border: 1px solid ${ThemeColors.OUTLINE};
                `;
                parent.appendChild(code);
                remaining = remaining.slice(codeMatch[0].length);
            } else {
                parent.appendChild(document.createTextNode(remaining[0]));
                remaining = remaining.slice(1);
            }
        }
    };

    const lines = text.split('\n');
    lines.forEach((line, index) => {
        if (index > 0) {
            container.appendChild(document.createElement('br'));
        }
        parseInline(line, container);
    });
};

export const createTooltipHeader = (label: string): HTMLDivElement => {
    const header = document.createElement("div");
    header.style.cssText = `
        padding: 8px 12px;
        background: ${ThemeColors.SURFACE_CONTAINER};
        border-bottom: 1px solid ${ThemeColors.OUTLINE};
        font-weight: 500;
        color: ${ThemeColors.PRIMARY};
        font-family: var(--vscode-editor-font-family);
    `;
    header.textContent = label;
    return header;
};

export const createSectionLabel = (text: string): HTMLDivElement => {
    const label = document.createElement("div");
    label.style.cssText = `
        color: ${ThemeColors.ON_SURFACE_VARIANT};
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
    `;
    label.textContent = text;
    return label;
};

export const createParametersSection = (args: string[], currentArgIndex: number): HTMLDivElement => {
    const section = document.createElement("div");
    section.style.cssText = `
        padding: 8px 12px;
        background: ${ThemeColors.SURFACE};
        border-bottom: 1px solid ${ThemeColors.OUTLINE};
    `;

    section.appendChild(createSectionLabel("Parameters"));

    args.forEach((arg, index) => {
        const isCurrent = index === currentArgIndex;
        const argDiv = document.createElement("div");
        argDiv.style.cssText = `
            padding: 4px 8px;
            margin: 2px 0;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            color: ${isCurrent ? ThemeColors.ON_SURFACE : ThemeColors.ON_SURFACE_VARIANT};
            background: ${isCurrent ? ThemeColors.SURFACE_CONTAINER : 'transparent'};
            font-weight: ${isCurrent ? '600' : '400'};
            border-left: ${isCurrent ? `3px solid ${ThemeColors.PRIMARY}` : '3px solid transparent'};
        `;
        argDiv.textContent = arg;
        section.appendChild(argDiv);
    });

    return section;
};

export const createDocumentationSection = (documentation: FnSignatureDocumentation): HTMLDivElement => {
    const section = document.createElement("div");
    section.style.cssText = `
        padding: 8px 12px;
        background: ${ThemeColors.SURFACE};
    `;

    section.appendChild(createSectionLabel("Documentation"));

    const docContent = document.createElement("div");
    docContent.style.cssText = `
        color: ${ThemeColors.ON_SURFACE};
        line-height: 1.5;
        font-size: 12px;
    `;

    if (documentation.fn) {
        const fnDoc = document.createElement("div");
        fnDoc.style.cssText = `margin-bottom: 8px;`;
        const text = extractTextContent(documentation.fn);
        if (text) {
            parseMarkdownToDOM(text, fnDoc, ThemeColors.SURFACE_CONTAINER);
        } else {
            fnDoc.textContent = 'Function documentation available';
        }
        docContent.appendChild(fnDoc);
    }

    if (documentation.args) {
        const argsDoc = document.createElement("div");
        argsDoc.style.cssText = `
            padding: 8px;
            background: ${ThemeColors.SURFACE_CONTAINER};
            border-radius: 3px;
            border-left: 3px solid ${ThemeColors.OUTLINE_VARIANT};
        `;

        argsDoc.appendChild(createSectionLabel("Arguments"));

        const argsDocText = document.createElement("div");
        argsDocText.style.cssText = `
            color: ${ThemeColors.ON_SURFACE};
            font-size: 12px;
        `;

        const text = extractTextContent(documentation.args);
        if (text) {
            parseMarkdownToDOM(text, argsDocText, ThemeColors.SURFACE);
        } else {
            argsDocText.textContent = 'Arguments documentation available';
        }

        argsDoc.appendChild(argsDocText);
        docContent.appendChild(argsDoc);
    }

    section.appendChild(docContent);
    return section;
};

export const createTooltipContainer = (): HTMLElement => {
    const dom = document.createElement("div");
    dom.style.cssText = `
        background: ${ThemeColors.SURFACE_BRIGHT};
        border: 1px solid ${ThemeColors.OUTLINE};
        border-radius: 4px;
        padding: 0;
        max-width: 500px;
        max-height: 200px;
        font-family: var(--vscode-font-family);
        font-size: 13px;
        box-shadow: 0 2px 8px ${ThemeColors.SURFACE_CONTAINER};
        overflow-y: auto;
        overflow-x: hidden;
    `;
    return dom;
};

export const createTooltipPositioningHandlers = (view: EditorView) => {
    let adjustmentObserver: MutationObserver | null = null;

    const adjustPosition = () => {
        const tooltipElements = view.dom.querySelectorAll('.cm-tooltip');
        if (tooltipElements.length === 0) return;

        const tooltip = tooltipElements[tooltipElements.length - 1] as HTMLElement;
        const editorRect = view.dom.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        const rightOverflow = (tooltipRect.left + tooltipRect.width) - (editorRect.left + editorRect.width);

        if (rightOverflow > 0) {
            const currentLeft = parseFloat(tooltip.style.left) || 0;
            const newLeft = currentLeft - rightOverflow - 10;
            tooltip.style.left = `${Math.max(0, newLeft)}px`;
        }
    };

    const mount = () => {
        requestAnimationFrame(() => {
            adjustPosition();

            const tooltipElements = view.dom.querySelectorAll('.cm-tooltip');
            if (tooltipElements.length > 0) {
                const tooltip = tooltipElements[tooltipElements.length - 1] as HTMLElement;
                adjustmentObserver = new MutationObserver(adjustPosition);
                adjustmentObserver.observe(tooltip, {
                    attributes: true,
                    attributeFilter: ['style']
                });
            }
        });
    };

    const destroy = () => {
        if (adjustmentObserver) {
            adjustmentObserver.disconnect();
        }
    };

    return { mount, destroy };
};

export const isSelectionOnToken = (from: number, to: number, view: EditorView): ParsedToken | undefined => {
    if (!view) return undefined;
    const { tokens, compounds } = view.state.field(tokenField);

    const matchingCompound = compounds.find(
        compound => compound.start === from && compound.end === to
    );
    if (matchingCompound) return undefined;

    const matchingToken = tokens.find(
        token => token.start === from && token.end === to
    );
    return matchingToken;
};