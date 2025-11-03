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

import React, { useState, useEffect, useCallback, useRef } from "react"
import { ChipEditorField } from "../styles"
import { CompletionItem, HelperPaneHeight } from "@wso2/ui-toolkit";
import { ContextMenuContainer, Completions, FloatingButtonContainer, COMPLETIONS_WIDTH } from "../styles";
import { CompletionsItem } from "./CompletionsItem";
import { FloatingToggleButton } from "./FloatingToggleButton";
import { CloseHelperButton, OpenHelperButton } from "./FloatingButtonIcons";
import { DATA_CHIP_ATTRIBUTE, DATA_ELEMENT_ID_ATTRIBUTE, ARIA_PRESSED_ATTRIBUTE, CHIP_MENU_VALUE, CHIP_TRUE_VALUE, EXPANDED_EDITOR_HEIGHT } from '../constants';
import { getCompletionsMenuPosition } from "../utils";
import styled from "@emotion/styled";

const ChipEditorFieldContainer = styled.div`
    width: 100%;
    position: relative;

    #floating-button-container {
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
    }

    &:hover #floating-button-container {
        opacity: 1;
    }
`;

export type AutoExpandingEditableDivProps = {
    value: string;
    fieldContainerRef?: React.RefObject<HTMLDivElement>;
    children?: React.ReactNode;
    onKeyUp?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    onInput?: (e: React.FormEvent<HTMLDivElement>) => void;
    style?: React.CSSProperties;
    onFocusChange?: (isFocused: boolean) => void;
    isCompletionsOpen?: boolean;
    completions?: CompletionItem[];
    selectedCompletionItem?: number;
    menuPosition2?: { top: number; left: number };
    onCompletionSelect?: (item: CompletionItem) => void;
    onCompletionHover?: (index: number) => void;
    onCloseCompletions?: () => void;
    getHelperPane?: (
        value: string,
        onChange: (value: string, closeHelperPane: boolean) => void,
        helperPaneHeight: HelperPaneHeight
    ) => React.ReactNode
    isHelperPaneOpen?: boolean;
    onHelperPaneClose?: () => void;
    onToggleHelperPane?: () => void;
    handleHelperPaneValueChange?: (value: string, closeHelperPane: boolean) => void;
    isInExpandedMode?: boolean;
    onOpenExpandedMode?: () => void;
}

