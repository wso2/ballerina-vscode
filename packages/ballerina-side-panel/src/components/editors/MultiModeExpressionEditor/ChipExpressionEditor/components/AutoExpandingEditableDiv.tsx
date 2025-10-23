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
import { useFormContext } from "../../../../../context";
import { ThemeColors, CompletionItem, HelperPaneHeight } from "@wso2/ui-toolkit";
import { ContextMenuContainer, Completions, FloatingButtonContainer, ExpandedPopupContainer, COMPLETIONS_WIDTH } from "../styles";
import { CompletionsItem } from "./CompletionsItem";
import { FloatingToggleButton } from "./FloatingToggleButton";
import { ExpandButton, GetHelperButton } from "./FloatingButtonIcons";
import { DATA_CHIP_ATTRIBUTE, DATA_MENU_ATTRIBUTE, DATA_ELEMENT_ID_ATTRIBUTE, ARIA_PRESSED_ATTRIBUTE, CHIP_MENU_VALUE, CHIP_TRUE_VALUE } from '../constants';
import { getTextValueFromExpressionModel } from "../utils";

export type AutoExpandingEditableDivProps = {
    fieldContainerRef?: React.RefObject<HTMLDivElement>;
    children?: React.ReactNode;
    onKeyUp?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseUp?: (e: React.MouseEvent<HTMLDivElement>) => void;
    onInput?: (e: React.FormEvent<HTMLDivElement>) => void;
    style?: React.CSSProperties;
    onFocusChange?: (isFocused: boolean, isEditableSpan: boolean) => void;
    isExpanded?: boolean;
    setIsExpanded?: (isExpanded: boolean) => void;
    // Completions props
    isCompletionsOpen?: boolean;
    completions?: CompletionItem[];
    selectedCompletionItem?: number;
    menuPosition?: { top: number; left: number };
    onCompletionSelect?: (item: CompletionItem) => void;
    onCompletionHover?: (index: number) => void;
    onCloseCompletions?: () => void;
    //helperpane
    getHelperPane?: (
        value: string,
        onChange: (value: string, updatedCursorPosition: number) => void,
        helperPaneHeight: HelperPaneHeight
    ) => React.ReactNode
    isHelperPaneOpen?: boolean;
    onHelperPaneClose?: () => void;
    onToggleHelperPane?: () => void;
    handleHelperPaneValueChange?: (value: string) => void;
}

