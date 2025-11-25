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
import { DiagramModel, NodeModel, PortModel } from "@projectstorm/react-diagrams";

import { ClauseConnectorNode, LinkConnectorNode, QueryExprConnectorNode } from "../Node";
import { isInputNode, isIntermediateNode, isOutputNode } from "../Actions/utils";
import { 
	animateNodesWithIndividualOffsets, 
	cancelCurrentAnimation, 
	AnimationConfig, 
	DEFAULT_ANIMATION_CONFIG 
} from "./smooth-animation-utils";

/**
 * Interface for position coordinates
 */
export interface Position {
	x: number;
	y: number;
}

/**
 * Interface for scroll offset calculations
 */
export interface ScrollOffsets {
	sourceOffset: number;
	targetOffset: number;
}

/**
 * Interface for resolved target node and port
 */
export interface ResolvedTarget {
	node: NodeModel;
	port: PortModel;
}

/**
 * Interface for node visibility information
 */
export interface NodeVisibility {
	isSourceVisible: boolean;
	isTargetVisible: boolean;
}

/**
 * Interface for node and port information
 */
export interface NodePortInfo {
	node: NodeModel;
	port: PortModel;
	position: Position;
}

/**
 * Configuration for scroll offset calculations
 */
export interface ScrollCalculationConfig {
	source: NodePortInfo;
	target: NodePortInfo;
	visibility: NodeVisibility;
	canvasHeight: number;
}

/**
 * Configuration for applying scroll offsets
 */
export interface ScrollApplicationConfig {
	source: NodePortInfo;
	target: NodePortInfo;
	offsets: ScrollOffsets;
	nodeCollections: {
		inputNodes: NodeModel[];
		outputNodes: NodeModel[];
		intermediateNodes: NodeModel[];
	};
}

/**
 * Creates a NodePortInfo object from node and port
 * 
 * @param node The node model
 * @param port The port model
 * @returns NodePortInfo object
 */
export const createNodePortInfo = (node: NodeModel, port: PortModel): NodePortInfo => ({
	node,
	port,
	position: port.getPosition()
});

/**
 * Creates a NodeVisibility object based on port positions and canvas height
 * 
 * @param sourcePortY Y position of source port
 * @param targetPortY Y position of target port
 * @param canvasHeight Height of the canvas
 * @returns NodeVisibility object
 */
export const createNodeVisibility = (
	sourcePortY: number,
	targetPortY: number,
	canvasHeight: number
): NodeVisibility => ({
	isSourceVisible: isPortVisible(sourcePortY, canvasHeight),
	isTargetVisible: isPortVisible(targetPortY, canvasHeight)
});

/**
 * Creates a scroll calculation configuration object
 * 
 * @param source Source node and port information
 * @param target Target node and port information
 * @param canvasHeight Height of the canvas
 * @returns ScrollCalculationConfig object
 */
export const createScrollCalculationConfig = (
	source: NodePortInfo,
	target: NodePortInfo,
	canvasHeight: number
): ScrollCalculationConfig => ({
	source,
	target,
	visibility: createNodeVisibility(source.position.y, target.position.y, canvasHeight),
	canvasHeight
});

/**
 * Resolves the actual target node and port, handling intermediate nodes
 * 
 * @param model The diagram model
 * @param targetNodeId ID of the target node
 * @param targetPortId ID of the target port
 * @returns Resolved target node and port, or null if not found
 */
export const resolveTargetNodeAndPort = (
	model: DiagramModel,
	targetNodeId: string,
	targetPortId: string
): ResolvedTarget | null => {
	let targetNode = model.getNode(targetNodeId);
	let targetPort = targetNode?.getPort(targetPortId);

	if (isIntermediateNode(targetNode)) {
		const intermediateNode = targetNode as LinkConnectorNode | QueryExprConnectorNode | ClauseConnectorNode;
		const intermediatePort = intermediateNode.targetMappedPort;

		targetNode = intermediatePort?.getNode();
		targetPort = intermediatePort;
	}

	return targetNode && targetPort ? { node: targetNode, port: targetPort } : null;
};

/**
 * Checks if a port is visible within the canvas bounds
 * 
 * @param portY Y position of the port
 * @param canvasHeight Height of the canvas
 * @returns True if the port is visible, false otherwise
 */
export const isPortVisible = (portY: number, canvasHeight: number): boolean => {
	return portY >= 0 && portY <= canvasHeight;
};

/**
 * Calculates the desired Y position for a node, ensuring it doesn't go above 0
 * 
 * @param desiredPortY Desired Y position for the port
 * @param portPosition Current position of the port
 * @param nodePosition Current position of the node
 * @returns Calculated desired Y position for the node
 */
export const calculateDesiredNodeY = (
	desiredPortY: number,
	portPosition: Position,
	nodePosition: Position
): number => {
	const desiredY = desiredPortY - (portPosition.y - nodePosition.y);
	return Math.min(0, desiredY);
};

/**
 * Calculates scroll offsets based on port visibility and positioning
 * 
 * @param config Configuration object containing source/target info, visibility, and canvas dimensions
 * @returns Calculated scroll offsets for source and target
 */
