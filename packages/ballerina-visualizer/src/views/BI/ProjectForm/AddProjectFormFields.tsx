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

import { useEffect, useState, useRef } from "react";
import { TextField } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { usePlatformExtContext } from "../../../providers/platform-ext-ctx-provider";
import {
    FieldGroup,
    ProjectSection,
    SectionDivider,
} from "./styles";
import { ProjectTypeSelector, PackageInfoSection } from "./components";
import { AddProjectFormData } from "./types";
import {
    sanitizePackageName,
    sanitizeProjectHandle,
    validatePackageName,
    validateOrgName,
    validateProjectHandle
} from "./utils";

// Re-export for backwards compatibility
export type { AddProjectFormData } from "./types";

export interface AddProjectFormFieldsProps {
    formData: AddProjectFormData;
    onFormDataChange: (data: Partial<AddProjectFormData>) => void;
    isInProject: boolean;
    packageNameValidationError?: string;
    projectNameValidationError?: string;
    projectHandlePathError?: string;
}

export function AddProjectFormFields({
    formData,
    onFormDataChange,
    isInProject,
    packageNameValidationError,
    projectNameValidationError,
    projectHandlePathError,
}: AddProjectFormFieldsProps) {
    const { rpcClient } = useRpcContext();
    const { platformExtState } = usePlatformExtContext();
    const organizations = platformExtState?.userInfo?.organizations ?? [];
    const isLoggedIn = !!platformExtState?.userInfo;
    const [packageNameTouched, setPackageNameTouched] = useState(false);
    const [projectHandleTouched, setProjectHandleTouched] = useState(false);
    const [isPackageInfoExpanded, setIsPackageInfoExpanded] = useState(false);
    const [packageNameError, setPackageNameError] = useState<string | null>(null);
    const [orgNameError, setOrgNameError] = useState<string | null>(null);
    const [projectHandleError, setProjectHandleError] = useState<string | null>(null);
    const resourceTypeLabel = formData.isLibrary ? "Library" : "Integration";
    const resourceTypeLabelLower = resourceTypeLabel.toLowerCase();

    const handleProjectName = (value: string) => {
        const updates: Partial<AddProjectFormData> = { workspaceName: value };
        if (!projectHandleTouched) {
            updates.projectHandle = sanitizeProjectHandle(value, { trimTrailing: false });
        }
        onFormDataChange(updates);
    };

    const handleIntegrationName = (value: string) => {
        onFormDataChange({ integrationName: value });
        // Auto-populate package name if user hasn't manually edited it
        if (!packageNameTouched) {
            onFormDataChange({ packageName: sanitizePackageName(value) });
        }
    };

    const orgNameRef = useRef(formData.orgName);
    orgNameRef.current = formData.orgName;

    useEffect(() => {
        let isMounted = true;

        if (organizations.length > 0 && !orgNameRef.current) {
            onFormDataChange({ orgName: organizations[0].handle });
        } else if (organizations.length === 0 && !orgNameRef.current) {
            (async () => {
                try {
                    const { orgName } = await rpcClient.getCommonRpcClient().getDefaultOrgName();
                    if (isMounted) {
                        onFormDataChange({ orgName });
                    }
                } catch (error) {
                    console.error("Failed to fetch default org name:", error);
                }
            })();
        }

        return () => {
            isMounted = false;
        };
    }, [organizations, onFormDataChange, rpcClient]);

    // Effect to trigger validation when requested by parent
    useEffect(() => {
        const error = validatePackageName(formData.packageName, formData.integrationName);
        setPackageNameError(error);
    }, [formData.packageName]);

    // Real-time validation for organization name
    useEffect(() => {
        const error = validateOrgName(formData.orgName);
        setOrgNameError(error);
    }, [formData.orgName]);

    // Real-time validation for project handle
    useEffect(() => {
        if (formData.projectHandle !== undefined) {
            setProjectHandleError(validateProjectHandle(formData.projectHandle));
        }
    }, [formData.projectHandle]);

    const hasAdvancedConfigError = !!(
        projectHandlePathError ||
        projectHandleError ||
        packageNameError ||
        packageNameValidationError ||
        orgNameError
    );

    // Auto-expand Advanced Configurations when any field inside it has an error
    useEffect(() => {
        if (hasAdvancedConfigError) {
            setIsPackageInfoExpanded(true);
        }
    }, [hasAdvancedConfigError]);

    return (
        <>
            {!isInProject && (
                <ProjectSection>
                    <TextField
                        onTextChange={handleProjectName}
                        value={formData.workspaceName}
                        label="Project Name"
                        placeholder="Enter project name"
                        autoFocus={true}
                        required={true}
                        errorMsg={projectNameValidationError || ""}
                    />
                </ProjectSection>
            )}

            <ProjectTypeSelector
                value={formData.isLibrary}
                onChange={(isLibrary) => onFormDataChange({ isLibrary })}
            />

            <FieldGroup>
                <TextField
                    onTextChange={handleIntegrationName}
                    value={formData.integrationName}
                    label={`${resourceTypeLabel} Name`}
                    placeholder={`Enter a ${resourceTypeLabelLower} name`}
                    autoFocus={isInProject}
                    onFocus={(e) => (e.target as HTMLInputElement).select()}
                    required={true}
                />
            </FieldGroup>

            <SectionDivider />

            <PackageInfoSection
                isExpanded={isPackageInfoExpanded}
                onToggle={() => setIsPackageInfoExpanded(!isPackageInfoExpanded)}
                data={{
                    packageName: formData.packageName,
                    orgName: formData.orgName,
                    version: formData.version,
                    projectHandle: !isInProject ? formData.projectHandle : undefined
                }}
                onChange={(data) => {
                    onFormDataChange(data);
                    if (data.packageName !== undefined) {
                        setPackageNameTouched(true);
                    }
                    if (data.projectHandle !== undefined) {
                        setProjectHandleTouched(true);
                    }
                }}
                isLibrary={formData.isLibrary}
                packageNameError={packageNameValidationError || packageNameError}
                orgNameError={orgNameError}
                projectHandleError={projectHandlePathError || projectHandleError}
                organizations={organizations}
                hasError={hasAdvancedConfigError}
            />
        </>
    );
}
