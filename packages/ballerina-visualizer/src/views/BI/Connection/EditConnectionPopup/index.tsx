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

import React, { useEffect, useState, useMemo } from "react";
import styled from "@emotion/styled";
import { FlowNode, LinePosition, ParentPopupData, EVENT_TYPE, MACHINE_VIEW } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Codicon, ThemeColors, Typography, ProgressRing, Button, Icon } from "@wso2/ui-toolkit";
import ConnectionConfigView from "../ConnectionConfigView";
import { getFormProperties } from "../../../../utils/bi";
import { ExpressionFormField } from "@wso2/ballerina-side-panel";
import { cloneDeep } from "lodash";
import { PopupOverlay, PopupContainer, PopupHeader as ConfigHeader, BackButton, HeaderTitleContainer as ConfigTitleContainer, PopupTitle, PopupSubtitle as ConfigSubtitle, CloseButton } from "../styles";
import { ConnectionKind, ConnectionSelectionList, ConnectionCreator } from "../../../../components/ConnectionSelector";
import { SidePanelView } from "../../FlowDiagram/PanelManager";
import { getNodeTemplateForConnection } from "../../FlowDiagram/utils";

const ConnectionDetailsSection = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
`;

const ConnectionDetailsTitleSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
`;

const ConnectionDetailsTitle = styled(Typography)`
    font-size: 16px;
    font-weight: 600;
    color: ${ThemeColors.ON_SURFACE};
    margin: 0;
`;

const ConnectionDetailsSubtitle = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 0;
`;

const Separator = styled.div`
    width: 100%;
    height: 1px;
    background-color: ${ThemeColors.OUTLINE_VARIANT};
`;

const ContentContainer = styled.div<{ hasFooterButton?: boolean }>`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: ${(props: { hasFooterButton?: boolean }) => props.hasFooterButton ? "hidden" : "auto"};
    padding: 24px 32px;
    padding-bottom: ${(props: { hasFooterButton?: boolean }) => props.hasFooterButton ? "0" : "24px"};
    min-height: 0;
`;

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    padding: 40px;
`;

// Navigation views for the popup
enum PopupView {
    CONNECTION_CONFIG = "CONNECTION_CONFIG",
    CONNECTION_SELECT = "CONNECTION_SELECT",
    CONNECTION_CREATE = "CONNECTION_CREATE"
}

interface PersistConnectionInfo {
    isPersist: boolean;
    modelFilePath: string;
}

interface EditConnectionPopupProps {
    connectionName: string;
    fileName?: string;
    target?: LinePosition;
    onClose?: (data?: ParentPopupData) => void;
}

