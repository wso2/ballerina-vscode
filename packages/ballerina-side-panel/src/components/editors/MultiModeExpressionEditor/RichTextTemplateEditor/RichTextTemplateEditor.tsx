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

import React, { useEffect, useRef } from "react";
import styled from "@emotion/styled";
import { EditorState, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { keymap } from "prosemirror-keymap";
import { history, undo, redo } from "prosemirror-history";
import { baseKeymap } from "prosemirror-commands";
import { gapCursor } from "prosemirror-gapcursor";
import { splitListItem, liftListItem, sinkListItem } from "prosemirror-schema-list";
import { defaultMarkdownParser, defaultMarkdownSerializer, MarkdownParser, MarkdownSerializer } from "prosemirror-markdown";
import markdownit from "markdown-it";
import { ThemeColors, CompletionItem, FnSignatureDocumentation, HelperPaneHeight } from "@wso2/ui-toolkit";
import { LineRange } from "@wso2/ballerina-core/lib/interfaces/common";
import { HelperpaneOnChangeOptions } from "../../../Form/types";
import { useFormContext } from "../../../../context/form";
import { createChipPlugin, createChipSchema, updateChipTokens } from "./plugins/chipPlugin";
import { createXMLTagDecorationPlugin } from "./plugins/xmlTagDecorationPlugin";
import { createPlaceholderPlugin } from "./plugins/placeholderPlugin";
import { HelperPane } from "../ChipExpressionEditor/components/HelperPane";
import {
    toggleBold,
    toggleItalic,
    toggleHeading,
    toggleBlockquote,
    toggleBulletList,
    toggleOrderedList
} from "./plugins/markdownCommands";
import { HELPER_PANE_WIDTH } from "../ChipExpressionEditor/constants";
import { calculateHelperPanePosition, processFunctionWithArguments } from "../ChipExpressionEditor/utils";
import { useHelperPaneClickOutside, useHelperPane } from "../ChipExpressionEditor/hooks/useHelperPane";
import { ChipExpressionEditorDefaultConfiguration } from "../ChipExpressionEditor/ChipExpressionDefaultConfig";

const EditorContainer = styled.div<{ readOnly?: boolean }>`
    flex: 1;
    overflow: auto;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 0 0 3px 3px;
    border-top: none;
    background-color: var(--vscode-input-background);
    position: relative;

    .ProseMirror {
        padding: 8px 12px;
        outline: none;
        min-height: 100%;
        font-family: var(--vscode-font-family);
        font-size: 13px;
        color: ${ThemeColors.ON_SURFACE};
        line-height: 1.6;
        ${props => props.readOnly && 'cursor: default;'}
    }

    .ProseMirror p {
        margin: 0.5em 0;
    }

    .ProseMirror h1,
    .ProseMirror h2,
    .ProseMirror h3,
    .ProseMirror h4,
    .ProseMirror h5,
    .ProseMirror h6 {
        margin: 0.5em 0;
        font-weight: 600;
    }

    .ProseMirror h1 { font-size: 2em; }
    .ProseMirror h2 { font-size: 1.5em; }
    .ProseMirror h3 { font-size: 1.25em; }

    .ProseMirror ul,
    .ProseMirror ol {
        margin: 0.5em 0;
        padding-left: 2em;
    }

    .ProseMirror blockquote {
        margin: 1em 0;
        padding-left: 1em;
        padding-top: 0.1em;
        padding-bottom: 0.1em;
        border-left: 3px solid ${ThemeColors.PRIMARY};
        color: ${ThemeColors.ON_SURFACE_VARIANT};
    }

    .ProseMirror code {
        background: ${ThemeColors.SURFACE_BRIGHT};
        padding: 2px 4px;
        border-radius: 3px;
        font-family: var(--vscode-editor-font-family);
        font-size: 0.9em;
    }

    .ProseMirror pre {
        background: ${ThemeColors.SURFACE_BRIGHT};
        padding: 8px;
        border-radius: 3px;
        overflow-x: auto;
    }

    .ProseMirror pre code {
        background: none;
        padding: 0;
    }

    .ProseMirror .xml-tag,
    .ProseMirror .xml-tag-opening,
    .ProseMirror .xml-tag-closing,
    .ProseMirror .xml-tag-selfClosing {
        color: var(--vscode-charts-green);
    }

    .ProseMirror .placeholder {
        color: ${ThemeColors.ON_SURFACE_VARIANT};
        opacity: 0.6;
        pointer-events: none;
        position: absolute;
        top: 14px;
        left: 12px;
    }
`;

const markdownTokenizer = markdownit("commonmark", { html: false }).disable(["autolink", "html_inline", "html_block"]);

// Helper function to sanitize text by removing invisible characters
const sanitizeText = (text: string): string => {
    return text
        .replace(/\u00A0/g, ' ')  // Replace non-breaking spaces with regular spaces
        .replace(/\u200B/g, '')   // Remove zero-width spaces
        .replace(/\u200C/g, '')   // Remove zero-width non-joiners
        .replace(/\u200D/g, '')   // Remove zero-width joiners
        .replace(/\uFEFF/g, '');  // Remove zero-width no-break spaces
};

// Create chip schema once
const chipSchema = createChipSchema();

export const customMarkdownParser = new MarkdownParser(
    chipSchema,
    markdownTokenizer,
    defaultMarkdownParser.tokens
);

// Create custom serializer that handles chip nodes
export const customMarkdownSerializer = new MarkdownSerializer(
    {
        ...defaultMarkdownSerializer.nodes,
        chip(state: any, node: any) {
            // Serialize chip nodes back to their original text
            state.text(node.attrs.text, false);
        }
    },
    defaultMarkdownSerializer.marks
);

interface RichTextTemplateEditorProps {
    value: string;
    onChange?: (value: string, cursorPosition: number) => void;
    completions?: CompletionItem[];
    placeholder?: string;
    fileName?: string;
    targetLineRange?: LineRange;
    configuration: ChipExpressionEditorDefaultConfiguration;
    extractArgsFromFunction?: (value: string, cursorPosition: number) => Promise<{
        label: string;
        args: string[];
        currentArgIndex: number;
        documentation?: FnSignatureDocumentation;
    }>;
    getHelperPane?: (
        value: string,
        onChange: (value: string, options?: HelperpaneOnChangeOptions) => void,
        helperPaneHeight: HelperPaneHeight
    ) => React.ReactNode;
    onEditorViewReady?: (view: EditorView) => void;
    onHelperPaneStateChange?: (state: {
        isOpen: boolean;
        ref: React.RefObject<HTMLButtonElement>;
        toggle: () => void;
    }) => void;
    readOnly?: boolean;
}

export const RichTextTemplateEditor: React.FC<RichTextTemplateEditorProps> = ({
    value,
    onChange,
    placeholder,
    fileName,
    targetLineRange,
    configuration,
    onEditorViewReady,
    getHelperPane,
    onHelperPaneStateChange,
    extractArgsFromFunction,
    readOnly = false,
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const helperPaneRef = useRef<HTMLDivElement>(null);
    const helperPaneToggleButtonRef = useRef<HTMLButtonElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const pendingTokenFetchRef = useRef(false);

    const { expressionEditor } = useFormContext();
    const rpcManager = expressionEditor?.rpcManager;

    // Helper pane state management with fixed placement for toolbar button
    const { helperPaneState, setHelperPaneState, handleKeyboardToggle } = useHelperPane(
        {
            editorRef,
            toggleButtonRef: helperPaneToggleButtonRef,
            helperPaneWidth: HELPER_PANE_WIDTH,
            onStateChange: onHelperPaneStateChange,
            customManualToggle: (setHelperPaneState) => {
                if (!editorRef?.current || !viewRef.current) return;

                setHelperPaneState(prev => {
                    if (prev.isOpen) {
                        return { ...prev, isOpen: false };
                    }

                    const scrollTop = editorRef.current!.scrollTop || 0;
                    return { isOpen: true, top: scrollTop, left: 10 };
                });
            }
        },
        () => {
            const view = viewRef.current;
            if (!view) return null;
            const cursorPos = view.state.selection.$head.pos;
            return view.coordsAtPos(cursorPos) || null;
        }
    );

    // Handle chip click to show helper pane
    const handleChipClick = (event: MouseEvent, chipPos: number, chipNode: any) => {
        if (!viewRef.current || !editorRef.current) return;

        const target = event.target as HTMLElement;
        const chipElement = target.closest('.pm-chip') as HTMLElement;
        if (!chipElement) return;

        const chipRect = chipElement.getBoundingClientRect();
        const editorRect = editorRef.current.getBoundingClientRect();

        // Get the scroll position from the editor container
        const scrollTop = editorRef.current.scrollTop || 0;

        const position = calculateHelperPanePosition(chipRect, editorRect, HELPER_PANE_WIDTH, scrollTop);

        setHelperPaneState({
            isOpen: true,
            ...position,
            clickedChipPos: chipPos,
            clickedChipNode: chipNode
        });
    };

    // Handle helper pane selection
    const onHelperItemSelect = async (selectedValue: string, options?: HelperpaneOnChangeOptions) => {
        if (!viewRef.current) return;

        const view = viewRef.current;

        // Check if selection is on a chip/token
        const isOnChip = helperPaneState.clickedChipPos !== undefined && helperPaneState.clickedChipNode;
        const transformedValue = configuration.getHelperValue(selectedValue);

        let finalValue = transformedValue;
        let cursorPosition: number;

        // HACK: this should be handled properly with completion items template
        // current API response sends an incorrect response
        // if API sends $1,$2.. for the arguments in the template
        // then we can directly handled it without explicitly calling the API
        // and extracting args
        if (transformedValue.endsWith('()') || transformedValue.endsWith(')}')) {
            if (extractArgsFromFunction) {
                const result = await processFunctionWithArguments(transformedValue, extractArgsFromFunction);
                finalValue = result.finalValue;
            }
        }

        // If a chip was clicked, replace it
        if (isOnChip) {
            const chipPos = helperPaneState.clickedChipPos!;
            const chipNode = helperPaneState.clickedChipNode;
            const chipSize = chipNode.nodeSize;

            // Replace the chip with the new text
            const textNode = view.state.schema.text(finalValue);
            const tr = view.state.tr;
            (tr as any).replaceRangeWith(chipPos, chipPos + chipSize, textNode);
            view.dispatch(tr);

            cursorPosition = chipPos + finalValue.length;
        } else {
            // Insert at current cursor position
            const { from, to } = view.state.selection;
            const tr = view.state.tr.insertText(finalValue, from, to);
            view.dispatch(tr);
            cursorPosition = from + finalValue.length;
        }

        setHelperPaneState({
            isOpen: !options?.closeHelperPane,
            top: helperPaneState.top,
            left: helperPaneState.left
        });

        // Trigger onChange to update parent
        const serialized = customMarkdownSerializer.serialize(view.state.doc);
        const newEditorValue = sanitizeText(configuration.deserializeValue(serialized));
        onChange(newEditorValue, cursorPosition);
    };

    const fetchAndUpdateTokens = async (editorView: EditorView) => {
        if (!rpcManager || !fileName) return;
        if (!pendingTokenFetchRef.current) return;

        pendingTokenFetchRef.current = false;

        try {
            const plainText = editorView.state.doc.textContent;
            if (!plainText) return;

            const startLine = targetLineRange?.startLine;

            const wrappedForAPI = configuration.deserializeValue(plainText);

            const tokens = await rpcManager.getExpressionTokens(
                wrappedForAPI,
                fileName,
                startLine !== undefined ? startLine : undefined
            );

            updateChipTokens(editorView, {
                tokens,
                plainText,
                wrappedText: wrappedForAPI
            });
        } catch (error) {
            console.error("Failed to fetch tokens:", error);
        }
    };

    // Initialize ProseMirror editor
    useEffect(() => {
        if (!editorRef.current) return;

        const sanitizedValue = configuration.serializeValue(value);
        const chipPlugin = createChipPlugin(chipSchema, handleChipClick);
        const xmlTagPlugin = createXMLTagDecorationPlugin();

        // Plugin to close helper pane when cursor moves
        const cursorMovePlugin = new Plugin({
            view() {
                return {
                    update(view, prevState) {
                        if (!view.state.doc.eq(prevState.doc)) {
                            return;
                        }
                        const oldSelection = prevState.selection;
                        const newSelection = view.state.selection;

                        if (oldSelection.from !== newSelection.from || oldSelection.to !== newSelection.to) {
                            setHelperPaneState(prev => {
                                if (prev.isOpen) {
                                    return { ...prev, isOpen: false };
                                }
                                return prev;
                            });
                        }
                    }
                };
            }
        });

        const state = EditorState.create({
            doc: customMarkdownParser.parse(sanitizedValue),
            schema: chipSchema,
            plugins: [
                history(),
                keymap({
                    // Undo/Redo
                    "Mod-z": undo,
                    "Mod-y": redo,
                    "Mod-Shift-z": redo,

                    // Text formatting
                    "Mod-b": toggleBold,
                    "Mod-i": toggleItalic,
                    // Mod-k removed: link insertion now requires dialog from toolbar

                    // Headings
                    "Mod-Alt-1": toggleHeading(1),
                    "Mod-Alt-2": toggleHeading(2),
                    "Mod-Alt-3": toggleHeading(3),
                    "Mod-Alt-4": toggleHeading(4),
                    "Mod-Alt-5": toggleHeading(5),
                    "Mod-Alt-6": toggleHeading(6),

                    // Block formatting
                    "Mod-Shift-9": toggleBlockquote,
                    "Mod-Shift-8": toggleBulletList,
                    "Mod-Shift-7": toggleOrderedList,

                    // List management
                    "Enter": splitListItem(chipSchema.nodes.list_item),
                    "Mod-[": liftListItem(chipSchema.nodes.list_item),
                    "Mod-]": sinkListItem(chipSchema.nodes.list_item),

                    // Helper pane
                    "Mod-/": () => handleKeyboardToggle(),
                    "Escape": () => {
                        if (helperPaneState.isOpen) {
                            setHelperPaneState(prev => ({ ...prev, isOpen: false }));
                            return true;
                        }
                        return false;
                    }
                }),
                keymap(baseKeymap),
                gapCursor(),
                chipPlugin,
                xmlTagPlugin,
                cursorMovePlugin,
                ...(placeholder ? [createPlaceholderPlugin(placeholder)] : [])
            ]
        });

        const view = new EditorView(editorRef.current, {
            state,
            handlePaste(view, event, _slice) {
                const text = event.clipboardData?.getData('text/plain');
                if (!text) return false;

                // Sanitize pasted text to remove invisible characters
                const sanitizedText = sanitizeText(text);

                // Check if the pasted text looks like markdown
                const markdownPatterns = [
                    /^#{1,6}\s/m,           // Headings
                    /\*\*[^*]+\*\*/,        // Bold
                    /\*[^*]+\*/,            // Italic
                    /^[-*+]\s/m,            // Unordered list
                    /^\d+\.\s/m,            // Ordered list
                    /^>\s/m,                // Blockquote
                    /`[^`]+`/,              // Inline code
                    /```[\s\S]*```/,        // Code block
                    /\[.+\]\(.+\)/          // Links
                ];

                const looksLikeMarkdown = markdownPatterns.some(pattern => pattern.test(sanitizedText));

                if (looksLikeMarkdown) {
                    const doc = customMarkdownParser.parse(sanitizedText);
                    if (doc && doc.content.size > 0) {
                        const { from, to } = view.state.selection;
                        const tr = (view.state.tr as any).replaceWith(from, to, doc.content);
                        view.dispatch(tr);
                        return true;
                    }
                } else {
                    // For plain text, insert sanitized text
                    const { from, to } = view.state.selection;
                    const tr = view.state.tr.insertText(sanitizedText, from, to);
                    view.dispatch(tr);
                    return true;
                }

                return false;
            },
            transformPastedText(text) {
                return sanitizeText(text);
            },
            editable: () => !readOnly,
            dispatchTransaction(transaction) {
                const newState = view.state.apply(transaction);
                view.updateState(newState);

                // Check if we should fetch tokens based on what was typed
                if ((transaction as any).docChanged && !readOnly) {
                    // Check if this is undo/redo
                    const meta = (transaction as any).getMeta('history$');
                    if (meta) {
                        pendingTokenFetchRef.current = true;
                        fetchAndUpdateTokens(view);
                    } else {
                        // Check what text was inserted
                        let shouldTrigger = false;
                        (transaction as any).steps?.forEach((step: any) => {
                            if (step.slice?.content) {
                                const insertedText = step.slice.content.textBetween(0, step.slice.content.size);
                                if (insertedText.includes(' ') || insertedText.includes('}')) {
                                    shouldTrigger = true;
                                }
                            }
                        });

                        if (shouldTrigger) {
                            pendingTokenFetchRef.current = true;
                            fetchAndUpdateTokens(view);
                        }
                    }

                    // Call onChange when document changes
                    const serialized = customMarkdownSerializer.serialize(newState.doc);
                    const newValue = sanitizeText(configuration.deserializeValue(serialized));
                    const cursorPos = (newState.selection as any).$head?.pos || 0;
                    onChange(newValue, cursorPos);
                }
            },
            handleDOMEvents: {
                keydown: (_view, event) => {
                    // Prevent Cmd+B from propagating to VSCode (which would open the sidebar)
                    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b' && !event.shiftKey && !event.altKey) {
                        event.stopPropagation();
                    }
                    return false;
                }
            }
        });

        viewRef.current = view;

        if (onEditorViewReady) {
            onEditorViewReady(view);
        }

        // Fetch initial tokens
        pendingTokenFetchRef.current = true;
        fetchAndUpdateTokens(view);

        return () => {
            if (viewRef.current) {
                viewRef.current.destroy();
                viewRef.current = null;
            }
        };
    }, []);

    // Fetch tokens when value changes from parent
    useEffect(() => {
        if (viewRef.current) {
            pendingTokenFetchRef.current = true;
            fetchAndUpdateTokens(viewRef.current);
        }
    }, [value]);

    // Handle click outside and escape key for helper pane
    useHelperPaneClickOutside({
        enabled: helperPaneState.isOpen,
        refs: {
            editor: editorRef,
            helperPane: helperPaneRef,
            toggleButton: helperPaneToggleButtonRef,
            toolbar: toolbarRef
        },
        onClickOutside: () => {
            setHelperPaneState(prev => ({ ...prev, isOpen: false }));
        },
        onEscapeKey: () => {
            setHelperPaneState(prev => ({ ...prev, isOpen: false }));
        }
    });

    return (
        <>
            <EditorContainer ref={editorRef} readOnly={readOnly}>
                {helperPaneState.isOpen && getHelperPane && (
                    <HelperPane
                        ref={helperPaneRef}
                        top={helperPaneState.top}
                        left={helperPaneState.left}
                        getHelperPane={getHelperPane}
                        value={value}
                        onChange={onHelperItemSelect}
                    />
                )}
            </EditorContainer>
        </>
    );
};
