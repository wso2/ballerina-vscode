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
import React, { useEffect, useMemo, useReducer, useState } from "react";

import { css, keyframes } from "@emotion/css";
import {
    EVENT_TYPE,
    FileListEntry,
    MACHINE_VIEW,
    VisualizerLocation
} from "@wso2/ballerina-core";
import { NodePosition, STNode, traversNode } from "@wso2/syntax-tree";

import { useDMSearchStore, useDMStore } from "../../store/store";
import { DataMapperContext } from "../../utils/DataMapperContext/DataMapperContext";
import DataMapperDiagram from "../Diagram/Diagram";
import { DataMapperNodeModel } from "../Diagram/Node/commons/DataMapperNode";
import { hasIONodesPresent } from "../Diagram/utils/dm-utils";
import { FunctionDefinitionStore } from "../Diagram/utils/fn-definition-store";
import { handleDiagnostics } from "../Diagram/utils/ls-utils";
import { TypeDescriptorStore, TypeStoreStatus } from "../Diagram/utils/type-descriptor-store";
import { NodeInitVisitor } from "../Diagram/visitors/NodeInitVisitor";
import { SelectedSTFindingVisitor } from "../Diagram/visitors/SelectedSTFindingVisitor";
import { ViewStateSetupVisitor } from "../Diagram/visitors/ViewStateSetupVisitor";
import { StatementEditorComponent } from "../StatementEditorComponent/StatementEditorComponent"

import { DataMapperInputParam, DataMapperOutputParam, TypeNature } from "./ConfigPanel/InputParamsPanel/types";
import { getFnNameFromST, getFnSignatureFromST, getInputsFromST, getOutputTypeFromST } from "./ConfigPanel/utils";
import { CurrentFileContext } from "./Context/current-file-context";
import { ErrorNodeKind } from "./Error/RenderingError";
import { DataMapperErrorBoundary } from "./ErrorBoundary";
import { DataMapperHeader } from "./Header/DataMapperHeader";
import { UnsupportedDataMapperHeader } from "./Header/UnsupportedDataMapperHeader";
import { LocalVarConfigPanel } from "./LocalVarConfigPanel/LocalVarConfigPanel";
import { isArraysSupported } from "./utils";
import { useFileContent, useDMMetaData, useProjectComponents } from "../Hooks";
import { DataMapperViewProps } from "../..";
import { WarningBanner } from "./Warning/DataMapperWarning";

import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { QueryExprMappingType } from "../Diagram/Node/QueryExpression";
import { AutoMapError } from "./Error/AutoMapError";
import { AUTO_MAP_IN_PROGRESS_MSG, AUTO_MAP_TIMEOUT_MS } from "../Diagram/utils/constants";
import { VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";
import { Button, Codicon } from "@wso2/ui-toolkit";
import { AutoMapErrorComponent, IOErrorComponent, UnsupportedIOErrorComponent } from "./Error/DataMapperError";
import { SkeletonLoader } from './SkeletonLoader/SkeletonLoader';

const fadeIn = keyframes`
    from { opacity: 0.5; }
    to { opacity: 1; }
`;

const classes = {
    root: css({
        flexGrow: 1,
        height: "100%",
        overflow: "hidden",
    }),
    gridContainer: css({
        height: "100%",
        gridTemplateColumns: "1fr fit-content(200px)"
    }),
    paper: css({
        padding: "16px",
        textAlign: 'center',
        color: "var(--vscode-foreground)",
    }),
    overlay: css({
        zIndex: 1,
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: "var(--vscode-input-background)",
        opacity: 0.5,
        cursor: 'not-allowed'
    }),
    dmUnsupportedOverlay: css({
        zIndex: 1,
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: "var(--vscode-input-background)",
        opacity: 0.5,
    }),
    dmUnsupportedMessage: css({
        zIndex: 1,
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)'
    }),
    errorBanner: css({
        borderColor: "var(--vscode-errorForeground)"
    }),
    errorMessage: css({
        zIndex: 1,
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '500px',
        animation: `${fadeIn} 0.5s ease-in-out`
    }),
    overlayWithLoader: css({
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        zIndex: 1,
        position: 'fixed',
        backdropFilter: "blur(3px)",
        backgroundColor: 'rgba(var(--vscode-editor-background-rgb), 0.8)',
    }),
    autoMapInProgressMsg: css({
        marginTop: '10px'
    }),
    autoMapStopButton: css({
        "& > vscode-button": {
            textTransform: 'none',
            marginTop: '15px',
            border: '1px solid var(--vscode-welcomePage-tileBorder)',
            width: '100px',
            justifyContent: 'center'
        }
    })
}

