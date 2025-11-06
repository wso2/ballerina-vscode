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
import { useQuery } from "@tanstack/react-query";
import { DataMapperNodeModel } from "../Node/commons/DataMapperNode";
import { DiagramModel, DiagramModelGenerics } from "@projectstorm/react-diagrams";

import { ErrorNodeKind } from "../../DataMapper/Error/RenderingError";
import { useDMCollapsedFieldsStore } from "../../../store/store";
import { useDMExpandedFieldsStore } from "../../../store/store";
import { useDMSearchStore } from "../../../store/store";
import { InputNode } from "../Node";
import { getErrorKind } from "../utils/common-utils";
import { OverlayLayerModel } from "../OverlayLayer/OverlayLayerModel";
import { IOType } from "@wso2/ballerina-core";
import { useEffect } from "react";

export const useDiagramModel = (
    nodes: DataMapperNodeModel[],
    diagramModel: DiagramModel,
    onError:(kind: ErrorNodeKind) => void,
    zoomLevel: number
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
    const mappings = model?.mappings.map(mapping => mapping.output + ':' + mapping.expression).toString();
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
        refetch
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

    useEffect(() => {
        if (model?.triggerRefresh) {
            refetch();
        }
    }, [model, refetch]);

    return { updatedModel, isFetching, isError, refetch };
};
