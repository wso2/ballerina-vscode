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

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import styled from "@emotion/styled";
import { ConfigVariable, DIRECTORY_MAP, FunctionModel, getConfigVariables, LineRange, NodePosition, ProjectStructureArtifactResponse, ServiceModel } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Codicon, ErrorBanner, Icon, SplitView, TextField, Tooltip, TreeView, TreeViewItem, Typography, View, ViewContent } from "@wso2/ui-toolkit";
import { TopNavigationBar } from "../../../components/TopNavigationBar";
import { TitleBar } from "../../../components/TitleBar";
import { DropdownOptionProps } from "./components/AddServiceElementDropdown";
import ServiceConfigForm from "./Forms/ServiceConfigForm";
import ListenerConfigForm from "./Forms/ListenerConfigForm";
import { ListenerEditView } from "./ListenerEditView";
import { ServiceEditView } from "./ServiceEditView";
import { LoadingContainer } from "../../styles";
import { LoadingRing } from "../../../components/Loader";

const Container = styled.div`
    width: 100%;
    padding: 10px 0px 10px 8px;
    height: calc(100vh - 220px);
    overflow-y: auto;
`;

const SearchStyle = {
    width: '100%',

    '& > vscode-text-field': {
        width: '100%',
        borderRadius: '5px'
    },
};

const EmptyReadmeContainer = styled.div`
    display: flex;
    margin: 80px 0px;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    height: 100%;
`;

const Description = styled(Typography)`
    color: var(--vscode-descriptionForeground);
`;

const TitleBoxShadow = styled.div`
    box-shadow: var(--vscode-scrollbar-shadow) 0 6px 6px -6px inset;
    height: 3px;
`;

const TitleContent = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const SearchContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 15px;
    gap: 40px;
`;

const searchIcon = (<Codicon name="search" sx={{ cursor: "auto" }} />);

export interface ServiceConfigureProps {
    filePath: string;
    position: NodePosition;
    listenerName?: string;
}

interface CategoryWithModules {
    name: string;
    modules: string[];
}

type ConfigVariablesState = {
    [category: string]: {
        [module: string]: ConfigVariable[];
    };
};

interface ReadonlyProperty {
    label: string;
    value: string | string[];
}

const Overlay = styled.div`
    position: fixed;
    width: 100vw;
    height: 100vh;
    background: var(--vscode-settings-rowHoverBackground);
    z-index: 1000;
