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
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
	DiagramModel,
    DiagramModelGenerics
} from "@projectstorm/react-diagrams";

import { DataMapperNodeModel } from '../Diagram/Node/commons/DataMapperNode';
import { getIONodeHeight } from '../Diagram/utils/diagram-utils';
import { OverlayLayerModel } from '../Diagram/OverlayLayer/OverlayLayerModel';
import { ErrorNodeKind } from '../DataMapper/Error/RenderingError';
import { useDMCollapsedFieldsStore, useDMExpandedFieldsStore, useDMSearchStore } from '../../store/store';
import { ArrayOutputNode, EmptyInputsNode, InputNode, ObjectOutputNode } from '../Diagram/Node';
import { GAP_BETWEEN_INPUT_NODES, OFFSETS } from '../Diagram/utils/constants';
import { InputDataImportNodeModel, OutputDataImportNodeModel } from '../Diagram/Node/DataImport/DataImportNode';
import { getErrorKind } from '../Diagram/utils/common-utils';

export const useRepositionedNodes = (
    nodes: DataMapperNodeModel[],
    zoomLevel: number,
    diagramModel: DiagramModel
) => {
    const nodesClone = [...nodes];
    const prevNodes = diagramModel.getNodes() as DataMapperNodeModel[];
    const filtersUnchanged = false;

    let prevBottomY = 0;

    nodesClone.forEach(node => {
        const exisitingNode = prevNodes.find(prevNode => prevNode.id === node.id);

        if (node instanceof ObjectOutputNode
            || node instanceof ArrayOutputNode
            || node instanceof OutputDataImportNodeModel
        ) {
            const x = OFFSETS.TARGET_NODE.X;
            const y = exisitingNode && exisitingNode.getY() !== 0 ? exisitingNode.getY() : 0;
            node.setPosition(x, y);
        }
        if (node instanceof InputNode
            || node instanceof EmptyInputsNode
            || node instanceof InputDataImportNodeModel
        ) {
            const x = OFFSETS.SOURCE_NODE.X;
            const computedY = prevBottomY + (prevBottomY ? GAP_BETWEEN_INPUT_NODES : 0);
            let y = exisitingNode && filtersUnchanged && exisitingNode.getY() !== 0 ? exisitingNode.getY() : computedY;
            node.setPosition(x, y);
            if (node instanceof InputNode) {
                const nodeHeight = getIONodeHeight(node.numberOfFields);
                prevBottomY = computedY + nodeHeight;
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
        queryKey: ['diagramModel', noOfNodes, zoomLevel, collapsedFields, expandedFields, inputSearch, outputSearch],
        queryFn: genModel,
        networkMode: 'always',
    });

    return { updatedModel, isFetching, isError, refetch };
};
