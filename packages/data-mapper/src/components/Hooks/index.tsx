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
import React, { useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
	DiagramModel,
    DiagramModelGenerics
} from "@projectstorm/react-diagrams";

import { DataMapperNodeModel } from '../Diagram/Node/commons/DataMapperNode';
import { getFieldCountMismatchIndex, getInputNodeFieldCounts, getIONodeHeight, isSameView } from '../Diagram/utils/diagram-utils';
import { OverlayLayerModel } from '../Diagram/OverlayLayer/OverlayLayerModel';
import { ErrorNodeKind } from '../DataMapper/Error/RenderingError';
import { useDMCollapsedFieldsStore, useDMExpandedFieldsStore, useDMSearchStore } from '../../store/store';
import {
    ArrayOutputNode,
    EmptyInputsNode,
    InputNode,
    LinkConnectorNode,
    ObjectOutputNode,
    PrimitiveOutputNode,
    QueryExprConnectorNode,
    QueryOutputNode,
    SubMappingNode
} from '../Diagram/Node';
import { GAP_BETWEEN_INPUT_NODES, IO_NODE_DEFAULT_WIDTH, OFFSETS } from '../Diagram/utils/constants';
import { InputDataImportNodeModel, OutputDataImportNodeModel } from '../Diagram/Node/DataImport/DataImportNode';
import { excludeEmptyInputNodes, getErrorKind } from '../Diagram/utils/common-utils';
import { IOType } from '@wso2/ballerina-core';

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

export const useDiagramModel = (
    nodes: DataMapperNodeModel[],
    diagramModel: DiagramModel,
    onError:(kind: ErrorNodeKind) => void,
    zoomLevel: number,
): {
    updatedModel: DiagramModel<DiagramModelGenerics>;
    isFetching: boolean;
    isError: boolean;
    refetch: any;
} => {
    const offSetX = diagramModel.getOffsetX();
    const offSetY = diagramModel.getOffsetY();
    const noOfNodes = nodes.length;
    const context = nodes.find(node => node.context)?.context;
    const { model } = context ?? {};
    const mappings = model.mappings.map(mapping => mapping.expression).toString();
    const subMappings = model?.subMappings?.map(mapping => (mapping as IOType).id).toString();
    const collapsedFields = useDMCollapsedFieldsStore(state => state.fields); // Subscribe to collapsedFields
    const expandedFields = useDMExpandedFieldsStore(state => state.fields); // Subscribe to expandedFields
    const { inputSearch, outputSearch } = useDMSearchStore();

    const genModel = async () => {
        if (diagramModel.getZoomLevel() !== zoomLevel && diagramModel.getNodes().length > 0) {
            // Update only zoom level and offset if zoom level is changed
            diagramModel.setZoomLevel(zoomLevel);
            diagramModel.setOffset(offSetX, offSetY);
            return diagramModel;
        }
        const newModel = new DiagramModel();
        newModel.setZoomLevel(zoomLevel);
        newModel.setOffset(offSetX, offSetY);

        newModel.addAll(...nodes);

        for (const node of nodes) {
            try {
                if (node instanceof InputNode && node.hasNoMatchingFields && !node.context) {
                    // Placeholder node for input search no result found
                    continue;
                }
                node.setModel(newModel);
                await node.initPorts();
                node.initLinks();
            } catch (e) {
                const errorNodeKind = getErrorKind(node);
                console.error(e);
                onError(errorNodeKind);
            }
        }
        newModel.setLocked(true);
        newModel.addLayer(new OverlayLayerModel());
        return newModel;
    };

    const {
        data: updatedModel,
        isFetching,
        isError,
        refetch,
    } = useQuery({
        queryKey: [
            'diagramModel',
            noOfNodes,
            zoomLevel,
            collapsedFields,
            expandedFields,
            inputSearch,
            outputSearch,
            mappings,
            subMappings
        ],
        queryFn: genModel,
        networkMode: 'always',
    });

    return { updatedModel, isFetching, isError, refetch };
};
