/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import styled from "@emotion/styled";
import { Codicon } from "@wso2/ui-toolkit";

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const Container = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
`;

const SearchIcon = styled.span`
    position: absolute;
    left: 10px;
    display: flex;
    align-items: center;
    color: var(--vscode-input-placeholderForeground);
    pointer-events: none;
`;

const Input = styled.input`
    width: 100%;
    padding: 6px 32px 6px 32px;
    background-color: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
    border-radius: 4px;
    color: var(--vscode-input-foreground);
    font-family: var(--vscode-font-family);
    font-size: 13px;
    outline: none;

    &::placeholder {
        color: var(--vscode-input-placeholderForeground);
    }

    &:focus {
        border-color: var(--vscode-focusBorder);
    }
`;

const ClearButton = styled.button`
    position: absolute;
    right: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    background: transparent;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    color: var(--vscode-input-placeholderForeground);

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
        color: var(--vscode-foreground);
    }
`;

export function SearchInput({ value, onChange, placeholder = "Search..." }: SearchInputProps) {
    return (
        <Container>
            <SearchIcon>
                <Codicon name="search" />
            </SearchIcon>
            <Input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
            {value && (
                <ClearButton onClick={() => onChange("")} title="Clear search">
                    <Codicon name="close" />
                </ClearButton>
            )}
        </Container>
    );
}
