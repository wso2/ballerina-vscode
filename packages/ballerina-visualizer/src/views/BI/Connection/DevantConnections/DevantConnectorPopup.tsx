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

import {
    AvailableNode,
    ConfigVariable,
    DataMapperDisplayMode,
    DIRECTORY_MAP,
    FlowNode,
    LinePosition,
    ParentPopupData,
} from "@wso2/ballerina-core";
import { Codicon, Stepper, ThemeColors } from "@wso2/ui-toolkit";
import {
    PopupOverlay,
    PopupContainer,
    PopupHeader,
    PopupTitle,
    CloseButton,
    BackButton,
    HeaderTitleContainer,
    PopupSubtitle,
} from "../styles";
import { PopupContent, StepperContainer } from "../AddConnectionPopup/styles";
import { DevantConnectorList } from "./DevantConnectorList";
import React, { useEffect, useState } from "react";
import { DevantConnectorMarketplaceInfo } from "./DevantConnectorMarketplaceInfo";
import { MarketplaceItem } from "@wso2/wso2-platform-core";
import {
    DevantConnectorCreateForm,
    getConnectionInitialName,
    useDevantConnectorForm,
} from "./DevantConnectorCreateForm";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import DevantConnectorImportConfigs from "./DevantConnectorImportConfigs";
import { usePlatformExtContext } from "../../../../providers/platform-ext-ctx-provider";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DevantConnectionFlow, DevantTempConfig } from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";
import { DevantBIConnectorCreateForm } from "./DevantBIConnectorInitForm";
import { DevantBIConnectorSelect } from "./DevantBIConnectorSelect";
import { AddConnectionPopupContent } from "../AddConnectionPopup/AddConnectionPopupContent";
import { ConnectorDevantCreateConfigs } from "./ConnectorDevantCreateConfigs";
import { APIConnectionForm } from "../APIConnectionPopup";

interface AddConnectionPopupProps {
    onClose?: (parent?: ParentPopupData) => void;
    onNavigateToOverview: () => void;
    isPopup?: boolean;
    fileName: string;
    target?: LinePosition;
}


export const DevantConnectionFlowTitles: Partial<Record<DevantConnectionFlow, string>> = {
    [DevantConnectionFlow.CREATE_INTERNAL_OAS]: 'Connect to Devant service',
    [DevantConnectionFlow.CREATE_INTERNAL_OTHER]: 'Connect to Devant service',
    [DevantConnectionFlow.CREATE_INTERNAL_OTHER_SELECT_BI_CONNECTOR]: 'Connect to Devant service',
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OAS]: 'Connect via API Specification',
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER]: 'Connect to Third-Party service',
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER_SELECT_BI_CONNECTOR]: 'Connect to Third-Party service',
    [DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_BI_CONNECTOR]: 'Connect to Third-Party service',
    [DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_OAS]: 'Connect to Third-Party service',
};

export const DevantConnectionFlowSubTitles: Partial<Record<DevantConnectionFlow, string>> = {
    [DevantConnectionFlow.CREATE_INTERNAL_OAS]: 'Connect to REST API service running in Devant',
    [DevantConnectionFlow.CREATE_INTERNAL_OTHER]: 'Connect to service running in Devant by configuring your connector',
    [DevantConnectionFlow.CREATE_INTERNAL_OTHER_SELECT_BI_CONNECTOR]: 'Connect to service running in Devant by configuring your connector',
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OAS]: 'Connect to Third-Party REST API service by creating and mapping configurations',
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER]: 'Connect to Third-Party service by creating and mapping configurations',
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER_SELECT_BI_CONNECTOR]: 'Connect to Third-Party service by configuring your connector',
    [DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_BI_CONNECTOR]: 'Connect to Third-Party service by configuring your Ballerina connector',
    [DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_OAS]: 'Connect to Third-Party service from API Specification',
};

export enum DevantConnectionFlowStep {
    VIEW_SWAGGER = 'Connection Details',
    INIT_DEVANT_INTERNAL_OAS_CONNECTOR = 'Create Connection',
    IMPORT_CONFIGS = 'Import Configs',
    SELECT_BI_CONNECTOR = 'Select Connector',
    INIT_CONNECTOR = 'Initialize Connector',
    SELECT_OR_CREATE_BI_CONNECTOR = 'Select or Create Connector',
    PROVIDE_CONFIGS = 'Provide Configs',
    UPLOAD_OAS = 'Upload Specification',
}

