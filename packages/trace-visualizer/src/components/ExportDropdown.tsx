/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { Icon } from "@wso2/ui-toolkit";

const DropdownContainer = styled.div`
    position: relative;
    display: inline-block;
`;

interface DropdownButtonProps {
    compact?: boolean;
}

const DropdownButton = styled.button<DropdownButtonProps>`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: ${(props: DropdownButtonProps) => props.compact ? '4px 8px' : '6px 12px'};
    background: transparent;
    border: 1px solid ${(props: DropdownButtonProps) => props.compact ? 'var(--vscode-panel-border)' : 'var(--vscode-button-border)'};
    color: var(--vscode-foreground);
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    transition: background-color 0.15s ease;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }

    &:active {
        transform: scale(0.98);
    }
`;

const DropdownMenu = styled.div`
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 2px;
    background: var(--vscode-dropdown-background);
    border: 1px solid var(--vscode-dropdown-border);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    min-width: 160px;
    z-index: 1000;
`;

const MenuItem = styled.button`
    display: block;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: var(--vscode-foreground);
    text-align: left;
    cursor: pointer;
    font-size: 13px;
    white-space: nowrap;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }

    &:first-child {
        border-radius: 4px 4px 0 0;
    }

    &:last-child {
        border-radius: 0 0 4px 4px;
    }
`;

interface ExportDropdownProps {
    onExportJson: () => void;
    onExportEvalset: () => void;
    buttonText?: string;
    showIcon?: boolean;
    compact?: boolean;
}

export function ExportDropdown({
    onExportJson,
    onExportEvalset,
    buttonText = "Export",
    showIcon = true,
    compact = false
}: ExportDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleExportJson = () => {
        onExportJson();
        setIsOpen(false);
    };

    const handleExportEvalset = () => {
        onExportEvalset();
        setIsOpen(false);
    };

    return (
        <DropdownContainer ref={dropdownRef}>
            <DropdownButton onClick={() => setIsOpen(!isOpen)} title="Export" compact={compact}>
                {showIcon && (
                    <Icon
                        name="bi-download"
                        sx={{ fontSize: '16px', width: '16px', height: '16px' }}
                        iconSx={{ display: 'flex' }}
                    />
                )}
                {buttonText}
            </DropdownButton>
            {isOpen && (
                <DropdownMenu>
                    <MenuItem onClick={handleExportJson}>
                        Export as JSON
                    </MenuItem>
                    <MenuItem onClick={handleExportEvalset}>
                        Export as Evalset
                    </MenuItem>
                </DropdownMenu>
            )}
        </DropdownContainer>
    );
}
