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
import { LocationSelector, TextField, CheckBox, Codicon } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { sanitizePackageName, validatePackageName } from "./utils";

const FieldGroup = styled.div`
    margin-bottom: 20px;
`;

const CheckboxContainer = styled.div`
    margin: 12px 0;
`;

const Description = styled.div`
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    margin-top: 4px;
    text-align: left;
`;

// Collapsible Section Styles
const CollapsibleSection = styled.div<{ isExpanded: boolean }>`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    margin-bottom: 12px;
    overflow: hidden;
    transition: border-color 0.2s ease;

    &:hover {
        border-color: var(--vscode-focusBorder);
    }
`;

const CollapsibleHeader = styled.div<{ isExpanded: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    cursor: pointer;
    user-select: none;
    background-color: ${(props: { isExpanded: boolean }) => props.isExpanded 
        ? 'var(--vscode-sideBar-background)' 
        : 'transparent'};
    transition: background-color 0.2s ease;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
`;

const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const HeaderTitle = styled.span`
    font-size: 13px;
    font-weight: 500;
    color: var(--vscode-foreground);
`;

const HeaderSubtitle = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-left: 4px;
`;

const ChevronIcon = styled.div<{ isExpanded: boolean }>`
    display: flex;
    align-items: center;
    transition: transform 0.2s ease;
    transform: ${(props: { isExpanded: boolean }) => props.isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};
    color: var(--vscode-descriptionForeground);
`;

const CollapsibleContent = styled.div<{ isExpanded: boolean }>`
    max-height: ${(props: { isExpanded: boolean }) => props.isExpanded ? '500px' : '0'};
    opacity: ${(props: { isExpanded: boolean }) => props.isExpanded ? 1 : 0};
    overflow: hidden;
    transition: max-height 0.3s ease, opacity 0.2s ease;
    padding: ${(props: { isExpanded: boolean }) => props.isExpanded ? '16px' : '0 16px'};
    border-top: ${(props: { isExpanded: boolean }) => props.isExpanded ? '1px solid var(--vscode-panel-border)' : 'none'};
`;

const SectionDivider = styled.div`
    height: 1px;
    background: var(--vscode-panel-border);
    margin: 24px 0 20px 0;
`;

const OptionalSectionsLabel = styled.div`
    font-size: 11px;
    letter-spacing: 0.5px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 12px;
`;

// Radio Button Styles for Project Type
const ProjectTypeContainer = styled.div`
    margin-top: 16px;
    margin-bottom: 8px;
`;

const ProjectTypeLabel = styled.div`
    font-size: 13px;
    font-weight: 500;
    color: var(--vscode-foreground);
    margin-bottom: 12px;
`;

const RadioGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const RadioOption = styled.label<{ isSelected: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    border-radius: 6px;
    cursor: pointer;
    border: 1px solid ${(props: { isSelected: boolean }) => 
        props.isSelected ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)'};
    background-color: ${(props: { isSelected: boolean }) => 
        props.isSelected ? 'var(--vscode-list-hoverBackground)' : 'transparent'};
    transition: all 0.15s ease;

    &:hover {
        border-color: var(--vscode-focusBorder);
        background-color: var(--vscode-list-hoverBackground);
    }
`;

const RadioInput = styled.input`
    appearance: none;
    width: 16px;
    height: 16px;
    border: 1px solid var(--vscode-checkbox-border);
    border-radius: 50%;
    background: var(--vscode-checkbox-background);
    cursor: pointer;
    margin-top: 2px;
    flex-shrink: 0;
    position: relative;

    &:checked {
        border-color: var(--vscode-focusBorder);
        background: var(--vscode-focusBorder);
    }

    &:checked::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--vscode-checkbox-background);
    }
`;

const RadioContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const RadioTitle = styled.span`
    font-size: 13px;
    color: var(--vscode-foreground);
`;

const RadioDescription = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.4;
`;

const ProjectTypeNote = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-top: 12px;
    padding: 8px 10px;
    background-color: var(--vscode-textBlockQuote-background);
    border-left: 3px solid var(--vscode-textBlockQuote-border);
    border-radius: 0 4px 4px 0;
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
    isLibrary: boolean;
}

export interface ProjectFormFieldsProps {
    formData: ProjectFormData;
    onFormDataChange: (data: Partial<ProjectFormData>) => void;
    onValidationChange?: (isValid: boolean) => void;
}