export const DEVANT_CONNECTION_FLOWS_STEPS: Partial<Record<DevantConnectionFlow, DevantConnectionFlowStep[]>> = {
    [DevantConnectionFlow.CREATE_INTERNAL_OAS]: [
        DevantConnectionFlowStep.VIEW_SWAGGER,
        DevantConnectionFlowStep.INIT_DEVANT_INTERNAL_OAS_CONNECTOR,
    ],
    [DevantConnectionFlow.CREATE_INTERNAL_OTHER]: [
        DevantConnectionFlowStep.IMPORT_CONFIGS,
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
    [DevantConnectionFlow.CREATE_INTERNAL_OTHER_SELECT_BI_CONNECTOR]: [
        DevantConnectionFlowStep.IMPORT_CONFIGS,
        DevantConnectionFlowStep.SELECT_BI_CONNECTOR,
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OAS]: [
        DevantConnectionFlowStep.VIEW_SWAGGER,
        DevantConnectionFlowStep.IMPORT_CONFIGS,
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER]: [
        DevantConnectionFlowStep.IMPORT_CONFIGS,
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER_SELECT_BI_CONNECTOR]: [
        DevantConnectionFlowStep.IMPORT_CONFIGS,
        DevantConnectionFlowStep.SELECT_BI_CONNECTOR,
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
    [DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_BI_CONNECTOR]: [
        DevantConnectionFlowStep.PROVIDE_CONFIGS,
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
    [DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_OAS]: [
        DevantConnectionFlowStep.UPLOAD_OAS,
        DevantConnectionFlowStep.PROVIDE_CONFIGS,
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
};

export enum DevantConnectionType {
    INTERNAL = 'INTERNAL',
    THIRD_PARTY = 'THIRD_PARTY',
    DATABASE = 'DATABASE',
}

export function DevantConnectorPopup(props: AddConnectionPopupProps) {
    const { onClose, onNavigateToOverview, isPopup, fileName, target } = props;
    const { platformRpcClient, projectPath, projectToml, platformExtState } = usePlatformExtContext();
    const { rpcClient } = useRpcContext();
    const [selectedFlow, setSelectedFlow] = useState<DevantConnectionFlow | null>(null);
    const [selectedMarketplaceItem, setSelectedMarketplaceItem] = useState<MarketplaceItem | null>(null);
    const [steps, setSteps] = useState<DevantConnectionFlowStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
    const [devantConfigs, setDevantConfigs] = useState<DevantTempConfig[] | null>(null);
    const [availableNode, setAvailableNode] = useState<AvailableNode>();
    const [showBiConnectorSelection, setShowBiConnectorSelection] = useState<boolean>(false);
    const [IDLFilePath, setIDLFilePath] = useState<string>("");
    const [oasConnectorName, setOasConnectorName] = useState<string>("");

    useEffect(() => {
        if (selectedFlow) {
            const flowSteps = DEVANT_CONNECTION_FLOWS_STEPS[selectedFlow] || [];
            setSteps(flowSteps);
        }
    }, [selectedFlow]);

    const { data: existingConfigVariables } = useQuery({
        queryFn: () =>
            rpcClient.getBIDiagramRpcClient().getConfigVariablesV2({
                projectPath,
                includeLibraries: false,
            }),
        queryKey: ["devant-config-variables", projectPath],
        select: (data) => {
            const configNames: string[] = [];
            const configVars = (data.configVariables as any)?.[
                `${projectToml?.values?.package?.org}/${projectToml?.values?.package?.name}`
            ]?.[""] as ConfigVariable[];
            configVars.forEach((configVar) =>
                configNames.push(configVar?.properties?.variable?.value?.toString() || ""),
            );
            return configNames;
        },
    });

    useEffect(() => {
        if (selectedMarketplaceItem && existingConfigVariables) {
            // Reset devantConfigs and select all entries when marketplace item changes
            const allEntries = selectedMarketplaceItem.connectionSchemas?.[0]?.entries || [];
            const existingSet = new Set(existingConfigVariables.map((name) => name.toLowerCase()));
            const usedNames = new Set<string>();

            const configs: DevantTempConfig[] = allEntries.map((entry) => {
                let uniqueName = entry.name;
                let counter = 1;

                // Check if name conflicts with existing configs or already used names
                while (existingSet.has(uniqueName.toLowerCase()) || usedNames.has(uniqueName.toLowerCase())) {
                    uniqueName = `${entry.name}${counter}`;
                    counter++;
                }

                usedNames.add(uniqueName.toLowerCase());

                return {
                    id: entry.name,
                    name: uniqueName,
                    value: "",
                    isSecret: entry.isSensitive,
                    description: entry.description,
                    type: entry.type,
                    selected: true,
                };
            });
            setDevantConfigs(configs);
        }
    }, [selectedMarketplaceItem, existingConfigVariables]);

    const handleClosePopup = () => {
        if (isPopup) {
            onClose?.();
        } else {
            onNavigateToOverview();
        }
    };

    const handleBackButtonClick = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
        } else if (currentStepIndex === 0) {
            setSelectedFlow(null);
            setSelectedMarketplaceItem(null);
            setDevantConfigs(null);
            setAvailableNode(undefined);
            setOasConnectorName("");
            setIDLFilePath("");

            if (showBiConnectorSelection && !selectedFlow) {
                setShowBiConnectorSelection(false);
            }
        }
    };

    // todo: move this back into connector create form
    const { form, visibilities, isCreatingConnection, createDevantConnection } = useDevantConnectorForm(
        selectedMarketplaceItem,
        selectedFlow,
        async (data) => {
            if (data.connectionNode) {
                rpcClient
                    .getBIDiagramRpcClient()
                    .getNodeTemplate({
                        position: target || null,
                        filePath: fileName,
                        id: data.connectionNode.codedata,
                    })
                    .then((nodeTemplatePromise) => {
                        // init connector flow
                    });
            } else if (data.connectionName) {
                if (onClose) {
                    onClose({ recentIdentifier: data.connectionName, artifactType: DIRECTORY_MAP.CONNECTION });
                }
            }
        },
    );

    const { mutate: updateDevantTempConfigs, isPending: updatingConfigs } = useMutation({
        mutationFn: (configs: DevantTempConfig[]) => {
            return platformRpcClient?.updateDevantTempConfigs({ configs });
        },
        onSuccess: (data) => {
            setDevantConfigs(
                devantConfigs.map((config) => ({
                    ...config,
                    nodePosition: data.configs.find((c) => c.name === config.name)?.nodePosition || config.nodePosition,
                })),
            );
            setCurrentStepIndex(currentStepIndex + 1);
        },
    });

    const { mutate: generateCustomConnectorFromOAS, isPending: generatingCustomConnectorFromOAS } = useMutation({
        mutationFn: () =>
            platformRpcClient?.generateCustomConnectorFromOAS({
                marketplaceItem: selectedMarketplaceItem!,
                connectionName: getConnectionInitialName(
                    selectedMarketplaceItem?.name,
                    platformExtState?.devantConns?.list?.map((conn) => conn.name),
                ),
            }),
        onSuccess: (data) => {
            setAvailableNode(data.connectionNode);
            setCurrentStepIndex(currentStepIndex + 1);
        },
    });

    let title: string = "Add Connection";
    let subTitle: string = "";
    if (selectedFlow && DevantConnectionFlowTitles[selectedFlow]) {
        title = DevantConnectionFlowTitles[selectedFlow];
        subTitle = DevantConnectionFlowSubTitles[selectedFlow] || "";
    }

    return (
        <>
            <PopupOverlay sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.5` }} />
            <PopupContainer>
                <PopupHeader>
                    {(selectedFlow || showBiConnectorSelection) && (
                        <BackButton appearance="icon" onClick={handleBackButtonClick}>
                            <Codicon name="chevron-left" />
                        </BackButton>
                    )}
                    <HeaderTitleContainer>
                        <PopupTitle variant="h2">{title}</PopupTitle>
                        {subTitle && <PopupSubtitle variant="body2">{subTitle}</PopupSubtitle>}
                    </HeaderTitleContainer>
                    <CloseButton appearance="icon" onClick={() => handleClosePopup()}>
                        <Codicon name="close" />
                    </CloseButton>
                </PopupHeader>
                {selectedFlow && steps.length > 0 && (
                    <StepperContainer>
                        <Stepper steps={steps} currentStep={currentStepIndex} alignment="center" />
                    </StepperContainer>
                )}
                <PopupContent>
                    {selectedFlow ? (
                        <>
                            {steps.length > 0 && steps[currentStepIndex].length > 0 && (
                                <>
                                    {steps[currentStepIndex] === DevantConnectionFlowStep.VIEW_SWAGGER && (
                                        <DevantConnectorMarketplaceInfo
                                            item={selectedMarketplaceItem}
                                            onNextClick={() => {
                                                if (selectedFlow === DevantConnectionFlow.CREATE_THIRD_PARTY_OAS) {
                                                    generateCustomConnectorFromOAS();
                                                } else {
                                                    setCurrentStepIndex(currentStepIndex + 1);
                                                }
                                            }}
                                            onFlowChange={(flow) => setSelectedFlow(flow)}
                                            loading={generatingCustomConnectorFromOAS}
                                        />
                                    )}
                                    {steps[currentStepIndex] ===
                                        DevantConnectionFlowStep.INIT_DEVANT_INTERNAL_OAS_CONNECTOR && (
                                        <DevantConnectorCreateForm
                                            item={selectedMarketplaceItem}
                                            form={form}
                                            visibilities={visibilities}
                                            onCreateClick={() => createDevantConnection(form.getValues())}
                                            isCreatingConnection={isCreatingConnection}
                                        />
                                    )}
                                    {steps[currentStepIndex] === DevantConnectionFlowStep.IMPORT_CONFIGS && (
                                        <DevantConnectorImportConfigs
                                            marketplaceItem={selectedMarketplaceItem!}
                                            items={devantConfigs || []}
                                            onChange={(configs) => setDevantConfigs(configs)}
                                            loading={updatingConfigs}
                                            initialSelectedConfigs={
                                                devantConfigs ? devantConfigs.map((config) => config.id) : null
                                            }
                                            onContinue={() => updateDevantTempConfigs(devantConfigs)}
                                        />
                                    )}
                                    {steps[currentStepIndex] === DevantConnectionFlowStep.INIT_CONNECTOR &&
                                        availableNode && (
                                            <DevantBIConnectorCreateForm
                                                fileName={fileName}
                                                onClose={onClose}
                                                devantConfigs={devantConfigs}
                                                selectedFlow={selectedFlow}
                                                selectedMarketplaceItem={selectedMarketplaceItem}
                                                selectedConnector={availableNode}
                                                IDLFilePath={IDLFilePath}
                                            />
                                        )}
                                    {steps[currentStepIndex] === DevantConnectionFlowStep.SELECT_BI_CONNECTOR && (
                                        <DevantBIConnectorSelect
                                            fileName={fileName}
                                            target={target}
                                            onItemSelect={(availableNode) => {
                                                setAvailableNode(availableNode);
                                                setCurrentStepIndex(currentStepIndex + 1);
                                            }}
                                        />
                                    )}
                                    {steps[currentStepIndex] === DevantConnectionFlowStep.PROVIDE_CONFIGS && (
                                        <ConnectorDevantCreateConfigs
                                            configs={devantConfigs || []}
                                            isCreating={updatingConfigs}
                                            onConfigsChange={(configs) => setDevantConfigs(configs)}
                                            onSave={() => updateDevantTempConfigs(devantConfigs!)}
                                            existingConfigVariables={existingConfigVariables || []}
                                        />
                                    )}
                                    {steps[currentStepIndex] === DevantConnectionFlowStep.UPLOAD_OAS && (
                                        <APIConnectionForm
                                            fileName={fileName}
                                            projectPath={projectPath}
                                            target={target}
                                            initialFilePath={IDLFilePath}
                                            initialName={oasConnectorName}
                                            disabled={!!IDLFilePath}
                                            apiSpecOptions={[{ id: "openapi", value: "OpenAPI", content: "OpenAPI" }]}
                                            actionButtonText="Continue"
                                            availableNode={availableNode}
                                            onSave={(availableNode,_flowNode,_type,name,filePath) => {
                                                setAvailableNode(availableNode);
                                                setCurrentStepIndex(currentStepIndex + 1);
                                                setOasConnectorName(name);
                                                setIDLFilePath(filePath);
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            {showBiConnectorSelection ? (
                                <AddConnectionPopupContent
                                    {...props}
                                    projectPath={projectPath}
                                    handleSelectConnector={(availableNode, _) => {
                                        setAvailableNode(availableNode);
                                        setSelectedFlow(
                                            DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_BI_CONNECTOR,
                                        );
                                    }}
                                    handleApiSpecConnection={() => {
                                        setSelectedFlow(DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_OAS);
                                    }}
                                />
                            ) : (
                                <DevantConnectorList
                                    fileName={fileName}
                                    target={target}
                                    showBiConnectors={() => setShowBiConnectorSelection(true)}
                                    onItemSelect={(flow, item, availableNode) => {
                                        setSelectedFlow(flow);
                                        setSelectedMarketplaceItem(item);
                                        setAvailableNode(availableNode);
                                    }}
                                />
                            )}
                        </>
                    )}
                </PopupContent>
            </PopupContainer>
        </>
    );
}
