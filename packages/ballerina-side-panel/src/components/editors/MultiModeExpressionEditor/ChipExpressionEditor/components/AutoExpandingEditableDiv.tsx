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

import React from "react"
import { ChipEditorField } from "../styles"

export type AutoExpandingEditableDivProps = {
    children?: React.ReactNode;
    fieldRef?: React.RefObject<HTMLDivElement>;
    onChange: (value: string) => void;
    onSelect?: () => void;
    value: string;
    tokens: number[];
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
    onKeyUp?: () => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    onFocus?: (e: React.FocusEvent<HTMLDivElement>) => void;
}

export const AutoExpandingEditableDiv = (props: AutoExpandingEditableDivProps) => {
    const { children, onChange, onSelect, onClick, onKeyUp, onFocus, fieldRef, value, tokens, onKeyDown } = props;

    const handleChange = (event: React.FormEvent<HTMLDivElement>) => {
        onChange(event.currentTarget.textContent || "");
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown && onKeyDown(e);
        if (e.key !== "Backspace" && e.key !== "Delete") return;
        const selection = window.getSelection();
        if (!selection || !selection.anchorNode) return;
        const { anchorNode, anchorOffset } = selection;
        if (anchorNode.nodeType === Node.TEXT_NODE) {
            const textNode = anchorNode as Text;
            if (anchorOffset > 0) return;
            const parent = textNode.parentNode;
            if (!parent) return;

            const prev = parent.previousSibling;
            if (prev) {
                if (prev.nodeType !== Node.TEXT_NODE) {
                    e.preventDefault();
                }
            }
            return;
        }
        e.preventDefault();
    };


    return (
        <ChipEditorField
            ref={fieldRef}
            key={`${props.value}-${props.tokens.join(',')}`}
            contentEditable
            suppressContentEditableWarning
            onInput={handleChange}
            onSelect={onSelect}
            onKeyDown={handleKeyDown}
            onClick={onClick}
            onKeyUp={onKeyUp}
            onFocus={onFocus}
        >
            {children}
        </ChipEditorField>
    )
}
