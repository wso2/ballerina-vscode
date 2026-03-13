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

import React, { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { Codicon, Icon, DefaultLlmIcon, getAIModuleIcon } from "@wso2/ui-toolkit";
import { CodeData } from "@wso2/ballerina-core";

const ICON_SIZE = 16;

export function getConnectionIcon(codedata: CodeData): React.ReactElement {
    // Check AI module icon map first
    if (codedata.module) {
        const icon = getAIModuleIcon(codedata.module, ICON_SIZE);
        if (icon) return icon;
    }

    // Handle WSO2 AI module
    if (codedata.module === "ai") {
        if (codedata.node === "VECTOR_STORE") {
            return <Icon name="bi-db" sx={{ width: ICON_SIZE, height: ICON_SIZE, fontSize: ICON_SIZE }} />;
        }
        return <Icon name="bi-wso2" sx={{ width: ICON_SIZE, height: ICON_SIZE, fontSize: ICON_SIZE }} />;
    }

    // Fallback by node type
    switch (codedata?.node) {
        case "MODEL_PROVIDER":
            return <Icon name="bi-ai-model" sx={{ width: ICON_SIZE, height: ICON_SIZE, fontSize: ICON_SIZE }} />;
        case "VECTOR_STORE":
            return <Icon name="bi-db" sx={{ width: ICON_SIZE, height: ICON_SIZE, fontSize: ICON_SIZE }} />;
        case "EMBEDDING_PROVIDER":
            return <Icon name="bi-doc" sx={{ width: ICON_SIZE, height: ICON_SIZE, fontSize: ICON_SIZE }} />;
        case "DATA_LOADER":
            return <Icon name="bi-data-table" sx={{ width: ICON_SIZE, height: ICON_SIZE, fontSize: ICON_SIZE }} />;
        case "CHUNKER":
            return <Icon name="bi-cut" sx={{ width: ICON_SIZE, height: ICON_SIZE, fontSize: ICON_SIZE }} />;
        case "MEMORY_STORE":
            return <Icon name="bi-memory" sx={{ width: ICON_SIZE, height: ICON_SIZE, fontSize: ICON_SIZE }} />;
        default:
            return <DefaultLlmIcon size={ICON_SIZE} />;
    }
}

// --- Select Item type ---

export interface ConnectionSelectItem {
    id: string;
    label: string;
    value: string;
    codedata?: CodeData;
}

// --- Styled Components ---

const SelectContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    color: var(--vscode-editor-foreground);
`;

const SelectTrigger = styled.div<{ disabled?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    min-height: 26px;
    background: var(--vscode-dropdown-background);
    border: 1px solid var(--vscode-dropdown-border);
    border-radius: 2px;
    cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
    opacity: ${(props) => (props.disabled ? 0.5 : 1)};

    &:focus {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: -1px;
    }
`;

const SelectedDisplay = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
`;

const SelectedLabel = styled.span`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 13px;
`;

const Placeholder = styled.span`
    color: var(--vscode-input-placeholderForeground);
    font-size: 13px;
`;

const DropdownPanel = styled.div`
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 3333;
    background: var(--vscode-dropdown-background);
    border: 1px solid var(--vscode-dropdown-border);
    border-radius: 2px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    max-height: 200px;
    overflow-y: auto;
`;

const OptionItem = styled.div<{ selected?: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    min-height: 26px;
    cursor: pointer;
    font-size: 13px;
    background: ${(props) =>
        props.selected ? "var(--vscode-list-activeSelectionBackground)" : "transparent"};
    color: ${(props) =>
        props.selected ? "var(--vscode-list-activeSelectionForeground)" : "inherit"};

    &:hover {
        background: ${(props) =>
        props.selected
            ? "var(--vscode-list-activeSelectionBackground)"
            : "var(--vscode-list-hoverBackground)"};
    }
`;

const OptionLabel = styled.span`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const Wrapper = styled.div`
    position: relative;
`;

const FieldLabel = styled.label`
    margin-bottom: 2px;
`;

// --- Component ---

interface ConnectionIconSelectProps {
    id: string;
    label?: string;
    items: ConnectionSelectItem[];
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    onChange: (value: string) => void;
}

export const ConnectionIconSelect: React.FC<ConnectionIconSelectProps> = ({
    id,
    label,
    items,
    value,
    placeholder = "Select...",
    disabled = false,
    required = false,
    onChange,
}) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedItem = items.find((item) => item.value === value);

    const handleSelect = (itemValue: string) => {
        onChange(itemValue);
        setOpen(false);
    };

    const focusOption = (index: number) => {
        const options = containerRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
        if (options && options[index]) {
            options[index].focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(!open);
        } else if (e.key === "Escape") {
            setOpen(false);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!open) {
                setOpen(true);
            }
            // Focus first option after render
            setTimeout(() => focusOption(0), 0);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) {
                setOpen(true);
            }
            setTimeout(() => focusOption(items.length - 1), 0);
        }
    };

    const handleOptionKeyDown = (e: React.KeyboardEvent, index: number, itemValue: string) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSelect(itemValue);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            focusOption(index + 1 < items.length ? index + 1 : 0);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            focusOption(index - 1 >= 0 ? index - 1 : items.length - 1);
        } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            containerRef.current?.querySelector<HTMLElement>('[role="combobox"]')?.focus();
        }
    };

    return (
        <SelectContainer>
            {label && (
                <FieldLabel htmlFor={id}>
                    {label}
                    {required && <span style={{ color: "var(--vscode-errorForeground)" }}> *</span>}
                </FieldLabel>
            )}
            <Wrapper ref={containerRef}>
                <SelectTrigger
                    id={id}
                    role="combobox"
                    aria-expanded={open}
                    aria-haspopup="listbox"
                    tabIndex={disabled ? -1 : 0}
                    disabled={disabled}
                    onClick={() => !disabled && setOpen(!open)}
                    onKeyDown={handleKeyDown}
                >
                    <SelectedDisplay>
                        {selectedItem ? (
                            <>
                                {selectedItem.codedata && getConnectionIcon(selectedItem.codedata)}
                                <SelectedLabel>{selectedItem.label}</SelectedLabel>
                            </>
                        ) : (
                            <Placeholder>{placeholder}</Placeholder>
                        )}
                    </SelectedDisplay>
                    <Codicon name="chevron-down" sx={{ fontSize: 14, flexShrink: 0 }} />
                </SelectTrigger>
                {open && (
                    <DropdownPanel role="listbox">
                        {items.map((item, index) => (
                            <OptionItem
                                key={item.id}
                                role="option"
                                aria-selected={item.value === value}
                                selected={item.value === value}
                                tabIndex={0}
                                onClick={() => handleSelect(item.value)}
                                onKeyDown={(e: React.KeyboardEvent) => handleOptionKeyDown(e, index, item.value)}
                            >
                                {item.codedata && getConnectionIcon(item.codedata)}
                                <OptionLabel>{item.label}</OptionLabel>
                            </OptionItem>
                        ))}
                    </DropdownPanel>
                )}
            </Wrapper>
        </SelectContainer>
    );
};
