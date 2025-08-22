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
import { FieldCount } from "../../Hooks";
import { InputNode } from "../Node";
import { DataMapperNodeModel } from "../Node/commons/DataMapperNode";
import {
    GAP_BETWEEN_FIELDS,
    GAP_BETWEEN_NODE_HEADER_AND_BODY,
    IO_NODE_FIELD_HEIGHT,
    IO_NODE_HEADER_HEIGHT,
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

export function calculateControlPointOffset(screenWidth: number) {
    const minWidth = 850;
    const maxWidth = 1500;
    const minOffset = 15;
    const maxOffset = 90;

    const clampedWidth = Math.min(Math.max(screenWidth, minWidth), maxWidth);
    const interpolationFactor = (clampedWidth - minWidth) / (maxWidth - minWidth);
    const interpolatedOffset = minOffset + interpolationFactor * (maxOffset - minOffset);
    return interpolatedOffset;
}

export function getInputNodeFieldCounts(nodes: DataMapperNodeModel[]): { id: string, numberOfFields: number }[] {
    const inputNodes = nodes.filter(node => node instanceof InputNode);
    const fieldCounts = inputNodes.map(node => ({
        id: node.id,
        numberOfFields: node.numberOfFields
    }));

    return fieldCounts;
}

export function getFieldCountMismatchIndex(newFieldCounts: FieldCount[], existingFieldCounts: FieldCount[]) {
    if (existingFieldCounts.length === 0) return 0;

    for (let i = 0; i < newFieldCounts.length; i++) {
        const newNode = newFieldCounts[i];
        const existingNode = existingFieldCounts[i];
        
        if (newNode.numberOfFields !== existingNode?.numberOfFields) {
            return i;
        }
    }
    
    return -1;
}
