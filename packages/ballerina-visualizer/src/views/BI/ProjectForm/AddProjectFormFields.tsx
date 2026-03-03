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
    ProjectSection,
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

            <FieldGroup>
                <TextField
                    onTextChange={handlePackageName}
                    value={formData.packageName}
                    label="Package Name"
                    description={`This will be used as the Ballerina package name for the ${resourceTypeLabelLower}.`}
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
