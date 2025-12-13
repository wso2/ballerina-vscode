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

import React, { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { FlowNode, LinePosition, ParentPopupData, SubPanel, SubPanelView } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Codicon, ThemeColors, Typography, Overlay, ProgressRing } from "@wso2/ui-toolkit";
import ConnectionConfigView from "../ConnectionConfigView";
import { getFormProperties } from "../../../../utils/bi";
import { ExpressionFormField } from "@wso2/ballerina-side-panel";
import { HelperView } from "../../HelperView";
import { ConnectorIcon } from "@wso2/bi-diagram";
import { cloneDeep } from "lodash";

const PopupOverlay = styled(Overlay)`
    z-index: 1999;
`;

const PopupContainer = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    max-width: 800px;
    height: 80%;
    max-height: 800px;
    z-index: 2000;
    background-color: ${ThemeColors.SURFACE_BRIGHT};
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const ConfigHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 24px 32px;
    border-bottom: 1px solid ${ThemeColors.OUTLINE_VARIANT};
`;

const BackButton = styled(Button)`
    min-width: auto;
    padding: 4px;
`;

const ConfigTitleContainer = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const PopupTitle = styled(Typography)`
    font-size: 20px;
    font-weight: 600;
    color: ${ThemeColors.ON_SURFACE};
    margin: 0;
`;

const ConfigSubtitle = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 0;
`;

const CloseButton = styled(Button)`
    min-width: auto;
    padding: 4px;
`;

const ConnectorInfoCard = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    margin: 24px 32px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 8px;
    background-color: ${ThemeColors.SURFACE_DIM};
    position: relative;
`;

const ConnectorInfoIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 8px;
    background-color: ${ThemeColors.SURFACE_CONTAINER};
    flex-shrink: 0;

    & > img {
        width: 32px;
        height: 32px;
        object-fit: contain;
    }

    & > svg {
        width: 32px;
        height: 32px;
    }
`;

const StyledCodicon = styled(Codicon)`
    font-size: 32px;
    width: 32px;
    height: 32px;
`;

const StyledConnectorIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;

    & > img {
        width: 32px;
        height: 32px;
        object-fit: contain;
    }

    & > svg {
        width: 32px;
        height: 32px;
    }
`;

const ConnectorInfoContent = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const ConnectorInfoName = styled(Typography)`
    font-size: 16px;
    font-weight: 600;
    color: ${ThemeColors.ON_SURFACE};
    margin: 0;
`;

const ConnectorInfoDescription = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 0;
`;


const ContentContainer = styled.div<{ hasFooterButton?: boolean }>`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: ${(props: { hasFooterButton?: boolean }) => props.hasFooterButton ? "hidden" : "auto"};
    padding: 24px 32px;
    padding-bottom: ${(props: { hasFooterButton?: boolean }) => props.hasFooterButton ? "0" : "24px"};
`;

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    padding: 40px;
`;

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
    }, [connectionName, rpcClient, onClose]);

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



    const updateExpressionField = (data: ExpressionFormField) => {
        setUpdatedExpressionField(data);
    };

    const handleResetUpdatedExpressionField = () => {
        setUpdatedExpressionField(undefined);
    };


    const handleBack = () => {
        handleClosePopup();
    };

    const getConnectorName = () => {
        return connection?.codedata?.module || connectionName || "Connection";
    };

    const getConnectorDescription = () => {
        return connection?.metadata?.description || "";
    };

    const getConnectorIcon = () => {
        return connection?.metadata?.icon;
    };

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
                        <PopupTitle variant="h2">Edit Connection</PopupTitle>
                        <ConfigSubtitle variant="body2">
                            Update connection settings for this connector
                        </ConfigSubtitle>
                    </ConfigTitleContainer>
                    <CloseButton appearance="icon" onClick={handleClosePopup}>
                        <Codicon name="close" />
                    </CloseButton>
                </ConfigHeader>

                <ConnectorInfoCard>
                    <ConnectorInfoIcon>
                        {getConnectorIcon() ? (
                            <StyledConnectorIcon>
                                <ConnectorIcon url={getConnectorIcon()} />
                            </StyledConnectorIcon>
                        ) : (
                            <StyledCodicon name="package" />
                        )}
                    </ConnectorInfoIcon>
                    <ConnectorInfoContent>
                        <ConnectorInfoName>{getConnectorName()}</ConnectorInfoName>
                        <ConnectorInfoDescription>
                            {getConnectorDescription()}
                        </ConnectorInfoDescription>
                    </ConnectorInfoContent>
                </ConnectorInfoCard>

                <ContentContainer hasFooterButton={true}>
                    <ConnectionConfigView
                        submitText={isSaving ? "Saving..." : "Save"}
                        fileName={filePath}
                        selectedNode={(() => {
                            // Remove description property from node before passing to form
                            // since it's already shown in the connector info card
                            const nodeWithoutDescription = cloneDeep(connection);
                            if (nodeWithoutDescription?.metadata?.description) {
                                delete nodeWithoutDescription.metadata.description;
                            }
                            return nodeWithoutDescription;
                        })()}
                        onSubmit={handleOnFormSubmit}
                        updatedExpressionField={updatedExpressionField}
                        resetUpdatedExpressionField={handleResetUpdatedExpressionField}
                        isSaving={isSaving}
                        footerActionButton={true}
                    />
                </ContentContainer>
            </PopupContainer>
        </>
    );
}

export default EditConnectionPopup;

