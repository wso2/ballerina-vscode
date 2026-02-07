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
import { DirectorySelector, TextField, CheckBox, LinkButton, ThemeColors, Codicon } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { sanitizePackageName } from "./utils";

const FieldGroup = styled.div`
    margin-bottom: 20px;
`;

const CheckboxContainer = styled.div`
    margin-top: 8px;
`;

const OptionalConfigRow = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: 8px;
`;

const OptionalConfigButtonContainer = styled.div`
    display: flex;
    flex-direction: row;
    flex-grow: 1;
    justify-content: flex-end;
`;

const OptionalConfigContent = styled.div`
    margin-top: 16px;
`;

const Description = styled.div`
    color: var(--vscode-list-deemphasizedForeground);
    margin-top: 4px;
    text-align: left;
`;

export interface ProjectFormData {
    integrationName: string;
    packageName: string;
    path: string;
    createDirectory: boolean;
    createAsWorkspace: boolean;
    workspaceName: string;
    orgName: string;
    version: string;
}

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
    const [showOptionalConfigurations, setShowOptionalConfigurations] = useState(false);
    const [isWorkspaceSupported, setIsWorkspaceSupported] = useState(false);

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
    };

    const handleProjectDirSelection = async () => {
        const projectDirectory = await rpcClient.getCommonRpcClient().selectFileOrDirPath({});
        onFormDataChange({ path: projectDirectory.path });
    };

    const handleShowOptionalConfigurations = () => {
        rpcClient.getLangClientRpcClient().isSupportedSLVersion({ major: 2201, minor: 13, patch: 0 }).then((res) => {
            if (res) {
                setIsWorkspaceSupported(res);
            }
            setShowOptionalConfigurations(true);
        });
    };

    const handleHideOptionalConfigurations = () => {
        setShowOptionalConfigurations(false);
    };

    useEffect(() => {
        (async () => {
            if (!formData.path) {
                const currentDir = await rpcClient.getCommonRpcClient().getWorkspaceRoot();
                onFormDataChange({ path: currentDir.path });
            }
        })();
    }, []);

    return (
        <>
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
                    errorMsg={packageNameValidationError || ""}
                />
            </FieldGroup>

            <FieldGroup>
                <DirectorySelector
                    id="project-folder-selector"
                    label="Select Path"
                    placeholder="Choose a folder for your project..."
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

            <OptionalConfigRow>
                Optional Configurations
                <OptionalConfigButtonContainer>
                    {!showOptionalConfigurations && (
                        <LinkButton
                            onClick={handleShowOptionalConfigurations}
                            sx={{ fontSize: 12, padding: 8, color: ThemeColors.PRIMARY, gap: 4, userSelect: "none" }}
                        >
                            <Codicon name={"chevron-down"} iconSx={{ fontSize: 12 }} sx={{ height: 12 }} />
                            Expand
                        </LinkButton>
                    )}
                    {showOptionalConfigurations && (
                        <LinkButton
                            onClick={handleHideOptionalConfigurations}
                            sx={{ fontSize: 12, padding: 8, color: ThemeColors.PRIMARY, gap: 4, userSelect: "none" }}
                        >
                            <Codicon name={"chevron-up"} iconSx={{ fontSize: 12 }} sx={{ height: 12 }} />
                            Collapse
                        </LinkButton>
                    )}
                </OptionalConfigButtonContainer>
            </OptionalConfigRow>

            {showOptionalConfigurations && (
                <OptionalConfigContent>
                    {isWorkspaceSupported && (
                        <FieldGroup>
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
                                <TextField
                                    onTextChange={(value) => onFormDataChange({ workspaceName: value })}
                                    value={formData.workspaceName}
                                    label="Workspace Name"
                                    placeholder="Enter workspace name"
                                    required={true}
                                />
                            )}
                        </FieldGroup>
                    )}
                    <FieldGroup>
                        <TextField
                            onTextChange={(value) => onFormDataChange({ orgName: value })}
                            value={formData.orgName}
                            label="Organization Name"
                            description="The organization that owns this Ballerina package."
                        />
                    </FieldGroup>
                    <FieldGroup>
                        <TextField
                            onTextChange={(value) => onFormDataChange({ version: value })}
                            value={formData.version}
                            label="Package Version"
                            placeholder="0.1.0"
                            description="Version of the Ballerina package."
                        />
                    </FieldGroup>
                </OptionalConfigContent>
            )}
        </>
    );
}
