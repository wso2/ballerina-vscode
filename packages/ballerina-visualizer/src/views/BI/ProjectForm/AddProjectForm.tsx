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
import { ValidateProjectFormErrorField } from "@wso2/ballerina-core";

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
    const [isInProject, setIsInProject] = useState<boolean>(false);
    const [targetPath, setTargetPath] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [pathValidationError, setPathValidationError] = useState<string | null>(null);
    const [packageNameValidationError, setPackageNameValidationError] = useState<string | null>(null);
    const [projectNameValidationError, setProjectNameValidationError] = useState<string | null>(null);
    const resourceTypeLabel = formData.isLibrary ? "Library" : "Integration";

    const handleFormDataChange = (data: Partial<AddProjectFormData>) => {
        setFormData(prev => ({ ...prev, ...data }));
        // Clear validation errors when form data changes
        if (pathValidationError) {
            setPathValidationError(null);
        }
        if (packageNameValidationError) {
            setPackageNameValidationError(null);
        }
        if (projectNameValidationError) {
            setProjectNameValidationError(null);
        }
    };

    useEffect(() => {
        Promise.all([
            rpcClient.getCommonRpcClient().getWorkspaceRoot(),
            rpcClient.getCommonRpcClient().getWorkspaceType()
        ]).then(([workspaceRoot, workspaceType]) => {
            setTargetPath(workspaceRoot.path);
            setIsInProject(workspaceType.type === "BALLERINA_WORKSPACE");
        });
    }, []);

    const handleAddProject = async () => {
        setIsLoading(true);
        setPathValidationError(null);
        setPackageNameValidationError(null);
        setProjectNameValidationError(null);

        try {
            // Validate the project path
            const targetNameForValidation = !isInProject
                ? formData.workspaceName
                : formData.packageName;

            const validationResult = await rpcClient.getBIDiagramRpcClient().validateProjectPath({
                projectPath: targetPath,
                projectName: targetNameForValidation,
                createDirectory: true,
            });

            if (!validationResult.isValid) {
                // Show error on the appropriate field
                if (validationResult.errorField === ValidateProjectFormErrorField.PATH) {
                    setPathValidationError(validationResult.errorMessage || `Invalid ${resourceTypeLabel.toLowerCase()} path`);
                } else if (validationResult.errorField === ValidateProjectFormErrorField.NAME) {
                    if (isInProject) {
                        setPackageNameValidationError(
                            validationResult.errorMessage || `Invalid ${resourceTypeLabel.toLowerCase()} name`
                        );
                    } else {
                        setProjectNameValidationError(
                            validationResult.errorMessage || "Invalid project name"
                        );
                    }
                }
                setIsLoading(false);
                return;
            }

            // If validation passes, add the project
            rpcClient.getBIDiagramRpcClient().addProjectToWorkspace({
                projectName: formData.integrationName,
                packageName: formData.packageName,
                convertToWorkspace: !isInProject,
                path: targetPath,
                workspaceName: formData.workspaceName,
                orgName: formData.orgName || undefined,
                version: formData.version || undefined,
                isLibrary: formData.isLibrary,
            });
        } catch (error) {
            setPathValidationError("An error occurred during validation");
            setIsLoading(false);
        }
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
                        {!isInProject
                            ? `Convert to Project & Add ${resourceTypeLabel}`
                            : `Add New ${resourceTypeLabel}`}
                    </Typography>
                </TitleContainer>

                <ScrollableContent>
                    <AddProjectFormFields
                        formData={formData}
                        onFormDataChange={handleFormDataChange}
                        isInProject={isInProject}
                        packageNameValidationError={packageNameValidationError || undefined}
                        projectNameValidationError={projectNameValidationError || undefined}
                    />
                </ScrollableContent>

                <ButtonWrapper>
                    {pathValidationError && (
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                color: "var(--vscode-errorForeground)", 
                                marginRight: "16px",
                                flex: 1
                            }}
                        >
                            {pathValidationError}
                        </Typography>
                    )}
                    <Button
                        disabled={!isFormValidAddProject(formData, isInProject) || isLoading}
                        onClick={handleAddProject}
                        appearance="primary"
                    >
                        {isLoading ? (
                            <Typography variant="progress">
                                {!isInProject
                                    ? "Converting & Adding..."
                                    : "Adding..."}
                            </Typography>
                        ) : (
                            !isInProject
                                ? `Convert & Add ${resourceTypeLabel}`
                                : `Add ${resourceTypeLabel}`
                        )}
                    </Button>
                </ButtonWrapper>
            </FormContainer>
        </PageWrapper>
    );
}
