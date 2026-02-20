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
import { LocationSelector, TextField, CheckBox, DirectorySelector } from "@wso2/ui-toolkit";
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
    integrationNameError?: string;
    pathError?: string;
    packageNameValidationError?: string;
}

export function ProjectFormFields({ formData, onFormDataChange, integrationNameError, pathError, packageNameValidationError }: ProjectFormFieldsProps) {
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

    const projectTypeNote = formData.createAsWorkspace
        ? "This sets the type for your first project. You can add more projects or libraries to this workspace later."
        : undefined;

    useEffect(() => {
        (async () => {
            const commonRpcClient = rpcClient.getCommonRpcClient();

            // Set default path if not already set
            if (!formData.path) {
                const currentDir = await commonRpcClient.getWorkspaceRoot();
                onFormDataChange({ path: currentDir.path });
            }

            // Set default org name if not already set
            if (!formData.orgName) {
                try {
                    const { orgName } = await commonRpcClient.getDefaultOrgName();
                    onFormDataChange({ orgName });
                } catch (error) {
                    console.error("Failed to fetch default org name:", error);
                }
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

    useEffect(() => {
        const error = validatePackageName(formData.packageName, formData.integrationName);
        setPackageNameError(error);
    }, [formData.packageName, formData.integrationName]);

    // Validation effect for org name
    useEffect(() => {
        const orgError = validateOrgName(formData.orgName);
        setOrgNameError(orgError);
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
                    errorMsg={integrationNameError || ""}
                />
            </FieldGroup>

            <FieldGroup>
                <TextField
                    onTextChange={handlePackageName}
                    value={formData.packageName}
                    label="Package Name"
                    description="This will be used as the Ballerina package name for the integration."
                    errorMsg={packageNameValidationError || packageNameError || ""}
                />
            </FieldGroup>

            <FieldGroup>
                <DirectorySelector
                    id="project-folder-selector"
                    label="Select Path"
                    placeholder="Enter path or browse to select a folder..."
                    selectedPath={formData.path}
                    required={true}
                    onSelect={handleProjectDirSelection}
                    onChange={(value) => onFormDataChange({ path: value })}
                    errorMsg={pathError || undefined}
                />

                <CheckboxContainer>
                    <CheckBox
                        label={`Create a new folder using the ${formData.createAsWorkspace ? "workspace name" : "package name"}`}
                        checked={formData.createDirectory}
                        onChange={(checked) => onFormDataChange({ createDirectory: checked })}
                    />
                </CheckboxContainer>
            </FieldGroup>

            <FieldGroup>
                <ProjectTypeSelector
                    value={formData.isLibrary}
                    onChange={(isLibrary) => onFormDataChange({ isLibrary })}
                    note={projectTypeNote}
                />
            </FieldGroup>

            <SectionDivider />
            <OptionalSectionsLabel>Optional Configurations</OptionalSectionsLabel>

            {/* Workspace Section */}
            {isWorkspaceSupported && (
                <CollapsibleSection
                    isExpanded={isProjectStructureExpanded}
                    onToggle={handleProjectStructureToggle}
                    icon="folder"
                    title="Workspace"
                >
                    <CheckboxContainer>
                        <CheckBox
                            label="Create as workspace"
                            checked={formData.createAsWorkspace}
                            onChange={(checked) => onFormDataChange({ createAsWorkspace: checked })}
                        />
                        <Description>
                            Enable Workspace mode to manage multiple integrations within a single repository with shared dependencies.
                        </Description>
                    </CheckboxContainer>
                    {formData.createAsWorkspace && (
                        <FieldGroup>
                            <TextField
                                onTextChange={(value) => onFormDataChange({ workspaceName: value })}
                                value={formData.workspaceName}
                                label="Workspace Name"
                                placeholder="Enter workspace name"
                                required={true}
                            />
                        </FieldGroup>
                    )}
                </CollapsibleSection>
            )}

            {/* Package Information Section */}
            <PackageInfoSection
                isExpanded={isPackageInfoExpanded}
                onToggle={() => setIsPackageInfoExpanded(!isPackageInfoExpanded)}
                data={{ orgName: formData.orgName, version: formData.version }}
                onChange={(data) => onFormDataChange(data)}
                orgNameError={orgNameError}
            />
        </>
    );
}
