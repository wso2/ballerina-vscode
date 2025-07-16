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
import React, { useCallback, useEffect, useReducer, useState } from "react";
import { css } from "@emotion/css";
import { ExpandedDMModel } from "@wso2/ballerina-core";

import { DataMapperContext } from "../../utils/DataMapperContext/DataMapperContext";
import DataMapperDiagram from "../Diagram/Diagram";
import { DataMapperHeader } from "./Header/DataMapperHeader";
import { DataMapperNodeModel } from "../Diagram/Node/commons/DataMapperNode";
import { IONodeInitVisitor } from "../../visitors/IONodeInitVisitor";
import { DataMapperErrorBoundary } from "./ErrorBoundary";
import { traverseNode } from "../../utils/model-utils";
import { View } from "./Views/DataMapperView";
import {
    useDMCollapsedFieldsStore,
    useDMExpandedFieldsStore,
    useDMQueryClausesPanelStore,
    useDMSearchStore,
    useDMSubMappingConfigPanelStore
} from "../../store/store";
import { KeyboardNavigationManager } from "../../utils/keyboard-navigation-manager";
import { InlineDataMapperProps } from "../../index";
import { ErrorNodeKind } from "./Error/RenderingError";
import { IOErrorComponent } from "./Error/DataMapperError";
import { IntermediateNodeInitVisitor } from "../../visitors/IntermediateNodeInitVisitor";
import {
    ArrayOutputNode,
    InputNode,
    ObjectOutputNode,
    LinkConnectorNode,
    QueryExprConnectorNode,
    QueryOutputNode,
    SubMappingNode,
    EmptyInputsNode
} from "../Diagram/Node";
import { SubMappingNodeInitVisitor } from "../../visitors/SubMappingNodeInitVisitor";
import { SubMappingConfigForm } from "./SidePanel/SubMappingConfig/SubMappingConfigForm";
import { ClausesPanel } from "./SidePanel/QueryClauses/ClausesPanel";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";
import { Button, Codicon } from "@wso2/ui-toolkit";
import { AUTO_MAP_IN_PROGRESS_MSG, AUTO_MAP_TIMEOUT_MS } from "../Diagram/utils/constants";

