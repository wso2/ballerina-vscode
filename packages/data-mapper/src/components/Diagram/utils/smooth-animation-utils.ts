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

import { NodeModel } from "@projectstorm/react-diagrams";

/**
 * Interface for animation configuration
 */
export interface AnimationConfig {
	duration: number; // Animation duration in milliseconds
	easing: (t: number) => number; // Easing function
}

/**
 * Interface for node animation data
 */
export interface NodeAnimationData {
	node: NodeModel;
	startX: number;
	startY: number;
	targetX: number;
	targetY: number;
}

/**
 * Interface for animation state
 */
export interface AnimationState {
	isAnimating: boolean;
	animationId: number | null;
	startTime: number;
}

/**
 * Default animation configuration
 */
export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
	duration: 500, // 500ms duration
	easing: easeInOutCubic
};

/**
 * Global animation state to manage ongoing animations
 */
let globalAnimationState: AnimationState = {
	isAnimating: false,
	animationId: null,
	startTime: 0
};

/**
 * Cubic ease-in-out easing function for smooth animations
 * 
 * @param t Time progress (0 to 1)
 * @returns Eased progress value
 */
export function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Ease-out quadratic easing function for smooth deceleration
 * 
 * @param t Time progress (0 to 1)
 * @returns Eased progress value
 */
export function easeOutQuad(t: number): number {
	return 1 - (1 - t) * (1 - t);
}

/**
 * Linear interpolation between two values
 * 
 * @param start Starting value
 * @param end Ending value
 * @param progress Progress (0 to 1)
 * @returns Interpolated value
 */
export function lerp(start: number, end: number, progress: number): number {
	return start + (end - start) * progress;
}

/**
 * Cancels any ongoing animation
 */
export function cancelCurrentAnimation(): void {
	if (globalAnimationState.animationId !== null) {
		cancelAnimationFrame(globalAnimationState.animationId);
		globalAnimationState.animationId = null;
		globalAnimationState.isAnimating = false;
	}
}

/**
 * Checks if an animation is currently running
 * 
 * @returns True if animation is running, false otherwise
 */
export function isAnimationRunning(): boolean {
	return globalAnimationState.isAnimating;
}

/**
 * Smoothly animates multiple nodes to their target positions
 * 
 * @param nodeAnimations Array of node animation data
 * @param onComplete Optional callback when animation completes
 * @param onUpdate Optional callback for each animation frame
 * @param config Animation configuration
 */
export function animateNodes(
	nodeAnimations: NodeAnimationData[],
	onComplete?: () => void,
	onUpdate?: () => void,
	config: AnimationConfig = DEFAULT_ANIMATION_CONFIG
): void {
	// Cancel any existing animation
	cancelCurrentAnimation();

	if (nodeAnimations.length === 0) {
		onComplete?.();
		return;
	}

	const startTime = performance.now();
	globalAnimationState.startTime = startTime;
	globalAnimationState.isAnimating = true;

	const animate = (currentTime: number): void => {
		const elapsed = currentTime - startTime;
		const progress = Math.min(elapsed / config.duration, 1);
		const easedProgress = config.easing(progress);

		// Update all node positions
		nodeAnimations.forEach(({ node, startX, startY, targetX, targetY }) => {
			const currentX = lerp(startX, targetX, easedProgress);
			const currentY = lerp(startY, targetY, easedProgress);
			node.setPosition(currentX, currentY);
		});

		// Call update callback if provided
		onUpdate?.();

		// Continue animation or complete
		if (progress < 1) {
			globalAnimationState.animationId = requestAnimationFrame(animate);
		} else {
			globalAnimationState.isAnimating = false;
			globalAnimationState.animationId = null;
			onComplete?.();
		}
	};

	globalAnimationState.animationId = requestAnimationFrame(animate);
}

/**
 * Creates node animation data for a group of nodes with the same offset
 * 
 * @param nodes Array of nodes to animate
 * @param offsetX X offset to apply
 * @param offsetY Y offset to apply
 * @returns Array of node animation data
 */
export function createNodeAnimationData(
	nodes: NodeModel[],
	offsetX: number,
	offsetY: number
): NodeAnimationData[] {
	return nodes.map(node => {
		const currentPosition = node.getPosition();
		return {
			node,
			startX: currentPosition.x,
			startY: currentPosition.y,
			targetX: currentPosition.x + offsetX,
			targetY: currentPosition.y + offsetY
		};
	});
}

/**
 * Smoothly animates nodes with different offsets
 * 
 * @param nodeOffsets Array of objects containing node and its specific offsets
 * @param onComplete Optional callback when animation completes
 * @param onUpdate Optional callback for each animation frame
 * @param config Animation configuration
 */
export function animateNodesWithIndividualOffsets(
	nodeOffsets: Array<{ node: NodeModel; offsetX: number; offsetY: number }>,
	onComplete?: () => void,
	onUpdate?: () => void,
	config: AnimationConfig = DEFAULT_ANIMATION_CONFIG
): void {
	const nodeAnimations: NodeAnimationData[] = nodeOffsets.map(({ node, offsetX, offsetY }) => {
		const currentPosition = node.getPosition();
		return {
			node,
			startX: currentPosition.x,
			startY: currentPosition.y,
			targetX: currentPosition.x + offsetX,
			targetY: currentPosition.y + offsetY
		};
	});

	animateNodes(nodeAnimations, onComplete, onUpdate, config);
}
