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

import { useState } from "react";
import {
    Button,
    Icon,
    Typography,
} from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/ballerina-core";
import { ProjectFormFields, ProjectFormData } from "./ProjectFormFields";
import { isFormValid } from "./utils";

const PageWrapper = styled.div`
    display: flex;
    flex-direction: column;
    max-height: 100vh;
    padding: 40px 120px;
    box-sizing: border-box;
    overflow: hidden;
`;

const FormContainer = styled.div`
    display: flex;
    flex-direction: column;
    max-width: 600px;
    overflow: hidden;
`;

const TitleContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 32px;
    flex-shrink: 0;
`;

const ScrollableContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding-right: 8px;
    min-height: 0;
`;

const ButtonWrapper = styled.div`
    margin-top: 20px;
    padding-top: 16px;
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
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

export function ProjectForm() {
    const { rpcClient } = useRpcContext();
    const [formData, setFormData] = useState<ProjectFormData>({
        integrationName: "",
        packageName: "",
        path: "",
        createDirectory: true,
        createAsWorkspace: false,
        workspaceName: "",
        orgName: "",
        version: "",
    });

    const handleFormDataChange = (data: Partial<ProjectFormData>) => {
        setFormData(prev => ({ ...prev, ...data }));
    };

    const handleCreateProject = () => {
        rpcClient.getBIDiagramRpcClient().createProject({
            projectName: formData.integrationName,
            packageName: formData.packageName,
            projectPath: formData.path,
            createDirectory: formData.createDirectory,
            createAsWorkspace: formData.createAsWorkspace,
            workspaceName: formData.workspaceName,
            orgName: formData.orgName || undefined,
            version: formData.version || undefined,
        });
    };

    const gotToWelcome = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIWelcome,
            },
        });
    };

    const goBack = () => {
        rpcClient.getVisualizerLocation().then((location) => {
            const projectPath = location.projectPath;
            if (projectPath) {
                rpcClient.getVisualizerRpcClient().goBack();
            } else {
                gotToWelcome();
            }
        });
    };

    return (
        <PageWrapper>
            <FormContainer>
                <TitleContainer>
                    <IconButton onClick={goBack}>
                        <Icon name="bi-arrow-back" iconSx={{ color: "var(--vscode-foreground)" }} />
                    </IconButton>
                    <Typography variant="h2">Create Your Integration</Typography>
                </TitleContainer>

                <ScrollableContent>
                    <ProjectFormFields
                        formData={formData}
                        onFormDataChange={handleFormDataChange}
                    />
                </ScrollableContent>

                <ButtonWrapper>
                    <Button
                        disabled={!isFormValid(formData)}
                        onClick={handleCreateProject}
                        appearance="primary"
                    >
                        {formData.createAsWorkspace ? "Create Workspace" : "Create Integration"}
                    </Button>
                </ButtonWrapper>
            </FormContainer>
        </PageWrapper>
    );
}
