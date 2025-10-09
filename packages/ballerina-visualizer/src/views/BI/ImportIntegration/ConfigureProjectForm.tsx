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

import { ActionButtons, Typography } from "@wso2/ui-toolkit";
import { useState } from "react";
import { BodyText } from "../../styles";
import { ButtonWrapper } from "./styles";
import { ConfigureProjectFormProps } from "./types";
import { ProjectFormFields, ProjectFormData } from "../ProjectForm/ProjectFormFields";
import { isFormValid } from "../ProjectForm/utils";

export function ConfigureProjectForm({ onNext, onBack }: ConfigureProjectFormProps) {
    const [formData, setFormData] = useState<ProjectFormData>({
        integrationName: "",
        packageName: "",
        path: "",
        createDirectory: true,
        createAsWorkspace: false,
        workspaceName: "",
        orgName: "",
        version: "",
    });

    const handleFormDataChange = (data: Partial<ProjectFormData>) => {
        setFormData(prev => ({ ...prev, ...data }));
    };

    const handleCreateProject = () => {
        onNext({
            projectName: formData.integrationName,
            packageName: formData.packageName,
            projectPath: formData.path,
            createDirectory: formData.createDirectory,
            createAsWorkspace: formData.createAsWorkspace,
            workspaceName: formData.workspaceName,
            orgName: formData.orgName || undefined,
            version: formData.version || undefined,
        });
    };

    return (
        <>
            <Typography variant="h2">Configure Your Integration Project</Typography>
            <BodyText>Please provide the necessary details to create your integration project.</BodyText>
            
            <ProjectFormFields
                formData={formData}
                onFormDataChange={handleFormDataChange}
            />

            <ButtonWrapper>
                <ActionButtons
                    primaryButton={{
                        text: "Create and Open Project",
                        onClick: handleCreateProject,
                        disabled: !isFormValid(formData)
                    }}
                    secondaryButton={{
                        text: "Back",
                        onClick: onBack,
                        disabled: false
                    }}
                />
            </ButtonWrapper>
        </>
    );
}
