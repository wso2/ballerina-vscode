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
import React, { useState } from 'react';
import { Button, Codicon, Dropdown, SearchBox } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { ConstructorPanel } from '../ConstructorPanel';
import { WorkspacesFileResponse } from '@wso2/ballerina-core';
import { SELECT_ALL_FILES } from '../../Overview';

const Container = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 56px;
    box-shadow: inset 0 -1px 0 0 var(--vscode-panel-border);
`;

const InputContainer = styled.div`
    display: flex;
    margin-bottom: 15px;
`;

const ComponentButton = styled.div`
    margin-right: 20px;
`;

export interface TitleBarProps {
    onQueryChange: (value: string) => void;
    onSelectedFileChange: (value: string) => void;
    selectedFile: string;
    query: string;
    workspacesFileResponse: WorkspacesFileResponse;
}

export function TitleBar(props: TitleBarProps) {
    const { onQueryChange, onSelectedFileChange, selectedFile, query, workspacesFileResponse } = props;

    const [isPanelOpen, setPanelOpen] = useState(false);

    const openPanel = () => {
        setPanelOpen(!isPanelOpen);
    };

    const handleSearch = (value: string) => {
        onQueryChange(value);
    };

    const handleFileChange = (value: string) => {
        onSelectedFileChange(value);
    };

    const workspaceFiles = [{ value: SELECT_ALL_FILES, content: SELECT_ALL_FILES }];
    workspacesFileResponse?.files.map((file) => {
        workspaceFiles.push({ value: file.path, content: file.relativePath });
    });

    return (
        <Container>
            <InputContainer>
                <div
                    style={{
                        minWidth: 100,
                        marginRight: 20
                    }}
                >
                    <Dropdown
                        children={null}
                        ref={null}
                        id="file-select"
                        items={workspaceFiles}
                        label="File"
                        onValueChange={handleFileChange}
                        value={selectedFile}
                        sx={{ width: 200, marginTop: 2 }}
                    />
                </div>
                <SearchBox
                    sx={{ width: "45%", gap: 4 }}
                    placeholder="Search Component"
                    label="Search Component"
                    value={query}
                    onChange={handleSearch}
                />
            </InputContainer>

            <ComponentButton>
                <Button onClick={openPanel} appearance="primary" tooltip='Add Construct'>
                    <Codicon name="add" sx={{ marginRight: 5 }} /> Component
                </Button>
            </ComponentButton>
            {isPanelOpen && <ConstructorPanel isPanelOpen={isPanelOpen} setPanelOpen={setPanelOpen} />}
        </Container>
    );
}