const classes = {
    root: css({
        flexGrow: 1,
        height: "100vh",
        overflow: "hidden",
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

enum ActionType {
    ADD_VIEW,
    SWITCH_VIEW,
    EDIT_VIEW
}

type ViewAction = {
    type: ActionType,
    payload: {
        view?: View,
        index?: number
    },
}

export interface AutoMapError {
    onClose: () => void;
}

function viewsReducer(state: View[], action: ViewAction) {
    switch (action.type) {
        case ActionType.ADD_VIEW:
            return [...state, action.payload.view];
        case ActionType.SWITCH_VIEW:
            return state.slice(0, action.payload.index + 1);
        case ActionType.EDIT_VIEW:
            return [...state.slice(0, state.length - 1), action.payload.view];
        default:
            return state;
    }
}

export function InlineDataMapper(props: InlineDataMapperProps) {
    const {
        modelState,
        name,
        applyModifications,
        onClose,
        addArrayElement,
        handleView,
        convertToQuery,
        addSubMapping,
        generateForm,
        addClauses
    } = props;
    const {
        model,
        hasInputsOutputsChanged = false,
        hasSubMappingsChanged = false,
    } = modelState;

    const initialView = [{
        label: model.output.variableName,
        targetField: name
    }];

    const [views, dispatch] = useReducer(viewsReducer, initialView);
    const [nodes, setNodes] = useState<DataMapperNodeModel[]>([]);
    const [errorKind, setErrorKind] = useState<ErrorNodeKind>();
    const [hasInternalError, setHasInternalError] = useState(false);
    const [autoMapInProgress, setAutoMapInProgress] = useState(false);
    const [autoMapError, setAutoMapError] = useState<AutoMapError>();

    const { isSMConfigPanelOpen } = useDMSubMappingConfigPanelStore((state) => state.subMappingConfig);
    const { isQueryClausesPanelOpen} = useDMQueryClausesPanelStore();

    const { resetSearchStore } = useDMSearchStore();
    const { rpcClient } = useRpcContext();

    const addView = useCallback((view: View) => {
        dispatch({ type: ActionType.ADD_VIEW, payload: { view } });
        resetSearchStore();
    }, [resetSearchStore]);

    const switchView = useCallback((navigateIndex: number) => {
        dispatch({ type: ActionType.SWITCH_VIEW, payload: { index: navigateIndex } });
        resetSearchStore();
    }, [resetSearchStore]);

    const editView = useCallback((newData: View) => {
        dispatch({ type: ActionType.EDIT_VIEW, payload: { view: newData } });
        resetSearchStore();
    }, [resetSearchStore]);

    useEffect(() => {
        const lastView = views[views.length - 1];
        handleView(lastView.targetField, !!lastView?.subMappingInfo);
        setupKeyboardShortcuts();

        return () => {
            KeyboardNavigationManager.getClient().resetMouseTrapInstance();
        };
    }, [views]);

    useEffect(() => {
        generateNodes(model);
    }, [model]);

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            cleanupStores();
        }
    }, []);

    const generateNodes = (model: ExpandedDMModel) => {
        try {
            const context = new DataMapperContext(
                model, 
                views, 
                addView, 
                applyModifications, 
                addArrayElement,
                hasInputsOutputsChanged,
                convertToQuery
            );

            // Only regenerate IO nodes if inputs/outputs have changed
            let ioNodes: DataMapperNodeModel[] = [];
            if (hasInputsOutputsChanged || nodes.length === 0) {
                const ioNodeInitVisitor = new IONodeInitVisitor(context);
                traverseNode(model, ioNodeInitVisitor);
                ioNodes = ioNodeInitVisitor.getNodes();
            } else {
                // Reuse existing IO nodes but update their context
                ioNodes = nodes
                    .filter(node => 
                        node instanceof InputNode || 
                        node instanceof ArrayOutputNode || 
                        node instanceof ObjectOutputNode ||
                        node instanceof QueryOutputNode
                    )
                    .map(node => {
                        node.context = context;
                        return node;
                    });
            }

            // Only regenerate sub mappiing node if sub mappings have changed
            const hasInputNodes = !ioNodes.some(node => node instanceof EmptyInputsNode);
            let subMappingNode: DataMapperNodeModel;
            if (hasInputNodes) {
                if (hasSubMappingsChanged) {
                    const subMappingNodeInitVisitor = new SubMappingNodeInitVisitor(context);
                    traverseNode(model, subMappingNodeInitVisitor);
                    subMappingNode = subMappingNodeInitVisitor.getNode();
                } else {
                    // Reuse existing sub mapping node
                    subMappingNode = nodes.find(node => node instanceof SubMappingNode) as SubMappingNode;
                }
            }

            // Always regenerate intermediate nodes as they depend on mappings
            const intermediateNodeInitVisitor = new IntermediateNodeInitVisitor(
                context,
                nodes.filter(node => node instanceof LinkConnectorNode || node instanceof QueryExprConnectorNode)
            );
            traverseNode(model, intermediateNodeInitVisitor);

            // Only add subMappingNode if it is defined
            setNodes([
                ...ioNodes,
                ...(subMappingNode ? [subMappingNode] : []),
                ...intermediateNodeInitVisitor.getNodes()
            ]);
        } catch (error) {
            console.error("Error generating nodes:", error);
            setHasInternalError(true);
        }
    };

    const setupKeyboardShortcuts = () => {
        const mouseTrapClient = KeyboardNavigationManager.getClient();
        mouseTrapClient.bindNewKey(['command+z', 'ctrl+z'], () => handleVersionChange('dmUndo'));
        mouseTrapClient.bindNewKey(['command+shift+z', 'ctrl+y'], async () => handleVersionChange('dmRedo'));
    };

    const cleanupStores = () => {
        useDMSearchStore.getState().resetSearchStore();
        useDMCollapsedFieldsStore.getState().resetFields();
        useDMExpandedFieldsStore.getState().resetFields();
    }

    const handleOnClose = () => {
        cleanupStores();
        onClose();
    };

    const handleVersionChange = async (action: 'dmUndo' | 'dmRedo') => {
        // TODO: Implement undo/redo
    };

    const handleErrors = (kind: ErrorNodeKind) => {
        setErrorKind(kind);
    };

    const autoMapWithAI = async () => {
        const withTimeout = (promise: Promise<any>) =>
            Promise.race([
                promise,
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Reached timeout.')), AUTO_MAP_TIMEOUT_MS)
                )
            ]).then(result => {
                if (result?.code && result?.message) throw result;
                return result;
            });

        setAutoMapInProgress(true);

        try {
            const allMappingsRequest = await withTimeout(
                rpcClient.getAiPanelRpcClient().generateInlineMappings()
            );

            const sourceResponse = await withTimeout(
                rpcClient.getInlineDataMapperRpcClient().getAllDataMapperSource(allMappingsRequest)
            );

            setAutoMapInProgress(false);

            if (sourceResponse.error) {
                setAutoMapError({ onClose: closeAutoMapError });
                return;
            }
        } catch (error) {
            setAutoMapInProgress(false);
            throw error;
        }
    };

    const closeAutoMapError = () => {
        setAutoMapError(undefined);
    };

    const stopAutoMap = async (): Promise<boolean> => {
        setAutoMapInProgress(false);
        await rpcClient.getAiPanelRpcClient().stopAIInlineMappings();
        return true;
    }

    return (
        <DataMapperErrorBoundary hasError={hasInternalError} onClose={onClose}>
            <div className={classes.root}>
                {autoMapInProgress && (
                    <div className={classes.overlayWithLoader}>
                        <VSCodeProgressRing />
                        <div className={classes.autoMapInProgressMsg}>
                            {AUTO_MAP_IN_PROGRESS_MSG}
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
                {model && (
                    <DataMapperHeader
                        views={views}
                        switchView={switchView}
                        hasEditDisabled={false}
                        onClose={handleOnClose}
                        autoMapWithAI={autoMapWithAI}
                    />
                )}
                {errorKind && <IOErrorComponent errorKind={errorKind} classes={classes} />}
                {nodes.length > 0 && (
                    <>
                        <DataMapperDiagram
                            nodes={nodes}
                            onError={handleErrors}
                        />
                        {isSMConfigPanelOpen && (
                            <SubMappingConfigForm
                                views={views}
                                updateView={editView}
                                applyModifications={applyModifications}
                                addSubMapping={addSubMapping}
                                generateForm={generateForm}
                            />
                        )}
                        {isQueryClausesPanelOpen && (
                            <ClausesPanel
                                query={model.query}
                                targetField={views[views.length - 1].targetField}
                                addClauses={addClauses}
                                generateForm={generateForm}
                            />
                        )}
                    </>
                )}
                
            </div>
        </DataMapperErrorBoundary>
    )
}
