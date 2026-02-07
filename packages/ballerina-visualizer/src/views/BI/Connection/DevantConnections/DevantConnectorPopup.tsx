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
import { usePlatformExtContext } from "../../../../providers/platform-ext-ctx-provider";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
    DevantConnectionFlow,
    DevantTempConfig,
} from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";
import { DevantBIConnectorCreateForm } from "./DevantBIConnectorInitForm";
import { DevantBIConnectorSelect } from "./DevantBIConnectorSelect";
import { AddConnectionPopupContent } from "../AddConnectionPopup/AddConnectionPopupContent";
import { APIConnectionForm } from "../APIConnectionPopup";

interface AddConnectionPopupProps {
    onClose?: (parent?: ParentPopupData) => void;
    onNavigateToOverview: () => void;
    isPopup?: boolean;
    fileName: string;
    target?: LinePosition;
}

export const DevantConnectionFlowTitles: Partial<Record<DevantConnectionFlow, string>> = {
    [DevantConnectionFlow.CREATE_INTERNAL_OAS]: "Connect to Devant service",
    [DevantConnectionFlow.CREATE_INTERNAL_OTHER]: "Connect to Devant service",
    [DevantConnectionFlow.CREATE_INTERNAL_OTHER_SELECT_BI_CONNECTOR]: "Connect to Devant service",
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OAS]: "Connect via API Specification",
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER]: "Connect to Third-Party service",
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER_SELECT_BI_CONNECTOR]: "Connect to Third-Party service",
    [DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_BI_CONNECTOR]: "Connect to Third-Party service",
    [DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_OAS]: "Connect to Third-Party service",
};

export const DevantConnectionFlowSubTitles: Partial<Record<DevantConnectionFlow, string>> = {
    [DevantConnectionFlow.CREATE_INTERNAL_OAS]: "Connect to REST API service running in Devant",
    [DevantConnectionFlow.CREATE_INTERNAL_OTHER]: "Connect to service running in Devant by configuring your connector",
    [DevantConnectionFlow.CREATE_INTERNAL_OTHER_SELECT_BI_CONNECTOR]:
        "Connect to service running in Devant by configuring your connector",
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OAS]:
        "Connect to Third-Party REST API service by creating and mapping configurations",
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER]:
        "Connect to Third-Party service by creating and mapping configurations",
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER_SELECT_BI_CONNECTOR]:
        "Connect to Third-Party service by configuring your connector",
    [DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_BI_CONNECTOR]:
        "Connect to Third-Party service by configuring your Ballerina connector",
    [DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_OAS]:
        "Connect to Third-Party service from API Specification",
};

export enum DevantConnectionFlowStep {
    VIEW_SWAGGER = "Connection Details",
    INIT_DEVANT_INTERNAL_OAS_CONNECTOR = "Create Connection",
    SELECT_BI_CONNECTOR = "Select Connector",
    INIT_CONNECTOR = "Initialize Connector",
    SELECT_OR_CREATE_BI_CONNECTOR = "Select or Create Connector",
    UPLOAD_OAS = "Upload Specification",
}

