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
import { ProjectFormData, ProjectFormFields } from "../ProjectForm/ProjectFormFields";
import { isFormValid } from "../ProjectForm/utils";
import { MultiProjectFormData, MultiProjectFormFields } from "./components/MultiProjectFormFields";
import { ButtonWrapper } from "./styles";
import { ConfigureProjectFormProps } from "./types";

export function ConfigureProjectForm({ isMultiProject, onNext, onBack }: ConfigureProjectFormProps) {
    const [singleProjectData, setSingleProjectData] = useState<ProjectFormData>({
        integrationName: "",
        packageName: "",
        path: "",
        createDirectory: true,
        createAsWorkspace: false,
        workspaceName: "",
        orgName: "",
        version: "",
    });

    const [multiProjectData, setMultiProjectData] = useState<MultiProjectFormData>({
        rootFolderName: "",
        path: "",
        createDirectory: true,
    });

    const handleSingleProjectFormChange = (data: Partial<ProjectFormData>) => {
        setSingleProjectData(prev => ({ ...prev, ...data }));
    };

    const handleMultiProjectFormChange = (data: Partial<MultiProjectFormData>) => {
        setMultiProjectData(prev => ({ ...prev, ...data }));
    };

    const handleCreateSingleProject = () => {
        onNext({
            projectName: singleProjectData.integrationName,
            packageName: singleProjectData.packageName,
            projectPath: singleProjectData.path,
            createDirectory: singleProjectData.createDirectory,
            createAsWorkspace: singleProjectData.createAsWorkspace,
            workspaceName: singleProjectData.workspaceName,
            orgName: singleProjectData.orgName || undefined,
            version: singleProjectData.version || undefined,
        });
    };

    const handleCreateMultiProject = () => {
        onNext({
            projectName: multiProjectData.rootFolderName,
            packageName: multiProjectData.rootFolderName,
            projectPath: multiProjectData.path,
            createDirectory: multiProjectData.createDirectory,
            createAsWorkspace: false,
        });
    };

    return (
        <>
            {isMultiProject ? (
                <>
                    <Typography variant="h2">Configure Multi-Project Import</Typography>
                    <BodyText>Provide the integration name and location for the migrated packages.</BodyText>

                    <MultiProjectFormFields
                        formData={multiProjectData}
                        onFormDataChange={handleMultiProjectFormChange}
                    />

                    <ButtonWrapper>
                        <ActionButtons
                            primaryButton={{
                                text: "Create and Open Project",
                                onClick: handleCreateMultiProject,
                                disabled: !multiProjectData.rootFolderName.trim() || !multiProjectData.path.trim()
                            }}
                            secondaryButton={{
                                text: "Back",
                                onClick: onBack,
                                disabled: false
                            }}
                        />
                    </ButtonWrapper>
                </>
            ) : (
                <>
                    <Typography variant="h2">Configure Your Integration Project</Typography>
                    <BodyText>Please provide the necessary details to create your integration project.</BodyText>

                    <ProjectFormFields
                        formData={singleProjectData}
                        onFormDataChange={handleSingleProjectFormChange}
                    />

                    <ButtonWrapper>
                        <ActionButtons
                            primaryButton={{
                                text: "Create and Open Project",
                                onClick: handleCreateSingleProject,
                                disabled: !isFormValid(singleProjectData)
                            }}
                            secondaryButton={{
                                text: "Back",
                                onClick: onBack,
                                disabled: false
                            }}
                        />
                    </ButtonWrapper>
                </>
            )}
        </>
    );
}
