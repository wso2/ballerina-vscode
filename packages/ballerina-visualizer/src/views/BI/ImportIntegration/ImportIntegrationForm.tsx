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

import { MigrationTool } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { ActionButtons, Icon, DirectorySelector, Typography } from "@wso2/ui-toolkit";
import { useState } from "react";
import ButtonCard from "../../../components/ButtonCard";
import { DownloadProgress } from "../../../components/DownloadProgress";
import { BodyText, LoadingOverlayContainer } from "../../styles";
import { IntegrationParameters } from "./components/IntegrationParameters";
import {
    ButtonWrapper,
    IntegrationCardGrid,
    PathText,
    StepContainer,
} from "./styles";
import { FinalIntegrationParams, ImportIntegrationFormProps } from "./types";
import { SELECTION_TEXT } from "./utils";

export function ImportIntegrationForm({
    selectedIntegration,
    migrationTools,
    onSelectIntegration,
    pullIntegrationTool,
    setImportParams,
    pullingTool,
    toolPullProgress,
    handleStartImport,
    onBack,
}: ImportIntegrationFormProps) {
    const { rpcClient } = useRpcContext();

    const [importSourcePath, setImportSourcePath] = useState("");
    const [integrationParams, setIntegrationParams] = useState<Record<string, any>>({});
    const [sourcePathError, setSourcePathError] = useState<string | null>(null);
    const [integrationSelectionError, setIntegrationSelectionError] = useState<string | null>(null);

    const handleIntegrationSelection = (integration: MigrationTool) => {
        // Reset state when a new integration is selected
        setImportSourcePath("");
        setSourcePathError(null);
        setIntegrationSelectionError(null);
        onSelectIntegration(integration);
        const defaultParams = integration.parameters.reduce((acc, param) => {
            acc[param.key] = param.defaultValue;
            return acc;
        }, {} as Record<string, any>);
        setIntegrationParams(defaultParams);
    };

    const handleFolderSelection = async () => {
        const result = await rpcClient.getCommonRpcClient().selectFileOrFolderPath();
        if (result?.path) {
            setImportSourcePath(result.path);
            setSourcePathError(null);
        }
    };

    const handleImportIntegration = () => {
        setSourcePathError(null);
        setIntegrationSelectionError(null);

        // Validate required fields
        let hasError = false;

        if (!selectedIntegration) {
            setIntegrationSelectionError("Please select an integration platform");
            hasError = true;
        }

        if (!importSourcePath || importSourcePath.trim().length === 0) {
            setSourcePathError("Please select your project folder");
            hasError = true;
        }

        if (hasError) {
            return;
        }

        // Proceed with import - backend will validate the project structure
        const finalParams: FinalIntegrationParams = {
            importSourcePath,
            type: selectedIntegration!.title,
            parameters: integrationParams,
        };

        setImportParams(finalParams);
        if (selectedIntegration!.needToPull) {
            pullIntegrationTool(selectedIntegration!.commandName, selectedIntegration!.requiredVersion);
        } else {
            handleStartImport(finalParams, selectedIntegration!, toolPullProgress);
        }
    };

    const handleParameterChange = (paramKey: string, value: any) => {
        setIntegrationParams((prev) => ({
            ...prev,
            [paramKey]: value,
        }));
    };

    return (
        <>
            <BodyText>
                This wizard converts an external integration project from MuleSoft or TIBCO into a ready-to-use BI
                project.
            </BodyText>
            <Typography variant="h3" sx={{ marginTop: 20, marginBottom: 8 }}>
                Choose the source platform
            </Typography>
            <BodyText>Select the integration platform that your current project uses:</BodyText>
            {integrationSelectionError && (
                <div style={{ color: "var(--vscode-errorForeground)", marginBottom: 8, fontSize: 12 }}>
                    {integrationSelectionError}
                </div>
            )}
            <IntegrationCardGrid>
                {migrationTools.map((tool) => {
                    return (
                        <ButtonCard
                            key={tool.id}
                            id={`${tool.id}-integration-card`}
                            icon={<Icon name="bi-import" />}
                            title={tool.title}
                            description=""
                            onClick={() => handleIntegrationSelection(tool)}
                            active={selectedIntegration?.id === tool.id}
                        />
                    );
                })}
            </IntegrationCardGrid>

            {selectedIntegration && (
                <StepContainer>
                    <Typography variant="h3" sx={{ marginBottom: 8 }}>Select Your Project Folder</Typography>
                    <BodyText>{selectedIntegration.description}</BodyText>
                    <DirectorySelector
                        id="import-project-folder-selector"
                        placeholder="Enter path or browse to select your project folder..."
                        selectedPath={importSourcePath}
                        onSelect={handleFolderSelection}
                        onChange={(value) => {
                            setImportSourcePath(value);
                            setSourcePathError(null);
                        }}
                        errorMsg={sourcePathError || undefined}
                    />
                </StepContainer>
            )}

            {!selectedIntegration && (
                <PathText>
                    <div style={{ color: "var(--vscode-editor-foreground)" }}>{SELECTION_TEXT}</div>
                </PathText>
            )}

            {selectedIntegration && (
                <IntegrationParameters
                    selectedIntegration={selectedIntegration}
                    integrationParams={integrationParams}
                    onParameterChange={handleParameterChange}
                />
            )}

            <ButtonWrapper>
                <ActionButtons
                    primaryButton={{
                        text: "Start Migration",
                        onClick: handleImportIntegration,
                        disabled: false
                    }}
                    secondaryButton={{
                        text: "Back",
                        onClick: onBack,
                        disabled: false
                    }}
                />
            </ButtonWrapper>

            {pullingTool && (
                <LoadingOverlayContainer>
                    <DownloadProgress
                        message={toolPullProgress?.message || "Pulling integration tool..."}
                        percentage={toolPullProgress?.percentage}
                    />
                </LoadingOverlayContainer>
            )}
        </>
    );
}
