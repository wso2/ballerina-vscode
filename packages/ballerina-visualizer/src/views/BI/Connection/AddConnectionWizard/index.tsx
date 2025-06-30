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

import { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import {
    AvailableNode,
    EVENT_TYPE,
    FlowNode,
    LinePosition,
    LineRange,
    MACHINE_VIEW,
    RunExternalCommandResponse,
    SubPanel,
    SubPanelView,
} from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import ConnectorView from "../ConnectorView";
import ConnectionConfigView from "../ConnectionConfigView";
import { getFormProperties } from "../../../../utils/bi";
import { ExpressionFormField, FormField, FormValues, PanelContainer } from "@wso2/ballerina-side-panel";
import { Icon, Overlay, ThemeColors, Typography } from "@wso2/ui-toolkit";
import { InlineDataMapper } from "../../../InlineDataMapper";
import { HelperView } from "../../HelperView";
import { BodyText } from "../../../styles";
import { DownloadIcon } from "../../../../components/DownloadIcon";
import FormGeneratorNew from "../../Forms/FormGeneratorNew";

const Container = styled.div`
    width: 100%;
    display: flex;
    justify-content: center;
`;

const StatusCard = styled.div`
    margin: 16px 16px 0 16px;
    padding: 16px;
    border-radius: 8px;
    background: ${ThemeColors.SURFACE_DIM_2};
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 16px;

    & > svg {
        font-size: 24px;
        color: ${ThemeColors.ON_SURFACE};
    }
`;

const StatusText = styled(Typography)`
    color: ${ThemeColors.ON_SURFACE};
`;

enum WizardStep {
    CONNECTOR_LIST = "connector-list",
    CONNECTION_CONFIG = "connection-config",
    GENERATE_CONNECTOR = "generate-connector",
}

enum PullingStatus {
    PULLING = "pulling",
    SUCCESS = "success",
    EXISTS = "exists",
    ERROR = "error",
}

enum SavingFormStatus {
    SAVING = "saving",
    SUCCESS = "success",
    ERROR = "error",
}

interface AddConnectionWizardProps {
    fileName: string; // file path of `connection.bal`
    target?: LinePosition;
    onClose?: () => void;
}

export function AddConnectionWizard(props: AddConnectionWizardProps) {
    const { fileName, target, onClose } = props;
    const { rpcClient } = useRpcContext();

    const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.CONNECTOR_LIST);
    const [pullingStatus, setPullingStatus] = useState<PullingStatus>(undefined);
    const [savingFormStatus, setSavingFormStatus] = useState<SavingFormStatus>(undefined);
    const selectedConnectorRef = useRef<AvailableNode>();
    const selectedNodeRef = useRef<FlowNode>();
    const [subPanel, setSubPanel] = useState<SubPanel>({ view: SubPanelView.UNDEFINED });
    const [updatedExpressionField, setUpdatedExpressionField] = useState<ExpressionFormField>(undefined);
    const [fetchingInfo, setFetchingInfo] = useState<boolean>(false);
    const [connectorsViewKey, setConnectorsViewKey] = useState(0);
    const [targetLineRange, setTargetLineRange] = useState<LineRange>();
    const [genConnectorFields, setGenConnectorFields] = useState<FormField[]>([
        {
            key: `module`,
            label: "Module",
            type: "string",
            optional: false,
            editable: true,
            documentation: "Name of the connector",
            enabled: true,
            value: "",
            valueTypeConstraint: "",
            diagnostics: [],
        },
        {
            key: `openApiSpecPath`,
            label: "OpenAPI Spec",
            type: "FILE_SELECT",
            optional: false,
            editable: true,
            documentation: "",
            enabled: true,
            value: "",
            valueTypeConstraint: "",
        },
    ]);

    const handleOnSelectConnector = async (connector: AvailableNode) => {
        if (!connector.codedata) {
            console.error(">>> Error selecting connector. No codedata found");
            return;
        }
        selectedConnectorRef.current = connector;
        setFetchingInfo(true);

        try {
            const response = await rpcClient.getBIDiagramRpcClient().getNodeTemplate({
                position: target || null,
                filePath: fileName,
                id: connector.codedata,
            });

            console.log(">>> FlowNode template", response);
            selectedNodeRef.current = response.flowNode;
            const formProperties = getFormProperties(response.flowNode);
            console.log(">>> Form properties", formProperties);

            if (Object.keys(formProperties).length === 0) {
                // add node to source code
                handleOnFormSubmit(response.flowNode);
                return;
            }

            // get node properties
            setCurrentStep(WizardStep.CONNECTION_CONFIG);
            // Start pulling connector after transitioning to config step
        } finally {
            setFetchingInfo(false);
        }
    };

    const handleOnAddGeneratedConnector = () => {
        setCurrentStep(WizardStep.GENERATE_CONNECTOR);
    };

    const handleOnFormSubmit = async (node: FlowNode) => {
        console.log(">>> on form submit", node);
        if (selectedNodeRef.current) {
            setSavingFormStatus(SavingFormStatus.SAVING);
            const visualizerLocation = await rpcClient.getVisualizerLocation();
            let connectionsFilePath = visualizerLocation.documentUri || visualizerLocation.projectUri;

            if (node.codedata.isGenerated && !connectionsFilePath.endsWith(".bal")) {
                connectionsFilePath += "/main.bal";
            }

            if (connectionsFilePath === "") {
                console.error(">>> Error updating source code. No source file found");
                setSavingFormStatus(SavingFormStatus.ERROR);
                return;
            }

            // node property scope is local. then use local file path and line position
            if ((node.properties?.scope?.value as string)?.toLowerCase() === "local") {
                node.codedata.lineRange = {
                    fileName: visualizerLocation.documentUri,
                    startLine: target,
                    endLine: target,
                };
            }

            rpcClient
                .getBIDiagramRpcClient()
                .getSourceCode({
                    filePath: connectionsFilePath,
                    flowNode: node,
                    isConnector: true,
                })
                .then((response) => {
                    console.log(">>> Updated source code", response);
                    if (response.artifacts.length > 0) {
                        // clear memory
                        selectedNodeRef.current = undefined;
                        setSavingFormStatus(SavingFormStatus.SUCCESS);
                        onClose ? onClose() : gotoHome();
                    } else {
                        console.error(">>> Error updating source code", response);
                        setSavingFormStatus(SavingFormStatus.ERROR);
                    }
                });
        }
    };

    const handleOnGenerateSubmit = async (data: FormValues) => {
        // Note: Project path is empty as the value is overridden in the rpc client
        const response = await rpcClient
            .getBIDiagramRpcClient()
            .generateOpenApiClient({ openApiContractPath: data["openApiSpecPath"], projectPath: "", module: data["module"] });
        if (response.errorMessage) {
            setGenConnectorFields((prevFields) =>
                prevFields.map((field) =>
                    field.key === "module"
                        ? {
                            ...field,
                            diagnostics: [
                                ...field.diagnostics,
                                { message: response.errorMessage, severity: "ERROR" },
                            ],
                        }
                        : field
                )
            );
        } else {
            handleOnBack();
            setConnectorsViewKey((prev) => prev + 1);
        }
    };

    const handleOnBack = () => {
        setCurrentStep(WizardStep.CONNECTOR_LIST);
    };

    const handleSubPanel = (subPanel: SubPanel) => {
        setSubPanel(subPanel);
    };

    const updateExpressionField = (data: ExpressionFormField) => {
        setUpdatedExpressionField(data);
    };

    const findSubPanelComponent = (subPanel: SubPanel) => {
        switch (subPanel.view) {
            case SubPanelView.INLINE_DATA_MAPPER:
                return (
                    <InlineDataMapper
                        onClosePanel={handleSubPanel}
                        updateFormField={updateExpressionField}
                        {...subPanel.props?.inlineDataMapper}
                    />
                );
            case SubPanelView.HELPER_PANEL:
                return (
                    <HelperView
                        filePath={subPanel.props.sidePanelData.filePath}
                        position={subPanel.props.sidePanelData.range}
                        updateFormField={updateExpressionField}
                        editorKey={subPanel.props.sidePanelData.editorKey}
                        onClosePanel={handleSubPanel}
                        configurePanelData={subPanel.props.sidePanelData?.configurePanelData}
                    />
                );
            default:
                return null;
        }
    };

    const handleResetUpdatedExpressionField = () => {
        setUpdatedExpressionField(undefined);
    };

    const gotoHome = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.Overview,
            },
        });
    };

    return (
        <Container>
            <>
                <ConnectorView
                    key={connectorsViewKey}
                    fileName={fileName}
                    targetLinePosition={target}
                    onSelectConnector={handleOnSelectConnector}
                    onAddGeneratedConnector={handleOnAddGeneratedConnector}
                    fetchingInfo={fetchingInfo}
                    onClose={onClose}
                />
                {(currentStep === WizardStep.CONNECTION_CONFIG || currentStep === WizardStep.GENERATE_CONNECTOR) && (
                    <Overlay sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.3`, zIndex: 2000 }} />
                )}
            </>
            {!fetchingInfo && currentStep === WizardStep.CONNECTION_CONFIG && (
                <PanelContainer
                    show={true}
                    title={`Configure the ${selectedConnectorRef.current?.metadata.label || ""} Connector`}
                    onClose={onClose ? onClose : handleOnBack}
                    width={400}
                    subPanelWidth={subPanel?.view === SubPanelView.INLINE_DATA_MAPPER ? 800 : 400}
                    subPanel={findSubPanelComponent(subPanel)}
                    onBack={handleOnBack}
                >
                    <>
                        {pullingStatus === PullingStatus.PULLING && (
                            <StatusCard>
                                <DownloadIcon color={ThemeColors.ON_SURFACE} />
                                <StatusText variant="body2">
                                    Please wait while the connector package is being pulled...
                                </StatusText>
                            </StatusCard>
                        )}
                        {pullingStatus === PullingStatus.EXISTS && (
                            <StatusCard>
                                <Icon name="bi-success" sx={{ color: ThemeColors.ON_SURFACE, fontSize: "18px" }} />
                                <StatusText variant="body2">
                                    Connector module already pulled. Please continue with the configuration.
                                </StatusText>
                            </StatusCard>
                        )}
                        {pullingStatus === PullingStatus.SUCCESS && (
                            <StatusCard>
                                <Icon name="bi-success" sx={{ color: ThemeColors.PRIMARY, fontSize: "18px" }} />
                                <StatusText variant="body2">Connector module pulled successfully.</StatusText>
                            </StatusCard>
                        )}
                        {pullingStatus === PullingStatus.ERROR && (
                            <StatusCard>
                                <Icon name="bi-error" sx={{ color: ThemeColors.ERROR, fontSize: "18px" }} />
                                <StatusText variant="body2">
                                    Failed to pull the connector module. Please try again.
                                </StatusText>
                            </StatusCard>
                        )}

                        <BodyText style={{ padding: "20px 16px 0 16px" }}>
                            Provide the necessary configuration details for the selected connector to complete the
                            setup.
                        </BodyText>
                        <ConnectionConfigView
                            fileName={fileName}
                            submitText={savingFormStatus === SavingFormStatus.SAVING ? "Creating..." : "Create"}
                            isSaving={savingFormStatus === SavingFormStatus.SAVING}
                            selectedNode={selectedNodeRef.current}
                            onSubmit={handleOnFormSubmit}
                            updatedExpressionField={updatedExpressionField}
                            resetUpdatedExpressionField={handleResetUpdatedExpressionField}
                            openSubPanel={handleSubPanel}
                            isPullingConnector={
                                pullingStatus === PullingStatus.PULLING || savingFormStatus === SavingFormStatus.SAVING
                            }
                        />
                        {savingFormStatus === SavingFormStatus.SAVING && (
                            <BodyText style={{ padding: "20px 20px 0 20px" }}>Saving connection ...</BodyText>
                        )}
                        {savingFormStatus === SavingFormStatus.SUCCESS && (
                            <BodyText style={{ padding: "20px 20px 0 20px" }}>Connection saved successfully.</BodyText>
                        )}
                        {savingFormStatus === SavingFormStatus.ERROR && (
                            <BodyText style={{ padding: "20px 20px 0 20px" }}>Error saving connection.</BodyText>
                        )}
                    </>
                </PanelContainer>
            )}
            {!fetchingInfo && currentStep === WizardStep.GENERATE_CONNECTOR && (
                <PanelContainer
                    show={true}
                    title={`Generate a new connector`}
                    onClose={onClose ? onClose : handleOnBack}
                    width={400}
                    subPanelWidth={400}
                    onBack={handleOnBack}
                >
                    <>
                        <BodyText style={{ padding: "20px 16px 0 16px" }}>
                            Provide the necessary details to generate the connector.
                        </BodyText>
                        <FormGeneratorNew
                            fileName={fileName}
                            targetLineRange={targetLineRange}
                            fields={genConnectorFields}
                            onSubmit={handleOnGenerateSubmit}
                            submitText={"Generate"}
                            nestedForm={false}
                        />
                        {savingFormStatus === SavingFormStatus.SAVING && (
                            <BodyText style={{ padding: "20px 20px 0 20px" }}>Saving connection ...</BodyText>
                        )}
                        {savingFormStatus === SavingFormStatus.SUCCESS && (
                            <BodyText style={{ padding: "20px 20px 0 20px" }}>Connection saved successfully.</BodyText>
                        )}
                        {savingFormStatus === SavingFormStatus.ERROR && (
                            <BodyText style={{ padding: "20px 20px 0 20px" }}>Error saving connection.</BodyText>
                        )}
                    </>
                </PanelContainer>
            )}
        </Container>
    );
}

export default AddConnectionWizard;

// TODO: remove this logic once module pull supported from LS
export function isConnectorDependOnDriver(connectorModule: string): boolean {
    const dbConnectors = ["mysql", "mssql", "postgresql", "oracledb", "cdata.connect", "snowflake"];
    if (dbConnectors.includes(connectorModule)) {
        return true;
    }
    return false;
}

// run command message handler
export function handleRunCommandResponse(response: RunExternalCommandResponse): PullingStatus {
    if (response.message.includes("Package already exists")) {
        return PullingStatus.EXISTS;
    }
    if (response.message.includes("pulled from central successfully")) {
        return PullingStatus.SUCCESS;
    }
    if (!response.error) {
        return PullingStatus.SUCCESS;
    }
    return PullingStatus.ERROR;
}
