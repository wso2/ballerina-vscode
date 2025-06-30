import React from "react";

import { FunctionDefinition, ResourceAccessorDefinition } from "@wso2/syntax-tree";

import { Function } from "../Components/RenderingComponents/Function";
import { sizingAndPositioning } from "../Utils";


export function FunctionDiagram(props: { model: FunctionDefinition | ResourceAccessorDefinition }) {
    const { model } = props;
    const visitedST = sizingAndPositioning(model) as FunctionDefinition;
    return (
        <div>
            <Function model={visitedST} hideHeader={true} />
        </div>
    );
}
