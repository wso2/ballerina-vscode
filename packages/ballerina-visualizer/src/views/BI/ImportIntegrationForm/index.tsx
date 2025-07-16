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
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, CheckBox, Codicon, Icon, LocationSelector, TextField, Tooltip, Typography } from "@wso2/ui-toolkit";
import { useEffect, useState } from "react";
import ButtonCard from "../../../components/ButtonCard";
import { BodyText } from "../../styles";

const FormContainer = styled.div`
    max-width: 660px;
    margin: 80px 120px;
    height: calc(100vh - 160px);
    overflow-y: auto;
`;

const IntegrationCardGrid = styled.div`
    display: flex;
    flex-direction: row;
    gap: 12px;
    margin: 20px 0;
`;

const ButtonWrapper = styled.div`
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
`;

const LocationSelectorWrapper = styled.div`
    margin-top: 20px;
`;

const ImportSourceWrapper = styled.div`
    margin: 20px 0;
`;

const IconButton = styled.div`
    cursor: pointer;
    border-radius: 4px;
    width: 20px;
    height: 20px;
    font-size: 20px;
    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }
`;

const PreviewContainer = styled.div`
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    padding: 8px 12px;
    display: inline-flex;
    align-items: center;
    width: fit-content;
    height: 28px;
    gap: 8px;
    background-color: var(--vscode-editor-background);
    * {
        cursor: default !important;
    }
`;

const InputPreviewWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 20px 0;
`;

const PreviewText = styled(Typography)`
    color: var(--vscode-sideBarTitle-foreground);
    opacity: 0.5;
    font-family: var(--vscode-editor-font-family, "Monaco", "Menlo", "Ubuntu Mono", monospace);
    word-break: break-all;
    min-width: 100px;
    display: flex;
    align-items: center;
    line-height: 1;
`;

const PreviewIcon = styled(Codicon)`
    display: flex;
    align-items: center;
`;

interface BaseIntegrationParams {
    name: string;
    path: string;
    importSourcePath: string;
}

interface MuleSoftParams extends BaseIntegrationParams {
    type: "mulesoft";
    keepStructure: boolean;
    multiRoot: boolean;
}

interface TibcoParams extends BaseIntegrationParams {
    type: "tibco";
    keepStructure: boolean;
    multiRoot: boolean;
}

interface LogicAppsParams extends BaseIntegrationParams {
    type: "logic-apps";
    keepStructure: boolean;
    multiRoot: boolean;
    prompt: string;
}

type IntegrationParams = MuleSoftParams | TibcoParams | LogicAppsParams;

const INTEGRATION_CONFIGS = {
    mulesoft: {
        parameters: [
            {
                key: "keepStructure",
                label: "Preserve Original Process Flow",
                type: "boolean" as const,
                defaultValue: false,
            },
            {
                key: "multiRoot",
                label: "Treat each Directory as a Separate Project",
                type: "boolean" as const,
                defaultValue: false,
            },
        ],
    },
    tibco: {
        parameters: [
            {
                key: "keepStructure",
                label: "Preserve Original Process Flow",
                type: "boolean" as const,
                defaultValue: false,
            },
            {
                key: "multiRoot",
                label: "Treat each Directory as a Separate Project",
                type: "boolean" as const,
                defaultValue: false,
            },
        ],
    },
    "logic-apps": {
        parameters: [
            {
                key: "keepStructure",
                label: "Preserve Original Process Flow",
                type: "boolean" as const,
                defaultValue: false,
            },
            {
                key: "multiRoot",
                label: "Treat each Directory as a Separate Project",
                type: "boolean" as const,
                defaultValue: false,
            },
            {
                key: "prompt",
                label: "Describe the Logic App for AI Conversion",
                type: "string" as const,
                defaultValue: "",
            },
        ],
    },
} as const;

const ParametersSection = styled.div`
    margin: 20px 0;
    padding: 16px;
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    background-color: var(--vscode-editor-background);
`;

const ParameterItem = styled.div`
    margin-bottom: 12px;
    &:last-child {
        margin-bottom: 0;
    }
