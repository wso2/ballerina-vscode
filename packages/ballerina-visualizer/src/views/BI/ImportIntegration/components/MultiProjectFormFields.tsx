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

import { useEffect } from "react";
import { LocationSelector, TextField, CheckBox } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";

const FieldGroup = styled.div`
    margin-bottom: 20px;
`;

const CheckboxContainer = styled.div`
    margin: 16px 0;
`;

const Description = styled.div`
    color: var(--vscode-list-deemphasizedForeground);
    margin-top: 4px;
    text-align: left;
`;

export interface MultiProjectFormData {
    rootFolderName: string;
    path: string;
    createDirectory: boolean;
}

export interface MultiProjectFormFieldsProps {
    formData: MultiProjectFormData;
    onFormDataChange: (data: Partial<MultiProjectFormData>) => void;
}

export function MultiProjectFormFields({ formData, onFormDataChange }: MultiProjectFormFieldsProps) {
    const { rpcClient } = useRpcContext();

    const handleIntegrationName = (value: string) => {
        onFormDataChange({ rootFolderName: value });
    };

    const handleProjectDirSelection = async () => {
        const projectDirectory = await rpcClient.getCommonRpcClient().selectFileOrDirPath({});
        onFormDataChange({ path: projectDirectory.path });
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
                    value={formData.rootFolderName}
                    label="Integration Name"
                    placeholder="Enter an integration name"
                    autoFocus={true}
                    required={true}
                />
                <Description>
                    This will be the parent folder containing all migrated packages from this integration.
                </Description>
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
                        label={`Create a new directory using the root folder name`}
                        checked={formData.createDirectory}
                        onChange={(checked) => onFormDataChange({ createDirectory: checked })}
                    />
                </CheckboxContainer>
            </FieldGroup>
        </>
    );
}
