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

import React, { useState, useEffect, useCallback } from "react"
import { ChipEditorField } from "../styles"

export type AutoExpandingEditableDivProps = {
    fieldContainerRef?: React.RefObject<HTMLDivElement>;
    children?: React.ReactNode;
    onKeyUp?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseUp?: (e: React.MouseEvent<HTMLDivElement>) => void;
    onInput?: (e: React.FormEvent<HTMLDivElement>) => void;
    style?: React.CSSProperties;
    onFocusChange?: (isFocused: boolean) => void;
    floatingControls?: React.ReactNode;
}

export const AutoExpandingEditableDiv = (props: AutoExpandingEditableDivProps) => {
    const { children, onKeyUp, onKeyDown, onMouseDown, onMouseUp, onInput, fieldContainerRef, style } = props;

    const [isAnyElementFocused, setIsAnyElementFocused] = useState(false);

    const checkFocusState = useCallback(() => {
        const container = fieldContainerRef?.current;
        if (!container) {
            setIsAnyElementFocused(false);
            return;
        }

        const activeElement = document.activeElement as HTMLElement;
        
        // Check if focused element is within our container
        const isWithinContainer = container.contains(activeElement);
        
        // Check if it's an editable span (contenteditable), a chip, or a floating toggle button
        const isEditableOrChip = 
            activeElement?.hasAttribute('contenteditable') ||
            activeElement?.getAttribute('data-chip') === 'true' ||
            activeElement?.hasAttribute('data-element-id') ||
            activeElement?.getAttribute('aria-pressed') !== null; // Floating toggle buttons

        setIsAnyElementFocused(isWithinContainer && isEditableOrChip);
    }, [fieldContainerRef]);

    useEffect(() => {
        const handleFocusIn = () => {
            checkFocusState();
        };

        const handleFocusOut = () => {
            // Small delay to allow focus to move to buttons if needed
            setTimeout(checkFocusState, 10);
        };

        document.addEventListener('focusin', handleFocusIn);
        document.addEventListener('focusout', handleFocusOut);

        // Initial check
        checkFocusState();

        return () => {
            document.removeEventListener('focusin', handleFocusIn);
            document.removeEventListener('focusout', handleFocusOut);
        };
    }, [checkFocusState]);

    useEffect(() => {
        if (props.onFocusChange) {
            props.onFocusChange(isAnyElementFocused);
        }
    }, [isAnyElementFocused, props]);

    return (
        <ChipEditorField
            ref={fieldContainerRef}
            style={{ ...style, flex: 1 }}
            onKeyUp={onKeyUp}
            onKeyDown={onKeyDown}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onInput={onInput}
        >
            {children}
            {props.floatingControls}
        </ChipEditorField>
    )
}
