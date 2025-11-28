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

import { FC, ReactNode, useEffect, useState } from "react";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Codicon, ProgressRing, Typography } from "@wso2/ui-toolkit";
import ButtonCard from "../../../../components/ButtonCard";
import { BodyTinyInfo } from "../../../styles";
import { useQuery } from "@tanstack/react-query";
import {
    ICreateDirCtxCmdParams,
    MarketplaceItem,
    CommandIds as PlatformExtCommandIds,
    ICmdParamsBase as PlatformExtICmdParamsBase,
} from "@wso2/wso2-platform-core";
import { VSCodePanelTab, VSCodePanelView, VSCodePanels } from "@vscode/webview-ui-toolkit/react";
import { usePlatformExtContext } from "../../../../providers/platform-ext-ctx-provider";

const GridContainer = styled.div<{ isHalfView?: boolean }>`
    display: grid;
    grid-template-columns: ${(props: { isHalfView: boolean }) =>
        props.isHalfView ? "unset" : "repeat(auto-fill, minmax(200px, 1fr))"};
    gap: 12px;
    width: 100%;
`;

const ProgressRingWrap = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    padding-top: 50px;
`;

const AddButtonWrap = styled.div`
    position: absolute;
    top: 10px;
    right: 12px;
`;

export const DevantConnectorList: FC<{
    search: string;
    hideTitle?: boolean;
    onSelectDevantConnector: (item: MarketplaceItem) => void;
}> = ({ search, hideTitle, onSelectDevantConnector }) => {
    const { rpcClient } = useRpcContext();
    const { platformExtState, deployableArtifacts, platformRpcClient, workspacePath, projectPath, devantConsoleUrl } =
        usePlatformExtContext();
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [selectedTab, setSelectedTab] = useState<"internal-services" | "third-party-services">("internal-services");

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 2000);
        return () => clearTimeout(handler);
    }, [search]);

    const { data: marketplaceResp, isLoading } = useQuery({
        queryKey: [
            "devant-marketplace",
            {
                org: platformExtState?.selectedContext?.org?.uuid,
                project: platformExtState?.selectedContext?.project?.id,
                debouncedSearch,
                isLoggedIn: platformExtState.isLoggedIn,
                component: platformExtState?.selectedComponent?.metadata?.id,
                internalOnly: selectedTab === "internal-services",
            },
        ],
        queryFn: () =>
            platformRpcClient?.getMarketplaceItems({
                orgId: platformExtState?.selectedContext?.org?.id?.toString(),
                request: {
                    limit: 60,
                    offset: 0,
                    networkVisibilityFilter: selectedTab === "third-party-services" ? "org,project,public" : "all",
                    networkVisibilityprojectId: platformExtState?.selectedContext?.project?.id,
                    sortBy: "createdTime",
                    query: debouncedSearch || undefined,
                    searchContent: false,
                    isThirdParty: selectedTab === "third-party-services",
                },
            }),
        enabled: platformExtState.isLoggedIn && !!platformExtState?.selectedContext?.project,
        select: (data) => ({
            ...data,
            data: data.data.filter((item) =>
                selectedTab === "third-party-services"
                    ? true
                    : item.component?.componentId !== platformExtState?.selectedComponent?.metadata?.id
            ),
        }),
    });

    const openRegisterNew3rdPartySvc = (isNew?: boolean) => {
        rpcClient.getCommonRpcClient().openExternalUrl({
            url: `${devantConsoleUrl}/organizations/${platformExtState?.selectedContext?.org?.handle}/projects/${
                platformExtState?.selectedContext?.project?.id
            }/admin/third-party-services${isNew ? "/new" : ""}`,
        });
    };

    if (!platformExtState.isLoggedIn) {
        return (
            <>
                <Typography variant="body3">
                    You need to be signed into Devant in order connect with dependencies in Devant
                </Typography>
                <Button
                    onClick={() =>
                        rpcClient.getCommonRpcClient().executeCommand({
                            commands: [
                                PlatformExtCommandIds.SignIn,
                                { extName: "Devant" } as PlatformExtICmdParamsBase,
                            ],
                        })
                    }
                >
                    Sign In
                </Button>
            </>
        );
    }

    if (!platformExtState?.selectedContext?.project) {
        return (
            <>
                <BodyTinyInfo>
                    To connect with dependencies in Devant, you can either deploy your source code now (recommended for
                    full integration) or associate this directory with an existing Devant project where you plan to
                    deploy later.
                </BodyTinyInfo>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <Button
                        onClick={() => platformRpcClient.deployIntegrationInDevant()}
                        disabled={!deployableArtifacts?.exists}
                        tooltip={
                            deployableArtifacts?.exists
                                ? ""
                                : "Please add a deployable artifact to your project in order to deploy it"
                        }
                    >
                        Deploy Now
                    </Button>
                    <Button
                        appearance="secondary"
                        onClick={() =>
                            rpcClient.getCommonRpcClient().executeCommand({
                                commands: [
                                    PlatformExtCommandIds.CreateDirectoryContext,
                                    {
                                        extName: "Devant",
                                        skipComponentExistCheck: true,
                                        fsPath: workspacePath || projectPath,
                                    } as ICreateDirCtxCmdParams,
                                ],
                            })
                        }
                    >
                        Associate Project
                    </Button>
                </div>
            </>
        );
    }

    return (
        <div style={{ position: "relative" }}>
            {selectedTab === "third-party-services" && marketplaceResp?.data?.length > 0 && !isLoading && (
                <AddButtonWrap>
                    <Button
                        appearance="icon"
                        tooltip="Register new 3rd party service"
                        onClick={() => openRegisterNew3rdPartySvc(true)}
                    >
                        <Codicon name="plus" />
                    </Button>
                </AddButtonWrap>
            )}
            <VSCodePanels style={{ height: "100%" }} activeid={selectedTab}>
                <VSCodePanelTab
                    id={`internal-services`}
                    key={`tab-internal-services`}
                    onClick={() => setSelectedTab("internal-services")}
                >
                    Internal API Services
                </VSCodePanelTab>
                <VSCodePanelTab
                    id={`third-party-services`}
                    key={`tab-third-party-services`}
                    onClick={() => setSelectedTab("third-party-services")}
                >
                    Third Party API Services
                </VSCodePanelTab>

                <PanelTab
                    id="internal-services"
                    data={marketplaceResp?.data || []}
                    emptyMessage="There are no internal API services available to connect to in your Devant project."
                    hideTitle={hideTitle}
                    isLoading={isLoading}
                    onSelectItem={(item) => onSelectDevantConnector(item)}
                />
                <PanelTab
                    id="tab-third-party-services"
                    data={marketplaceResp?.data || []}
                    emptyMessage="There are no third party API services registered in your Devant account."
                    hideTitle={hideTitle}
                    isLoading={isLoading}
                    onSelectItem={(item) => onSelectDevantConnector(item)}
                    emptyActionButton={{
                        text: "Register New Service",
                        tooltip: "Open Devant console and register a new 3rd party API service",
                        onClick: () => openRegisterNew3rdPartySvc(),
                    }}
                />
            </VSCodePanels>
        </div>
    );
};

const PanelTab = (props: {
    id: string;
    isLoading: boolean;
    data: MarketplaceItem[];
    hideTitle: boolean;
    onSelectItem: (item: MarketplaceItem) => void;
    emptyMessage: ReactNode;
    emptyActionButton?: {
        text: string;
        tooltip: string;
        onClick: () => void;
    };
}) => {
    const { isLoading, data, hideTitle, id, onSelectItem, emptyMessage, emptyActionButton } = props;
    return (
        <VSCodePanelView id={id} key={id}>
            <div style={{ width: "100%", marginTop: 12 }}>
                {isLoading && (
                    <ProgressRingWrap>
                        <ProgressRing />
                    </ProgressRingWrap>
                )}
                {data?.length === 0 && (
                    <>
                        <BodyTinyInfo>{emptyMessage}</BodyTinyInfo>
                        {emptyActionButton && (
                            <Button
                                sx={{ marginTop: 6 }}
                                tooltip={emptyActionButton.tooltip}
                                onClick={emptyActionButton.onClick}
                            >
                                {emptyActionButton.text}
                            </Button>
                        )}
                    </>
                )}
                <GridContainer isHalfView={hideTitle}>
                    {data?.map((item) => {
                        return (
                            <ButtonCard
                                id={`connector-${item.serviceId}`}
                                key={item.serviceId}
                                title={item.name}
                                description={item.description}
                                icon={<Codicon name="package" />}
                                onClick={() => onSelectItem(item)}
                            />
                        );
                    })}
                </GridContainer>
            </div>
        </VSCodePanelView>
    );
};
