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

import React, { useEffect, useState } from "react";
import { Button, Icon, LocationSelector, TextField, Typography,Codicon,Tooltip } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { BodyText } from "../../styles";
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/ballerina-core";

const FormContainer = styled.div`
    display: flex;
    flex-direction: column;
    margin: 80px 120px;
    max-width: 600px;
`;

const ButtonWrapper = styled.div`
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
`;

const IconButton = styled.div`
    cursor: pointer;
    border-radius: 4px;
    width: 20px;
    height: 20px;
    font-size: 20px;
    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }
`;

const PreviewContainer = styled.div`
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    padding: 8px 12px;
    display: inline-flex;
    align-items: center;
    width: fit-content;
    height: 28px;
    gap: 8px;
    background-color: var(--vscode-editor-background);
    * {
        cursor: default !important;
    }
`;

const InputPreviewWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 20px 0;
`;

const PreviewText = styled(Typography)`
    color: var(--vscode-sideBarTitle-foreground);
    opacity: 0.5;
    font-family: var(--vscode-editor-font-family, 'Monaco', 'Menlo', 'Ubuntu Mono', monospace);
    word-break: break-all;
    min-width: 100px;
    display: flex;
    align-items: center;
    line-height: 1;
`;

const PreviewIcon = styled(Codicon)`
    display: flex;
    align-items: center;
`;

const sanitizeProjectName = (name: string): string => {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
};

export function ProjectForm() {
    const { rpcClient } = useRpcContext();
    const [selectedModule, setSelectedModule] = useState("Main");
    const [name, setName] = useState("");
    const [path, setPath] = useState("");

    const handleProjectName = (value: string) => {
        setName(value);
    };

    const handleCreateProject = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .createProject({ projectName: name, isService: selectedModule === "Service", projectPath: path });
    };

    const handleProjecDirSelection = async () => {
        const projectDirectory = await rpcClient.getCommonRpcClient().selectFileOrDirPath({});
        setPath(projectDirectory.path);
    };

    useEffect(() => {
        (async () => {
            const currentDir = await rpcClient.getCommonRpcClient().getWorkspaceRoot();
            setPath(currentDir.path);
        })();

    }, []);

    const gotToWelcome = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIWelcome,
            },
        });
    };

    return (
        <FormContainer>
            <IconButton onClick={gotToWelcome}>
                <Icon name="bi-arrow-back" iconSx={{ color: "var(--vscode-foreground)" }} />
            </IconButton>
            <Typography variant="h2">Create Your Integration</Typography>
            <BodyText>
                Name your integration and select a location to start building.
            </BodyText>
            <InputPreviewWrapper>
                <TextField
                    onTextChange={handleProjectName}
                    value={name}
                    label="Integration Name"
                    placeholder="Enter a integration name"
                    autoFocus={true}
                />
                {name && (
                    <PreviewContainer>
                        <PreviewIcon name="project" iconSx={{ fontSize: 14, color: "var(--vscode-descriptionForeground)" }} />
                            <Tooltip content="A unique identifier for your intergration">
                                <PreviewText variant="caption">
                                    {sanitizeProjectName(name)}
                                </PreviewText>
                            </Tooltip>
                    </PreviewContainer>
                )}
            </InputPreviewWrapper>
            <LocationSelector
                label="Select Integration Path"
                selectedFile={path}
                btnText="Select Path"
                onSelect={handleProjecDirSelection}
            />
            <ButtonWrapper>
                <Button
                    disabled={name.length < 2 || path.length < 2}
                    onClick={handleCreateProject}
                    appearance="primary"
                >
                    Create Integration
                </Button>
            </ButtonWrapper>
        </FormContainer>
    );
}