export enum ViewOption {
    INITIALIZE,
    EXPAND,
    COLLAPSE,
    NAVIGATE,
    RESET,
}

export interface SelectionState {
    selectedST: DMNode;
    prevST?: DMNode[];
    state?: DMState;
}

export interface ExpressionInfo {
    value: string;
    valuePosition: NodePosition;
    label?: string;
}

export interface DMNode {
    // the parent node of the selected node
    stNode: STNode;
    // fqn for identifying the query expression view
    fieldPath: string;
    // position of the query expression (use to identify query expressions comes under select clauses)
    position?: NodePosition;
    // index of the select clause of chanined query expression
    index?: number;
    // nature of the query expression
    mappingType?: QueryExprMappingType;
}

enum DMState {
    INITIALIZED,
    NOT_INITIALIZED,
    ST_NOT_FOUND,
}

const selectionReducer = (state: SelectionState, action: { type: ViewOption, payload?: SelectionState, index?: number }) => {
    switch (action.type) {
        case ViewOption.EXPAND: {
            const previousST = state.prevST.length ? [...state.prevST, state.selectedST] : [state.selectedST];
            return { ...state, selectedST: action.payload.selectedST, prevST: previousST };
        }
        case ViewOption.COLLAPSE: {
            const prevSelection = state.prevST.pop();
            return { ...state, selectedST: prevSelection, prevST: [...state.prevST] };
        }
        case ViewOption.NAVIGATE: {
            const targetST = state.prevST[action.index];
            return { ...state, selectedST: targetST, prevST: [...state.prevST.slice(0, action.index)] };
        }
        case ViewOption.RESET: {
            return { selectedST: { stNode: undefined, fieldPath: undefined }, prevST: [], state: state.selectedST?.stNode ? DMState.ST_NOT_FOUND : DMState.INITIALIZED };
        }
        case ViewOption.INITIALIZE: {
            return { selectedST: action.payload.selectedST, prevST: action.payload.prevST, state: DMState.INITIALIZED };
        }
        default: {
            return state;
        }
    }
};

