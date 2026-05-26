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
// tslint:disable: jsx-no-multiline-js
import { useEffect, useState } from "react";


import { BallerinaConnectorInfo, BallerinaModuleResponse, BallerinaConnectorsRequest, BallerinaConstruct, STModification } from "@wso2/ballerina-core";


import { Marketplace, SearchQueryParams } from "../Marketplace";
import { BallerinaRpcClient, useRpcContext } from "@wso2/ballerina-rpc-client";
import { fetchConnectorInfo, getConnectorImports, getInitialSourceForConnectors } from "./utils";
import { useVisualizerContext } from "../../../Context";
import { PanelContainer } from "@wso2/ballerina-side-panel";
import { StatementEditorComponent } from "../../StatementEditorComponent";
import { getSymbolInfo } from "@wso2/ballerina-low-code-diagram";


export interface ConnectorListProps {
    applyModifications: (modifications: STModification[]) => Promise<void>;
}

export function ConnectorList(props: ConnectorListProps) {
    const { applyModifications } = props;
    const [pullingPackage, setPullingPackage] = useState(false);
    const [selectedConnector, setSelectedConnector] = useState<BallerinaConnectorInfo>();
    const [showStatementEditor, setShowStatementEditor] = useState<boolean>(false);
    const [initialSource, setInitialSource] = useState<string>();
    const { activeFileInfo, statementPosition, setActivePanel, setSidePanel } = useVisualizerContext();


    const { rpcClient } = useRpcContext();

    useEffect(() => {
        if (
            pullingPackage &&
            selectedConnector?.package?.organization &&
            selectedConnector.package.name
        ) {
            // setPullingPackage(true);
            const imports = getConnectorImports(activeFileInfo?.fullST, selectedConnector.package.organization, selectedConnector.moduleName, true);
            if (imports && imports?.size > 0) {
                let pullCommand = "";
                imports.forEach((impt) => {
                    if (pullCommand !== "") {
                        pullCommand += ` && `;
                    }
                    pullCommand += `bal pull ${impt.replace(" as _", "")}`;
                });
                rpcClient.getCommonRpcClient().runBackgroundTerminalCommand({ command: pullCommand })
                    .then((res) => {
                        if (res.error && !res.message.includes("already exists")) {
                            // TODO: Handle error properly
                            console.error('Something wrong when pulling package: ', res.message);
                        }
                    })
                    .catch((err) => {
                        // TODO: Handle error properly
                        console.error('Something wrong when pulling package: ', err);
                    })
                    .finally(async () => {
                        setPullingPackage(false);
                        // get the initial source
                        const stSymbolInfo = getSymbolInfo();
                        const initialSource = await getInitialSourceForConnectors(selectedConnector, statementPosition, stSymbolInfo, activeFileInfo.activeSequence);
                        setInitialSource(initialSource);
                        setShowStatementEditor(true);
                    });
            }
        }
    }, [selectedConnector]);

    const fetchConnectorsList = async (
        queryParams: SearchQueryParams,
        currentFilePath: string,
        langClient: BallerinaRpcClient,
    ): Promise<BallerinaModuleResponse> => {
        const { query, category, filterState, limit, page } = queryParams;
        const request: BallerinaConnectorsRequest = {
            targetFile: currentFilePath,
            query,
            limit: limit,
        };
        if (category) {
            request.keyword = category;
        }
        if (page) {
            request.offset = (page - 1) * (limit || 5);
        }
        return langClient.getConnectorWizardRpcClient().getConnectors(request);
    };

    const onSelect = async (balModule: BallerinaConstruct, langClient: BallerinaRpcClient) => {
        setPullingPackage(true);
        const connectorMetadata = await fetchConnectorInfo(balModule, langClient, activeFileInfo?.filePath);
        setSelectedConnector(connectorMetadata);
    }

    const closeStatementEditor = () => {
        setShowStatementEditor(false);
        setSidePanel("EMPTY");
    }

    const cancelStatementEditor = () => {
        setShowStatementEditor(false);
        setSelectedConnector(undefined);
    }

    const onMarketplaceClose = () => {
        setSidePanel("EMPTY");
    }

    return (
        <>
            {pullingPackage &&
                (
                    <PanelContainer title="Pulling packages" show={true} onClose={() => setActivePanel({ isActive: false })}>
                        Pulling Packages ...
                    </PanelContainer>
                )}
            {activeFileInfo?.filePath && !selectedConnector && !pullingPackage &&
                <Marketplace
                    currentFilePath={activeFileInfo?.filePath}
                    onSelect={onSelect}
                    onClose={onMarketplaceClose}
                    fetchModulesList={fetchConnectorsList}
                    title={"Connectors"}
                    shortName="connectors"
                />
            }
            {selectedConnector && !pullingPackage && activeFileInfo?.filePath && showStatementEditor &&
                <PanelContainer title="Add Connector" show={true} onClose={cancelStatementEditor}>
                    (
                    <StatementEditorComponent
                        label={"Connector"}
                        config={{ type: "Connector", model: null }}
                        initialSource={initialSource}
                        applyModifications={applyModifications}
                        currentFile={{
                            content: activeFileInfo?.fullST?.source || "",
                            path: activeFileInfo?.filePath,
                            size: 1
                        }}
                        formArgs={{
                            connector: selectedConnector?.package ? selectedConnector : undefined,
                            functionNode: activeFileInfo?.activeSequence,
                        }}
                        onCancel={cancelStatementEditor}
                        onClose={closeStatementEditor}
                        syntaxTree={activeFileInfo?.fullST}
                        targetPosition={statementPosition}
                        skipSemicolon={false}
                        extraModules={getConnectorImports(activeFileInfo?.fullST, selectedConnector?.package?.organization, selectedConnector?.moduleName)}

                    />
                    )
                </PanelContainer>

            }
        </>
    );
}

