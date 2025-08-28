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

import React, { useCallback, useEffect, useState } from "react";
import {
    KeyboardNavigationManager,
    MachineStateValue,
    STModification,
    MACHINE_VIEW,
    PopupMachineStateValue,
    EVENT_TYPE,
    ParentPopupData,
} from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Global, css } from "@emotion/react";
import { debounce } from "lodash";
import styled from "@emotion/styled";
import { LoadingRing } from "./components/Loader";
import { DataMapper } from "./views/DataMapper";
import { ERDiagram } from "./views/ERDiagram";
import { GraphQLDiagram } from "./views/GraphQLDiagram";
import { ServiceDesigner } from "./views/BI/ServiceDesigner";
import {
    WelcomeView,
    ProjectForm,
    ComponentListView,
    PopupMessage,
    FunctionForm,
    SetupView,
    TestFunctionForm
} from "./views/BI";
import { handleRedo, handleUndo } from "./utils/utils";
import { FunctionDefinition } from "@wso2/syntax-tree";
import { URI, Utils } from "vscode-uri";
import { Typography } from "@wso2/ui-toolkit";
import { PanelType, useVisualizerContext } from "./Context";
import { ConstructPanel } from "./views/ConstructPanel";
import { EditPanel } from "./views/EditPanel";
import { RecordEditor } from "./views/RecordEditor/RecordEditor";
import PopupPanel from "./PopupPanel";
import { ConnectorList } from "../../ballerina-visualizer/src/views/Connectors/ConnectorWizard";
import { EndpointList } from "./views/Connectors/EndpointList";
import { getSymbolInfo } from "@wso2/ballerina-low-code-diagram";
import DiagramWrapper from "./views/BI/DiagramWrapper";
import AddConnectionWizard from "./views/BI/Connection/AddConnectionWizard";
import { TypeDiagram } from "./views/TypeDiagram";
import { Overview as OverviewBI } from "./views/BI/Overview/index";
import EditConnectionWizard from "./views/BI/Connection/EditConnectionWizard";
import ViewConfigurableVariables from "./views/BI/Configurables/ViewConfigurableVariables";
import { ServiceWizard } from "./views/BI/ServiceDesigner/ServiceWizard";
import { ServiceEditView } from "./views/BI/ServiceDesigner/ServiceEditView";
import { ListenerEditView } from "./views/BI/ServiceDesigner/ListenerEditView";
import { ServiceClassDesigner } from "./views/BI/ServiceClassEditor/ServiceClassDesigner";
import { ServiceClassConfig } from "./views/BI/ServiceClassEditor/ServiceClassConfig";
import { AIAgentDesigner } from "./views/BI/AIChatAgent";
import { AIChatAgentWizard } from "./views/BI/AIChatAgent/AIChatAgentWizard";
import { BallerinaUpdateView } from "./views/BI/BallerinaUpdateView";
import { VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";
import { InlineDataMapper } from "./views/InlineDataMapper";

const globalStyles = css`
    *,
    *::before,
    *::after {
        box-sizing: border-box;
    }
    
    @keyframes fadeIn {
        0% { 
            opacity: 0;
        }
        100% { 
            opacity: 1;
        }
    }
    
    .loading-dots::after {
        content: '';
        animation: dots 1.5s infinite;
    }
    
    @keyframes dots {
        0%, 20% { content: ''; }
        40% { content: '.'; }
        60% { content: '..'; }
        80%, 100% { content: '...'; }
    }
`;

const ProgressRing = styled(VSCodeProgressRing)`
    height: 50px;
    width: 50px;
    margin: 1.5rem;
`;

const VisualizerContainer = styled.div`
    width: 100%;
    /* height: 100%; */
`;

const ComponentViewWrapper = styled.div`
    height: calc(100vh - 24px);
`;

const PopUpContainer = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2000;
`;

const LoadingViewContainer = styled.div`
    background-color: var(--vscode-editor-background);
    height: 100vh;
    width: 100%;
    display: flex;
    font-family: var(--vscode-font-family);
`;

const LoadingContent = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    height: 100%;
    width: 100%;
    padding-top: 30vh;
    text-align: center;
    max-width: 500px;
    margin: 0 auto;
    animation: fadeIn 1s ease-in-out;
`;

const LoadingTitle = styled.h1`
    color: var(--vscode-foreground);
    font-size: 1.5em;
    font-weight: 400;
    margin: 0;
    letter-spacing: -0.02em;
    line-height: normal;
`;

const LoadingSubtitle = styled.p`
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
    margin: 0.5rem 0 2rem 0;
    opacity: 0.8;
`;

const LoadingText = styled.div`
    color: var(--vscode-foreground);
    font-size: 13px;
    font-weight: 500;
`;

const MainPanel = () => {
    const { rpcClient } = useRpcContext();
    const { sidePanel, setSidePanel, popupMessage, setPopupMessage, activePanel } = useVisualizerContext();
    const [viewComponent, setViewComponent] = useState<React.ReactNode>();
    const [navActive, setNavActive] = useState<boolean>(true);
    const [showHome, setShowHome] = useState<boolean>(true);
    const [popupState, setPopupState] = useState<PopupMachineStateValue>("initialize");
    const [breakpointState, setBreakpointState] = useState<boolean>(false);

    rpcClient?.onStateChanged((newState: MachineStateValue) => {
        if (typeof newState === "object" && "viewActive" in newState && newState.viewActive === "viewReady") {
            debounceFetchContext();
        }
    });

    const debounceFetchContext = useCallback(
        debounce(() => {
            fetchContext();
        }, 200), []
    );

    rpcClient?.onPopupStateChanged((newState: PopupMachineStateValue) => {
        setPopupState(newState);
    });

    rpcClient?.onBreakpointChanges((state: boolean) => {
        setBreakpointState(pre => {
            return !pre;
        });
        console.log("Breakpoint changes");
    });

    // TODO: Need to refactor this function. use util apply modifications function
    const applyModifications = async (modifications: STModification[], isRecordModification?: boolean) => {
        const langServerRPCClient = rpcClient.getLangClientRpcClient();
        let filePath;
        let m: STModification[];
        if (isRecordModification) {
            filePath = (await rpcClient.getVisualizerLocation()).metadata?.recordFilePath;
            if (modifications.length === 1) {
                // Change the start position of the modification to the beginning of the file
                m = [
                    {
                        ...modifications[0],
                        startLine: 0,
                        startColumn: 0,
                        endLine: 0,
                        endColumn: 0,
                    },
                ];
            }
        } else {
            filePath = (await rpcClient.getVisualizerLocation()).documentUri;
            m = modifications;
        }
        const {
            parseSuccess,
            source: newSource,
            syntaxTree,
        } = await langServerRPCClient?.stModify({
            astModifications: m,
            documentIdentifier: {
                uri: URI.file(filePath).toString(),
            },
        });
        if (parseSuccess) {
            rpcClient.getVisualizerRpcClient().addToUndoStack(newSource);
            await langServerRPCClient.updateFileContent({
                content: newSource,
                filePath,
            });
        }
    };

    const fetchContext = () => {
        setNavActive(true);
        rpcClient.getVisualizerLocation().then(async (value) => {
            const configFilePath = await rpcClient.getVisualizerRpcClient().joinProjectPath('config.bal');
            let defaultFunctionsFile = await rpcClient.getVisualizerRpcClient().joinProjectPath('functions.bal');
            if (value.documentUri) {
                defaultFunctionsFile = value.documentUri
            }
            if (!value?.view) {
                setViewComponent(<LoadingRing />);
            } else {
                switch (value?.view) {
                    case MACHINE_VIEW.Overview:
                        setViewComponent(
                            <OverviewBI
                                projectPath={value.projectUri}
                            />
                        );
                        break;
                    case MACHINE_VIEW.ServiceDesigner:
                        setViewComponent(
                            <ServiceDesigner
                                serviceIdentifier={value.identifier}
                                filePath={value.documentUri}
                                position={value?.position}
                            />
                        );
                        break;
                    case MACHINE_VIEW.AIAgentDesigner:
                        setViewComponent(<AIAgentDesigner
                            filePath={value.documentUri}
                            position={value?.position}
                        />);
                        break;
                    case MACHINE_VIEW.BIDiagram:

                        rpcClient.getLangClientRpcClient().getSTByRange({
                            documentIdentifier: {
                                uri: URI.file(value.documentUri).toString(),
                            },
                            lineRange: {
                                start: {
                                    line: value?.position?.startLine,
                                    character: value?.position?.startColumn,
                                },
                                end: {
                                    line: value?.position?.endLine,
                                    character: value?.position?.endColumn,
                                },
                            },
                        }).then((st) => {
                            setViewComponent(
                                <DiagramWrapper
                                    key={value?.identifier}
                                    syntaxTree={st.syntaxTree}
                                    projectPath={value?.projectUri}
                                    filePath={value?.documentUri}
                                    view={value?.focusFlowDiagramView}
                                    breakpointState={breakpointState}
                                />
                            );
                        }).catch((error) => {
                            console.error("Error fetching ST:", error);
                            // Fallback to render without waiting
                            setViewComponent(
                                <DiagramWrapper
                                    key={value?.identifier}
                                    projectPath={value?.projectUri}
                                    filePath={value?.documentUri}
                                    view={value?.focusFlowDiagramView}
                                    breakpointState={breakpointState}
                                />
                            );
                        });
                        break;
                    case MACHINE_VIEW.ERDiagram:
                        setViewComponent(<ERDiagram />);
                        break;
                    case MACHINE_VIEW.TypeDiagram:
                        setViewComponent(<TypeDiagram selectedTypeId={value?.identifier} projectUri={value?.projectUri} addType={value?.addType} />);
                        break;
                    case MACHINE_VIEW.DataMapper:
                        setViewComponent(
                            <DataMapper
                                projectPath={value.projectUri}
                                filePath={value.documentUri}
                                model={value?.syntaxTree as FunctionDefinition}
                                functionName={value?.identifier}
                                applyModifications={applyModifications}
                            />
                        );
                        break;
                    case MACHINE_VIEW.InlineDataMapper:
                        setViewComponent(
                            <InlineDataMapper
                                filePath={value.documentUri}
                                codedata={value?.dataMapperMetadata?.codeData}
                                varName={value?.dataMapperMetadata?.name}
                            />
                        );
                        break;
                    case MACHINE_VIEW.BIDataMapperForm:
                        setViewComponent(
                            <FunctionForm
                                projectPath={value.projectUri}
                                filePath={defaultFunctionsFile}
                                functionName={value?.identifier}
                                isDataMapper={true}
                            />
                        );
                        break;
                    case MACHINE_VIEW.BINPFunctionForm:
                        setViewComponent(
                            <FunctionForm
                                projectPath={value.projectUri}
                                filePath={defaultFunctionsFile}
                                functionName={value?.identifier}
                                isDataMapper={false}
                                isNpFunction={true}
                            />
                        );
                        break;
                    case MACHINE_VIEW.GraphQLDiagram:
                        setViewComponent(<GraphQLDiagram serviceIdentifier={value?.identifier} filePath={value?.documentUri} position={value?.position} projectUri={value?.projectUri} />);
                        break;
                    case MACHINE_VIEW.BallerinaUpdateView:
                        setNavActive(false);
                        setViewComponent(<BallerinaUpdateView />);
                        break;
                    case MACHINE_VIEW.BIWelcome:
                        setNavActive(false);
                        setViewComponent(<WelcomeView isBISupported={value.metadata.isBISupported} />);
                        break;
                    case MACHINE_VIEW.SetupView:
                        setNavActive(false);
                        setViewComponent(<SetupView haveLS={value.metadata.haveLS} />);
                        break;
                    case MACHINE_VIEW.BIProjectForm:
                        setShowHome(false);
                        setViewComponent(<ProjectForm />);
                        break;
                    case MACHINE_VIEW.BIComponentView:
                        setViewComponent(<ComponentListView scope={value.scope} />);
                        break;
                    case MACHINE_VIEW.AIChatAgentWizard:
                        setViewComponent(<AIChatAgentWizard />);
                        break;
                    case MACHINE_VIEW.BIServiceWizard:
                        setViewComponent(<ServiceWizard type={value.serviceType} />);
                        break;
                    case MACHINE_VIEW.BIServiceClassDesigner:
                        setViewComponent(
                            <ServiceClassDesigner
                                type={value?.type}
                                isGraphql={value?.isGraphql}
                                projectUri={value?.projectUri}
                            />
                        );
                        break;
                    case MACHINE_VIEW.BIServiceConfigView:
                        setViewComponent(<ServiceEditView filePath={value.documentUri} position={value?.position} />);
                        break;
                    case MACHINE_VIEW.BIServiceClassConfigView:
                        setViewComponent(
                            <ServiceClassConfig
                                fileName={value.documentUri}
                                position={value?.position}
                                projectUri={value?.projectUri} />
                        );
                        break;
                    case MACHINE_VIEW.BIListenerConfigView:
                        setViewComponent(<ListenerEditView filePath={value.documentUri} position={value?.position} />);
                        break;
                    case MACHINE_VIEW.AddConnectionWizard:
                        setViewComponent(
                            <AddConnectionWizard
                                fileName={value.documentUri || value.projectUri}
                            />
                        );
                        break;
                    case MACHINE_VIEW.EditConnectionWizard:
                        setViewComponent(
                            <EditConnectionWizard
                                projectUri={value.projectUri}
                                connectionName={value?.identifier}
                            />
                        );
                        break;
                    case MACHINE_VIEW.BIMainFunctionForm:
                        setViewComponent(<FunctionForm projectPath={value.projectUri} filePath={defaultFunctionsFile} functionName={value?.identifier} isAutomation={true} />);
                        break;
                    case MACHINE_VIEW.BIFunctionForm:
                        setViewComponent(<FunctionForm projectPath={value.projectUri} filePath={defaultFunctionsFile} functionName={value?.identifier} />);
                        break;
                    case MACHINE_VIEW.BITestFunctionForm:
                        setViewComponent(<TestFunctionForm
                            functionName={value?.identifier}
                            filePath={value?.documentUri}
                            serviceType={value?.serviceType}
                        />);
                        break;
                    case MACHINE_VIEW.ViewConfigVariables:
                        setViewComponent(
                            <ViewConfigurableVariables
                                fileName={configFilePath}
                                org={value?.org}
                                package={value?.package}
                            />
                        );
                        break;
                    case MACHINE_VIEW.AddConfigVariables:
                        setViewComponent(
                            <ViewConfigurableVariables
                                fileName={configFilePath}
                                org={value?.org}
                                package={value?.package}
                                addNew={true}
                            />
                        );
                        break;
                    default:
                        setNavActive(false);
                        setViewComponent(<LoadingRing />);
                }
            }
        });
    };

    useEffect(() => {
        debounceFetchContext();
    }, [breakpointState]);

    useEffect(() => {
        const mouseTrapClient = KeyboardNavigationManager.getClient();

        mouseTrapClient.bindNewKey(["command+z", "ctrl+z"], () => handleUndo(rpcClient));
        mouseTrapClient.bindNewKey(["command+shift+z", "ctrl+y"], async () => handleRedo(rpcClient));

        return () => {
            mouseTrapClient.resetMouseTrapInstance();
        };
    }, [viewComponent]);

    const handleOnCloseMessage = () => {
        setPopupMessage(false);
    };

    const handleOnClose = (parent?: ParentPopupData) => {
        rpcClient
            .getVisualizerRpcClient()
            .openView({ type: EVENT_TYPE.CLOSE_VIEW, location: { view: null, recentIdentifier: parent?.recentIdentifier, artifactType: parent?.artifactType }, isPopup: true });
    };

    return (
        <>
            <Global styles={globalStyles} />
            <VisualizerContainer>
                {/* {navActive && <NavigationBar showHome={showHome} />} */}
                {viewComponent && <ComponentViewWrapper>{viewComponent}</ComponentViewWrapper>}
                {!viewComponent && (
                    <ComponentViewWrapper>
                        <LoadingViewContainer>
                            <LoadingContent>
                                <ProgressRing />
                                <LoadingTitle>Loading Integration</LoadingTitle>
                                <LoadingSubtitle>Setting up your integration environment</LoadingSubtitle>
                                <LoadingText>
                                    <span className="loading-dots">Please wait</span>
                                </LoadingText>
                            </LoadingContent>
                        </LoadingViewContainer>
                    </ComponentViewWrapper>
                )}
                {sidePanel !== "EMPTY" && sidePanel === "ADD_CONNECTION" && (
                    <ConnectorList applyModifications={applyModifications} />
                )}

                {popupMessage && (
                    <PopupMessage onClose={handleOnCloseMessage}>
                        <Typography variant="h3">This feature is coming soon!</Typography>
                    </PopupMessage>
                )}
                {sidePanel === "RECORD_EDITOR" && (
                    <RecordEditor
                        isRecordEditorOpen={sidePanel === "RECORD_EDITOR"}
                        onClose={() => setSidePanel("EMPTY")}
                        rpcClient={rpcClient}
                    />
                )}
                {activePanel?.isActive && activePanel.name === PanelType.CONSTRUCTPANEL && (
                    <ConstructPanel applyModifications={applyModifications} />
                )}
                {activePanel?.isActive && activePanel.name === PanelType.STATEMENTEDITOR && (
                    <EditPanel applyModifications={applyModifications} />
                )}
                {typeof popupState === "object" && "open" in popupState && (
                    <PopUpContainer>
                        <PopupPanel onClose={handleOnClose} formState={popupState} />
                    </PopUpContainer>
                )}
                {sidePanel !== "EMPTY" && sidePanel === "ADD_ACTION" && (
                    <EndpointList stSymbolInfo={getSymbolInfo()} applyModifications={applyModifications} />
                )}
            </VisualizerContainer>
        </>
    );
};

export default MainPanel;
