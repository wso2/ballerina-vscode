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
import { LocationSelector, TextField, CheckBox } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import {
    FieldGroup,
    CheckboxContainer,
    Description,
    SectionDivider,
    OptionalSectionsLabel,
} from "./styles";
import { CollapsibleSection, ProjectTypeSelector, PackageInfoSection } from "./components";
import { ProjectFormData } from "./types";
import { sanitizePackageName, validatePackageName, validateOrgName } from "./utils";

// Re-export for backwards compatibility
export type { ProjectFormData } from "./types";

export interface ProjectFormFieldsProps {
    formData: ProjectFormData;
    onFormDataChange: (data: Partial<ProjectFormData>) => void;
    onValidationChange?: (isValid: boolean) => void;
}

export function ProjectFormFields({ formData, onFormDataChange, onValidationChange }: ProjectFormFieldsProps) {
    const { rpcClient } = useRpcContext();
    const [packageNameTouched, setPackageNameTouched] = useState(false);
    const [packageNameError, setPackageNameError] = useState<string | null>(null);
    const [orgNameError, setOrgNameError] = useState<string | null>(null);
    const [isWorkspaceSupported, setIsWorkspaceSupported] = useState(false);
    const [isProjectStructureExpanded, setIsProjectStructureExpanded] = useState(false);
    const [isPackageInfoExpanded, setIsPackageInfoExpanded] = useState(false);

    const handleIntegrationName = (value: string) => {
        onFormDataChange({ integrationName: value });
        // Auto-populate package name if user hasn't manually edited it
        if (!packageNameTouched) {
            onFormDataChange({ packageName: sanitizePackageName(value) });
        }
    };

    const handlePackageName = (value: string) => {
        // Allow dots and other characters while typing
        const sanitized = sanitizePackageName(value);
        onFormDataChange({ packageName: sanitized });
        setPackageNameTouched(value.length > 0);
        // Clear error while typing
        if (packageNameError) {
            setPackageNameError(null);
        }
    };

    const handleProjectDirSelection = async () => {
        const projectDirectory = await rpcClient.getCommonRpcClient().selectFileOrDirPath({});
        onFormDataChange({ path: projectDirectory.path });
    };

    const handleProjectStructureToggle = () => {
        setIsProjectStructureExpanded(!isProjectStructureExpanded);
    };

    useEffect(() => {
        (async () => {
            if (!formData.path) {
                const currentDir = await rpcClient.getCommonRpcClient().getWorkspaceRoot();
                onFormDataChange({ path: currentDir.path });
            }
            const isWorkspaceSupported = await rpcClient
                .getLangClientRpcClient()
                .isSupportedSLVersion({ major: 2201, minor: 13, patch: 0 })
                .catch((err) => {
                    console.error("Failed to check workspace support:", err);
                    return false;
                });
            setIsWorkspaceSupported(isWorkspaceSupported);
        })();
    }, []);

    // Effect to trigger validation when requested by parent
    useEffect(() => {
        const error = validatePackageName(formData.packageName, formData.integrationName);
        setPackageNameError(error);
        onValidationChange?.(error === null);
    }, [formData.packageName, onValidationChange]);

    // Real-time validation for organization name
    useEffect(() => {
        const error = validateOrgName(formData.orgName);
        setOrgNameError(error);
    }, [formData.orgName]);

    return (
        <>
            {/* Primary Fields - Always Visible */}
            <FieldGroup>
                <TextField
                    onTextChange={handleIntegrationName}
                    value={formData.integrationName}
                    label="Integration Name"
                    placeholder="Enter an integration name"
                    autoFocus={true}
                    required={true}
                />
            </FieldGroup>

            <FieldGroup>
                <TextField
                    onTextChange={handlePackageName}
                    value={formData.packageName}
                    label="Package Name"
                    description="This will be used as the Ballerina package name for the integration."
                    errorMsg={packageNameError || ""}
                />
            </FieldGroup>

            <FieldGroup>
                <LocationSelector
                    label="Select Path"
                    selectedFile={formData.path}
                    btnText="Select Path"
                    onSelect={handleProjectDirSelection}
                />

                <CheckboxContainer>
                    <CheckBox
                        label={`Create a new directory using the ${formData.createAsWorkspace ? "workspace name" : "package name"}`}
                        checked={formData.createDirectory}
                        onChange={(checked) => onFormDataChange({ createDirectory: checked })}
                    />
                </CheckboxContainer>
            </FieldGroup>

            <SectionDivider />
            <OptionalSectionsLabel>Optional Configurations</OptionalSectionsLabel>

            {/* Project Structure Section */}
            {isWorkspaceSupported && (
                <CollapsibleSection
                    isExpanded={isProjectStructureExpanded}
                    onToggle={handleProjectStructureToggle}
                    icon="folder"
                    title="Project Structure"
                >
                    <CheckboxContainer>
                        <CheckBox
                            label="Create as workspace"
                            checked={formData.createAsWorkspace}
                            onChange={(checked) => onFormDataChange({ createAsWorkspace: checked })}
                        />
                        <Description>
                            Include this integration in a new workspace for multi-project management.
                        </Description>
                    </CheckboxContainer>
                    {formData.createAsWorkspace && (
                        <>
                            <FieldGroup>
                                <TextField
                                    onTextChange={(value) => onFormDataChange({ workspaceName: value })}
                                    value={formData.workspaceName}
                                    label="Workspace Name"
                                    placeholder="Enter workspace name"
                                    required={true}
                                />
                            </FieldGroup>

                            <ProjectTypeSelector
                                value={formData.isLibrary}
                                onChange={(isLibrary) => onFormDataChange({ isLibrary })}
                                note="This sets the type for your first project. You can add more projects or libraries to this workspace later."
                            />
                        </>
                    )}
                </CollapsibleSection>
            )}

            {/* Package Information Section */}
            <PackageInfoSection
                isExpanded={isPackageInfoExpanded}
                onToggle={() => setIsPackageInfoExpanded(!isPackageInfoExpanded)}
                data={{ orgName: formData.orgName, version: formData.version }}
                onChange={(data) => onFormDataChange(data)}
            />
        </>
    );
}
