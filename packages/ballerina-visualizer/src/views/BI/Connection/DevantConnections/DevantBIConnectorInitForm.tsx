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

import { type MarketplaceItem } from "@wso2/wso2-platform-core";
import React, { type FC } from "react";
import { usePlatformExtContext } from "../../../../providers/platform-ext-ctx-provider";
import { useMutation } from "@tanstack/react-query";
import { DevantConnectionFlow, DevantTempConfig } from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";
import { ConnectionConfigurationForm, ConnectionConfigurationFormProps } from "../ConnectionConfigurationPopup";
import { DIRECTORY_MAP } from "@wso2/ballerina-core";
import { getConnectionInitialName } from "./DevantConnectorCreateForm";

interface Props extends Omit<ConnectionConfigurationFormProps, "devantConfigs"> {
    selectedMarketplaceItem: MarketplaceItem;
    selectedFlow: DevantConnectionFlow;
    devantConfigs: DevantTempConfig[];
    resetDevantConfigs: () => void;
    onAddDevantConfig: (name: string, value: string, isSecret: boolean) => Promise<void>;
    IDLFilePath?: string;
}

export const DevantBIConnectorCreateForm: FC<Props> = (props) => {
    const { selectedMarketplaceItem, selectedFlow, devantConfigs, onAddDevantConfig, IDLFilePath, onClose, resetDevantConfigs } = props;
    const { platformExtState, platformRpcClient } = usePlatformExtContext();

    const { mutate: createDevantInternalConnNonOAS, isPending: isCreating } = useMutation({
        mutationFn: ({ recentIdentifier }: { recentIdentifier: string }) => {
            if (devantConfigs?.length > 0) {
                if (
                    [
                        DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_BI_CONNECTOR,
                        DevantConnectionFlow.REGISTER_CREATE_THIRD_PARTY_FROM_OAS,
                    ].includes(selectedFlow)
                ) {
                    return platformRpcClient.registerAndCreateDevantComponentConnection({
                        name: getConnectionInitialName(
                            recentIdentifier,
                            platformExtState?.devantConns?.list?.map((conn) => conn.name) || [],
                        ),
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
                        name: getConnectionInitialName(
                            selectedMarketplaceItem?.name,
                            platformExtState?.devantConns?.list?.map((conn) => conn.name) || [],
                        ),
                        schemaId: selectedMarketplaceItem.connectionSchemas[0]?.id || "",
                        visibility: "PUBLIC",
                    },
                    importThirdPartyConnectionParams: {
                        devantTempConfigs: devantConfigs || [],
                        name: getConnectionInitialName(
                            selectedMarketplaceItem?.name,
                            platformExtState?.devantConns?.list?.map((conn) => conn.name) || [],
                        ),
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
        />
    );
};