`;

const sanitizeProjectName = (name: string): string => {
    return name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
};

export function ImportIntegrationForm() {
    const { rpcClient } = useRpcContext();
    const [selectedIntegration, setSelectedIntegration] = useState<keyof typeof INTEGRATION_CONFIGS | null>(null);
    const [name, setName] = useState("");
    const [path, setPath] = useState("");
    const [importSourcePath, setImportSourcePath] = useState("");
    const [integrationParams, setIntegrationParams] = useState<Record<string, any>>({});

    const handleProjectName = (value: string) => {
        setName(value);
    };

    const handleIntegrationSelection = (integrationType: keyof typeof INTEGRATION_CONFIGS) => {
        setSelectedIntegration(integrationType);

        // Initialize parameters with default values
        const config = INTEGRATION_CONFIGS[integrationType];
        const defaultParams = config.parameters.reduce((acc, param) => {
            acc[param.key] = param.defaultValue;
            return acc;
        }, {} as Record<string, any>);

        setIntegrationParams(defaultParams);
    };

    const handleParameterChange = (paramKey: string, value: any) => {
        setIntegrationParams((prev) => ({
            ...prev,
            [paramKey]: value,
        }));
    };

    const handleImportIntegration = () => {
        if (!selectedIntegration || !name || !path || !importSourcePath) return;

        // Create the properly typed parameters object
        const baseParams = { name, path, importSourcePath };

        let finalParams: IntegrationParams;

        switch (selectedIntegration) {
            case "mulesoft":
                finalParams = {
                    ...baseParams,
                    type: "mulesoft",
                    keepStructure: integrationParams.keepStructure || false,
                    multiRoot: integrationParams.multiRoot || false,
                } as MuleSoftParams;
                break;
            case "tibco":
                finalParams = {
                    ...baseParams,
                    type: "tibco",
                    keepStructure: integrationParams.keepStructure || false,
                    multiRoot: integrationParams.multiRoot || false,
                } as TibcoParams;
                break;
            case "logic-apps":
                finalParams = {
                    ...baseParams,
                    type: "logic-apps",
                    keepStructure: integrationParams.keepStructure || false,
                    multiRoot: integrationParams.multiRoot || false,
                    prompt: integrationParams.prompt || "",
                } as LogicAppsParams;
                break;
            default:
                return;
        }

        // Pass the parameters to your import function
        console.log("Importing integration with parameters:", finalParams);

        // TODO: Call your RPC method with finalParams
        // rpcClient.getBIDiagramRpcClient().importIntegration(finalParams);
    };

    const handleProjecDirSelection = async () => {
        const projectDirectory = await rpcClient.getCommonRpcClient().selectFileOrDirPath({});
        setPath(projectDirectory.path);
    };

    const handleImportSourceSelection = async () => {
        const importSource = await rpcClient.getCommonRpcClient().selectFileOrDirPath({});
        setImportSourcePath(importSource.path);
    };

    useEffect(() => {
        (async () => {
            const currentDir = await rpcClient.getCommonRpcClient().getWorkspaceRoot();
            setPath(currentDir.path);
        })();
    }, []);

    const gotToWelcome = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIWelcome,
            },
        });
    };

    const renderIntegrationParameters = () => {
        if (!selectedIntegration) return null;
        const config = INTEGRATION_CONFIGS[selectedIntegration];
        if (!config.parameters.length) return null;

        return (
            <ParametersSection>
                <Typography variant="h4" sx={{ marginBottom: 12 }}>
                    {selectedIntegration.charAt(0).toUpperCase() + selectedIntegration.slice(1)} Configuration
                </Typography>
                {config.parameters.map((param) => (
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
        <FormContainer>
            <IconButton onClick={gotToWelcome}>
                <Icon name="bi-arrow-back" iconSx={{ color: "var(--vscode-foreground)" }} />
            </IconButton>
            <Typography variant="h2">Import External Integration</Typography>
            <BodyText>Select the external integration tool and select a location to start building.</BodyText>
            <InputPreviewWrapper>
                <TextField
                    onTextChange={handleProjectName}
                    value={name}
                    label="Integration Name"
                    placeholder="Enter a integration name"
                    autoFocus={true}
                />
                <PreviewContainer>
                    <PreviewIcon
                        name="project"
                        iconSx={{ fontSize: 14, color: "var(--vscode-descriptionForeground)" }}
                    />
                    <Tooltip content="A unique identifier for your intergration">
                        <PreviewText variant="caption">
                            {name ? sanitizeProjectName(name) : "integration_id"}
                        </PreviewText>
                    </Tooltip>
                </PreviewContainer>
            </InputPreviewWrapper>
            <LocationSelectorWrapper>
                <LocationSelector
                    label="Select Integration Path"
                    selectedFile={path}
                    btnText="Select Path"
                    onSelect={handleProjecDirSelection}
                />
            </LocationSelectorWrapper>
            <IntegrationCardGrid>
                <ButtonCard
                    id="mulesoft-integration-card"
                    icon={<Icon name="bi-globe" />}
                    title="MuleSoft"
                    onClick={() => handleIntegrationSelection("mulesoft")}
                    active={selectedIntegration === "mulesoft"}
                />
                <ButtonCard
                    id="tibco-integration-card"
                    icon={<Icon name="bi-globe" />}
                    title="TIBCO"
                    onClick={() => handleIntegrationSelection("tibco")}
                    active={selectedIntegration === "tibco"}
                />
                <ButtonCard
                    id="logic-apps-integration-card"
                    icon={<Icon name="bi-globe" />}
                    title="Logic Apps"
                    onClick={() => handleIntegrationSelection("logic-apps")}
                    active={selectedIntegration === "logic-apps"}
                />
            </IntegrationCardGrid>
            <ImportSourceWrapper>
                <LocationSelector
                    label="Select Importing Source"
                    selectedFile={importSourcePath}
                    btnText="Import Project/File"
                    onSelect={handleImportSourceSelection}
                />
            </ImportSourceWrapper>

            {renderIntegrationParameters()}

            <ButtonWrapper>
                <Button
                    disabled={name.length < 2 || path.length < 2 || importSourcePath.length < 2 || !selectedIntegration}
                    onClick={handleImportIntegration}
                    appearance="primary"
                >
                    Import Integration
                </Button>
            </ButtonWrapper>
        </FormContainer>
    );
}
