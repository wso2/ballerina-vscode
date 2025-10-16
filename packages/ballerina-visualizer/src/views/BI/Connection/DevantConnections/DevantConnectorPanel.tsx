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

import React, { FC, useState } from "react";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { useQuery } from "@tanstack/react-query";
import { MarketplaceItem } from "@wso2/wso2-platform-core";
import { DevantConnectorMarketplaceInfo } from "./DevantConnectorMarketplaceInfo";
import { PanelContainer } from "@wso2/ballerina-side-panel";
import { DevantConnectorCreateForm } from "./DevantConnectorCreateForm";

export const DevantConnectorPanel: FC<{ selectedItem: MarketplaceItem; onClose: () => void }> = ({
    selectedItem,
    onClose,
}) => {
    const { rpcClient } = useRpcContext();
    const [showInfo, setShowInfo] = useState(false);

    const { data: projectPath } = useQuery({
        queryKey: ["projectPath"],
        queryFn: () => rpcClient.getVisualizerLocation(),
    });

    const { data: isLoggedIn } = useQuery({
        queryKey: ["isLoggedIn"],
        queryFn: () => rpcClient.getPlatformRpcClient().isLoggedIn(),
        refetchInterval: 2000,
    });

    const { data: selected } = useQuery({
        queryKey: ["devant-context", isLoggedIn],
        queryFn: () => rpcClient.getPlatformRpcClient().getSelectedContext(),
        enabled: !!isLoggedIn,
        refetchInterval: 2000,
    });

    const { data: directoryComponent } = useQuery({
        queryKey: [
            "getDirectoryComponents",
            { isLoggedIn, org: selected?.org?.uuid, project: selected?.project?.id, projectPath },
        ],
        queryFn: () => rpcClient.getPlatformRpcClient().getDirectoryComponents(projectPath.projectUri),
        enabled: isLoggedIn && !!projectPath,
        select: (components) => components[0] || null,
        refetchInterval: 2000,
    });

    return (
        <>
            <>
                <PanelContainer
                    show={true}
                    title="Create New Devant Connection"
                    onClose={() => onClose()}
                    subPanelWidth={600}
                    subPanel={
                        showInfo && (
                            <DevantConnectorMarketplaceInfo
                                onCloseClick={() => setShowInfo(false)}
                                org={selected?.org}
                                item={selectedItem}
                            />
                        )
                    }
                >
                    <DevantConnectorCreateForm
                        component={directoryComponent}
                        item={selectedItem}
                        onCreate={() => onClose()}
                        directoryFsPath={projectPath?.projectUri}
                        org={selected.org}
                        project={selected.project}
                        onShowInfo={() => setShowInfo(true)}
                        isShowingInfo={showInfo}
                    />
                </PanelContainer>
            </>
        </>
    );
};
