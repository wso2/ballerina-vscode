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
import { TextField } from "@wso2/ui-toolkit";
import {
    FieldGroup,
    WorkspaceSection,
    SectionDivider,
    OptionalSectionsLabel,
} from "./styles";
import { ProjectTypeSelector, PackageInfoSection } from "./components";
import { AddProjectFormData } from "./types";
import { sanitizePackageName, validatePackageName, validateOrgName } from "./utils";

// Re-export for backwards compatibility
export type { AddProjectFormData } from "./types";

export interface AddProjectFormFieldsProps {
    formData: AddProjectFormData;
    onFormDataChange: (data: Partial<AddProjectFormData>) => void;
    isInWorkspace: boolean; // true if already in a workspace, false if in a package
    packageNameValidationError?: string;
}

export function AddProjectFormFields({ 
    formData, 
    onFormDataChange,
    isInWorkspace,
    packageNameValidationError
}: AddProjectFormFieldsProps) {
    const [packageNameTouched, setPackageNameTouched] = useState(false);
    const [isPackageInfoExpanded, setIsPackageInfoExpanded] = useState(false);
    const [packageNameError, setPackageNameError] = useState<string | null>(null);
    const [orgNameError, setOrgNameError] = useState<string | null>(null);

    const handleIntegrationName = (value: string) => {
        onFormDataChange({ integrationName: value });
        // Auto-populate package name if user hasn't manually edited it
        if (!packageNameTouched) {
            onFormDataChange({ packageName: sanitizePackageName(value) });
        }
    };

    const handlePackageName = (value: string) => {
        const sanitized = sanitizePackageName(value);
        onFormDataChange({ packageName: sanitized });
        setPackageNameTouched(value.length > 0);
        // Clear error while typing
        if (packageNameError) {
            setPackageNameError(null);
        }
    };

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
            {!isInWorkspace && (
                <WorkspaceSection>
                    <TextField
                        onTextChange={(value) => onFormDataChange({ workspaceName: value })}
                        value={formData.workspaceName}
                        label="Workspace Name"
                        placeholder="Enter workspace name"
                        autoFocus={true}
                        required={true}
                    />
                </WorkspaceSection>
            )}

            <FieldGroup>
                <TextField
                    onTextChange={handleIntegrationName}
                    value={formData.integrationName}
                    label="Integration Name"
                    placeholder="Enter an integration name"
                    autoFocus={isInWorkspace}
                    required={true}
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

            <ProjectTypeSelector
                value={formData.isLibrary}
                onChange={(isLibrary) => onFormDataChange({ isLibrary })}
            />

            <SectionDivider />
            <OptionalSectionsLabel>Optional Configurations</OptionalSectionsLabel>

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
