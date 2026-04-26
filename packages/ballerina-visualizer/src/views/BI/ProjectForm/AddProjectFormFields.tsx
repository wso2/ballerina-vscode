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

import { useEffect, useRef, useState } from "react";
import { TextField } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { usePlatformExtContext } from "../../../providers/platform-ext-ctx-provider";
import {
    FieldGroup,
    ProjectSection,
    SectionDivider,
} from "./styles";
import { ProjectTypeSelector, AdvancedConfigurationSection } from "./components";
import { AddProjectFormData } from "./types";
import {
    sanitizePackageName,
    sanitizeProjectHandle,
    validateComponentName,
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
    const isLoggedIn = !!platformExtState?.isLoggedIn;
    const organizations = isLoggedIn ? (platformExtState?.userInfo?.organizations ?? []) : undefined;
    const [packageNameTouched, setPackageNameTouched] = useState(false);
    const [projectHandleTouched, setProjectHandleTouched] = useState(false);
    const isOrgTouched = useRef(false);
    const [isPackageInfoExpanded, setIsPackageInfoExpanded] = useState(false);
    const [integrationNameError, setIntegrationNameError] = useState<string | null>(null);
    const [packageNameError, setPackageNameError] = useState<string | null>(null);
    const [projectHandleError, setProjectHandleError] = useState<string | null>(null);
    const [isOrgLocked, setIsOrgLocked] = useState(false);
    const [isOrgDataLoaded, setIsOrgDataLoaded] = useState(false);
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

    const rpcClientRef = useRef(rpcClient);
    rpcClientRef.current = rpcClient;

    useEffect(() => {
        if (isOrgTouched.current) return;

        const controller = new AbortController();

        (async () => {
            try {
                const { orgName: rpcOrg, isLocked } = await rpcClientRef.current.getCommonRpcClient().getDefaultOrgName();
                if (controller.signal.aborted) return;

                if (isInProject && isLocked) {
                    // Org is derived from context.yaml or an existing package — lock the field.
                    setIsOrgLocked(true);
                    setIsOrgDataLoaded(true);
                    onFormDataChange({ orgName: rpcOrg });
                    return;
                }

                setIsOrgLocked(false);
                setIsOrgDataLoaded(true);

                if (isInProject) {
                    // No context.yaml and no existing packages — let the user pick/type.
                    const contextMatch = organizations?.find((o) => o.handle === rpcOrg);
                    if (contextMatch) {
                        onFormDataChange({ orgName: contextMatch.handle });
                    } else if (organizations && organizations.length > 0) {
                        onFormDataChange({ orgName: organizations[0].handle });
                    } else {
                        onFormDataChange({ orgName: rpcOrg });
                    }
                    return;
                }

                // Not in project: prefer context.yaml match → first org → username fallback.
                const contextMatch = organizations?.find((o) => o.handle === rpcOrg);
                if (contextMatch) {
                    onFormDataChange({ orgName: contextMatch.handle });
                } else if (organizations && organizations.length > 0) {
                    onFormDataChange({ orgName: organizations[0].handle });
                } else {
                    onFormDataChange({ orgName: rpcOrg });
                }
            } catch (error) {
                if (controller.signal.aborted) return;

                console.error("Failed to fetch default org name:", error);
                setIsOrgLocked(false);
                setIsOrgDataLoaded(true);

                if (organizations && organizations.length > 0) {
                    onFormDataChange({ orgName: organizations[0].handle });
                }
            }
        })();

        return () => {
            controller.abort();
        };
    }, [isInProject, organizations, onFormDataChange]);

    // Real-time validation for integration/library name
    useEffect(() => {
        const error = validateComponentName(formData.integrationName, formData.isLibrary);
        setIntegrationNameError(error);
    }, [formData.integrationName, formData.isLibrary]);

    // Effect to trigger validation when requested by parent
    useEffect(() => {
        const error = validatePackageName(formData.packageName, formData.integrationName);
        setPackageNameError(error);
    }, [formData.packageName]);

    // Real-time validation for project handle
    useEffect(() => {
        if (formData.projectHandle !== undefined) {
            setProjectHandleError(validateProjectHandle(formData.projectHandle));
        }
    }, [formData.projectHandle]);

    // Computed inline — avoids a one-render lag from a useState/useEffect pair which would
    // cause hasAdvancedConfigError to briefly read a stale error while orgName is updating.
    const orgNameError = (!isOrgLocked && isOrgDataLoaded) ? validateOrgName(formData.orgName) : null;

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
                    errorMsg={integrationNameError || ""}
                />
            </FieldGroup>

            <SectionDivider />

            <AdvancedConfigurationSection
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
                    if (data.orgName !== undefined) {
                        isOrgTouched.current = true;
                    }
                }}
                isLibrary={formData.isLibrary}
                packageNameError={packageNameValidationError || packageNameError}
                orgNameError={orgNameError || undefined}
                projectHandleError={projectHandlePathError || projectHandleError}
                organizations={organizations}
                hasError={hasAdvancedConfigError}
                isOrgLocked={isOrgLocked}
            />
        </>
    );
}
