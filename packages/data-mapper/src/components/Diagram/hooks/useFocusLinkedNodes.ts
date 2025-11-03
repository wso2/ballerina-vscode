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

import { useEffect } from "react";
import { DiagramEngine } from "@projectstorm/react-diagrams";

import { FOCUS_LINKED_NODES_EVENT, FocusLinkedNodesEventPayload } from "../utils/link-focus-utils";
import {
	resolveTargetNodeAndPort,
	createNodePortInfo,
	focusLinkedNodesSmooth
} from "../utils/focus-positioning-utils";
import { cancelCurrentAnimation } from "../utils/smooth-animation-utils";
import { isInputNode, isIntermediateNode, isOutputNode } from "../Actions/utils";

/**
 * Custom hook for handling focus linked nodes functionality
 * 
 * This hook manages the event listener for focusing on linked nodes,
 * handling the positioning and scrolling logic to ensure both source
 * and target ports are visible when a link is focused. The positioning
 * is animated with smooth transitions for better UX.
 * 
 * @param engine The diagram engine instance
 */
export const useFocusLinkedNodes = (engine: DiagramEngine): void => {
	useEffect(() => {
		const handleFocusLinkedNodes = (event: CustomEvent): void => {
			const eventDetail = event.detail as FocusLinkedNodesEventPayload;
			if (!eventDetail) return;

			const { sourceNodeId, targetNodeId, sourcePortId, targetPortId } = eventDetail;
			
			// Get model and validate source node/port
			const model = engine.getModel();
			const sourceNode = model.getNode(sourceNodeId);
			const sourcePort = sourceNode?.getPort(sourcePortId);
			
			if (!sourceNode || !sourcePort) return;

			// Resolve target node and port (handling intermediate nodes)
			const targetResult = resolveTargetNodeAndPort(model, targetNodeId, targetPortId);
			if (!targetResult) return;

			const { node: targetNode, port: targetPort } = targetResult;
			
			// Get canvas dimensions and node collections
			const canvas = engine.getCanvas();
			const canvasHeight = canvas?.offsetHeight || 0;
			
			const allNodes = model.getNodes();
			const inputNodes = allNodes.filter(node => isInputNode(node));
			const outputNodes = allNodes.filter(node => isOutputNode(node));
			const intermediateNodes = allNodes.filter(node => isIntermediateNode(node));

			// Create node-port info objects
			const sourceInfo = createNodePortInfo(sourceNode, sourcePort);
			const targetInfo = createNodePortInfo(targetNode, targetPort);
			
			// Focus the linked nodes with smooth animation
			focusLinkedNodesSmooth(
				sourceInfo, 
				targetInfo, 
				canvasHeight, 
				{
					inputNodes,
					outputNodes,
					intermediateNodes
				},
				() => {
					// Animation complete callback
					engine.repaintCanvas();
				},
				() => {
					// Animation frame callback - repaint canvas during animation
					engine.repaintCanvas();
				}
			);
		};
		
		// Register and cleanup event listener
		document.addEventListener(FOCUS_LINKED_NODES_EVENT, handleFocusLinkedNodes as EventListener);
		
		return () => {
			// Cancel any ongoing animations when component unmounts or engine changes
			cancelCurrentAnimation();
			document.removeEventListener(FOCUS_LINKED_NODES_EVENT, handleFocusLinkedNodes as EventListener);
		};
	}, [engine]);
};
