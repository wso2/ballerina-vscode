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

import styled from "@emotion/styled";
import React, { useEffect, useState } from "react";
import { URI, Utils } from "vscode-uri";
import { MACHINE_VIEW, PopupMachineStateValue, PopupVisualizerLocation } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import AddConnectionWizard from "./views/BI/Connection/AddConnectionWizard";
import { ThemeColors, Overlay } from "@wso2/ui-toolkit";
import EditConnectionWizard from "./views/BI/Connection/EditConnectionWizard";
import { FunctionForm } from "./views/BI";

const ViewContainer = styled.div<{ isFullScreen?: boolean }>`
    position: fixed;
    top: 0;
    right: 0;
    width: ${(props: { isFullScreen: boolean; }) => props.isFullScreen ? '100%' : '400px'};
    height: 100%;
    z-index: 2000;
    background-color: ${ThemeColors.SURFACE_BRIGHT};
`;

const TopBar = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px 16px;
`;

interface PopupPanelProps {
    formState: PopupMachineStateValue;
    onClose: () => void;
}

const PopupPanel = (props: PopupPanelProps) => {
    const { formState, onClose } = props;
    const { rpcClient } = useRpcContext();
    const [viewComponent, setViewComponent] = useState<React.ReactNode>();
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        if (typeof formState === "object" && "open" in formState) {
            fetchContext();
        }
    }, [formState]);

    useEffect(() => {
        fetchContext();
    }, []);

    const fetchContext = () => {
        rpcClient.getPopupVisualizerState().then((machineState: PopupVisualizerLocation) => {
            switch (machineState?.view) {
                case MACHINE_VIEW.AddConnectionWizard:
                    rpcClient.getVisualizerLocation().then((location) => {
                        setViewComponent(
                            <AddConnectionWizard
                                fileName={location.documentUri || location.projectUri}
                                target={machineState.metadata?.target || undefined}
                                onClose={onClose}
                            />
                        );
                    });
                    break;
                case MACHINE_VIEW.EditConnectionWizard:
                    rpcClient.getVisualizerLocation().then((location) => {
                        setViewComponent(
                            <>
                                <EditConnectionWizard
                                    fileName={location.documentUri || location.projectUri}
                                    connectionName={machineState?.identifier}
                                    onClose={onClose}
                                />
                                <Overlay sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.3`, zIndex: 1000 }} />
                            </>
                        );
                    });
                    break;
                case MACHINE_VIEW.BIFunctionForm:
                    setIsFullScreen(true);
                    rpcClient.getVisualizerLocation().then((location) => {
                        const defaultFunctionsFile = Utils.joinPath(URI.file(location.projectUri), 'functions.bal').fsPath;
                        setViewComponent(<FunctionForm
                            projectPath={location.projectUri}
                            filePath={defaultFunctionsFile}
                            functionName={undefined}
                            isPopup={true} />
                        );
                    });
                    break;
                case MACHINE_VIEW.BIDataMapperForm:
                    setIsFullScreen(true);
                    rpcClient.getVisualizerLocation().then((location) => {
                        const defaultFunctionsFile = Utils.joinPath(URI.file(location.projectUri), 'data_mappings.bal').fsPath;
                        setViewComponent(
                            <FunctionForm
                                projectPath={location.projectUri}
                                filePath={defaultFunctionsFile}
                                functionName={undefined}
                                isDataMapper={true}
                                isPopup={true}
                            />
                        );
                    });
                    break;
                case MACHINE_VIEW.BINPFunctionForm:
                    setIsFullScreen(true);
                    rpcClient.getVisualizerLocation().then((location) => {
                        const defaultFunctionsFile = Utils.joinPath(URI.file(location.projectUri), 'functions.bal').fsPath;
                        setViewComponent(
                            <FunctionForm
                                projectPath={location.projectUri}
                                filePath={defaultFunctionsFile}
                                functionName={undefined}
                                isDataMapper={false}
                                isNpFunction={true}
                                isPopup={true}
                            />
                        );
                    });
                    break;
                default:
                    setViewComponent(null);
            }
        });
    };

    return <ViewContainer isFullScreen={isFullScreen}>{viewComponent}</ViewContainer>;
};

export default PopupPanel;
