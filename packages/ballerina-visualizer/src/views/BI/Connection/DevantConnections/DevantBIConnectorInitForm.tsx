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

import { ConnectionListItem, type MarketplaceItem } from "@wso2/wso2-platform-core";
import React, { useEffect, type FC } from "react";
import { usePlatformExtContext } from "../../../../providers/platform-ext-ctx-provider";
import { useMutation } from "@tanstack/react-query";
import { DevantConnectionFlow, DevantTempConfig } from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";
import { ConnectionConfigurationForm, ConnectionConfigurationFormProps } from "../ConnectionConfigurationPopup";
import { DIRECTORY_MAP } from "@wso2/ballerina-core";
import { generateInitialConnectionName, isValidDevantConnName } from "./utils";

interface Props extends Omit<ConnectionConfigurationFormProps, "devantConfigs"> {
    importedConnection?: ConnectionListItem;
    selectedMarketplaceItem: MarketplaceItem;
    selectedFlow: DevantConnectionFlow;
    devantConfigs: DevantTempConfig[];
    resetDevantConfigs: () => void;
    onAddDevantConfig: (name: string, value: string, isSecret: boolean) => Promise<void>;
    IDLFilePath?: string;
    biConnectionNames: string[];
    onFlowChange: (flow: DevantConnectionFlow | null) => void;
    projectPath: string;
}

export const DevantBIConnectorCreateForm: FC<Props> = (props) => {
    const { selectedMarketplaceItem, selectedFlow, devantConfigs, onAddDevantConfig, IDLFilePath, biConnectionNames, onClose, resetDevantConfigs, onFlowChange, importedConnection, projectPath } = props;
    const { platformExtState, platformRpcClient } = usePlatformExtContext();

    let initialNameCandidate = selectedMarketplaceItem?.name?.replaceAll(" ", "_")?.replaceAll("-","_") || "my_connection";
    if ([ DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_BI_CONNECTOR,DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_OAS].includes(selectedFlow) ){
        initialNameCandidate = `${props.selectedConnector?.codedata?.module}Connection`
    }
    if(importedConnection){
        initialNameCandidate = importedConnection?.name?.replaceAll(" ", "_")?.replaceAll("-","_") || "my_connection";
    }

    useEffect(() => {
        if (selectedMarketplaceItem && !props.selectedConnector) {
            if(importedConnection){
                onFlowChange(
                    selectedMarketplaceItem.isThirdParty
                        ? DevantConnectionFlow.IMPORT_THIRD_PARTY_OTHER_SELECT_BI_CONNECTOR
                        : DevantConnectionFlow.IMPORT_INTERNAL_OTHER_SELECT_BI_CONNECTOR,
                );
            }else{
                onFlowChange(
                    selectedMarketplaceItem.isThirdParty
                        ? DevantConnectionFlow.CREATE_THIRD_PARTY_OTHER_SELECT_BI_CONNECTOR
                        : DevantConnectionFlow.CREATE_INTERNAL_OTHER_SELECT_BI_CONNECTOR,
                );
            }
        }
    }, [props.selectedConnector]);

    const { mutate: createDevantInternalConnNonOAS, isPending: isCreating } = useMutation({
        mutationFn: async ({ recentIdentifier }: { recentIdentifier: string }) => {
            if(importedConnection){
                const connectionDetailed = await platformRpcClient.getConnection({
                    connectionGroupId: importedConnection.groupUuid,
                    orgId: platformExtState?.selectedContext?.org?.id?.toString()
                })
                await platformRpcClient.replaceDevantTempConfigValues({
                    configs: devantConfigs,
                    createdConnection: connectionDetailed,
                })
                await platformRpcClient.createConnectionConfig({
                    marketplaceItem: selectedMarketplaceItem,
                    name: importedConnection.name,
                    visibility: "PUBLIC",
                    componentDir: projectPath
                })
            } else if (devantConfigs?.length > 0) {
                if (
                    [
                        DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_BI_CONNECTOR,
                        DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_OAS,
                    ].includes(selectedFlow)
                ) {
                    return platformRpcClient.registerAndCreateDevantComponentConnection({
                        name: recentIdentifier,
                        configs: devantConfigs?.map((item) => ({ ...item, id: item.name })) || [],
                        idlFilePath: IDLFilePath || "",
                        idlType:
                            selectedFlow === DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_OAS
                                ? "OpenAPI"
                                : "TCP",
                        serviceType: "REST",
                    });
                }
                return platformRpcClient.createDevantComponentConnectionV2({
                    flow: selectedFlow,
                    marketplaceItem: selectedMarketplaceItem,
                    createInternalConnectionParams: {
                        devantTempConfigs: devantConfigs || [],
                        name: recentIdentifier,
                        schemaId: selectedMarketplaceItem.connectionSchemas[0]?.id || "",
                        visibility: "PUBLIC",
                    },
                    importThirdPartyConnectionParams: {
                        devantTempConfigs: devantConfigs || [],
                        name: recentIdentifier,
                        schemaId: selectedMarketplaceItem.connectionSchemas[0]?.id || "",
                    },
                });
            }
        },
        onError: (error) => {
            console.error(">>> Error creating Devant connection", error);
        },
        onSuccess: (_, { recentIdentifier }) => {
            resetDevantConfigs();
            onClose({ recentIdentifier, artifactType: DIRECTORY_MAP.CONNECTION });
        },
    });

    if(!props.selectedConnector){
        return null;
    }

    return (
        <ConnectionConfigurationForm
            {...props}
            devantExpressionEditor={{
                devantConfigs: devantConfigs.map((config) => config.name),
                onAddDevantConfig: [
                    // Only allow users to create devant configs via these flows
                    DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_BI_CONNECTOR,
                    DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_OAS,
                ].includes(selectedFlow)
                    ? onAddDevantConfig
                    : undefined,
            }}
            onClose={(params) => {
                if (params.recentIdentifier) {
                    createDevantInternalConnNonOAS({ recentIdentifier: params.recentIdentifier });
                } else {
                    onClose();
                }
            }}
            loading={isCreating}
            customValidator={(fieldKey, value) => {
                if (fieldKey === "variable") {
                    return isValidDevantConnName(value, devantConfigs?.map((conn) => conn.name) || [], biConnectionNames);
                }
                return undefined;
            }}
            overrideFlowNode={(node) => {
                if(node.properties.variable){
                    node.properties.variable.value = importedConnection ? initialNameCandidate : generateInitialConnectionName(
                        biConnectionNames,
                        platformExtState?.devantConns?.list?.map((conn) => conn.name) || [],
                        initialNameCandidate
                    )
                    if(importedConnection){
                        node.properties.variable.editable = false;
                    }
                }
                return node
            }}
        />
    );
};
