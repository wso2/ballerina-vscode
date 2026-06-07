import React, { useContext, useReducer } from "react";

import { NodePosition, STNode } from "@wso2/syntax-tree";

import { recalculateSizingAndPositioning, sizingAndPositioning } from "../Utils";

import { LowCodeDiagramContext, LowCodeDiagramProps, LowCodeDiagramState } from "./types";

const defaultState: any = {};
export const Context = React.createContext<LowCodeDiagramContext>(defaultState);

const reducer = (state: LowCodeDiagramState, action: any) => {
    switch (action.type) {
        case 'UPDATE_STATE':
            return {
                ...state,
                ...action.payload,
                targetPosition: state.targetPosition,
            };
        case 'DIAGRAM_CLEAN_DRAW':
            return {
                ...state,
                syntaxTree: sizingAndPositioning(action.payload, state.experimentalEnabled),
            };
        case 'DIAGRAM_REDRAW':
            return {
                ...state,
                syntaxTree: recalculateSizingAndPositioning(action.payload, state.experimentalEnabled)
            };
        case 'INSERT_COMPONENT_START':
            return {
                ...state,
                targetPosition: action.payload
            }
        case 'EDITOR_COMPONENT_START':
            return {
                ...state,
                targetPosition: action.payload
            }
        default:
            return state;
    }
};

const updateState = (dispatch: any) => {
    return (payload: any) => {
        dispatch({ type: 'UPDATE_STATE', payload });
    };
}

const diagramCleanDraw = (dispatch: any) => {
    return (payload: STNode) => {
        dispatch({ type: 'DIAGRAM_CLEAN_DRAW', payload });
    }
}

const diagramRedraw = (dispatch: any) => {
    return (payload: STNode) => {
        dispatch({ type: 'DIAGRAM_REDRAW', payload })
    }
}

const insertComponentStart = (dispatch: any) => {
    return (payload: NodePosition) => {
        dispatch({ type: 'INSERT_COMPONENT_START', payload })
    }
}

const editorComponentStart = (dispatch: any) => {
    return (payload: STNode) => {
        dispatch({ type: 'EDITOR_COMPONENT_START', payload })
    }
}

export const Provider: React.FC<React.PropsWithChildren<LowCodeDiagramProps>> = (props) => {
    const { children, api, ...restProps } = props;

    const [state, dispatch] = useReducer(reducer, { experimentalEnabled: props.experimentalEnabled });

    const actions = {
        updateState: updateState(dispatch),
        diagramCleanDraw: diagramCleanDraw(dispatch),
        diagramRedraw: diagramRedraw(dispatch),
        insertComponentStart: insertComponentStart(dispatch),
        editorComponentStart: editorComponentStart(dispatch),
    };

    return (
        <Context.Provider value={{ state, actions, api, props: restProps }}>
            {children}
        </Context.Provider>
    );
}


export const useDiagramContext = () => useContext(Context);
