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
import React, { Fragment } from 'react'

import { css, cx } from "@emotion/css";
import styled from "@emotion/styled";
import { Combobox, Transition } from '@headlessui/react'

export interface ComboboxOptionProps {
    active?: boolean;
}

export interface DropdownContainerProps {
    widthOffset?: number;
}

const DropdownContainer = styled.div<DropdownContainerProps>`
    position: absolute;
    max-height: 100px;
    width: ${(props: DropdownContainerProps) => `calc(var(--input-min-width) + ${props.widthOffset}px)`};
    overflow: auto;
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    outline: none;
    border: 1px solid var(--vscode-list-dropBackground);
    padding-top: 5px;
    padding-bottom: 5px;
    ul {
        margin: 0;
        padding: 0;
    }
`;

const ComboboxOption = styled.div`
    position: relative;
    cursor: default;
    user-select: none;
    color: var(--vscode-editor-foreground);
    background-color: ${(props: ComboboxOptionProps) => (props.active ? 'var(--vscode-editor-selectionBackground)' :
        'var(--vscode-editor-background)')};
    list-style: none;
`;

export const OptionContainer = cx(css`
    color: var(--vscode-editor-foreground);
    background-color: var(--vscode-editor-selectionBackground);
    padding: 3px 5px 3px 5px;
    list-style-type: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
`);

export const ActiveOptionContainer = cx(css`
    color: var(--vscode-editor-foreground);
    background-color: var(--vscode-editor-background);
    list-style-type: none;
    padding: 3px 5px 3px 5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
`);

const ErrorLabel = cx(css`
    margin-left: 4px;
    margin-top: 4px;
    font-size: 12px;
    font-family: var(--font-family);
`);

// export const NothingFound = styled.div`
//     position: relative;
//     cursor: default;
//     user-select: none;
//     padding-left: 8px;
//     color: var(--vscode-editor-foreground);
//     background-color: var(--vscode-editor-background);
// `;

export interface Item {
    value: string;
    id: number;
}

export interface DropdownProps {
    query: string;
    filteredResults: string[];
    widthOffset?: number;
    onQueryChange: (query: string) => void;
    onCreateNewRecord?: (name: string) => void;
}

export function Dropdown(props: DropdownProps) {
    const { query, filteredResults, widthOffset = 108, onQueryChange, onCreateNewRecord } = props;

    const handleQueryChange = (q: string) => {
        onQueryChange(q);
    };
    const ComboboxOptionContainer = ({ active }: ComboboxOptionProps) => {
        return active ? OptionContainer : ActiveOptionContainer;
    };

    const handleAfterLeave = () => {
        handleQueryChange('');
    };

    const handleCreateNewRecord = () => {
        onCreateNewRecord(query);
    };

    return (
        <Transition
            as={Fragment}
            afterLeave={handleAfterLeave}
        >
            <DropdownContainer widthOffset={widthOffset}>
                <Combobox.Options>
                    {filteredResults.length === 0 && query !== '' ? (
                        <div className={ErrorLabel}>
                            <label>
                                <span style={{color: "var(--vscode-inputValidation-errorBorder)"}}>
                                    Unknown type {query}
                                </span>
                                <span onClick={handleCreateNewRecord} style={{color: "var(--vscode-button-background)", marginLeft: 4, cursor: "pointer"}}>
                                    Create Record
                                </span>
                            </label> 
                        </div>
                    ) : (
                        filteredResults.map((item: string, i: number) => {
                            return (
                                <ComboboxOption key={i}>
                                    <Combobox.Option
                                        className={ComboboxOptionContainer}
                                        value={item}
                                        key={item}
                                    >
                                        {item}
                                    </Combobox.Option>
                                </ComboboxOption>
                            );
                        })
                    )}
                </Combobox.Options>
            </DropdownContainer>
        </Transition>
    )
}
