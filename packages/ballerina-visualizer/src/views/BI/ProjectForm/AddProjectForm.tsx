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

import { useEffect, useState } from "react";
import { Button, Icon, Typography } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import {
    PageWrapper,
    FormContainer,
    TitleContainer,
    ScrollableContent,
    ButtonWrapper,
    IconButton,
} from "./styles";
import { AddProjectFormFields } from "./AddProjectFormFields";
import { AddProjectFormData } from "./types";
import { isFormValidAddProject } from "./utils";

export function AddProjectForm() {
    const { rpcClient } = useRpcContext();
    const [formData, setFormData] = useState<AddProjectFormData>({
        integrationName: "",
        packageName: "",
        workspaceName: "",
        orgName: "",
        version: "",
        isLibrary: false,
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
            isLibrary: formData.isLibrary,
        });
    };

    const goBack = () => {
        rpcClient.getVisualizerRpcClient().goBack();
    };

    return (
        <PageWrapper>
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

                <ScrollableContent>
                    <AddProjectFormFields
                        formData={formData}
                        onFormDataChange={handleFormDataChange}
                        isInWorkspace={isInWorkspace}
                    />
                </ScrollableContent>

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
        </PageWrapper>
    );
}
