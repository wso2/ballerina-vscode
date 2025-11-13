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

import { useEffect, useMemo, useState } from "react";
import {
    Button,
    Icon,
    Typography,
} from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { AddProjectFormFields, AddProjectFormData } from "./AddProjectFormFields";
import { isFormValidAddProject } from "./utils";

const FormContainer = styled.div`
    display: flex;
    flex-direction: column;
    margin: 80px 120px;
    max-width: 600px;
`;

const TitleContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 32px;
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

export function AddProjectForm() {
    const { rpcClient } = useRpcContext();
    const [formData, setFormData] = useState<AddProjectFormData>({
        integrationName: "",
        packageName: "",
        workspaceName: "",
        orgName: "",
        version: "",
    });
    const [isInWorkspace, setIsInWorkspace] = useState<boolean>(false);
    const [path, setPath] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleFormDataChange = (data: Partial<AddProjectFormData>) => {
        setFormData(prev => ({ ...prev, ...data }));
    };

    useEffect(() => {
        Promise.all([
            rpcClient.getCommonRpcClient().getWorkspaceRoot(),
            rpcClient.getCommonRpcClient().getWorkspaceType()
        ]).then(([path, workspaceType]) => {
            setPath(path.path);
            setIsInWorkspace(workspaceType.type === "BALLERINA_WORKSPACE");
        });
    }, []);

    const handleAddProject = () => {
        setIsLoading(true);
        rpcClient.getBIDiagramRpcClient().addProjectToWorkspace({
            projectName: formData.integrationName,
            packageName: formData.packageName,
            convertToWorkspace: !isInWorkspace,
            path: path,
            workspaceName: formData.workspaceName,
            orgName: formData.orgName || undefined,
            version: formData.version || undefined,
        });
    };

    const goBack = () => {
        rpcClient.getVisualizerRpcClient().goBack();
    };

    return (
        <FormContainer>
            <TitleContainer>
                <IconButton onClick={goBack}>
                    <Icon name="bi-arrow-back" iconSx={{ color: "var(--vscode-foreground)" }} />
                </IconButton>
                <Typography variant="h2">
                    {!isInWorkspace 
                        ? "Convert to Workspace & Add Integration"
                        : "Add New Integration"}
                </Typography>
            </TitleContainer>

            <AddProjectFormFields
                formData={formData}
                onFormDataChange={handleFormDataChange}
                isInWorkspace={isInWorkspace}
            />

            <ButtonWrapper>
                <Button
                    disabled={!isFormValidAddProject(formData, isInWorkspace) || isLoading}
                    onClick={handleAddProject}
                    appearance="primary"
                >
                    {isLoading ? (
                        <Typography variant="progress">
                            {!isInWorkspace 
                                ? "Converting & Adding..."
                                : "Adding..."}
                        </Typography>
                    ) : (
                        !isInWorkspace 
                            ? "Convert & Add Integration"
                            : "Add Integration"
                    )}
                </Button>
            </ButtonWrapper>
        </FormContainer>
    );
}