export const calculateScrollOffsets = (config: ScrollCalculationConfig): ScrollOffsets => {
	const { source, target, visibility, canvasHeight } = config;
	const { isSourceVisible, isTargetVisible } = visibility;

	const sourceNodePosition = source.node.getPosition();
	const targetNodePosition = target.node.getPosition();

	if (!isSourceVisible && !isTargetVisible) {
		// Case 1: Both ports not visible - center both
		const visibleAreaCenter = canvasHeight / 2;
		
		const sourceNodeDesiredY = calculateDesiredNodeY(
			visibleAreaCenter,
			source.position,
			sourceNodePosition
		);
		const targetNodeDesiredY = calculateDesiredNodeY(
			visibleAreaCenter,
			target.position,
			targetNodePosition
		);
		
		return {
			sourceOffset: source.node.getY() - sourceNodeDesiredY,
			targetOffset: target.node.getY() - targetNodeDesiredY
		};
	}

	if (isSourceVisible && !isTargetVisible) {
		// Case 2: Source visible, target not - align target to source
		const targetNodeDesiredY = calculateDesiredNodeY(
			source.position.y,
			target.position,
			targetNodePosition
		);
		
		return {
			sourceOffset: 0,
			targetOffset: target.node.getY() - targetNodeDesiredY
		};
	}

	if (!isSourceVisible && isTargetVisible) {
		// Case 3: Target visible, source not - align source to target
		const sourceNodeDesiredY = calculateDesiredNodeY(
			target.position.y,
			source.position,
			sourceNodePosition
		);
		
		return {
			sourceOffset: source.node.getY() - sourceNodeDesiredY,
			targetOffset: 0
		};
	}

	// Case 4: Both visible - no scrolling needed
	return { sourceOffset: 0, targetOffset: 0 };
};

/**
 * Smoothly applies scroll offsets to the appropriate node groups with animation
 * 
 * @param config Configuration object containing nodes, offsets, and node collections
 * @param onComplete Optional callback when animation completes
 * @param onUpdate Optional callback for each animation frame
 * @param animationConfig Animation configuration
 */
export const applySmoothScrollOffsets = (
	config: ScrollApplicationConfig,
	onComplete?: () => void,
	onUpdate?: () => void,
	animationConfig: AnimationConfig = DEFAULT_ANIMATION_CONFIG
): void => {
	const { source, target, offsets, nodeCollections } = config;
	const { sourceOffset, targetOffset } = offsets;
	const { inputNodes, outputNodes, intermediateNodes } = nodeCollections;

	const isValidSourceTarget = 
		isInputNode(source.node) && 
		(isOutputNode(target.node) || isIntermediateNode(target.node));

	if (!isValidSourceTarget) {
		onComplete?.();
		return;
	}

	// Cancel any existing animation before starting a new one
	cancelCurrentAnimation();

	// Collect all nodes that need to be animated with their respective offsets
	const nodeOffsets: Array<{ node: NodeModel; offsetX: number; offsetY: number }> = [];

	if (sourceOffset !== 0) {
		inputNodes.forEach(node => {
			nodeOffsets.push({
				node,
				offsetX: 0,
				offsetY: -sourceOffset
			});
		});
	}
	
	if (targetOffset !== 0) {
		[...outputNodes, ...intermediateNodes].forEach(node => {
			nodeOffsets.push({
				node,
				offsetX: 0,
				offsetY: -targetOffset
			});
		});
	}

	// If no nodes need animation, call complete immediately
	if (nodeOffsets.length === 0) {
		onComplete?.();
		return;
	}

	// Animate all nodes smoothly
	animateNodesWithIndividualOffsets(
		nodeOffsets,
		onComplete,
		onUpdate,
		animationConfig
	);
};

/**
 * High-level function that handles the complete focus linked nodes process with smooth animation
 * 
 * @param source Source node and port information
 * @param target Target node and port information
 * @param canvasHeight Height of the canvas
 * @param nodeCollections Collections of input, output, and intermediate nodes
 * @param onComplete Optional callback when animation completes
 * @param onUpdate Optional callback for each animation frame
 * @param animationConfig Animation configuration
 * @returns The calculated scroll offsets that will be applied
 */
export const focusLinkedNodesSmooth = (
	source: NodePortInfo,
	target: NodePortInfo,
	canvasHeight: number,
	nodeCollections: {
		inputNodes: NodeModel[];
		outputNodes: NodeModel[];
		intermediateNodes: NodeModel[];
	},
	onComplete?: () => void,
	onUpdate?: () => void,
	animationConfig: AnimationConfig = DEFAULT_ANIMATION_CONFIG
): ScrollOffsets => {
	// Create scroll calculation configuration
	const scrollConfig = createScrollCalculationConfig(source, target, canvasHeight);
	
	// Calculate scroll offsets
	const offsets = calculateScrollOffsets(scrollConfig);
	
	// Apply scroll offsets smoothly
	applySmoothScrollOffsets({
		source,
		target,
		offsets,
		nodeCollections
	}, onComplete, onUpdate, animationConfig);
	
	return offsets;
};
