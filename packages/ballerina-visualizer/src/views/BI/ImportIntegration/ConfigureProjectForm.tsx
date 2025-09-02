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

import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { ActionButtons, LocationSelector, TextField, Tooltip, Typography } from "@wso2/ui-toolkit";
import { useEffect, useState } from "react";
import { BodyText } from "../../styles";
import {
    ButtonWrapper,
    InputPreviewWrapper,
    PreviewContainer,
    PreviewIcon,
    PreviewText,
    StepContainer
} from "./styles";
import { ConfigureProjectFormProps } from "./types";
import { sanitizeProjectName } from "./utils";

export function ConfigureProjectForm({ onNext, onBack }: ConfigureProjectFormProps) {
    const { rpcClient } = useRpcContext();
    const [name, setName] = useState("");
    const [path, setPath] = useState("");

    const isPathValid = path.length > 2;
    const isCreateProjectDisabled = !isPathValid || name.length < 2;

    const handleProjectDirSelection = async () => {
        const result = await rpcClient.getCommonRpcClient().selectFileOrDirPath({});
        if (result?.path) {
            setPath(result.path);
        }
    };

    useEffect(() => {
        (async () => {
            const currentDir = await rpcClient.getCommonRpcClient().getWorkspaceRoot();
            setPath(currentDir.path);
        })();
    }, []);

    return (
        <>
            <Typography variant="h2">Configure Your Integration Project</Typography>
            <BodyText>Please provide the necessary details to create your integration project.</BodyText>
            <InputPreviewWrapper>
                <TextField
                    onTextChange={setName}
                    value={name}
                    label="Integration Name"
                    placeholder="Enter an integration name"
                    autoFocus={true}
                />
                <PreviewContainer>
                    <PreviewIcon
                        name="project"
                        iconSx={{ fontSize: 14, color: "var(--vscode-descriptionForeground)" }}
                    />
                    <Tooltip content="A unique identifier for your integration">
                        <PreviewText variant="caption">
                            {name ? sanitizeProjectName(name) : "integration_id"}
                        </PreviewText>
                    </Tooltip>
                </PreviewContainer>
            </InputPreviewWrapper>
            <StepContainer>
                <Typography variant="body3">Project Location</Typography>
                <BodyText style={{ marginTop: "8px" }}>Select where to create the project.</BodyText>
                <LocationSelector
                    label=""
                    selectedFile={path}
                    onSelect={handleProjectDirSelection}
                    btnText="Select Path"
                />
            </StepContainer>
            <ButtonWrapper>
                <ActionButtons
                    primaryButton={{
                        text: "Create and Open Project",
                        onClick: () => onNext(name, path),
                        disabled: isCreateProjectDisabled
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