export function EditConnectionPopup(props: EditConnectionPopupProps) {
    const { connectionName, fileName, target, onClose } = props;
    const { rpcClient } = useRpcContext();

    const [connection, setConnection] = useState<FlowNode>();
    const [filePath, setFilePath] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [updatedExpressionField, setUpdatedExpressionField] = useState<ExpressionFormField>(undefined);
    const [persistConnection, setPersistConnection] = useState<PersistConnectionInfo>({
        isPersist: false,
        modelFilePath: ""
    });

    // Navigation state
    const [currentView, setCurrentView] = useState<PopupView>(PopupView.CONNECTION_CONFIG);
    const [selectedConnectionKind, setSelectedConnectionKind] = useState<ConnectionKind>();
    const [nodeFormTemplate, setNodeFormTemplate] = useState<FlowNode>();

    useEffect(() => {
        const fetchConnection = async () => {
            setIsLoading(true);
            try {
                const res = await rpcClient.getBIDiagramRpcClient().getModuleNodes();
                console.log(">>> moduleNodes", { moduleNodes: res });

                if (!res.flowModel.connections || res.flowModel.connections.length === 0) {
                    console.error(">>> No connections found");
                    if (onClose) {
                        onClose();
                    } else {
                        rpcClient.getVisualizerRpcClient()?.goHome();
                    }
                    return;
                }

                const connector = res.flowModel.connections.find(
                    (node) => node.properties.variable.value === connectionName
                );

                if (!connector) {
                    console.error(">>> Error finding connector", { connectionName });
                    if (onClose) {
                        onClose();
                    } else {
                        rpcClient.getVisualizerRpcClient()?.goHome();
                    }
                    return;
                }

                const connectionFile = connector.codedata.lineRange.fileName;
                const connectionFilePath = (await rpcClient.getVisualizerRpcClient().joinProjectPath({
                    segments: [connectionFile]
                })).filePath;

                setFilePath(connectionFilePath);
                setConnection(connector);

                // Check if this is a persist connection and store connection info
                const metadataData = connector.metadata?.data as any;
                const isPersist = metadataData?.connectorType === "persist";
                setPersistConnection({
                    isPersist: isPersist,
                    modelFilePath: isPersist && metadataData?.persistModelFile ? metadataData.persistModelFile : ""
                });

                const formProperties = getFormProperties(connector);
                console.log(">>> Connector form properties", formProperties);
            } catch (error) {
                console.error(">>> Error fetching connection", error);
                if (onClose) {
                    onClose();
                } else {
                    rpcClient.getVisualizerRpcClient()?.goHome();
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchConnection();
    }, [connectionName, rpcClient]);

    const handleClosePopup = () => {
        if (onClose) {
            onClose();
        } else {
            rpcClient.getVisualizerRpcClient()?.goHome();
        }
    };

    const handleOnFormSubmit = async (node: FlowNode) => {
        console.log(">>> on form submit", node);
        if (connection) {
            setIsSaving(true);
            try {
                if (filePath === "") {
                    console.error(">>> Error updating source code. No source file found");
                    setIsSaving(false);
                    return;
                }

                const response = await rpcClient.getBIDiagramRpcClient().getSourceCode({
                    filePath: filePath,
                    flowNode: node,
                    isConnector: true,
                });

                console.log(">>> Updated source code", response);
                if (response.artifacts.length > 0) {
                    handleClosePopup();
                } else {
                    console.error(">>> Error updating source code", response);
                }
            } catch (error) {
                console.error(">>> Error saving connection", error);
            } finally {
                setIsSaving(false);
            }
        }
    };


    const handleResetUpdatedExpressionField = () => {
        setUpdatedExpressionField(undefined);
    };

    // Navigation handlers
    const handleNavigateToPanel = async (targetPanel: SidePanelView, connectionKind?: ConnectionKind) => {
        if (connectionKind) {
            setSelectedConnectionKind(connectionKind);
        }
        switch (targetPanel) {
            case SidePanelView.CONNECTION_SELECT:
                setCurrentView(PopupView.CONNECTION_SELECT);
                break;
            case SidePanelView.CONNECTION_CREATE:
                setCurrentView(PopupView.CONNECTION_CREATE);
                break;
            default:
                setCurrentView(PopupView.CONNECTION_CONFIG);
        }
    };

    const handleSelectNewConnection = async (nodeId: string, metadata?: any) => {
        try {
            const { flowNode, connectionKind } = await getNodeTemplateForConnection(
                nodeId,
                metadata,
                connection?.codedata?.lineRange,
                filePath,
                rpcClient
            );
            setNodeFormTemplate(flowNode);
            setSelectedConnectionKind(connectionKind as ConnectionKind);
            setCurrentView(PopupView.CONNECTION_CREATE);
        } catch (error) {
            console.error('Error getting node template for connection:', error);
        }
    };

    const handleConnectionCreated = (connectionNode: FlowNode) => {
        // Update the connection state with the modified node to trigger re-render
        // and update the memoized selectedNode
        setConnection(cloneDeep(connectionNode));
        setCurrentView(PopupView.CONNECTION_CONFIG);
    };

    const handleBack = () => {
        switch (currentView) {
            case PopupView.CONNECTION_SELECT:
                setCurrentView(PopupView.CONNECTION_CONFIG);
                break;
            case PopupView.CONNECTION_CREATE:
                setCurrentView(PopupView.CONNECTION_SELECT);
                break;
            default:
                handleClosePopup();
        }
    };

    const handleOpenERDiagram = async () => {
        const visualizerLocation = await rpcClient.getVisualizerLocation();

        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.ERDiagram,
                projectPath: visualizerLocation.projectPath,
                documentUri: persistConnection.modelFilePath
            }
        });
    };

    const getViewTitle = () => {
        switch (currentView) {
            case PopupView.CONNECTION_SELECT:
                return `Select ${connection?.codedata?.module || ''} Connection`;
            case PopupView.CONNECTION_CREATE:
                return `Create ${connection?.codedata?.module || ''} Connection`;
            default:
                return "Edit Connection";
        }
    };

    const getViewSubtitle = () => {
        switch (currentView) {
            case PopupView.CONNECTION_SELECT:
                return "Choose a connection type";
            case PopupView.CONNECTION_CREATE:
                return "Configure new connection";
            default:
                return "Update connection details";
        }
    };

    const renderCurrentView = () => {
        switch (currentView) {
            case PopupView.CONNECTION_SELECT:
                return (
                    <ConnectionSelectionList
                        connectionKind={selectedConnectionKind}
                        selectedNode={connection}
                        onSelect={handleSelectNewConnection}
                    />
                );
            case PopupView.CONNECTION_CREATE:
                return (
                    <ConnectionCreator
                        connectionKind={selectedConnectionKind}
                        selectedNode={connection}
                        nodeFormTemplate={nodeFormTemplate}
                        onSave={handleConnectionCreated}
                    />
                );
            default:
                return (
                    <>
                        <ConnectionDetailsSection>
                            <ConnectionDetailsTitleSection>
                                <ConnectionDetailsTitle variant="h3">Connection Details</ConnectionDetailsTitle>
                                <ConnectionDetailsSubtitle variant="body2">
                                    Configure your connection settings
                                </ConnectionDetailsSubtitle>
                            </ConnectionDetailsTitleSection>
                            {persistConnection.isPersist && (
                                <Button
                                    appearance="secondary"
                                    onClick={handleOpenERDiagram}
                                    buttonSx={{
                                        display: "flex",
                                        alignItems: "center",
                                        fontSize: "13px",
                                        whiteSpace: "nowrap"
                                    }}
                                    tooltip="View Entity Relationship Diagram"
                                >
                                    <Icon
                                        name="persist-diagram"
                                        sx={{
                                            fontSize: "14px",
                                            width: "14px",
                                            height: "14px",
                                            marginRight: "4px"
                                        }}
                                    />
                                    View ER Diagram
                                </Button>
                            )}
                        </ConnectionDetailsSection>
                        {persistConnection.isPersist && <Separator />}
                        {selectedNode && (
                            <ConnectionConfigView
                                submitText={isSaving ? "Updating..." : "Update Connection"}
                                fileName={filePath}
                                selectedNode={selectedNode}
                                onSubmit={handleOnFormSubmit}
                                updatedExpressionField={updatedExpressionField}
                                resetUpdatedExpressionField={handleResetUpdatedExpressionField}
                                isSaving={isSaving}
                                footerActionButton={true}
                                navigateToPanel={handleNavigateToPanel}
                            />
                        )}
                    </>
                );
        }
    };

    const selectedNode = useMemo(() => {
        if (!connection) return undefined;

        // Remove description property from node before passing to form
        // since it's already shown in the connector info card
        const nodeWithoutDescription = cloneDeep(connection);
        if (nodeWithoutDescription?.metadata?.description) {
            delete nodeWithoutDescription.metadata.description;
        }
        return nodeWithoutDescription;
    }, [connection]);

    if (isLoading) {
        return (
            <>
                <PopupOverlay sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.5` }} />
                <PopupContainer>
                    <LoadingContainer>
                        <ProgressRing />
                    </LoadingContainer>
                </PopupContainer>
            </>
        );
    }

    if (!connection) {
        return null;
    }

    return (
        <>
            <PopupOverlay sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.5` }} />
            <PopupContainer>
                <ConfigHeader>
                    <BackButton appearance="icon" onClick={handleBack}>
                        <Codicon name="chevron-left" />
                    </BackButton>
                    <ConfigTitleContainer>
                        <PopupTitle variant="h2">{getViewTitle()}</PopupTitle>
                        <ConfigSubtitle variant="body2">
                            {getViewSubtitle()}
                        </ConfigSubtitle>
                    </ConfigTitleContainer>
                    <CloseButton appearance="icon" onClick={handleClosePopup}>
                        <Codicon name="close" />
                    </CloseButton>
                </ConfigHeader>
                <ContentContainer hasFooterButton={currentView === PopupView.CONNECTION_CONFIG}>
                    {renderCurrentView()}
                </ContentContainer>
            </PopupContainer>
        </>
    );
}

export default EditConnectionPopup;

