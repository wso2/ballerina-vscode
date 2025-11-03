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

/**
 * Custom event for focusing on linked nodes
 */
export const FOCUS_LINKED_NODES_EVENT = 'focus-linked-nodes';

/**
 * Type for the focus linked nodes event payload
 */
export interface FocusLinkedNodesEventPayload {
    sourceNodeId: string;
    targetNodeId: string;
    sourcePortId: string;
    targetPortId: string;
    type?: string; // Required for BaseEvent compatibility
}

/**
 * Creates a payload for the focus linked nodes event
 * 
 * @param sourceNodeId The ID of the source node
 * @param targetNodeId The ID of the target node
 * @param sourcePortId The ID of the source port
 * @param targetPortId The ID of the target port
 * @returns The event payload
 */
export function createFocusLinkedNodesEventPayload(
    sourceNodeId: string,
    targetNodeId: string,
    sourcePortId: string,
    targetPortId: string
): FocusLinkedNodesEventPayload {
    return {
        sourceNodeId,
        targetNodeId,
        sourcePortId,
        targetPortId
    };
}
