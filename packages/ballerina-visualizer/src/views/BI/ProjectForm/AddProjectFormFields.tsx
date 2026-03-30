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
import { sanitizePackageName, validatePackageName, validateOrgName } from "./utils";

// Re-export for backwards compatibility
export type { AddProjectFormData } from "./types";

export interface AddProjectFormFieldsProps {
    formData: AddProjectFormData;
    onFormDataChange: (data: Partial<AddProjectFormData>) => void;
    isInProject: boolean;
    packageNameValidationError?: string;
    projectNameValidationError?: string;
}

export function AddProjectFormFields({ 
    formData, 
    onFormDataChange,
    isInProject,
    packageNameValidationError,
    projectNameValidationError
}: AddProjectFormFieldsProps) {
    const { rpcClient } = useRpcContext();
    const { platformExtState } = usePlatformExtContext();
    const organizations = platformExtState?.userInfo?.organizations ?? [];
    const [packageNameTouched, setPackageNameTouched] = useState(false);
    const [isPackageInfoExpanded, setIsPackageInfoExpanded] = useState(false);
    const [packageNameError, setPackageNameError] = useState<string | null>(null);
    const [orgNameError, setOrgNameError] = useState<string | null>(null);
    const resourceTypeLabel = formData.isLibrary ? "Library" : "Integration";
    const resourceTypeLabelLower = resourceTypeLabel.toLowerCase();

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

    return (
        <>
            {!isInProject && (
                <ProjectSection>
                    <TextField
                        onTextChange={(value) => onFormDataChange({ workspaceName: value })}
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
                    required={true}
                />
            </FieldGroup>

            <SectionDivider />

            <PackageInfoSection
                isExpanded={isPackageInfoExpanded}
                onToggle={() => setIsPackageInfoExpanded(!isPackageInfoExpanded)}
                data={{ packageName: formData.packageName, orgName: formData.orgName, version: formData.version }}
                onChange={(data) => {
                    onFormDataChange(data);
                    if (data.packageName !== undefined) {
                        setPackageNameTouched(true);
                    }
                }}
                isLibrary={formData.isLibrary}
                packageNameError={packageNameValidationError || packageNameError}
                orgNameError={orgNameError}
                organizations={organizations}
            />
        </>
    );
}
