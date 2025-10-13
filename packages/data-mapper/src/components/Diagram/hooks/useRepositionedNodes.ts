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
import { useRef, useEffect } from "react";
import { DiagramModel } from "@projectstorm/react-diagrams";

import { DataMapperNodeModel } from "../Node/commons/DataMapperNode";
import { excludeEmptyInputNodes } from "../utils/common-utils";
import {
    getFieldCountMismatchIndex,
    getInputNodeFieldCounts,
    getIONodeHeight,
    isSameView
} from "../utils/diagram-utils";
import {
    ArrayOutputNode,
    EmptyInputsNode,
    InputNode,
    ObjectOutputNode,
    PrimitiveOutputNode,
    QueryOutputNode,
    SubMappingNode
} from "../Node";
import { InputDataImportNodeModel, OutputDataImportNodeModel } from "../Node/DataImport/DataImportNode";
import { GAP_BETWEEN_INPUT_NODES, IO_NODE_DEFAULT_WIDTH, OFFSETS } from "../utils/constants";

export interface FieldCount {
    id: string;
    numberOfFields: number;
}

export const useRepositionedNodes = (
    nodes: DataMapperNodeModel[],
    zoomLevel: number,
    diagramModel: DiagramModel
) => {
    const nodesClone = [...excludeEmptyInputNodes(nodes)];
    const prevNodes = diagramModel.getNodes() as DataMapperNodeModel[];
    const inputNodeFieldCounts = getInputNodeFieldCounts(nodesClone);

    // Ref to store previous field counts
    const prevFieldCountsRef = useRef<FieldCount[]>([]);

    const fieldCountMismatchIndex = getFieldCountMismatchIndex(inputNodeFieldCounts, prevFieldCountsRef.current);
    
    // Update refs when field counts change
    useEffect(() => {
        if (fieldCountMismatchIndex !== -1) {
            prevFieldCountsRef.current = inputNodeFieldCounts;
        }
    }, [inputNodeFieldCounts, diagramModel]);

    let prevBottomY = 0;

    nodesClone.forEach((node, index) => {
        const existingNode = prevNodes.find(prevNode => prevNode.id === node.id);
        const sameView = isSameView(node, existingNode);

        if (node instanceof ObjectOutputNode
            || node instanceof ArrayOutputNode
            || node instanceof PrimitiveOutputNode
            || node instanceof QueryOutputNode
            || node instanceof OutputDataImportNodeModel
        ) {
            const x = (window.innerWidth) * (100 / zoomLevel) - IO_NODE_DEFAULT_WIDTH;
            const y = existingNode && sameView && existingNode.getY() !== 0 ? existingNode.getY() : 0;
            node.setPosition(x, y);
        }
        if (node instanceof InputNode
            || node instanceof EmptyInputsNode
            || node instanceof SubMappingNode
            || node instanceof InputDataImportNodeModel
        ) {
            const x = OFFSETS.SOURCE_NODE.X;
            const computedY = prevBottomY + (prevBottomY ? GAP_BETWEEN_INPUT_NODES : 0);

            const utilizeExistingY = existingNode &&
                sameView &&
                existingNode.getY() !== 0 &&
                !(node instanceof SubMappingNode) &&
                (fieldCountMismatchIndex === -1 || index <= fieldCountMismatchIndex);

            let y = utilizeExistingY ? existingNode.getY() : computedY;
            node.setPosition(x, y);
            if (node instanceof InputNode) {
                const nodeHeight = getIONodeHeight(node.numberOfFields);
                prevBottomY = y + nodeHeight;
            }
        }
    });

    return nodesClone;
}
