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
import { Button, Icon, Typography } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW, ValidateProjectFormErrorField } from "@wso2/ballerina-core";
import {
    PageWrapper,
    FormContainer,
    TitleContainer,
    ScrollableContent,
    ButtonWrapper,
    IconButton,
} from "./styles";
import { ProjectFormFields } from "./ProjectFormFields";
import { ProjectFormData } from "./types";
import { validatePackageName } from "./utils";

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
        isLibrary: false,
    });
    const [isValidating, setIsValidating] = useState(false);
    const [integrationNameError, setIntegrationNameError] = useState<string | null>(null);
    const [pathError, setPathError] = useState<string | null>(null);
    const [packageNameValidationError, setPackageNameValidationError] = useState<string | null>(null);

    const handleFormDataChange = (data: Partial<ProjectFormData>) => {
        setFormData(prev => ({ ...prev, ...data }));
        // Clear validation errors when form data changes
        if (integrationNameError) {
            setIntegrationNameError(null);
        }
        if (pathError) {
            setPathError(null);
        }
        if (packageNameValidationError) {
            setPackageNameValidationError(null);
        }
    };

    const handleCreateProject = async () => {
        setIsValidating(true);
        setIntegrationNameError(null);
        setPathError(null);
        setPackageNameValidationError(null);

        let hasError = false;

        if (formData.integrationName.length < 2) {
            setIntegrationNameError("Integration name must be at least 2 characters");
            hasError = true;
        }

        if (formData.packageName.length < 2) {
            setPackageNameValidationError("Package name must be at least 2 characters");
            hasError = true;
        } else {
            const packageNameError = validatePackageName(formData.packageName, formData.integrationName);
            if (packageNameError) {
                setPackageNameValidationError(packageNameError);
                hasError = true;
            }
        }

        if (formData.path.length < 2) {
            setPathError("Please select a path for your project");
            hasError = true;
        }

        if (hasError) {
            setIsValidating(false);
            return;
        }

        try {
            const validationResult = await rpcClient.getBIDiagramRpcClient().validateProjectPath({
                projectPath: formData.path,
                projectName: formData.createAsWorkspace ? formData.workspaceName : formData.packageName,
                createDirectory: formData.createDirectory,
            });

            if (!validationResult.isValid) {
                if (validationResult.errorField === ValidateProjectFormErrorField.PATH) {
                    setPathError(validationResult.errorMessage || "Invalid project path");
                } else if (validationResult.errorField === ValidateProjectFormErrorField.NAME) {
                    setPackageNameValidationError(validationResult.errorMessage || "Invalid project name");
                }
                setIsValidating(false);
                return;
            }

            rpcClient.getBIDiagramRpcClient().createProject({
                projectName: formData.integrationName,
                packageName: formData.packageName,
                projectPath: formData.path,
                createDirectory: formData.createDirectory,
                createAsWorkspace: formData.createAsWorkspace,
                workspaceName: formData.workspaceName,
                orgName: formData.orgName || undefined,
                version: formData.version || undefined,
                isLibrary: formData.isLibrary,
            });
        } catch (error) {
            setPathError("An error occurred during validation");
            setIsValidating(false);
        }
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
                        integrationNameError={integrationNameError || undefined}
                        pathError={pathError || undefined}
                        packageNameValidationError={packageNameValidationError || undefined}
                    />
                </ScrollableContent>

                <ButtonWrapper>
                    <Button
                        disabled={isValidating}
                        onClick={handleCreateProject}
                        appearance="primary"
                    >
                        {isValidating 
                            ? "Validating..." 
                            : formData.createAsWorkspace 
                                ? "Create Workspace" 
                                : "Create Integration"}
                    </Button>
                </ButtonWrapper>
            </FormContainer>
        </PageWrapper>
    );
}
