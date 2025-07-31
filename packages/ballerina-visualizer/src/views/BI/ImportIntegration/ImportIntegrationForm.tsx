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

import styled from "@emotion/styled";
import { DownloadProgress } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, CheckBox, Icon, TextField, Typography } from "@wso2/ui-toolkit";
import { useState } from "react";
import { FinalIntegrationParams } from ".";
import ButtonCard from "../../../components/ButtonCard";
import { LoadingRing } from "../../../components/Loader";
import { BodyText, LoadingOverlayContainer } from "../../styles";
import { MigrationTool } from "@wso2/ballerina-core";

const SELECTION_TEXT = "To begin, choose a source platform from the options above.";
const IMPORT_DISABLED_TOOLTIP = "Please select a source project from the options above to continue.";
const IMPORT_ENABLED_TOOLTIP = "Begin converting your selected project and view the progress.";

const IntegrationCardGrid = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 20px 0;
`;

const ButtonWrapper = styled.div`
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
`;

const ParametersSection = styled.div`
    margin: 20px 0;
    padding: 16px;
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    background-color: var(--vscode-editor-background);
`;

const PathText = styled.div`
    font-family: var(--vscode-editor-font-family);
    padding: 4px 0;
    opacity: 0.8;
`;

const ParameterItem = styled.div`
    margin-bottom: 12px;
    &:last-child {
        margin-bottom: 0;
    }
`;

interface FormProps {
    selectedIntegration: MigrationTool | null;
    migrationTools: MigrationTool[];
    pullIntegrationTool: (integrationType: string) => void;
    pullingTool: boolean;
    toolPullProgress: DownloadProgress | null;
    setImportParams: (params: FinalIntegrationParams) => void;
    onSelectIntegration: (selectedIntegration: MigrationTool) => void;
    handleStartImport: (
        importParams: FinalIntegrationParams,
        selectedIntegration: MigrationTool,
        toolPullProgress: DownloadProgress
    ) => void;
}

export function ImportIntegrationForm({
    selectedIntegration,
    migrationTools,
    onSelectIntegration,
    pullIntegrationTool,
    setImportParams,
    pullingTool,
    toolPullProgress,
    handleStartImport,
}: FormProps) {
    const { rpcClient } = useRpcContext();

    const [importSourcePath, setImportSourcePath] = useState("");
    const [integrationParams, setIntegrationParams] = useState<Record<string, any>>({});

    const isImportDisabled = importSourcePath.length < 2 || !selectedIntegration;

    const handleIntegrationSelection = async (integration: MigrationTool) => {
        // Reset state when a new integration is selected
        setImportSourcePath("");
        onSelectIntegration(integration);
        const defaultParams = integration.parameters.reduce((acc, param) => {
            acc[param.key] = param.defaultValue;
            return acc;
        }, {} as Record<string, any>);
        setIntegrationParams(defaultParams);
        const importSource = await rpcClient.getCommonRpcClient().selectFileOrFolderPath();
        setImportSourcePath(importSource.path);
        if (importSource.path == "") {
            onSelectIntegration(null);
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

    const renderIntegrationParameters = () => {
        if (!selectedIntegration || !selectedIntegration.parameters.length) return null;

        return (
            <ParametersSection>
                <Typography variant="h4" sx={{ marginBottom: 12 }}>
                    {selectedIntegration.title} Configuration
                </Typography>
                {selectedIntegration.parameters.map((param) => (
                    <ParameterItem key={param.key}>
                        {param.type === "boolean" ? (
                            <CheckBox
                                checked={integrationParams[param.key] || false}
                                onChange={(checked) => handleParameterChange(param.key, checked)}
                                label={param.label}
                            />
                        ) : (
                            <TextField
                                value={integrationParams[param.key] || ""}
                                onTextChange={(value) => handleParameterChange(param.key, value)}
                                label={param.label}
                                placeholder={`Enter ${param.label.toLowerCase()}`}
                            />
                        )}
                    </ParameterItem>
                ))}
            </ParametersSection>
        );
    };

    return (
        <>
            <Typography variant="h2">Import and Migrate an Existing Integration</Typography>
            <BodyText>
                This wizard converts an existing integration project from MuleSoft, TIBCO, or Logic Apps into a
                ready-to-use BI project.
            </BodyText>
            <Typography variant="h3" sx={{ marginTop: 20 }}>
                Choose the source platform and import your project
            </Typography>
            <IntegrationCardGrid>
                {migrationTools.map((tool) => {
                    return (
                        <ButtonCard
                            key={tool.id}
                            id={`${tool.id}-integration-card`}
                            icon={<Icon name="bi-globe" />}
                            title={`Import from ${tool.title}`}
                            description={tool.description}
                            onClick={() => handleIntegrationSelection(tool)}
                            active={selectedIntegration?.id === tool.id}
                        />
                    );
                })}
            </IntegrationCardGrid>

            <PathText>
                {importSourcePath ? (
                    <span>{`Project Path: ${importSourcePath}`}</span>
                ) : (
                    <div style={{ color: "var(--vscode-editor-foreground)" }}>{SELECTION_TEXT}</div>
                )}
            </PathText>

            {importSourcePath.length >= 2 && renderIntegrationParameters()}

            <ButtonWrapper>
                <Button
                    disabled={isImportDisabled}
                    onClick={handleImportIntegration}
                    appearance="primary"
                    tooltip={isImportDisabled ? IMPORT_DISABLED_TOOLTIP : IMPORT_ENABLED_TOOLTIP}
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