export function ProjectFormFields({ formData, onFormDataChange, onValidationChange }: ProjectFormFieldsProps) {
    const { rpcClient } = useRpcContext();
    const [packageNameTouched, setPackageNameTouched] = useState(false);
    const [packageNameError, setPackageNameError] = useState<string | null>(null);
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
        if (!isProjectStructureExpanded) {
            // Check workspace support when expanding
            rpcClient.getLangClientRpcClient().isSupportedSLVersion({ major: 2201, minor: 13, patch: 0 }).then((res) => {
                if (res) {
                    setIsWorkspaceSupported(res);
                }
            });
        }
        setIsProjectStructureExpanded(!isProjectStructureExpanded);
    };

    useEffect(() => {
        (async () => {
            if (!formData.path) {
                const currentDir = await rpcClient.getCommonRpcClient().getWorkspaceRoot();
                onFormDataChange({ path: currentDir.path });
            }
        })();
    }, []);

    // Effect to trigger validation when requested by parent
    useEffect(() => {
        const error = validatePackageName(formData.packageName, formData.integrationName);
        setPackageNameError(error);
        onValidationChange?.(error === null);
    }, [formData.packageName, onValidationChange]);

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
            <CollapsibleSection isExpanded={isProjectStructureExpanded}>
                <CollapsibleHeader 
                    isExpanded={isProjectStructureExpanded}
                    onClick={handleProjectStructureToggle}
                >
                    <HeaderLeft>
                        <Codicon name="folder" iconSx={{ fontSize: 14 }} />
                        <HeaderTitle> Project Structure </HeaderTitle>
                    </HeaderLeft>
                    <ChevronIcon isExpanded={isProjectStructureExpanded}>
                        <Codicon name="chevron-down" iconSx={{ fontSize: 14 }} />
                    </ChevronIcon>
                </CollapsibleHeader>

                <CollapsibleContent isExpanded={isProjectStructureExpanded}>
                    {isWorkspaceSupported && (
                        <>
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

                                    <ProjectTypeContainer>
                                        <ProjectTypeLabel>Project Type</ProjectTypeLabel>
                                        <RadioGroup>
                                            <RadioOption isSelected={formData.isLibrary === false}>
                                                <RadioInput
                                                    type="radio"
                                                    name="projectType"
                                                    value="integration"
                                                    checked={formData.isLibrary === false}
                                                    onChange={() => onFormDataChange({ isLibrary: false })}
                                                />
                                                <RadioContent>
                                                    <RadioTitle>Standard Integration (Default)</RadioTitle>
                                                    <RadioDescription>
                                                        A deployable project that can be built, tested, and deployed as an integration.
                                                    </RadioDescription>
                                                </RadioContent>
                                            </RadioOption>

                                            <RadioOption isSelected={formData.isLibrary === true}>
                                                <RadioInput
                                                    type="radio"
                                                    name="projectType"
                                                    value="library"
                                                    checked={formData.isLibrary === true}
                                                    onChange={() => onFormDataChange({ isLibrary: true })}
                                                />
                                                <RadioContent>
                                                    <RadioTitle>Library Project</RadioTitle>
                                                    <RadioDescription>
                                                        Shared logic and utilities that can be reused across multiple projects in the workspace.
                                                    </RadioDescription>
                                                </RadioContent>
                                            </RadioOption>
                                        </RadioGroup>

                                        <ProjectTypeNote>
                                            This sets the type for your first project. You can add more projects or libraries to this workspace later.
                                        </ProjectTypeNote>
                                    </ProjectTypeContainer>
                                </>
                            )}
                        </>
                    )}
                </CollapsibleContent>
            </CollapsibleSection>

            {/* Package Information Section */}
            <CollapsibleSection isExpanded={isPackageInfoExpanded}>
                <CollapsibleHeader 
                    isExpanded={isPackageInfoExpanded}
                    onClick={() => setIsPackageInfoExpanded(!isPackageInfoExpanded)}
                >
                    <HeaderLeft>
                        <Codicon name="package" iconSx={{ fontSize: 14 }} />
                        <HeaderTitle>
                            Package Information
                            {!isPackageInfoExpanded && formData.orgName && (
                                <HeaderSubtitle>— {formData.orgName}</HeaderSubtitle>
                            )}
                        </HeaderTitle>
                    </HeaderLeft>
                    <ChevronIcon isExpanded={isPackageInfoExpanded}>
                        <Codicon name="chevron-down" iconSx={{ fontSize: 14 }} />
                    </ChevronIcon>
                </CollapsibleHeader>

                <CollapsibleContent isExpanded={isPackageInfoExpanded}>
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
                </CollapsibleContent>
            </CollapsibleSection>
        </>
    );
}