export const AutoExpandingEditableDiv = (props: AutoExpandingEditableDivProps) => {
    const {
        children,
        onKeyUp,
        onKeyDown,
        onInput,
        fieldContainerRef,
        style
    } = props;

    const [isAnyElementFocused, setIsAnyElementFocused] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const lastFocusStateRef = useRef<{ focused: boolean; isEditable: boolean }>({ focused: false, isEditable: false });

    const renderCompletionsMenu = () => {
        if (!props.isCompletionsOpen || !props.completions || !fieldContainerRef?.current) return null;

        const menuPosition = getCompletionsMenuPosition(fieldContainerRef);


        const menuWidth = COMPLETIONS_WIDTH;
        const viewportWidth = document.documentElement.clientWidth;
        const adjustedLeft = Math.max(0, Math.min(menuPosition.left, viewportWidth - menuWidth - 10));

        return (
            <ContextMenuContainer
                ref={menuRef}
                top={menuPosition.top}
                left={adjustedLeft}
                data-menu={CHIP_MENU_VALUE}
                onMouseDown={(e) => e.preventDefault()}
            >
                <Completions>
                    {props.completions.map((item, index) => (
                        <CompletionsItem
                            key={`${item.label}-${index}`}
                            item={item}
                            isSelected={index === props.selectedCompletionItem}
                            onClick={() => props.onCompletionSelect?.(item)}
                            onMouseEnter={() => props.onCompletionHover?.(index)}
                        />
                    ))}
                </Completions>
            </ContextMenuContainer>
        );
    };

    const renderHelperPane = () => {
        if (!props.getHelperPane || !props.isHelperPaneOpen || !fieldContainerRef?.current) return null;

        const menuPosition = getCompletionsMenuPosition(fieldContainerRef);
        const menuWidth = COMPLETIONS_WIDTH;
        const viewportWidth = document.documentElement.clientWidth;
        const adjustedLeft = Math.max(0, Math.min(menuPosition.left, viewportWidth - menuWidth - 10));
        return (
            <ContextMenuContainer
                ref={menuRef}
                top={menuPosition.top}
                left={adjustedLeft}
                data-menu={CHIP_MENU_VALUE}
                onMouseDown={(e) => e.preventDefault()}
            >
                {props.getHelperPane(
                    props.value,
                    props.handleHelperPaneValueChange ? props.handleHelperPaneValueChange : () => { },
                    "3/4"
                )}
            </ContextMenuContainer>
        );
    };

    const checkFocusState = useCallback(() => {
        const container = fieldContainerRef?.current;
        if (!container) {
            setIsAnyElementFocused(false);
            return;
        }

        const activeElement = document.activeElement as HTMLElement;

        const isWithinContainer = container.contains(activeElement);

        const isEditableOrChip =
            activeElement?.hasAttribute('contenteditable') ||
            activeElement?.getAttribute(DATA_CHIP_ATTRIBUTE) === CHIP_TRUE_VALUE ||
            activeElement?.hasAttribute(DATA_ELEMENT_ID_ATTRIBUTE) ||
            activeElement?.getAttribute(ARIA_PRESSED_ATTRIBUTE) !== null;

        const isEditableSpan = activeElement?.hasAttribute('contenteditable');

        const newFocusState = isWithinContainer && isEditableOrChip;

        const lastState = lastFocusStateRef.current;
        if (lastState.focused !== newFocusState || lastState.isEditable !== isEditableSpan) {
            setIsAnyElementFocused(newFocusState);
            lastFocusStateRef.current = { focused: newFocusState, isEditable: isEditableSpan };

            if (props.onFocusChange) {
                props.onFocusChange(newFocusState);
            }
        }
    }, [fieldContainerRef]);

    const debounce = (func: Function, delay: number) => {
        let timer: ReturnType<typeof setTimeout>;
        return (...args: any[]) => {
            clearTimeout(timer);
            timer = setTimeout(() => func(...args), delay);
        };
    };

    const debouncedCheckFocusState = debounce(checkFocusState, 100);

    useEffect(() => {
        const handleFocusChange = () => {
            debouncedCheckFocusState();
        };
        document.addEventListener('focusin', handleFocusChange);
        document.addEventListener('focusout', handleFocusChange);
        checkFocusState();

        return () => {
            document.removeEventListener('focusin', handleFocusChange);
            document.removeEventListener('focusout', handleFocusChange);
        };
    }, [debouncedCheckFocusState]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setTimeout(() => {
                    props.onCloseCompletions?.();
                    props.onHelperPaneClose?.();
                }, 100);
            }
        };

        if (props.isCompletionsOpen || props.isHelperPaneOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [props.isCompletionsOpen, props.isHelperPaneOpen, props.onCloseCompletions, props.onHelperPaneClose]);

    const handleEditorClicked = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target instanceof HTMLSpanElement) return;
        const spans = (e.target as HTMLElement).querySelectorAll('span[contenteditable]');
        if (spans.length > 0) {
            const lastSpan = spans[spans.length - 1] as HTMLSpanElement;
            lastSpan.focus();
        }
    }

    return (
        <ChipEditorFieldContainer>
            <ChipEditorField
                ref={fieldContainerRef}
                style={{
                    ...style,
                    flex: 1,
                    maxHeight: props.isInExpandedMode ? `${EXPANDED_EDITOR_HEIGHT}px` : '200px',
                    ...(props.isInExpandedMode && {
                        height: `${EXPANDED_EDITOR_HEIGHT}px`,
                        minHeight: `${EXPANDED_EDITOR_HEIGHT}px`,
                    })
                }}
                onKeyUp={onKeyUp}
                onClick={handleEditorClicked}
                onKeyDown={onKeyDown}
                onInput={onInput}
            >
                <div style={{ flex: 1, overflow: 'auto', height: props.isInExpandedMode ? `${EXPANDED_EDITOR_HEIGHT}px` : 'auto' }}>
                    {children}
                </div>
            </ChipEditorField>
            {renderCompletionsMenu()}
            {renderHelperPane()}
            <FloatingButtonContainer id="floating-button-container">
                <FloatingToggleButton onClick={() => props.onToggleHelperPane?.()} title={props.isHelperPaneOpen ? "Close Helper" : "Open Helper"}>
                    {props.isHelperPaneOpen ? <CloseHelperButton /> : <OpenHelperButton />}
                </FloatingToggleButton>
            </FloatingButtonContainer>
        </ChipEditorFieldContainer>
    )
}