export const AutoExpandingEditableDiv = (props: AutoExpandingEditableDivProps) => {
    const {
        children,
        onKeyUp,
        onKeyDown,
        onMouseDown,
        onMouseUp,
        onInput,
        fieldContainerRef,
        style,
        isExpanded,
        setIsExpanded } = props;

    const [isAnyElementFocused, setIsAnyElementFocused] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const lastFocusStateRef = useRef<{ focused: boolean; isEditable: boolean }>({ focused: false, isEditable: false });

    const { popupManager } = useFormContext();

    const renderCompletionsMenu = () => {
        if (!props.isCompletionsOpen || !props.completions || !props.menuPosition) return null;

        const menuWidth = COMPLETIONS_WIDTH; // Use the constant from styles
        const viewportWidth = document.documentElement.clientWidth; // Use clientWidth to account for scrollbars
        const adjustedLeft = Math.max(0, Math.min(props.menuPosition.left, viewportWidth - menuWidth - 10)); // Ensure menu stays within viewport bounds

        return (
            <ContextMenuContainer
                ref={menuRef}
                top={props.menuPosition.top}
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
        if (!props.getHelperPane || !props.isHelperPaneOpen) return null;

        const menuWidth = COMPLETIONS_WIDTH; 
        const viewportWidth = document.documentElement.clientWidth; 
        const adjustedLeft = Math.max(0, Math.min(props.menuPosition.left, viewportWidth - menuWidth - 10));
        return (
            <ContextMenuContainer
                ref={menuRef}
                top={props.menuPosition.top}
                left={adjustedLeft}
                data-menu={CHIP_MENU_VALUE}
                onMouseDown={(e) => e.preventDefault()}
            >
               {props.getHelperPane(
                    "var",
                    props.handleHelperPaneValueChange ? props.handleHelperPaneValueChange : () => {},
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

        // Check if focused element is within our container
        const isWithinContainer = container.contains(activeElement);

        // Check if it's an editable span (contenteditable), a chip, or a floating toggle button
        const isEditableOrChip =
            activeElement?.hasAttribute('contenteditable') ||
            activeElement?.getAttribute(DATA_CHIP_ATTRIBUTE) === CHIP_TRUE_VALUE ||
            activeElement?.hasAttribute(DATA_ELEMENT_ID_ATTRIBUTE) ||
            activeElement?.getAttribute(ARIA_PRESSED_ATTRIBUTE) !== null; // Floating toggle buttons

        const isEditableSpan = activeElement?.hasAttribute('contenteditable');

        const newFocusState = isWithinContainer && isEditableOrChip;
        
        // Only update and call callback if the state actually changed
        const lastState = lastFocusStateRef.current;
        if (lastState.focused !== newFocusState || lastState.isEditable !== isEditableSpan) {
            console.log('Focus check:', { activeElement: activeElement?.tagName, isWithinContainer, isEditableOrChip, isEditableSpan, newFocusState });
            setIsAnyElementFocused(newFocusState);
            lastFocusStateRef.current = { focused: newFocusState, isEditable: isEditableSpan };
            
            if (props.onFocusChange) {
                props.onFocusChange(newFocusState, isEditableSpan);
            }
        }
    }, [fieldContainerRef]); // Remove props.onFocusChange from dependencies

    useEffect(() => {
        const handleFocusChange = () => {
            checkFocusState();
        };
        document.addEventListener('focusin', handleFocusChange);
        checkFocusState();

        return () => {
            document.removeEventListener('focusin', handleFocusChange);
        };
    }, [checkFocusState]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                props.onCloseCompletions?.();
                props.onHelperPaneClose?.();
            }
        };

        if (props.isCompletionsOpen || props.isHelperPaneOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [props.isCompletionsOpen, props.isHelperPaneOpen, props.onCloseCompletions, props.onHelperPaneClose]);

    useEffect(() => {
        if (isExpanded) {
            popupManager.closePopup("chip-expression-editor-expanded");
            popupManager.addPopup(
                <ExpandedPopupContainer style={style}>
                    <ChipEditorField
                        ref={fieldContainerRef}
                        style={{
                            ...style,
                            flex: 1,
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            backgroundColor: ThemeColors.SURFACE_DIM_2
                        }}
                        onKeyDown={onKeyDown}
                    >
                        {children}
                        <FloatingButtonContainer>


                            <FloatingToggleButton isActive={isExpanded} onClick={() => setIsExpanded && setIsExpanded(!isExpanded)} title="Expanded Mode">
                                <ExpandButton />
                            </FloatingToggleButton>
                            <FloatingToggleButton isActive={props.isHelperPaneOpen || false} onClick={() => props.onToggleHelperPane?.()} title="Helper">
                                <GetHelperButton />
                            </FloatingToggleButton>
                        </FloatingButtonContainer>
                        {renderCompletionsMenu()}
                    </ChipEditorField>
                </ExpandedPopupContainer>,
                "chip-expression-editor-expanded", "Expression Editor",
                700, 800,
                () => {
                    setIsExpanded && setIsExpanded(false);
                }
            )
        } else {
            popupManager.closePopup("chip-expression-editor-expanded");
        }
    }, [isExpanded, props.isCompletionsOpen, props.selectedCompletionItem, props.isHelperPaneOpen])

    return (
        <>
            {isExpanded ? (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >

                    <span>Editing in expanded mode</span>
                </div>
            ) : (
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
                    <FloatingButtonContainer>
                        <FloatingToggleButton isActive={props.isHelperPaneOpen || false} onClick={() => props.onToggleHelperPane?.()} title="Helper">
                            <GetHelperButton />
                        </FloatingToggleButton>
                        <FloatingToggleButton isActive={isExpanded} onClick={() => setIsExpanded && setIsExpanded(!isExpanded)} title="Expanded Mode">
                            <ExpandButton />
                        </FloatingToggleButton>
                    </FloatingButtonContainer>
                    {renderCompletionsMenu()}
                    {renderHelperPane()}
                </ChipEditorField>
            )}
        </>
    )
}
