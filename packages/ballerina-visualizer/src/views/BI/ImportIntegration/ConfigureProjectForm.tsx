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

import { ActionButtons, Codicon, Typography } from "@wso2/ui-toolkit";
import { useState } from "react";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { ValidateProjectFormErrorField } from "@wso2/ballerina-core";
import { BodyText } from "../../styles";
import { ProjectFormData, ProjectFormFields } from "../ProjectForm/ProjectFormFields";
import { validatePackageName } from "../ProjectForm/utils";
import { MultiProjectFormData, MultiProjectFormFields } from "./components/MultiProjectFormFields";
import {
    AIEnhancementSection,
    AIEnhancementTitle,
    ButtonWrapper,
} from "./styles";
import {
    RadioGroup,
    RadioOption,
    RadioInput,
    RadioContent,
    RadioTitle,
    RadioDescription,
} from "../ProjectForm/styles";
import { ConfigureProjectFormProps } from "./types";

interface AIEnhancementToggleProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}

function AIEnhancementToggle({ enabled, onChange }: AIEnhancementToggleProps) {
    return (
        <AIEnhancementSection>
            <AIEnhancementTitle>
                <Codicon name="sparkle" />
                AI Enhancement
            </AIEnhancementTitle>
            <RadioGroup>
                <RadioOption isSelected={enabled} onClick={() => onChange(true)}>
                    <RadioInput
                        type="radio"
                        name="ai-enhancement"
                        checked={enabled}
                        onChange={() => onChange(true)}
                    />
                    <RadioContent>
                        <RadioTitle>Enable AI Enhancement</RadioTitle>
                        <RadioDescription>
                            AI will automatically resolve unmapped elements, fix build errors, and refine tests.
                        </RadioDescription>
                    </RadioContent>
                </RadioOption>
                <RadioOption isSelected={!enabled} onClick={() => onChange(false)}>
                    <RadioInput
                        type="radio"
                        name="ai-enhancement"
                        checked={!enabled}
                        onChange={() => onChange(false)}
                    />
                    <RadioContent>
                        <RadioTitle>Skip for Now – Enhance Later</RadioTitle>
                        <RadioDescription>
                            Open the project as-is. You can trigger AI enhancement later from the BI Copilot.
                        </RadioDescription>
                    </RadioContent>
                </RadioOption>
            </RadioGroup>
        </AIEnhancementSection>
    );
}