export function DataMapperC(props: DataMapperViewProps) {
    const {
        fnST,
        filePath,
        langServerRpcClient,
        libraryBrowserRpcClient,
        applyModifications,
        onClose,
        goToFunction: updateSelectedComponent,
        renderRecordPanel
    } = props;
    const openedViaPlus = false;
    const updateActiveFile: (currentFile: FileListEntry) => void = undefined;

    const {
        projectComponents,
        isFetching: isFetchingComponents,
    } = useProjectComponents(langServerRpcClient, filePath, fnST.source);
    const { 
        ballerinaVersion,
        dMSupported,
        dMUnsupportedMessage,
        isFetching: isFetchingDMMetaData,
        isError: isErrorDMMetaData
    } = useDMMetaData(langServerRpcClient);
    const {
        content,
        isFetching: isFetchingContent
    } = useFileContent(langServerRpcClient, filePath, fnST);

    const [currentEditableField, setCurrentEditableField] = useState<ExpressionInfo>(null);
    const [isStmtEditorCanceled, setIsStmtEditorCanceled] = useState(false);
    const [showDMOverlay, setShowDMOverlay] = useState(false);
    const [selection, dispatchSelection] = useReducer(selectionReducer, {
        selectedST: { stNode: fnST, fieldPath: fnST && fnST.functionName.value },
        prevST: [],
        state: DMState.NOT_INITIALIZED,
    });
    const [collapsedFields, setCollapsedFields] = React.useState<string[]>([]);
    const [inputs, setInputs] = useState<DataMapperInputParam[]>();
    const [output, setOutput] = useState<DataMapperOutputParam>();
    const [fnName, setFnName] = useState(getFnNameFromST(fnST));
    const [fnSignature, setFnSignature] = useState(getFnSignatureFromST(fnST));
    const [showLocalVarConfigPanel, setShowLocalVarConfigPanel] = useState(false);
    const { setFunctionST } = useDMStore();
    const { resetSearchStore } = useDMSearchStore();
    const [dmContext, setDmContext] = useState<DataMapperContext>();
    const [dmNodes, setDmNodes] = useState<DataMapperNodeModel[]>();
    const [shouldRestoreTypes, setShouldRestoreTypes] = useState(true);
    const [hasInternalError, setHasInternalError] = useState(false);
    const [errorKind, setErrorKind] = useState<ErrorNodeKind>();
    const [isSelectionComplete, setIsSelectionComplete] = useState(false);
    const [currentReferences, setCurrentReferences] = useState<string[]>([]);
    const [autoMapInProgress, setAutoMapInProgress] = useState(false);
    const [autoMapError, setAutoMapError] = useState<AutoMapError>();

    const typeStore = TypeDescriptorStore.getInstance();
    const typeStoreStatus = typeStore.getStatus();
    const { rpcClient } = useRpcContext();

    const goToSource = (position: NodePosition) => {
        rpcClient.getCommonRpcClient().goToSource({ position, filePath });
    };

    const isOverlay = (!isFetchingDMMetaData && !isErrorDMMetaData) && (showDMOverlay || showLocalVarConfigPanel || autoMapInProgress);

    const handleSelectedST = (mode: ViewOption, selectionState?: SelectionState, navIndex?: number) => {
        dispatchSelection({ type: mode, payload: selectionState, index: navIndex });
        resetSearchStore();
    }

    const handleCurrentReferences = (referencedFields: string[]) => {
        setCurrentReferences(referencedFields);
    }

    const onEdit = () => {
        const context: VisualizerLocation = {
            view: MACHINE_VIEW.BIDataMapperForm,
            identifier: fnST.functionName.value,
            documentUri: filePath,
        };
        rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: context });
    };

    const enableStatementEditor = (expressionInfo: ExpressionInfo) => {
        setCurrentEditableField(expressionInfo);
    }

    const closeStatementEditor = () => {
        setCurrentEditableField(null);
    }

    const cancelStatementEditor = () => {
        setCurrentEditableField(null);
        setIsStmtEditorCanceled(true);
    }

    const handleCollapse = (fieldName: string, expand?: boolean) => {
        if (!expand) {
            setCollapsedFields((prevState) => [...prevState, fieldName]);
        }
        else {
            setCollapsedFields((prevState) => prevState.filter((element) => element !== fieldName));
        }
    }

    const handleOverlay = (showOverlay: boolean) => {
        setShowDMOverlay(showOverlay);
    }

    const handleLocalVarConfigPanel = (showPanel: boolean) => {
        setShowLocalVarConfigPanel(showPanel);
    }

    const recordPanel = (props: {
        targetPosition: NodePosition,
        closeAddNewRecord: (createdNewRecord?: string) => void,
        onUpdate: (updated: boolean) => void
    }) => {
            return renderRecordPanel({
                langServerRpcClient,
                libraryBrowserRpcClient,
                applyModifications,
                currentFile,
                onCancelStatementEditor: cancelStatementEditor,
                onClose: closeStatementEditor,
                importStatements,
                currentReferences,
                ...props
            });
    }

    const referenceManager = {
        currentReferences,
        handleCurrentReferences
    }

    const currentFile = useMemo(() => ({
        content: content ? content[0] : "",
        path: filePath,
        size: 1
    }), [content, isFetchingContent]);

    const importStatements = useMemo(() => content ? content[1] : [], [content, isFetchingContent]);

    const moduleComponents = useMemo(() => {
        const moduleVars = [];
        const consts = [];
        const enums = [];
        const functions = [];
        if (projectComponents && projectComponents.packages) {
            for (const pkg of projectComponents.packages) {
                for (const mdl of pkg.modules) {
                    for (const moduleVariable of mdl.moduleVariables) {
                        moduleVars.push(moduleVariable);
                    }
                    for (const constant of mdl.constants) {
                        consts.push(constant);
                    }
                    for (const enumType of mdl.enums) {
                        enums.push({
                            filePath: pkg.filePath,
                            enum: enumType,
                        });
                    }
                    for (const fn of mdl.functions) {
                        functions.push(fn);
                    }
                }
            }
        }
        return {
            moduleVarDecls: moduleVars,
            constDecls: consts,
            enumDecls: enums,
            functions: functions
        };
    }, [projectComponents, isFetchingComponents]);

    const autoMapWithAI = async () => {
        rpcClient.getAiPanelRpcClient().generateMappings({position: fnST.position, filePath});
    };

    const stopAutoMap = async (): Promise<boolean> => {
        const ai = rpcClient.getAiPanelRpcClient();
        setAutoMapInProgress(false);
        await ai.stopAIMappings();
        return true;
    }

    useEffect(() => {
        if (fnST) {
            const defaultSt = { stNode: fnST, fieldPath: fnST.functionName.value };
            if (selection.selectedST) {
                try {
                    traversNode(fnST, new ViewStateSetupVisitor());
                    const selectedSTFindingVisitor = new SelectedSTFindingVisitor([...selection.prevST, selection.selectedST]);
                    traversNode(fnST, selectedSTFindingVisitor);
                    const { selectedST, prevST } = selectedSTFindingVisitor.getST();

                    dispatchSelection({ type: ViewOption.INITIALIZE, payload: { prevST, selectedST: selectedST || defaultSt } });
                } catch (e) {
                    setHasInternalError(true);
                    // tslint:disable-next-line:no-console
                    console.error(e);
                }
            } else {
                dispatchSelection({ type: ViewOption.INITIALIZE, payload: { prevST: [], selectedST: defaultSt } });
            }
        } else {
            dispatchSelection({ type: ViewOption.RESET });
        }
        setFunctionST(fnST);
        setShouldRestoreTypes(true);
        const fnSignatureFromFnST = getFnSignatureFromST(fnST);
        const fnNameFromFnST = getFnNameFromST(fnST);
        if (!(inputs && output) || (fnST && fnSignatureFromFnST !== fnSignature && fnNameFromFnST !== fnName)) {
            const fnSTFromTypeStore = typeStore.getSTNode();
            const hasFnSwitched = fnST && fnSTFromTypeStore && (
                fnNameFromFnST !== getFnNameFromST(fnSTFromTypeStore)
                || fnSignatureFromFnST !== getFnSignatureFromST(fnSTFromTypeStore)
            );
            if (hasFnSwitched || (!(inputs && output) && (!fnSTFromTypeStore || openedViaPlus))) {
                typeStore.resetStatus();
                setInputs(undefined);
                setOutput(undefined);
            }
            setFnSignature(fnSignatureFromFnST);
            setFnName(fnNameFromFnST);
        }
    }, [fnST]);

    useEffect(() => {
        setIsSelectionComplete(false)
        void (async () => {
            if (selection.selectedST.stNode && !isFetchingComponents && !isFetchingDMMetaData) {
                const diagnostics = await handleDiagnostics(filePath, langServerRpcClient);

                const context = new DataMapperContext(
                    filePath,
                    fnST,
                    selection,
                    langServerRpcClient,
                    currentFile,
                    moduleComponents,
                    handleSelectedST,
                    goToSource,
                    diagnostics,
                    enableStatementEditor,
                    collapsedFields,
                    handleCollapse,
                    isStmtEditorCanceled,
                    handleOverlay,
                    ballerinaVersion,
                    handleLocalVarConfigPanel,
                    applyModifications,
                    updateActiveFile,
                    updateSelectedComponent,
                    referenceManager
                );

                if (shouldRestoreTypes) {
                    await typeStore.storeTypeDescriptors(fnST, context, isArraysSupported(ballerinaVersion), langServerRpcClient);
                    const functionDefinitions = FunctionDefinitionStore.getInstance();
                    await functionDefinitions.storeFunctionDefinitions(fnST, context, langServerRpcClient);
                    setShouldRestoreTypes(false);
                }

                setDmContext(context);
            }
        })();
        setIsSelectionComplete(true)
    }, [selection.selectedST, collapsedFields, isStmtEditorCanceled, isFetchingComponents, isFetchingDMMetaData]);

    useEffect(() => {
        if (isSelectionComplete && dmContext && selection?.selectedST?.stNode) {
            const nodeInitVisitor = new NodeInitVisitor(dmContext, selection);
            try {
                traversNode(selection.selectedST.stNode, nodeInitVisitor);
                const nodes = nodeInitVisitor.getNodes();
                if (hasIONodesPresent(nodes) && typeStoreStatus === TypeStoreStatus.Loaded) {
                    setDmNodes(nodes);
                }
            } catch (e) {
                setHasInternalError(true);
                // tslint:disable-next-line:no-console
                console.error(e);
            }
        } else {
            setDmNodes([]);
        }
    }, [isSelectionComplete, dmContext, typeStoreStatus]);

    useEffect(() => {
        let inputParams: DataMapperInputParam[] = [];
        let outputType: DataMapperOutputParam = { type: undefined, isUnsupported: true, typeNature: TypeNature.DUMMY };
        const hasIncompleteInputs = inputs && inputs.some(i => i.isUnsupported && (
            i.typeNature === TypeNature.TYPE_UNAVAILABLE
            || i.typeNature === TypeNature.PARAM_NAME_UNAVAILABLE
            || i.typeNature === TypeNature.INVALID)
        );
        const hasIncompleteOutput = output && output.isUnsupported
            && (output.typeNature === TypeNature.INVALID || output.typeNature === TypeNature.TYPE_UNAVAILABLE);
        if (selection.prevST.length === 0
            && typeStoreStatus === TypeStoreStatus.Loaded
            && ((!hasInvalidIO) || hasIncompleteInputs || hasIncompleteOutput)) {
            if (fnST && selection.state === DMState.INITIALIZED) {
                // When open the DM of an existing function using code lens
                const hasNoParameter = fnST.functionSignature.parameters.length === 0;
                const hasNoReturnType = !fnST.functionSignature?.returnTypeDesc;
                if (!hasNoParameter) {
                    inputParams = getInputsFromST(fnST, ballerinaVersion) || inputParams;
                    setInputs(inputParams);
                }
                if (!hasNoReturnType) {
                    outputType = getOutputTypeFromST(fnST, ballerinaVersion) || outputType;
                    setOutput(outputType);
                }
                if (!inputs && !output) {
                    setInputs(inputParams);
                    setOutput(outputType);
                }
            }
        } else if (typeStoreStatus === TypeStoreStatus.Init && openedViaPlus) {
            // When creating a new DM using plus menu
            setInputs(inputParams);
            setOutput(outputType);
        }
    }, [fnSignature, typeStoreStatus]);

    useEffect(() => {
        if (selection.state === DMState.ST_NOT_FOUND) {
            onClose();
        }
    }, [selection.state])

    const hasInvalidIO = useMemo(() => {
        if (inputs && output) {
            const hasInvalidInputs = !inputs.length || inputs.some(input => input.isUnsupported);
            const isInvalidOutput = output.isUnsupported;
            return hasInvalidInputs || isInvalidOutput;
        }
    }, [inputs, output])

    useEffect(() => {
        handleOverlay(!!currentEditableField || !selection?.selectedST?.stNode || hasInvalidIO);
    }, [currentEditableField, selection.selectedST, hasInvalidIO])

    useEffect(() => {
        resetSearchStore();
    }, [fnName]);

    const handleErrors = (kind: ErrorNodeKind) => {
        setErrorKind(kind);
    };

    const handleBack = () => {
        rpcClient.getVisualizerRpcClient()?.goBack();
    };

    return (
        <DataMapperErrorBoundary hasError={hasInternalError}>
            <CurrentFileContext.Provider value={currentFile}>
                {selection.state === DMState.INITIALIZED && (
                    <div className={classes.root}>
                        {isOverlay &&
                            <>
                                <div className={dMSupported ? classes.overlay : classes.dmUnsupportedOverlay} />
                            </>
                        }
                        {autoMapInProgress && (
                            <div className={classes.overlayWithLoader}>
                                <VSCodeProgressRing />
                                <div className={classes.autoMapInProgressMsg}>
                                    { AUTO_MAP_IN_PROGRESS_MSG }
                                </div>
                                <Button
                                    onClick={stopAutoMap}
                                    appearance="secondary"
                                    className={classes.autoMapStopButton}
                                >
                                    <Codicon sx={{ marginRight: 5 }} name="stop-circle" />
                                    {"Stop"}
                                </Button>
                        </div>
                        )}
                        {fnST && (
                            <DataMapperHeader
                                selection={selection}
                                hasEditDisabled={!dMSupported || !!errorKind}
                                changeSelection={handleSelectedST}
                                onClose={onClose}
                                autoMapWithAI={autoMapWithAI}
                                onEdit={onEdit}
                                onBack={handleBack}
                            />
                        )}
                        {(!isFetchingDMMetaData && !isErrorDMMetaData) && !dMSupported && (
                            <>
                                {!fnST && (<UnsupportedDataMapperHeader onClose={onClose} />)}
                                <div className={classes.dmUnsupportedMessage}>
                                    <WarningBanner message={dMUnsupportedMessage} testId={"warning-message"} />
                                </div>
                            </>
                        )}
                        {errorKind && <IOErrorComponent errorKind={errorKind} classes={classes} />}
                        {autoMapError && <AutoMapErrorComponent autoMapError={autoMapError} classes={classes} />}
                        {dmNodes.length > 0 && !hasInvalidIO && !errorKind && (
                            <DataMapperDiagram
                                nodes={dmNodes}
                                onError={handleErrors}
                            />
                        )}
                        {dmNodes.length === 0 && !errorKind && (
                            <SkeletonLoader />
                        )}
                        {hasInvalidIO && <UnsupportedIOErrorComponent inputs={inputs} output={output} classes={classes} />}
                        {!!currentEditableField && dMSupported && (
                            <StatementEditorComponent
                                expressionInfo={currentEditableField}
                                langServerRpcClient={langServerRpcClient}
                                libraryBrowserRpcClient={libraryBrowserRpcClient}
                                applyModifications={applyModifications}
                                currentFile={currentFile}
                                onCancel={cancelStatementEditor}
                                onClose={closeStatementEditor}
                                importStatements={importStatements}
                                currentReferences={currentReferences}
                            />
                        )}
                        {showLocalVarConfigPanel && (
                            <LocalVarConfigPanel
                                handleLocalVarConfigPanel={handleLocalVarConfigPanel}
                                enableStatementEditor={enableStatementEditor}
                                fnDef={selection.selectedST.stNode}
                                applyModifications={applyModifications}
                                langServerRpcClient={langServerRpcClient}
                                filePath={filePath}
                            />
                        )}
                    </div>
                )}
            </CurrentFileContext.Provider>
        </DataMapperErrorBoundary>
    )
}

export const DataMapper = React.memo(DataMapperC);
