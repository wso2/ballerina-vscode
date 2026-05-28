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
import { PanelContainer } from "@wso2/ballerina-side-panel";
import { useVisualizerContext } from '../../Context';
import { StatementEditorComponent } from "../StatementEditorComponent"
import { STModification } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { shouldSkipSemicolon } from "../ConstructPanel";
import { fetchConnectorInfo, retrieveUsedAction } from "../Connectors/ConnectorWizard/utils";
import { Typography } from "@wso2/ui-toolkit";

interface EditPanelProps {
    applyModifications: (modifications: STModification[]) => Promise<void>;
}

export function EditPanel(props: EditPanelProps) {
    const { applyModifications } = props;
    const { activePanel, setActivePanel, statementPosition, componentInfo, activeFileInfo } = useVisualizerContext();
    const [isFetching, setIsFetching] = useState(true);
    const { rpcClient } = useRpcContext();

    const closeStatementEditor = () => {
        setActivePanel({ isActive: false });
    }

    const cancelStatementEditor = () => {
        setActivePanel({ isActive: false });
    }

    useEffect(() => {
        if (componentInfo && isFetching) {
            getComponentInfo();
        }

    }, [componentInfo]);

    const getComponentInfo = async () => {
        if ((componentInfo.componentType === "Connector" || componentInfo.componentType === "Action" || componentInfo.componentType === "HttpAction") && componentInfo.connectorInfo?.connector) {
            const connectorMetadata = await fetchConnectorInfo(componentInfo.connectorInfo.connector, rpcClient, activeFileInfo?.filePath);
            componentInfo.connectorInfo.connector = connectorMetadata;
            if (componentInfo.componentType === "Action" || componentInfo.componentType === "HttpAction") {
                const action = retrieveUsedAction(componentInfo.model, connectorMetadata);
                componentInfo.connectorInfo.action = action;
            }
            setIsFetching(false);
        } else {
            setIsFetching(false);
        }
    };


    return (
        <>
            {activeFileInfo?.filePath && componentInfo?.model &&
                <PanelContainer title="Edit Construct" show={activePanel?.isActive} onClose={() => { setActivePanel({ isActive: false }) }}>

                    {isFetching &&
                        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                            <Typography>Loading Statement Editor...</Typography>
                        </div>
                    }
                    {!isFetching &&
                        <StatementEditorComponent
                            label={componentInfo.componentType}
                            config={{ type: componentInfo.componentType, model: componentInfo.model }}
                            initialSource={componentInfo.model?.source}
                            applyModifications={applyModifications}
                            currentFile={{
                                content: activeFileInfo?.fullST?.source || "",
                                path: activeFileInfo?.filePath,
                                size: 1
                            }}
                            formArgs={{
                                ...componentInfo?.connectorInfo
                            }}
                            onCancel={cancelStatementEditor}
                            onClose={closeStatementEditor}
                            syntaxTree={activeFileInfo?.fullST}
                            targetPosition={componentInfo?.position || statementPosition}
                            skipSemicolon={shouldSkipSemicolon(componentInfo?.componentType)}
                        />
                    }

                </PanelContainer>
            }
        </>
    );
}