export function ConfigureProjectForm({ isMultiProject, onNext, onBack }: ConfigureProjectFormProps) {
    const { rpcClient } = useRpcContext();
    const [aiEnhancementEnabled, setAiEnhancementEnabled] = useState(true);
    const [singleProjectData, setSingleProjectData] = useState<ProjectFormData>({
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

    const [multiProjectData, setMultiProjectData] = useState<MultiProjectFormData>({
        rootFolderName: "",
        path: "",
        createDirectory: true,
    });

    const [isValidating, setIsValidating] = useState(false);
    const [pathError, setPathError] = useState<string | null>(null);
    const [folderNameError, setFolderNameError] = useState<string | null>(null);
    const [singleProjectIntegrationNameError, setSingleProjectIntegrationNameError] = useState<string | null>(null);
    const [singleProjectPathError, setSingleProjectPathError] = useState<string | null>(null);
    const [singleProjectPackageNameError, setSingleProjectPackageNameError] = useState<string | null>(null);

    const handleSingleProjectFormChange = (data: Partial<ProjectFormData>) => {
        setSingleProjectData(prev => ({ ...prev, ...data }));
        // Clear validation errors when form data changes
        if (singleProjectIntegrationNameError) {
            setSingleProjectIntegrationNameError(null);
        }
        if (singleProjectPathError) {
            setSingleProjectPathError(null);
        }
        if (singleProjectPackageNameError) {
            setSingleProjectPackageNameError(null);
        }
    };

    const handleMultiProjectFormChange = (data: Partial<MultiProjectFormData>) => {
        setMultiProjectData(prev => ({ ...prev, ...data }));
        // Clear validation errors when form data changes
        if (pathError) {
            setPathError(null);
        }
        if (folderNameError) {
            setFolderNameError(null);
        }
    };

    const handleCreateSingleProject = async () => {
        setIsValidating(true);
        setSingleProjectIntegrationNameError(null);
        setSingleProjectPathError(null);
        setSingleProjectPackageNameError(null);

        // Validate required fields first
        let hasError = false;

        if (singleProjectData.integrationName.length < 2) {
            setSingleProjectIntegrationNameError("Integration name must be at least 2 characters");
            hasError = true;
        }

        if (singleProjectData.packageName.length < 2) {
            setSingleProjectPackageNameError("Package name must be at least 2 characters");
            hasError = true;
        } else {
            const packageNameError = validatePackageName(singleProjectData.packageName, singleProjectData.integrationName);
            if (packageNameError) {
                setSingleProjectPackageNameError(packageNameError);
                hasError = true;
            }
        }

        if (singleProjectData.path.length < 2) {
            setSingleProjectPathError("Please select a path for your project");
            hasError = true;
        }

        if (hasError) {
            setIsValidating(false);
            return;
        }

        try {
            // Validate the project path
            const validationResult = await rpcClient.getBIDiagramRpcClient().validateProjectPath({
                projectPath: singleProjectData.path,
                projectName: singleProjectData.createAsWorkspace ? singleProjectData.workspaceName : singleProjectData.packageName,
                createDirectory: singleProjectData.createDirectory,
            });

            if (!validationResult.isValid) {
                // Show error on the appropriate field
                if (validationResult.errorField === ValidateProjectFormErrorField.PATH) {
                    setSingleProjectPathError(validationResult.errorMessage || "Invalid project path");
                } else if (validationResult.errorField === ValidateProjectFormErrorField.NAME) {
                    setSingleProjectPackageNameError(validationResult.errorMessage || "Invalid project name");
                }
                setIsValidating(false);
                return;
            }

            // If validation passes, proceed
            onNext({
                projectName: singleProjectData.integrationName,
                packageName: singleProjectData.packageName,
                projectPath: singleProjectData.path,
                createDirectory: singleProjectData.createDirectory,
                createAsWorkspace: singleProjectData.createAsWorkspace,
                workspaceName: singleProjectData.workspaceName,
                orgName: singleProjectData.orgName || undefined,
                version: singleProjectData.version || undefined,
            }, aiEnhancementEnabled);
        } catch (error) {
            setSingleProjectPathError("An error occurred during validation");
            setIsValidating(false);
        }
    };

    const handleCreateMultiProject = async () => {
        setIsValidating(true);
        setPathError(null);
        setFolderNameError(null);

        // Validate required fields first
        let hasError = false;

        if (!multiProjectData.path.trim() || multiProjectData.path.length < 2) {
            setPathError("Please select a path for your project");
            hasError = true;
        }

        if (multiProjectData.createDirectory && (!multiProjectData.rootFolderName.trim() || multiProjectData.rootFolderName.length < 1)) {
            setFolderNameError("Folder name is required when creating a new directory");
            hasError = true;
        }

        if (hasError) {
            setIsValidating(false);
            return;
        }

        try {
            // Validate the project path
            const validationResult = await rpcClient.getBIDiagramRpcClient().validateProjectPath({
                projectPath: multiProjectData.path,
                projectName: multiProjectData.rootFolderName,
                createDirectory: multiProjectData.createDirectory,
            });

            if (!validationResult.isValid) {
                // Show error on the appropriate field
                if (validationResult.errorField === ValidateProjectFormErrorField.PATH) {
                    setPathError(validationResult.errorMessage || "Invalid project path");
                } else if (validationResult.errorField === ValidateProjectFormErrorField.NAME) {
                    setFolderNameError(validationResult.errorMessage || "Invalid folder name");
                }
                setIsValidating(false);
                return;
            }

            // If validation passes, proceed
            onNext({
                projectName: multiProjectData.rootFolderName,
                packageName: multiProjectData.rootFolderName,
                projectPath: multiProjectData.path,
                createDirectory: multiProjectData.createDirectory,
                createAsWorkspace: false,
            }, aiEnhancementEnabled);
        } catch (error) {
            setPathError("An error occurred during validation");
            setIsValidating(false);
        }
    };

    return (
        <>
            {isMultiProject ? (
                <>
                    <Typography variant="h2">Configure Multi-Project Import</Typography>
                    <BodyText>Select the location where you want to save the migrated packages.</BodyText>

                    <MultiProjectFormFields
                        formData={multiProjectData}
                        onFormDataChange={handleMultiProjectFormChange}
                        pathError={pathError || undefined}
                        folderNameError={folderNameError || undefined}
                    />

                    {<AIEnhancementToggle enabled={aiEnhancementEnabled} onChange={setAiEnhancementEnabled} />}

                    <ButtonWrapper>
                        <ActionButtons
                            primaryButton={{
                                text: isValidating ? "Validating..." : (aiEnhancementEnabled ? "Create and Start AI Enhancement" : "Create and Open Project"),
                                onClick: handleCreateMultiProject,
                                disabled: isValidating
                            }}
                            secondaryButton={{
                                text: "Back",
                                onClick: onBack,
                                disabled: false
                            }}
                        />
                    </ButtonWrapper>
                </>
            ) : (
                <>
                    <Typography variant="h2">Configure Your Integration Project</Typography>
                    <BodyText>Please provide the necessary details to create your integration project.</BodyText>

                    <ProjectFormFields
                        formData={singleProjectData}
                        onFormDataChange={handleSingleProjectFormChange}
                        integrationNameError={singleProjectIntegrationNameError || undefined}
                        pathError={singleProjectPathError || undefined}
                        packageNameValidationError={singleProjectPackageNameError || undefined}
                    />

                    {<AIEnhancementToggle enabled={aiEnhancementEnabled} onChange={setAiEnhancementEnabled} />}

                    <ButtonWrapper>
                        <ActionButtons
                            primaryButton={{
                                text: isValidating ? "Validating..." : (aiEnhancementEnabled ? "Create and Start AI Enhancement" : "Create and Open Project"),
                                onClick: handleCreateSingleProject,
                                disabled: isValidating
                            }}
                            secondaryButton={{
                                text: "Back",
                                onClick: onBack,
                                disabled: false
                            }}
                        />
                    </ButtonWrapper>
                </>
            )}
        </>
    );
}
