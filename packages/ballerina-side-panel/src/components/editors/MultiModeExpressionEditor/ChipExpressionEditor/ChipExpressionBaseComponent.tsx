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

import React, { useEffect } from "react";
import FXButton from "./components/FxButton";
import { Chip, ChipEditorContainer, ChipEditorField } from "./styles";
import { Token } from "./types";
import { CHIP_EXPRESSION_EDITOR_HEIGHT } from "./constants";
import { AutoExpandingEditableDiv } from "./components/AutoExpandingEditableDiv";
import { TokenizedExpression } from "./components/TokenizedExpression";
import { getInvalidTokensRange, handleErrorCorrection } from "./utils";

export type ChipExpressionBaseComponentProps = {
    // tokens: Token[];
    onTokenRemove?: (token: string) => void;
    onTokenClick?: (token: string) => void;
}

export const ChipExpressionBaseComponent = (props: ChipExpressionBaseComponentProps) => {
    const { onTokenRemove, onTokenClick } = props;
    const editorRef = React.useRef<HTMLDivElement>(null);
    const cursorBeforeChangeRef = React.useRef<{ start: number; end: number }>({ start: 0, end: 0 });
    const [value, setValue] = React.useState<string>("val + 12 + foo(val, 14);\n" +
        "bar( x, y + 5 ) + z.prop + 7\n" +
        "compute( a, b, c ) * d / (e + 2)\n");
    const [tokens, setTokens] = React.useState<number[]>([
        0, 0, 3, 0, 0,
        0, 15, 3, 2, 0,
        0, 5, 2, 2, 0,

        1, 5, 1, 2, 0,
        0, 3, 5, 2, 0,
        0, 10, 6, 1, 0,

        1, 9, 1, 2, 0,
        0, 3, 1, 2, 0,
        0, 3, 1, 2, 0,
        0, 6, 1, 0, 0,
        0, 5, 1, 0, 0,
    ])

    const currentCursorPositionRef = React.useRef<{ start: number; end: number }>({ start: 0, end: 0 });

    const handleSelectionChange = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);

        // Get the container element (ChipEditorField)
        const container = range.commonAncestorContainer;
        const root = container.nodeType === Node.TEXT_NODE
            ? container.parentNode
            : container;

        // Calculate absolute position by traversing all text nodes
        let absoluteStart = 0;
        let absoluteEnd = 0;
        let foundStart = false;
        let foundEnd = false;

        const calculatePosition = (node: Node, targetNode: Node, targetOffset: number): number => {
            let position = 0;

            const traverse = (current: Node): boolean => {
                if (current === targetNode) {
                    position += targetOffset;
                    return true;
                }

                if (current.nodeType === Node.TEXT_NODE) {
                    position += current.textContent?.length || 0;
                } else if (current.nodeType === Node.ELEMENT_NODE) {
                    const element = current as Element;
                    // Skip contentEditable="false" elements but count them as their text length
                    if (element.getAttribute('contenteditable') === 'false') {
                        position += current.textContent?.length || 0;
                        return false;
                    }

                    for (let i = 0; i < current.childNodes.length; i++) {
                        if (traverse(current.childNodes[i])) {
                            return true;
                        }
                    }
                }
                return false;
            };

            // Find the root editable container
            let rootElement = node;
            while (rootElement.parentNode && rootElement.parentNode.nodeType === Node.ELEMENT_NODE) {
                const parent = rootElement.parentNode as Element;
                if (parent.getAttribute('contenteditable') === 'true') {
                    rootElement = parent;
                } else {
                    break;
                }
            }

            traverse(rootElement);
            return position;
        };

        absoluteStart = calculatePosition(root, range.startContainer, range.startOffset);
        absoluteEnd = calculatePosition(root, range.endContainer, range.endOffset);

        currentCursorPositionRef.current = { start: absoluteStart, end: absoluteEnd };
        console.log('Cursor position:', { start: absoluteStart, end: absoluteEnd });
    };

    function setCaretPosition(container: HTMLElement, charIndex: number) {
        const selection = window.getSelection();
        if (!selection) return;
        let remaining = charIndex;

        // Use TreeWalker to find the text node at charIndex
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const nodeLength = node.textContent?.length ?? 0;

            if (remaining <= nodeLength) {
                // Found the node containing the target position
                const range = document.createRange();
                range.setStart(node, remaining);
                range.collapse(true); // true = caret (not a selection)
                selection.removeAllRanges();
                selection.addRange(range);
                return;
            } else {
                remaining -= nodeLength;
            }
        }
    }
    useEffect(() => {
        setCaretPosition(editorRef.current, cursorBeforeChangeRef.current.start);
    }, [value]);

    return (
        <>
            <ChipEditorContainer>
                <FXButton />
                <AutoExpandingEditableDiv
                    fieldRef={editorRef}
                    value={value}
                    tokens={tokens}
                    onChange={(newValue) => {
                        handleSelectionChange();
                        cursorBeforeChangeRef.current = { ...currentCursorPositionRef.current }; // Save cursor before change
                        console.log("cursor correction", (newValue.length - value.length))
                        const invalidTokensRange = getInvalidTokensRange(value, tokens, cursorBeforeChangeRef.current.start - (newValue.length - value.length));
                        const correctedTokens = handleErrorCorrection(invalidTokensRange, tokens, newValue.length - value.length);
                        console.log("Corrected Tokens: ", correctedTokens);
                        setTokens(correctedTokens);
                        setValue(newValue);
                    }}
                    onSelect={handleSelectionChange}
                    onClick={handleSelectionChange}
                    onKeyUp={handleSelectionChange}
                >
                    <TokenizedExpression value={value} tokens={tokens} />
                </AutoExpandingEditableDiv>
            </ChipEditorContainer>
            <pre>           
                 {JSON.stringify(currentCursorPositionRef.current)}
            </pre>           
            {JSON.stringify(value)}
            <div style={{maxWidth: '300px'}}> {JSON.stringify(tokens)}</div>
        </>
    )
}
