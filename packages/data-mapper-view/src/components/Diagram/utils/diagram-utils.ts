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
import { ExpandedMappingHeaderNode, RequiredParamNode } from "../Node";
import { DataMapperNodeModel } from "../Node/commons/DataMapperNode";
import {
    GAP_BETWEEN_FIELDS,
    GAP_BETWEEN_INTERMEDIATE_CLAUSES_AND_NODE,
    GAP_BETWEEN_NODE_HEADER_AND_BODY,
    IO_NODE_FIELD_HEIGHT,
    IO_NODE_HEADER_HEIGHT,
    QUERY_EXPR_INTERMEDIATE_CLAUSE_HEIGHT,
    defaultModelOptions
} from "./constants";

export function calculateZoomLevel(screenWidth: number) {
    const minWidth = 200;
    const maxWidth = 850; // After this width, the max zoom level is reached
    const minZoom = 20;
    const maxZoom = defaultModelOptions.zoom;

	// Ensure the max zoom level is not exceeded
	const boundedScreenWidth = Math.min(screenWidth, maxWidth);
    const normalizedWidth = (boundedScreenWidth - minWidth) / (maxWidth - minWidth);
    const zoomLevel = minZoom + normalizedWidth * (maxZoom - minZoom);
    return Math.max(minZoom, Math.min(maxZoom, zoomLevel));
}

export function getIONodeHeight(noOfFields: number) {
	return noOfFields * IO_NODE_FIELD_HEIGHT
		+ (IO_NODE_HEADER_HEIGHT - IO_NODE_FIELD_HEIGHT)
		+ noOfFields * GAP_BETWEEN_FIELDS
		+ GAP_BETWEEN_NODE_HEADER_AND_BODY;
}

export function getExpandedMappingHeaderNodeHeight(node: ExpandedMappingHeaderNode) {
    const noOfIntermediateClauses = node.queryExpr.queryPipeline.intermediateClauses.length;
    return (noOfIntermediateClauses + 1) * (QUERY_EXPR_INTERMEDIATE_CLAUSE_HEIGHT + GAP_BETWEEN_INTERMEDIATE_CLAUSES_AND_NODE);
}

export function calculateControlPointOffset(screenWidth: number) {
    const minWidth = 850;
    const maxWidth = 1500;
    const minOffset = 20;
    const maxOffset = 300;

    const clampedWidth = Math.min(Math.max(screenWidth, minWidth), maxWidth);
    const interpolationFactor = (clampedWidth - minWidth) / (maxWidth - minWidth);
    const interpolatedOffset = minOffset + interpolationFactor * (maxOffset - minOffset);
    return interpolatedOffset;
}

export function isSameView(newNode: DataMapperNodeModel, existingNode?: DataMapperNodeModel) {
    if (!existingNode || !existingNode?.context || !newNode?.context) return;

    const prevFocusedView = existingNode.context.selection;
    const newFocusedView = newNode.context.selection;

    return prevFocusedView.selectedST.fieldPath === newFocusedView.selectedST.fieldPath;
}

export function hasSameIntermediateClauses(newNodes: DataMapperNodeModel[], existingNodes?: DataMapperNodeModel[]) {
    if (!existingNodes) return;

    const newMappingHeaderNode = newNodes
        .find(node => node instanceof ExpandedMappingHeaderNode) as ExpandedMappingHeaderNode;
    const existingMappingHeaderNode = existingNodes
        .find(node => node instanceof ExpandedMappingHeaderNode) as ExpandedMappingHeaderNode;

    if (!newMappingHeaderNode && !existingMappingHeaderNode) return true;

    if (newMappingHeaderNode && existingMappingHeaderNode) {
        return newMappingHeaderNode.queryExpr.queryPipeline.intermediateClauses.length ===
            existingMappingHeaderNode.queryExpr.queryPipeline.intermediateClauses.length;
    }

    return true;
}

export function getFieldCountMismatchIndex(newNodes: DataMapperNodeModel[], existingNodes?: DataMapperNodeModel[]) {
    if (existingNodes.length === 0) return 0;

    const newRequiredParamNodes = newNodes.filter(node => node instanceof RequiredParamNode);
    const existingRequiredParamNodes = existingNodes.filter(node => node instanceof RequiredParamNode);

    for (let i = 0; i < newRequiredParamNodes.length; i++) {
        const newNode = newRequiredParamNodes[i] as RequiredParamNode;
        const existingNode = existingRequiredParamNodes[i] as RequiredParamNode;
        
        if (newNode?.numberOfFields !== existingNode?.numberOfFields) {
            return i;
        }
    }
    
    return -1;
}
