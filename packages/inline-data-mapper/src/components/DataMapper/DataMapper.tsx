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

import { DataMapperContext } from "../../utils/DataMapperContext/DataMapperContext";
import DataMapperDiagram from "../Diagram/Diagram";
import { DataMapperHeader } from "./Header/DataMapperHeader";
import { DataMapperNodeModel } from "../Diagram/Node/commons/DataMapperNode";
import { NodeInitVisitor } from "../../visitors/NodeInitVisitor";
import { DataMapperErrorBoundary } from "./ErrorBoundary";
import { traverseNode } from "../../utils/model-utils";
import { View } from "./Views/DataMapperView";
import { useDMCollapsedFieldsStore, useDMExpandedFieldsStore, useDMSearchStore } from "../../store/store";
import { KeyboardNavigationManager } from "../../utils/keyboard-navigation-manager";
import { DataMapperViewProps } from "../../index";
import { ErrorNodeKind } from "./Error/RenderingError";
import { IOErrorComponent } from "./Error/DataMapperError";

const classes = {
    root: css({
        flexGrow: 1,
        height: "100vh",
        overflow: "hidden",
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

export function InlineDataMapper(props: DataMapperViewProps) {
    const { model, applyModifications, onClose, addArrayElement } = props;

    const initialView = [{
        label: 'Root', // TODO: Pick a better label
        model: model
    }];

    const [views, dispatch] = useReducer(viewsReducer, initialView);
    const [nodes, setNodes] = useState<DataMapperNodeModel[]>([]);
    const [errorKind, setErrorKind] = useState<ErrorNodeKind>();
    const [hasInternalError, setHasInternalError] = useState(false);

    const { resetSearchStore } = useDMSearchStore();

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
        generateNodes();
        setupKeyboardShortcuts();

        return () => {
            KeyboardNavigationManager.getClient().resetMouseTrapInstance();
        };
    }, [model, views]);

    useEffect(() => {
        return () => {
            // Cleanup on close
            handleOnClose();
        }
    }, []);

    const generateNodes = () => {
        try {
            const context = new DataMapperContext(model, views, addView, applyModifications, addArrayElement);
            const nodeInitVisitor = new NodeInitVisitor(context);
            traverseNode(model, nodeInitVisitor);
            setNodes(nodeInitVisitor.getNodes());
        } catch (error) {
            setHasInternalError(true);
        }
    };

    const setupKeyboardShortcuts = () => {
        const mouseTrapClient = KeyboardNavigationManager.getClient();
        mouseTrapClient.bindNewKey(['command+z', 'ctrl+z'], () => handleVersionChange('dmUndo'));
        mouseTrapClient.bindNewKey(['command+shift+z', 'ctrl+y'], async () => handleVersionChange('dmRedo'));
    };

    const handleOnClose = () => {
        useDMSearchStore.getState().resetSearchStore();
        useDMCollapsedFieldsStore.getState().resetFields();
        useDMExpandedFieldsStore.getState().resetFields();
        onClose();
    };

    const handleVersionChange = async (action: 'dmUndo' | 'dmRedo') => {
        // TODO: Implement undo/redo
    };

    const handleErrors = (kind: ErrorNodeKind) => {
        setErrorKind(kind);
    };

    return (
        <DataMapperErrorBoundary hasError={hasInternalError} onClose={onClose}>
            <div className={classes.root}>
                {model && (
                    <DataMapperHeader
                        hasEditDisabled={false}
                        onClose={handleOnClose}
                    />
                )}
                {errorKind && <IOErrorComponent errorKind={errorKind} classes={classes} />}
                {nodes.length > 0 && (
                    <DataMapperDiagram
                        nodes={nodes}
                        onError={handleErrors}
                    />
                )}
            </div>
        </DataMapperErrorBoundary>
    )
}
