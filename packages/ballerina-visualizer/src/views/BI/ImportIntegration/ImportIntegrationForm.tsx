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
import { Button, Icon, Typography } from "@wso2/ui-toolkit";
import { useState } from "react";
import ButtonCard from "../../../components/ButtonCard";
import { LoadingRing } from "../../../components/Loader";
import { BodyText, LoadingOverlayContainer } from "../../styles";
import { IntegrationParameters } from "./components/IntegrationParameters";
import {
    ButtonWrapper,
    FolderPathText,
    FolderSelectionContainer,
    IntegrationCardGrid,
    PathText,
    SelectedFolderContainer,
    SelectedFolderDisplay,
    StepContainer,
} from "./styles";
import { FinalIntegrationParams, ImportIntegrationFormProps } from "./types";
import { getImportTooltip, SELECTION_TEXT } from "./utils";

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
    const [folderSelectionStarted, setFolderSelectionStarted] = useState(false);

    const isImportDisabled = importSourcePath.length < 2 || !selectedIntegration;

    const handleIntegrationSelection = (integration: MigrationTool) => {
        // Reset state when a new integration is selected
        setImportSourcePath("");
        setFolderSelectionStarted(false);
        onSelectIntegration(integration);
        const defaultParams = integration.parameters.reduce((acc, param) => {
            acc[param.key] = param.defaultValue;
            return acc;
        }, {} as Record<string, any>);
        setIntegrationParams(defaultParams);
    };

    const handleFolderSelection = async () => {
        if (!selectedIntegration) return;

        setFolderSelectionStarted(true);
        const importSource = await rpcClient.getCommonRpcClient().selectFileOrFolderPath();
        setImportSourcePath(importSource.path);
        if (importSource.path === "") {
            setFolderSelectionStarted(false);
        }
    };

    const handleImportIntegration = () => {
        if (!selectedIntegration || !importSourcePath) return;

        const finalParams: FinalIntegrationParams = {
            importSourcePath,
            type: selectedIntegration.title,
            ...integrationParams,
        };

        setImportParams(finalParams);
        if (selectedIntegration.needToPull) {
            pullIntegrationTool(selectedIntegration.commandName);
        } else {
            handleStartImport(finalParams, selectedIntegration, toolPullProgress);
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
            <Typography variant="h2">Import and Migrate an External Integration</Typography>
            <BodyText>
                This wizard converts an external integration project from MuleSoft or TIBCO into a ready-to-use BI
                project.
            </BodyText>
            <Typography variant="h3" sx={{ marginTop: 20 }}>
                Step 1: Choose the source platform
            </Typography>
            <BodyText>Select the integration platform that your current project uses:</BodyText>
            <IntegrationCardGrid>
                {migrationTools.map((tool) => {
                    return (
                        <ButtonCard
                            key={tool.id}
                            id={`${tool.id}-integration-card`}
                            icon={<Icon name="bi-globe" />}
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
                    <Typography variant="h3">Step 2: Select Your Project Folder</Typography>
                    <BodyText>{selectedIntegration.description}</BodyText>
                    {!importSourcePath ? (
                        <FolderSelectionContainer>
                            <Button
                                onClick={handleFolderSelection}
                                appearance="secondary"
                                disabled={folderSelectionStarted}
                            >
                                {folderSelectionStarted ? "Selecting..." : "Select Project"}
                            </Button>
                        </FolderSelectionContainer>
                    ) : (
                        <SelectedFolderContainer>
                            <SelectedFolderDisplay>
                                <FolderPathText>{importSourcePath}</FolderPathText>
                                <Button
                                    onClick={handleFolderSelection}
                                    appearance="secondary"
                                    sx={{ marginLeft: "12px" }}
                                >
                                    Change
                                </Button>
                            </SelectedFolderDisplay>
                        </SelectedFolderContainer>
                    )}
                </StepContainer>
            )}

            {!selectedIntegration && (
                <PathText>
                    <div style={{ color: "var(--vscode-editor-foreground)" }}>{SELECTION_TEXT}</div>
                </PathText>
            )}

            {importSourcePath.length >= 2 && selectedIntegration && (
                <IntegrationParameters
                    selectedIntegration={selectedIntegration}
                    integrationParams={integrationParams}
                    onParameterChange={handleParameterChange}
                />
            )}

            <ButtonWrapper>
                <Button onClick={onBack} appearance="secondary" sx={{ marginRight: "12px" }}>
                    Back
                </Button>
                <Button
                    disabled={isImportDisabled}
                    onClick={handleImportIntegration}
                    appearance="primary"
                    tooltip={getImportTooltip(selectedIntegration, importSourcePath)}
                >
                    Start Migration
                </Button>
            </ButtonWrapper>

            {pullingTool && (
                <LoadingOverlayContainer>
                    <LoadingRing message="Pulling integration tool..." />
                </LoadingOverlayContainer>
            )}
        </>
    );
}
