import React from "react";

import { FunctionDefinition, ResourceAccessorDefinition } from "@wso2/syntax-tree";

import { Provider } from "../Context/diagram";
import { LowCodeDiagramProperties } from "../Context/types";

import { FunctionDiagram } from "./functionDiagram";

export interface ReadOnlyDiagramProps {
    model: FunctionDefinition | ResourceAccessorDefinition;
    onDiagramDoubleClick ?: () => void;
}

export function ReadOnlyDiagram(props: ReadOnlyDiagramProps) {
    const { model, onDiagramDoubleClick } = props;

    const context: LowCodeDiagramProperties = {
        syntaxTree: model,
        fullST: model,
        isReadOnly: true,
        onDiagramDoubleClick,
    }

    return (
        <Provider {...context}>
            <FunctionDiagram model={model} />
        </Provider>
    );
}
