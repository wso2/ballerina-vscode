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
import { css, keyframes } from "@emotion/css";
import { CodeData, ExpandedDMModel } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { useShallow } from "zustand/react/shallow";

import { DataMapperContext } from "../../utils/DataMapperContext/DataMapperContext";
import DataMapperDiagram from "../Diagram/Diagram";
import { DataMapperHeader } from "./Header/DataMapperHeader";
import { DataMapperNodeModel } from "../Diagram/Node/commons/DataMapperNode";
import { IONodeInitVisitor } from "../../visitors/IONodeInitVisitor";
import { traverseNode } from "../../utils/model-utils";
import { View } from "./Views/DataMapperView";
import {
    useDMCollapsedFieldsStore,
    useDMExpandedFieldsStore,
    useDMQueryClausesStore,
    useDMSearchStore,
    useDMSubMappingConfigPanelStore,
    useDMExpressionBarStore
} from "../../store/store";
import { KeyboardNavigationManager } from "../../utils/keyboard-navigation-manager";
import { DataMapperEditorProps } from "../../index";
import { ErrorNodeKind } from "./Error/RenderingError";
import { IntermediateNodeInitVisitor } from "../../visitors/IntermediateNodeInitVisitor";
import {
    LinkConnectorNode,
    QueryExprConnectorNode,
    EmptyInputsNode
} from "../Diagram/Node";
import { SubMappingNodeInitVisitor } from "../../visitors/SubMappingNodeInitVisitor";
import { SubMappingConfigForm } from "./SidePanel/SubMappingConfig/SubMappingConfigForm";
import { ClausesPanel } from "./SidePanel/QueryClauses/ClausesPanel";
import { ClauseForm } from "./SidePanel/QueryClauses/ClauseForm";

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
    overlay: css({
        zIndex: 1,
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: "var(--vscode-input-background)",
        opacity: 0.5,
        cursor: 'not-allowed'
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
    })
}

enum ActionType {
    ADD_VIEW,
    SWITCH_VIEW,
    EDIT_VIEW,
    RESET_VIEW
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
        case ActionType.RESET_VIEW:
            return [action.payload.view];
        default:
            return state;
    }
}

