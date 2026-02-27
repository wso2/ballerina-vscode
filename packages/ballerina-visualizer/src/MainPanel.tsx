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

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    KeyboardNavigationManager,
    MachineStateValue,
    STModification,
    MACHINE_VIEW,
    PopupMachineStateValue,
    EVENT_TYPE,
    ParentPopupData,
    ProjectStructureArtifactResponse,
    DIRECTORY_MAP,
    CodeData,
    LinePosition,
} from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Global, css } from "@emotion/react";
import { debounce } from "lodash";
import styled from "@emotion/styled";
import { LoadingRing } from "./components/Loader";
import { ERDiagram } from "./views/ERDiagram";
import { GraphQLDiagram } from "./views/GraphQLDiagram";
import { ServiceDesigner } from "./views/BI/ServiceDesigner";
import {
    WelcomeView,
    ProjectForm,
    AddProjectForm,
    ComponentListView,
    PopupMessage,
    FunctionForm,
    SetupView,
    TestFunctionForm,
    AIEvaluationForm
} from "./views/BI";
import { handleRedo, handleUndo } from "./utils/utils";
import { STKindChecker } from "@wso2/syntax-tree";
import { URI, Utils } from "vscode-uri";
import { ThemeColors, Typography } from "@wso2/ui-toolkit";
import { PanelType, useModalStack, useVisualizerContext } from "./Context";
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
import { PackageOverview } from "./views/BI/PackageOverview/index";
import EditConnectionWizard from "./views/BI/Connection/EditConnectionWizard";
import ViewConfigurableVariables from "./views/BI/Configurables/ViewConfigurableVariables";
import { ServiceEditView } from "./views/BI/ServiceDesigner/ServiceEditView";
import { ListenerEditView } from "./views/BI/ServiceDesigner/ListenerEditView";
import { ServiceClassDesigner } from "./views/BI/ServiceClassEditor/ServiceClassDesigner";
import { ServiceClassConfig } from "./views/BI/ServiceClassEditor/ServiceClassConfig";
import { AIAgentDesigner } from "./views/BI/AIChatAgent";
import { AIChatAgentWizard } from "./views/BI/AIChatAgent/AIChatAgentWizard";
import { BallerinaUpdateView } from "./views/BI/BallerinaUpdateView";
import { VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";
import { DataMapper } from "./views/DataMapper";
import { ImportIntegration } from "./views/BI/ImportIntegration";
import { ServiceCreationView } from "./views/BI/ServiceDesigner/ServiceCreationView";
import Popup from "./components/Popup";
import { ServiceFunctionForm } from "./views/BI/ServiceFunctionForm";
import ServiceConfigureView from "./views/BI/ServiceDesigner/ServiceConfigureView";
import { WorkspaceOverview } from "./views/BI/WorkspaceOverview";
import { SamplesView } from "./views/BI/SamplesView";
import { ReviewMode } from "./views/ReviewMode";
import AddConnectionPopup from "./views/BI/Connection/AddConnectionPopup";
import EditConnectionPopup from "./views/BI/Connection/EditConnectionPopup";
import { EvalsetViewer } from "./views/EvalsetViewer/EvalsetViewer";
import { ConfigurationCollector } from "./views/BI/ConfigurationCollector";

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

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: ${ThemeColors.SURFACE_CONTAINER};
    opacity: 0.4;
    z-index: 2001;
    pointer-events: auto;
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
    const { sidePanel, setSidePanel, popupMessage, setPopupMessage, activePanel, showOverlay, setShowOverlay } = useVisualizerContext();
    const { modalStack, closeModal } = useModalStack()
    const [viewComponent, setViewComponent] = useState<React.ReactNode>();
    const [navActive, setNavActive] = useState<boolean>(true);
    const [showHome, setShowHome] = useState<boolean>(true);
    const [popupState, setPopupState] = useState<PopupMachineStateValue>("initialize");
    const [breakpointState, setBreakpointState] = useState<number>(0);
    const breakpointStateRef = useRef<number>(0);

    const debounceFetchContext = useCallback(
        debounce(() => {
            fetchContext();
        }, 200), []
    );

    useEffect(() => {
        rpcClient?.onStateChanged((newState: MachineStateValue) => {
            if (typeof newState === "object" && "viewActive" in newState && newState.viewActive === "viewReady") {
                debounceFetchContext();
            }
        });

        rpcClient?.onPopupStateChanged((newState: PopupMachineStateValue) => {
            setPopupState(newState);
        });

        rpcClient?.onBreakpointChanges((state: boolean) => {
            console.log("Breakpoint changes - updating state");
            setBreakpointState(prev => {
                const newValue = prev + 1;
                breakpointStateRef.current = newValue;
                return newValue;
            });
        });
    }, [rpcClient]);

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
            rpcClient.getVisualizerRpcClient().addToUndoStack({
                source: newSource,
                filePath,
            });
            await langServerRPCClient.updateFileContent({
                content: newSource,
                filePath,
            });
        }
    };

    const fetchContext = () => {
        setNavActive(true);
        rpcClient.getVisualizerLocation().then(async (value) => {
            const configFilePath = (await rpcClient.getVisualizerRpcClient().joinProjectPath({ segments: ['config.bal'] })).filePath;
            const testsFolderResult = await rpcClient.getVisualizerRpcClient().joinProjectPath({ segments: ['tests'], checkExists: true });
            const testsConfigTomlPath = testsFolderResult.exists ? (await rpcClient.getVisualizerRpcClient().joinProjectPath({ segments: ['tests', 'Config.toml'] })).filePath : undefined;
            let defaultFunctionsFile = (await rpcClient.getVisualizerRpcClient().joinProjectPath({ segments: ['functions.bal'] })).filePath;
            if (value.documentUri) {
                defaultFunctionsFile = value.documentUri
            }
            if (!value?.view) {
                setViewComponent(<LoadingRing />);
            } else {
                switch (value?.view) {
                    case MACHINE_VIEW.PackageOverview:
                        setViewComponent(
                            <PackageOverview
                                projectPath={value.projectPath}
                                isInDevant={value.isInDevant}
                            />
                        );
                        break;
                    case MACHINE_VIEW.WorkspaceOverview:
                        setViewComponent(
                            <WorkspaceOverview />
                        );
                        break;
                    case MACHINE_VIEW.ServiceDesigner:
                        setViewComponent(
                            <ServiceDesigner
                                projectPath={value.projectPath}
                                serviceIdentifier={value.identifier}
                                filePath={value.documentUri}
                                position={value?.position}
                            />
                        );
                        break;
                    case MACHINE_VIEW.AIAgentDesigner:
                        setViewComponent(
                            <AIAgentDesigner
                                projectPath={value?.projectPath}
                                filePath={value.documentUri}
                                position={value?.position}
                            />
                        );
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
                                    projectPath={value?.projectPath}
                                    filePath={value?.documentUri}
                                    view={value?.focusFlowDiagramView}
                                    breakpointState={breakpointStateRef.current}
                                />
                            );
                        }).catch((error) => {
                            console.error("Error fetching ST:", error);
                            // Fallback to render without waiting
                            setViewComponent(
                                <DiagramWrapper
                                    key={value?.identifier}
                                    projectPath={value?.projectPath}
                                    filePath={value?.documentUri}
                                    view={value?.focusFlowDiagramView}
                                    breakpointState={breakpointStateRef.current}
                                />
                            );
                        });
                        break;
                    case MACHINE_VIEW.ERDiagram:
                        setViewComponent(<ERDiagram projectPath={value.projectPath} />);
                        break;
                    case MACHINE_VIEW.TypeDiagram:
                        if (value?.identifier) {
                            setViewComponent(
                                <TypeDiagram
                                    selectedTypeId={value?.identifier}
                                    addType={value?.addType}
                                    projectPath={value?.projectPath}
                                />
                            );
                        } else {
                            // To support rerendering when user click on view all btn from left side panel
                            setViewComponent(
                                <TypeDiagram
                                    key={value?.rootDiagramId ? value.rootDiagramId : `default-diagram`}
                                    selectedTypeId={value?.identifier}
                                    addType={value?.addType}
                                    projectPath={value?.projectPath}
                                />
                            );
                        }
                        break;
                    case MACHINE_VIEW.DataMapper:
                        let position: LinePosition = {
                            line: value?.position?.startLine,
                            offset: value?.position?.startColumn
                        };
                        if (STKindChecker.isFunctionDefinition(value?.syntaxTree) &&
                            STKindChecker.isExpressionFunctionBody(value?.syntaxTree.functionBody)
                        ) {
                            position = {
                                line: value?.syntaxTree.functionBody.expression.position.startLine,
                                offset: value?.syntaxTree.functionBody.expression.position.startColumn
                            };
                        }
                        setViewComponent(
                            <DataMapper
                                key={value?.dataMapperMetadata?.name}
                                filePath={value.documentUri}
                                codedata={value?.dataMapperMetadata?.codeData}
                                name={value?.dataMapperMetadata?.name}
                                projectPath={value.projectPath}
                                position={position}
                                reusable
                            />
                        );
                        break;
                    case MACHINE_VIEW.InlineDataMapper:
                        setViewComponent(
                            <DataMapper
                                projectPath={value.projectPath}
                                filePath={value.documentUri}
                                codedata={value?.dataMapperMetadata?.codeData}
                                name={value?.dataMapperMetadata?.name}
                            />
                        );
                        break;
                    case MACHINE_VIEW.BIDataMapperForm:
                        setViewComponent(
                            <FunctionForm
                                projectPath={value.projectPath}
                                filePath={defaultFunctionsFile}
                                functionName={value?.identifier}
                                isDataMapper={true}
                            />
                        );
                        break;
                    case MACHINE_VIEW.BINPFunctionForm:
                        setViewComponent(
                            <FunctionForm
                                projectPath={value.projectPath}
                                filePath={defaultFunctionsFile}
                                functionName={value?.identifier}
                                isDataMapper={false}
                                isNpFunction={true}
                            />
                        );
                        break;
                    case MACHINE_VIEW.GraphQLDiagram:
                        const projectStructure = await rpcClient.getBIDiagramRpcClient().getProjectStructure();
                        const project = projectStructure.projects.find(project => project.projectPath === value.projectPath);
                        const entryPoint = project
                            .directoryMap[DIRECTORY_MAP.SERVICE]
                            .find((service: ProjectStructureArtifactResponse) => service.name === value?.identifier);
                        setViewComponent(
                            <GraphQLDiagram
                                projectPath={value.projectPath}
                                serviceIdentifier={value?.identifier}
                                filePath={value?.documentUri}
                                position={entryPoint?.position ?? value?.position}
                            />);
                        break;
                    case MACHINE_VIEW.BallerinaUpdateView:
                        setNavActive(false);
                        setViewComponent(<BallerinaUpdateView />);
                        break;
                    case MACHINE_VIEW.BIWelcome:
                        setNavActive(false);
                        setViewComponent(<WelcomeView isBISupported={value.metadata.isBISupported} />);
                        break;
                    case MACHINE_VIEW.BISamplesView:
                        setNavActive(false);
                        setViewComponent(<SamplesView />);
                        break;
                    case MACHINE_VIEW.SetupView:
                        setNavActive(false);
                        setViewComponent(<SetupView haveLS={value.metadata.haveLS} />);
                        break;
                    case MACHINE_VIEW.BIProjectForm:
                        setShowHome(false);
                        setViewComponent(<ProjectForm />);
                        break;
                    case MACHINE_VIEW.BIImportIntegration:
                        setShowHome(false);
                        setViewComponent(<ImportIntegration />);
                        break;
                    case MACHINE_VIEW.BIAddProjectForm:
                        setShowHome(false);
                        setViewComponent(<AddProjectForm />);
                        break;
                    case MACHINE_VIEW.BIComponentView:
                        setViewComponent(
                            <ComponentListView
                                projectPath={value?.projectPath}
                                scope={value.scope}
                            />
                        );
                        break;
                    case MACHINE_VIEW.AIChatAgentWizard:
                        setViewComponent(<AIChatAgentWizard />);
                        break;
                    case MACHINE_VIEW.BIServiceWizard:
                        setViewComponent(
                            <ServiceCreationView
                                projectPath={value.projectPath}
                                orgName={value?.artifactInfo.org}
                                packageName={value?.artifactInfo.packageName}
                                moduleName={value?.artifactInfo.moduleName}
                                version={value?.artifactInfo.version}
                            />
                        );
                        break;
                    case MACHINE_VIEW.BIServiceClassDesigner:
                        setViewComponent(
                            <ServiceClassDesigner
                                projectPath={value.projectPath}
                                type={value?.type}
                                fileName={value?.documentUri}
                                position={value?.position}
                                isGraphql={value?.isGraphql}
                            />
                        );
                        break;
                    case MACHINE_VIEW.BIServiceConfigView:
                        setViewComponent(
                            <ServiceConfigureView
                                projectPath={value.projectPath}
                                filePath={value.documentUri}
                                position={value?.position}
                                listenerName={value?.identifier}
                            />
                        );
                        break;
                    case MACHINE_VIEW.BIServiceClassConfigView:
                        setViewComponent(
                            <ServiceClassConfig
                                projectPath={value.projectPath}
                                type={value?.type}
                                fileName={value.documentUri}
                                position={value?.position}
                            />
                        );
                        break;
                    case MACHINE_VIEW.BIListenerConfigView:
                        setViewComponent(
                            <ListenerEditView
                                projectPath={value.projectPath}
                                filePath={value.documentUri}
                                position={value?.position}
                            />);
                        break;
                    case MACHINE_VIEW.AddConnectionWizard:
                        setViewComponent(
                            <AddConnectionPopup
                                projectPath={value.projectPath}
                                fileName={value.documentUri || value.projectPath}
                                onNavigateToOverview={handleNavigateToOverview}
                            />
                        );
                        break;
                    case MACHINE_VIEW.EditConnectionWizard:
                        setViewComponent(
                            <EditConnectionPopup
                                connectionName={value?.identifier}
                            />
                        );
                        break;
                    case MACHINE_VIEW.AddCustomConnector:
                        setViewComponent(
                            <AddConnectionWizard
                                projectPath={value.projectPath}
                                fileName={value.documentUri || value.projectPath}
                                openCustomConnectorView={true}
                            />
                        );
                        break;
                    case MACHINE_VIEW.BIMainFunctionForm:
                        setViewComponent(
                            <FunctionForm
                                projectPath={value.projectPath}
                                filePath={defaultFunctionsFile}
                                functionName={value?.identifier}
                                isAutomation={true}
                            />
                        );
                        break;
                    case MACHINE_VIEW.BIFunctionForm:
                        setViewComponent(
                            <FunctionForm
                                projectPath={value.projectPath}
                                filePath={defaultFunctionsFile}
                                functionName={value?.identifier}
                            />);
                        break;
                    case MACHINE_VIEW.BITestFunctionForm:
                        setViewComponent(
                            <TestFunctionForm
                                key={value?.identifier} // Force remount when switching between different tests
                                projectPath={value.projectPath}
                                functionName={value?.identifier}
                                filePath={value?.documentUri}
                                serviceType={value?.serviceType}
                            />);
                        break;
                    case MACHINE_VIEW.BIAIEvaluationForm:
                        setViewComponent(
                            <AIEvaluationForm
                                key={value?.identifier} // Force remount when switching between different tests
                                projectPath={value.projectPath}
                                functionName={value?.identifier}
                                filePath={value?.documentUri}
                                serviceType={value?.serviceType}
                                isVersionSupported={value?.metadata?.featureSupport?.aiEvaluation}
                            />);
                        break;
                    case MACHINE_VIEW.ViewConfigVariables:
                        setViewComponent(
                            <ViewConfigurableVariables
                                projectPath={value?.projectPath}
                                fileName={configFilePath}
                                testsConfigTomlPath={testsConfigTomlPath}
                                org={value?.org}
                            />
                        );
                        break;
                    case MACHINE_VIEW.AddConfigVariables:
                        setViewComponent(
                            <ViewConfigurableVariables
                                projectPath={value?.projectPath}
                                fileName={configFilePath}
                                testsConfigTomlPath={testsConfigTomlPath}
                                org={value?.org}
                                addNew={true}
                            />
                        );
                        break;
                    case MACHINE_VIEW.ServiceFunctionForm:
                        setViewComponent(
                            <ServiceFunctionForm
                                position={value?.position}
                                currentFilePath={value.documentUri}
                                projectPath={value.projectPath}
                            />
                        );
                        break;
                    case MACHINE_VIEW.ReviewMode:
                        setViewComponent(
                            <ReviewMode />
                        );
                        break;
                    case MACHINE_VIEW.EvalsetViewer:
                        setViewComponent(
                            <EvalsetViewer
                                projectPath={value.projectPath}
                                filePath={value?.evalsetData.filePath}
                                content={value?.evalsetData.content}
                                threadId={value?.evalsetData?.threadId}
                            />
                        );
                        break;
                    case MACHINE_VIEW.ConfigurationCollector:
                        setViewComponent(
                            <ConfigurationCollector
                                data={value.agentMetadata?.configurationCollector}
                                onClose={() => handleApprovalClose(value.agentMetadata?.configurationCollector)}
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

    const handleNavigateToOverview = () => {
        rpcClient.getVisualizerRpcClient().goHome();
    };

    const handleApprovalClose = (approvalData: any | undefined) => {
        const requestId = approvalData?.requestId;

        if (requestId) {
            console.log('[MainPanel] Approval view closed, notifying backend:', requestId);
            rpcClient.getVisualizerRpcClient().handleApprovalPopupClose({ requestId });
        }
    };

    const handlePopupClose = (id: string) => {
        closeModal(id);
    }

    return (
        <>
            <Global styles={globalStyles} />
            <VisualizerContainer id="visualizer-container">
                {/* {navActive && <NavigationBar showHome={showHome} />} */}
                {(showOverlay || modalStack.length > 0) && <Overlay />}
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
                        <PopupPanel onClose={handleOnClose} formState={popupState} handleNavigateToOverview={handleNavigateToOverview} />
                    </PopUpContainer>
                )}
                {sidePanel !== "EMPTY" && sidePanel === "ADD_ACTION" && (
                    <EndpointList stSymbolInfo={getSymbolInfo()} applyModifications={applyModifications} />
                )}
                {
                    modalStack.map((modal) => (
                        <Popup title={modal.title} onClose={() => {
                            modal.onClose && modal.onClose();
                            handlePopupClose(modal.id)
                        }} key={modal.id} width={modal.width} height={modal.height}>{modal.modal}</Popup>
                    ))
                }
            </VisualizerContainer>
        </>
    );
};

export default MainPanel;