`;

export function ServiceConfigureView(props: ServiceConfigureProps) {

    const { rpcClient } = useRpcContext();
    const [serviceModel, setServiceModel] = useState<ServiceModel>(undefined);

    const [listenerPosition, setListenerPosition] = useState<{ filePath: string, position: NodePosition }>(undefined);
    const [projectListeners, setProjectListeners] = useState<ProjectStructureArtifactResponse[]>([]);

    const [listeners, setListeners] = useState<string[]>([]);

    const [selectedListener, setSelectedListener] = useState<string>(props.listenerName || "");

    const [tabView, setTabView] = useState<"service" | "listener">(props.listenerName ? "listener" : "service");

    useEffect(() => {
        fetchService(props.position);
    }, []);

    useEffect(() => {
        if (props.listenerName) {
            handleListenerSelect(props.listenerName);
        }
    }, [projectListeners]);


    const handleListenerSelect = (listener: string) => {
        setSelectedListener(listener);
        setTabView("listener");

        const selectedListener = projectListeners.find(l => l.name === listener);
        if (selectedListener) {
            setListenerPosition({ filePath: selectedListener.path, position: selectedListener.position });
        }
    };
    const handleOnServiceSelect = () => {
        setTabView("service");
    };

    const fetchService = (targetPosition: NodePosition) => {
        const lineRange: LineRange = {
            startLine: { line: targetPosition.startLine, offset: targetPosition.startColumn },
            endLine: { line: targetPosition.endLine, offset: targetPosition.endColumn },
        };
        try {
            rpcClient
                .getServiceDesignerRpcClient()
                .getServiceModelFromCode({ filePath: props.filePath, codedata: { lineRange } })
                .then((res) => {
                    console.log("Service Model: ", res.service);
                    setServiceModel(res.service);
                    setServiceMetaInfo(res.service);
                    getProjectListeners();
                });
        } catch (error) {
            console.log("Error fetching service model: ", error);
        }
    };

    const setServiceMetaInfo = (service: ServiceModel) => {
        if (service?.properties?.listener) {
            const listenerProperty = service.properties.listener;
            if (listenerProperty.values && listenerProperty.values.length > 0) {
                setListeners(listenerProperty.values);
            } else if (listenerProperty.value) {
                setListeners([listenerProperty.value]);
            }
        }
    }

    const getProjectListeners = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .getProjectStructure()
            .then((res) => {
                const listeners = res.directoryMap[DIRECTORY_MAP.LISTENER];
                if (listeners.length > 0) {
                    setProjectListeners(listeners);
                }
            });
    };

    return (
        <View>
            <TopNavigationBar />
            {!serviceModel && (
                <LoadingContainer>
                    <LoadingRing message="Loading service..." />
                </LoadingContainer>
            )}
            {
                serviceModel && (
                    <>
                        <TitleBar title={`${serviceModel.name} Configuration`} subtitle="Configure and manage service details" />
                        <ViewContent padding>
                            <div style={{ height: 'calc(100vh - 220px)' }}>
                                <div style={{ width: "auto" }}>
                                    <SplitView defaultWidths={[20, 80]}>
                                        {/* Left side tree view */}
                                        <div id={`package-treeview`} style={{ padding: "10px 0 50px 0" }}>
                                            <TreeViewItem
                                                id="service"
                                                onSelect={handleOnServiceSelect}
                                                selectedId={serviceModel.name}
                                                sx={{
                                                    border: tabView === "service"
                                                        ? '1px solid var(--vscode-focusBorder)'
                                                        : 'none'
                                                }}
                                            >
                                                <Typography
                                                    variant="body3"
                                                    sx={{
                                                        fontWeight: tabView === "service"
                                                            ? 'bold' : 'normal'
                                                    }}
                                                >{serviceModel.name}</Typography>
                                            </TreeViewItem>

                                            {/* Group all the listeners under "Service listeners" */}
                                            {listeners.length > 0 && (
                                                <TreeView
                                                    rootTreeView
                                                    id="service-listeners"
                                                    expandByDefault={true}
                                                    content={
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                height: '22px',
                                                                alignItems: 'center',
                                                            }}>
                                                            <Typography
                                                                variant="body3"
                                                                sx={{
                                                                    fontWeight: 'normal'
                                                                }}
                                                            >
                                                                Service listeners
                                                            </Typography>
                                                        </div>
                                                    }
                                                >
                                                    {/* Map all the listeners */}
                                                    {listeners
                                                        .map((listener, index) => (
                                                            <TreeViewItem
                                                                key={listener}
                                                                id={listener}
                                                                sx={{
                                                                    backgroundColor: 'transparent',
                                                                    paddingLeft: '35px',
                                                                    height: '25px',
                                                                    border: tabView === "listener" && selectedListener === listener
                                                                        ? '1px solid var(--vscode-focusBorder)'
                                                                        : 'none',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    boxSizing: 'border-box'
                                                                }}
                                                                selectedId={selectedListener}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        height: '22px',
                                                                        alignItems: 'center'
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleListenerSelect(listener);
                                                                    }}
                                                                >
                                                                    <Typography
                                                                        variant="body3"
                                                                        sx={{
                                                                            fontWeight: selectedListener === listener
                                                                                ? 'bold' : 'normal'
                                                                        }}
                                                                    >
                                                                        {listener}
                                                                    </Typography>
                                                                </div>
                                                            </TreeViewItem>
                                                        ))}
                                                </TreeView>
                                            )}
                                        </div>
                                        {/* Right side view */}
                                        <div style={{ height: '100%' }}>
                                            <>
                                                <div
                                                    id="TitleDiv"
                                                    style={{
                                                        position: "sticky", top: 0, color: "var(--vscode-editor-foreground)",
                                                        backgroundColor: "var(--vscode-editor-background)"
                                                    }}>
                                                    <TitleContent>
                                                        <Typography
                                                            variant="h2"
                                                            sx={{
                                                                padding: "0px 0 0 20px",
                                                                margin: "10px 0px",
                                                                color: "var(--vscode-foreground)"
                                                            }}>
                                                            {tabView === "service" ? serviceModel.name : selectedListener}
                                                        </Typography>
                                                    </TitleContent>
                                                    <TitleBoxShadow />
                                                </div>
                                                <Container>
                                                    <>
                                                        {tabView === "service" && !serviceModel && (
                                                            <LoadingContainer>
                                                                <LoadingRing message="Loading service..." />
                                                            </LoadingContainer>
                                                        )}
                                                        {tabView === "listener" && !listenerPosition && (
                                                            <LoadingContainer>
                                                                <LoadingRing message="Loading listener..." />
                                                            </LoadingContainer>
                                                        )}
                                                        {tabView === "service" && serviceModel && (
                                                            <ServiceEditView filePath={props.filePath} position={props.position} />
                                                        )}
                                                        {tabView === "listener" && listenerPosition && (
                                                            <ListenerEditView filePath={listenerPosition.filePath} position={listenerPosition.position} />
                                                        )}
                                                    </>
                                                </Container >
                                            </>
                                        </div>
                                    </SplitView>
                                </div>
                            </div>
                        </ViewContent >

                    </>
                )}
        </View >
    );
}

export default ServiceConfigureView;