export const DEVANT_CONNECTION_FLOWS_STEPS: Partial<Record<DevantConnectionFlow, DevantConnectionFlowStep[]>> = {
    [DevantConnectionFlow.CREATE_INTERNAL_OAS]: [
        DevantConnectionFlowStep.VIEW_SWAGGER,
        DevantConnectionFlowStep.INIT_DEVANT_INTERNAL_OAS_CONNECTOR,
    ],
    [DevantConnectionFlow.CREATE_INTERNAL_OTHER]: [
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
    [DevantConnectionFlow.CREATE_INTERNAL_OTHER_SELECT_BI_CONNECTOR]: [
        DevantConnectionFlowStep.SELECT_BI_CONNECTOR,
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OAS]: [
        DevantConnectionFlowStep.VIEW_SWAGGER,
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER]: [
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
    [DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER_SELECT_BI_CONNECTOR]: [
        DevantConnectionFlowStep.SELECT_BI_CONNECTOR,
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
    [DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_BI_CONNECTOR]: [
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
    [DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_OAS]: [
        DevantConnectionFlowStep.UPLOAD_OAS,
        DevantConnectionFlowStep.INIT_CONNECTOR,
    ],
};

export enum DevantConnectionType {
    INTERNAL = "INTERNAL",
    THIRD_PARTY = "THIRD_PARTY",
    DATABASE = "DATABASE",
}

export function DevantConnectorPopup(props: AddConnectionPopupProps) {
    const { onClose, onNavigateToOverview, isPopup, fileName, target } = props;
    const { platformRpcClient, projectPath, projectToml, platformExtState } = usePlatformExtContext();
    const { rpcClient } = useRpcContext();
    const [selectedFlow, setSelectedFlow] = useState<DevantConnectionFlow | null>(null);
    const [selectedMarketplaceItem, setSelectedMarketplaceItem] = useState<MarketplaceItem | null>(null);
    const [steps, setSteps] = useState<DevantConnectionFlowStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
    const [devantConfigs, setDevantConfigs] = useState<DevantTempConfig[]>([]);
    const [availableNode, setAvailableNode] = useState<AvailableNode>();
    const [showBiConnectorSelection, setShowBiConnectorSelection] = useState<boolean>(false);
    const [IDLFilePath, setIDLFilePath] = useState<string>("");
    const [oasConnectorName, setOasConnectorName] = useState<string>("");

    const goToNextStep = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex((prev) => prev + 1);
        }
    };

    const goToPreviousStep = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex((prev) => prev - 1);
        }
    };

    useEffect(() => {
        if (selectedFlow) {
            const flowSteps = DEVANT_CONNECTION_FLOWS_STEPS[selectedFlow] || [];
            setSteps(flowSteps);
        }
    }, [selectedFlow]);

    const { mutate: createTempConfigs } = useMutation({
        mutationFn: async (item: MarketplaceItem) => {
            const configResp = await rpcClient.getBIDiagramRpcClient().getConfigVariablesV2({
                projectPath,
                includeLibraries: false,
            })
            const existingConfigs = new Set<string>();
            const configVars = (configResp.configVariables as any)?.[
                `${projectToml?.values?.package?.org}/${projectToml?.values?.package?.name}`
            ]?.[""] as ConfigVariable[];
            configVars.forEach((configVar) =>
                existingConfigs.add(configVar?.properties?.variable?.value?.toString() || ""),
            );
            
            const allEntries = item.connectionSchemas?.[0]?.entries || [];
            const configs: DevantTempConfig[] = allEntries.map((entry) => {
                let uniqueName = entry.name;
                let counter = 1;

                // Check if name conflicts with existing configs or already used names
                while (existingConfigs.has(uniqueName)) {
                    uniqueName = `${entry.name}${counter}`;
                    counter++;
                }

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
            for (const [index, config] of configs.entries()) {
                const resp = await platformRpcClient.addDevantTempConfig({ name: config.name, newLine: index === 0 })
                config.node = resp.configNode;
            }
            setDevantConfigs(configs);
        },
    });

    useEffect(() => {
        if (selectedMarketplaceItem) {
            createTempConfigs(selectedMarketplaceItem)
        }
    }, [selectedMarketplaceItem]);

    const handleClosePopup = () => {
        deleteTempConfig();
        if (isPopup) {
            onClose?.();
        } else {
            onNavigateToOverview();
        }
    };

    const handleBackButtonClick = () => {
        if (currentStepIndex > 0) {
            goToPreviousStep();
        } else if (currentStepIndex === 0) {
            setSelectedFlow(null);
            setSelectedMarketplaceItem(null);
            deleteTempConfig();
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
            goToNextStep();
        },
    });

    const { mutate: deleteTempConfig } = useMutation({
        mutationFn: async () => {
            if(devantConfigs.length > 0) {
                await platformRpcClient?.deleteDevantTempConfigs({nodes: devantConfigs.map((config) => config.node!)});
            }
        },
        onSettled: () => setDevantConfigs([]),
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
                {selectedFlow && steps.length > 1 && (
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
                                                    goToNextStep();
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
                                    {steps[currentStepIndex] === DevantConnectionFlowStep.INIT_CONNECTOR &&
                                        availableNode && (
                                            <DevantBIConnectorCreateForm
                                                fileName={fileName}
                                                onClose={onClose}
                                                devantConfigs={devantConfigs}
                                                resetDevantConfigs={() => setDevantConfigs([])}
                                                selectedFlow={selectedFlow}
                                                selectedMarketplaceItem={selectedMarketplaceItem}
                                                selectedConnector={availableNode}
                                                IDLFilePath={IDLFilePath}
                                                onAddDevantConfig={async (name, value, isSecret) => {
                                                    const resp = await platformRpcClient.addDevantTempConfig({ name, newLine: devantConfigs.length === 0 })
                                                    const newDevantConfig: DevantTempConfig = {
                                                        id: name,
                                                        name: name,
                                                        value: value,
                                                        isSecret: isSecret,
                                                        type: "string",
                                                        node: resp.configNode,
                                                    };
                                                    setDevantConfigs([...devantConfigs, newDevantConfig]);
                                                }}
                                            />
                                        )}
                                    {steps[currentStepIndex] === DevantConnectionFlowStep.SELECT_BI_CONNECTOR && (
                                        <DevantBIConnectorSelect
                                            fileName={fileName}
                                            target={target}
                                            onItemSelect={(availableNode) => {
                                                setAvailableNode(availableNode);
                                                goToNextStep();
                                            }}
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
                                            onSave={(availableNode, _flowNode, _type, name, filePath) => {
                                                setAvailableNode(availableNode);
                                                goToNextStep();
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