export function DataMapperEditor(props: DataMapperEditorProps) {
    const {
        modelState,
        name,
        reusable,
        applyModifications,
        onClose,
        onRefresh,
        onEdit,
        addArrayElement,
        handleView,
        convertToQuery,
        addSubMapping,
        deleteMapping,
        deleteSubMapping,
        generateForm,
        addClauses,
        deleteClause,
        getClausePosition,
        mapWithCustomFn,
        mapWithTransformFn,
        goToFunction,
        enrichChildFields,
        genUniqueName,
        getConvertedExpression,
        createConvertedVariable,
        undoRedoGroup
    } = props;
    const {
        model,
        hasInputsOutputsChanged = false
    } = modelState;

    const initialView: View[] = [{
        label: model.output.name,
        targetField: name
    }];

    const [views, dispatch] = useReducer(viewsReducer, initialView);
    const [nodes, setNodes] = useState<DataMapperNodeModel[]>([]);

    const { isSMConfigPanelOpen, resetSubMappingConfig } = useDMSubMappingConfigPanelStore(
        useShallow(state => ({
            isSMConfigPanelOpen: state.subMappingConfig.isSMConfigPanelOpen,
            resetSubMappingConfig: state.resetSubMappingConfig
        }))
    );
    const { isQueryClausesPanelOpen, isQueryClauseFormOpen } = useDMQueryClausesStore();
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

    const resetView = useCallback((newData: View) => {
        dispatch({ type: ActionType.RESET_VIEW, payload: { view: newData } });
    }, [resetSearchStore]);

    const handleOnReset = useCallback(async () => {
        const targetField = views[views.length - 1].targetField;
        const outputIds = targetField.split('.');

        let output: string;
        while ((output = outputIds.pop()) === '0');
        
        await deleteMapping(
            { output, expression: undefined },
            targetField
        );
    }, [views, deleteMapping]);

    useEffect(() => {
        const lastView = views[views.length - 1];
        handleView(lastView.targetField, !!lastView?.subMappingInfo);
        setupKeyboardShortcuts();

        return () => {
            KeyboardNavigationManager.getClient().resetMouseTrapInstance();
        };
    }, [views]);

    useEffect(() => {
        const prevRootViewId = views[0].label;
        const newRootViewId = model.rootViewId;

        if (prevRootViewId !== newRootViewId) {
            const view = {
                label: model.rootViewId,
                targetField: name
            };
            generateNodes(model, [view]);
            resetView(view);
        } else {
            generateNodes(model, views);
        }
    }, [model]);

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            cleanupStores();
        }
    }, []);

    const generateNodes = (model: ExpandedDMModel, views: View[]) => {
        try {
            const context = new DataMapperContext(
                model, 
                views, 
                hasInputsOutputsChanged,
                addView, 
                applyModifications, 
                addArrayElement,
                convertToQuery,
                deleteMapping,
                deleteSubMapping,
                addClauses,
                mapWithCustomFn,
                mapWithTransformFn,
                goToFunction,
                enrichChildFields,
                genUniqueName,
                getConvertedExpression,
                createConvertedVariable
            );

            const ioNodeInitVisitor = new IONodeInitVisitor(context);
            traverseNode(model, ioNodeInitVisitor);
            const inputNodes = ioNodeInitVisitor.getInputNodes();
            const outputNode = ioNodeInitVisitor.getOutputNode();

            const hasInputNodes = !inputNodes.some(node => node instanceof EmptyInputsNode);
            let subMappingNode: DataMapperNodeModel;
            if (hasInputNodes) {
                const subMappingNodeInitVisitor = new SubMappingNodeInitVisitor(context);
                traverseNode(model, subMappingNodeInitVisitor);
                subMappingNode = subMappingNodeInitVisitor.getNode();
            }

            const intermediateNodeInitVisitor = new IntermediateNodeInitVisitor(
                context,
                nodes.filter(node => node instanceof LinkConnectorNode || node instanceof QueryExprConnectorNode)
            );
            traverseNode(model, intermediateNodeInitVisitor);

            setNodes([
                ...inputNodes,
                ...(subMappingNode ? [subMappingNode] : []),
                outputNode,
                ...intermediateNodeInitVisitor.getNodes()
            ]);
        } catch (error) {
            console.error("Error generating nodes:", error);
            throw error;
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
        useDMExpressionBarStore.getState().resetExpressionBarStore();
        useDMQueryClausesStore.getState().resetQueryClausesPanelStore();
    }

    const handleOnClose = () => {
        cleanupStores();
        onClose();
    };

    const handleOnBack = () => {
        if (views.length > 1) {
            switchView(views.length - 2);
        } else {
            handleOnClose();
        }
    };

    const handleVersionChange = async (action: 'dmUndo' | 'dmRedo') => {
        // TODO: Implement undo/redo
    };

    const handleErrors = (kind: ErrorNodeKind) => {
        throw new Error("Diagram rendering error:" + kind);
    };

    const autoMapWithAI = async () => {
        await rpcClient.getAiPanelRpcClient().openChatWindowWithCommand();
    };

    const addNewSubMapping = async (
        subMappingName: string,
        type: string,
        index: number,
        targetField: string,
        importsCodedata?: CodeData
    ) => {
        await addSubMapping(subMappingName, type, index, targetField, importsCodedata);
        resetSubMappingConfig();
    }

    return (
        <div className={classes.root}>
            {model && (
                <DataMapperHeader
                    views={views}
                    reusable={reusable}
                    switchView={switchView}
                    onClose={handleOnClose}
                    onBack={handleOnBack}
                    onRefresh={onRefresh}
                    onReset={handleOnReset}
                    onEdit={onEdit}
                    autoMapWithAI={autoMapWithAI}
                    undoRedoGroup={undoRedoGroup}
                />
            )}
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
                            addSubMapping={addNewSubMapping}
                            generateForm={generateForm}
                        />
                    )}
                    {isQueryClausesPanelOpen && (
                        <ClausesPanel
                            query={model.query}
                            targetField={views[views.length - 1].targetField}
                            addClauses={addClauses}
                            deleteClause={deleteClause}
                            getClausePosition={getClausePosition}
                            generateForm={generateForm}
                            genUniqueName={genUniqueName}
                        />
                    )}
                    {isQueryClauseFormOpen && (
                        <ClauseForm
                            query={model.query}
                            targetField={views[views.length - 1].targetField}
                            addClauses={addClauses}
                            getClausePosition={getClausePosition}
                            generateForm={generateForm}
                        />
                    )}
                </>
            )}
        </div>
    );
}
