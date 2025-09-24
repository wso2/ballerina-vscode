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
// tslint:disable: jsx-no-multiline-js jsx-no-lambda
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { SelectionBoxLayerFactory } from "@projectstorm/react-canvas-core";
import {
	DefaultDiagramState,
	DefaultLabelFactory,
	DefaultLinkFactory,
	DefaultNodeFactory,
	DefaultPortFactory,
	DiagramEngine,
	DiagramModel,
	NodeLayerFactory,
	PathFindingLinkFactory
} from "@projectstorm/react-diagrams";

import { ErrorNodeKind } from '../DataMapper/Error/RenderingError';
import { DataMapperCanvasContainerWidget } from './Canvas/DataMapperCanvasContainerWidget';
import { DataMapperCanvasWidget } from './Canvas/DataMapperCanvasWidget';
import { DefaultState as LinkState } from './LinkState/DefaultState';
import { DataMapperNodeModel } from './Node/commons/DataMapperNode';
import { LinkConnectorNode, QueryExprConnectorNode } from './Node';
import { OverlayLayerFactory } from './OverlayLayer/OverlayLayerFactory';
import { OverriddenLinkLayerFactory } from './OverriddenLinkLayer/LinkLayerFactory';
import { useDiagramModel, useRepositionedNodes } from '../Hooks';
import { throttle } from 'lodash';
import { defaultModelOptions } from './utils/constants';
import { IONodesScrollCanvasAction } from './Actions/IONodesScrollCanvasAction';
import { useDMExpressionBarStore, useDMSearchStore } from '../../store/store';
import { isOutputNode, isInputNode, isIntermediateNode } from './Actions/utils';
import { InputOutputPortModel } from './Port';
import { calculateZoomLevel } from './utils/diagram-utils';
import { FOCUS_LINKED_NODES_EVENT, FocusLinkedNodesEventPayload } from './utils/link-focus-utils';
import * as Nodes from "./Node";
import * as Ports from "./Port";
import * as Labels from "./Label";
import * as Links from "./Link";

interface DataMapperDiagramProps {
	nodes?: DataMapperNodeModel[];
	hideCanvas?: boolean;
	onError?: (kind: ErrorNodeKind) => void;
}

function initDiagramEngine() {
	const engine = new DiagramEngine({
		registerDefaultPanAndZoomCanvasAction: false,
		registerDefaultZoomCanvasAction: false,
	});

	// register model factories
	engine.getLayerFactories().registerFactory(new NodeLayerFactory());
	engine.getLayerFactories().registerFactory(new OverriddenLinkLayerFactory());
	engine.getLayerFactories().registerFactory(new SelectionBoxLayerFactory());

	engine.getLabelFactories().registerFactory(new DefaultLabelFactory() as any);
	engine.getNodeFactories().registerFactory(new DefaultNodeFactory() as any);
	engine.getLinkFactories().registerFactory(new DefaultLinkFactory() as any);
	engine.getLinkFactories().registerFactory(new PathFindingLinkFactory() as any);
	engine.getPortFactories().registerFactory(new DefaultPortFactory() as any);

	// register the default interaction behaviours
	engine.getStateMachine().pushState(new DefaultDiagramState());
	engine.getLayerFactories().registerFactory(new OverlayLayerFactory());

	engine.getNodeFactories().registerFactory(new Nodes.InputNodeFactory());
	engine.getNodeFactories().registerFactory(new Nodes.SubMappingNodeFactory());
	engine.getNodeFactories().registerFactory(new Nodes.ObjectOutputNodeFactory());
	engine.getNodeFactories().registerFactory(new Nodes.ArrayOutputNodeFactory());
	engine.getNodeFactories().registerFactory(new Nodes.PrimitiveOutputNodeFactory());
	engine.getNodeFactories().registerFactory(new Nodes.QueryOutputNodeFactory());
	engine.getNodeFactories().registerFactory(new Nodes.LinkConnectorNodeFactory());
	engine.getNodeFactories().registerFactory(new Nodes.QueryExprConnectorNodeFactory());
	engine.getNodeFactories().registerFactory(new Nodes.DataImportNodeFactory());
	engine.getNodeFactories().registerFactory(new Nodes.EmptyInputsNodeFactory());

	engine.getPortFactories().registerFactory(new Ports.InputOutputPortFactory());
	engine.getPortFactories().registerFactory(new Ports.IntermediatePortFactory());

	engine.getLabelFactories().registerFactory(new Labels.ExpressionLabelFactory());

	engine.getLinkFactories().registerFactory(new Links.DataMapperLinkFactory() as any);
	engine.getLinkFactories().registerFactory(new Links.ArrowLinkFactory() as any);

	engine.getActionEventBus().registerAction(new IONodesScrollCanvasAction());

	const state = engine.getStateMachine().getCurrentState();
	if (state instanceof DefaultDiagramState) {
		state.dragNewLink.config.allowLooseLinks = false;
	}

	engine.getStateMachine().pushState(new LinkState());
	return engine;
}

function DataMapperDiagram(props: DataMapperDiagramProps): React.ReactElement {
	const { nodes, hideCanvas, onError } = props;

	const [engine, setEngine] = useState<DiagramEngine>(initDiagramEngine());
	const [diagramModel, setDiagramModel] = useState(new DiagramModel(defaultModelOptions));
	const [screenWidth, setScreenWidth] = useState(window.innerWidth);
	const [, forceUpdate] = useState({});

	const getScreenWidthRef = useRef(() => screenWidth);
	const devicePixelRatioRef = useRef(window.devicePixelRatio);

	const { inputSearch, outputSearch } = useDMSearchStore.getState();

	const zoomLevel = calculateZoomLevel(screenWidth);

	const repositionedNodes = useRepositionedNodes(nodes, zoomLevel, diagramModel);
	const { updatedModel, isFetching } = useDiagramModel(repositionedNodes, diagramModel, onError, zoomLevel);

	engine.setModel(diagramModel);

	useEffect(() => {
		engine.getStateMachine().pushState(new LinkState(true));
	}, [inputSearch, outputSearch]);
	
	// Add event listener for focusing on linked nodes
	useEffect(() => {
		const handleFocusLinkedNodes = (event: CustomEvent) => {
			if (!event.detail) return;
			const { sourceNodeId, targetNodeId, sourcePortId, targetPortId } = event.detail as FocusLinkedNodesEventPayload;
			
			// Get the nodes and ports from the model
			const model = engine.getModel();
			const sourceNode = model.getNode(sourceNodeId);
			let targetNode = model.getNode(targetNodeId);

			const sourcePort = sourceNode?.getPort(sourcePortId);
			let targetPort = targetNode?.getPort(targetPortId);

			if (isIntermediateNode(targetNode)) {
				const intermediateNode = targetNode as LinkConnectorNode | QueryExprConnectorNode;
				const intermediatePort = intermediateNode.targetMappedPort;

				targetNode = intermediatePort?.getNode();
				targetPort = intermediatePort;
			}
			
			if (!sourceNode || !targetNode || !sourcePort || !targetPort) {
				return;
			}
			
			// Get canvas height for visibility calculations
			const canvas = engine.getCanvas();
			const canvasHeight = canvas?.offsetHeight || 0;
			
			// Get all input and output nodes
			const allNodes = model.getNodes();
			const inputNodes = allNodes.filter(node => isInputNode(node));
			const outputNodes = allNodes.filter(node => isOutputNode(node));
			const intermediateNodes = allNodes.filter(node => isIntermediateNode(node));

			// Get node positions
			const sourceNodePosition = sourceNode.getPosition();
			const targetNodePosition = targetNode.getPosition();
			
			// Get port positions
			const sourcePortPosition = sourcePort.getPosition();
			const targetPortPosition = targetPort.getPosition();
			
			// Get port Y positions
			const sourcePortY = sourcePortPosition.y;
			const targetPortY = targetPortPosition.y;
			
			// Check port visibility (considering a port visible if it's within canvas bounds)
			const isSourcePortVisible = sourcePortY >= 0 && sourcePortY <= canvasHeight;
			const isTargetPortVisible = targetPortY >= 0 && targetPortY <= canvasHeight;
			
			// Determine scrolling strategy based on visibility
			let sourceNodeScrollOffset = 0;
			let targetNodeScrollOffset = 0;
			
			if (!isSourcePortVisible && !isTargetPortVisible) {
				// Case 1: Both ports not visible - scroll both to center
				const visibleAreaCenter = canvasHeight / 2;
				
				// Calculate where nodes should be positioned so their ports are centered
				let sourceNodeDesiredY = visibleAreaCenter - (sourcePortPosition.y - sourceNodePosition.y);
				let targetNodeDesiredY = visibleAreaCenter - (targetPortPosition.y - targetNodePosition.y);

				if (sourceNodeDesiredY > 0) {
					sourceNodeDesiredY = 0;
				}

				if (targetNodeDesiredY > 0) {
					targetNodeDesiredY = 0;
				}
				
				sourceNodeScrollOffset = sourceNode.getY() - sourceNodeDesiredY;
				targetNodeScrollOffset = targetNode.getY() - targetNodeDesiredY;
			} else if (isSourcePortVisible && !isTargetPortVisible) {
				// Case 2: Source visible, target not - align target port Y to source port Y
				// Calculate how much to move the target node so its port aligns with source port
				const targetPortDesiredY = sourcePortY;
				let targetNodeDesiredY = targetPortDesiredY - (targetPortPosition.y - targetNodePosition.y);

				if (targetNodeDesiredY > 0) {
					targetNodeDesiredY = 0;
				}

				targetNodeScrollOffset = targetNode.getY() - targetNodeDesiredY;
			} else if (!isSourcePortVisible && isTargetPortVisible) {
				// Case 3: Target visible, source not - align source port Y to target port Y
				// Calculate how much to move the source node so its port aligns with target port
				const sourcePortDesiredY = targetPortY;
				let sourceNodeDesiredY = sourcePortDesiredY - (sourcePortPosition.y - sourceNodePosition.y);

				if (sourceNodeDesiredY > 0) {
					sourceNodeDesiredY = 0;
				}

				sourceNodeScrollOffset = sourceNode.getY() - sourceNodeDesiredY;
			}
			// Case 4: Both visible - no scrolling needed (offsets remain 0)

			// Apply scrolling based on node types
			if (isInputNode(sourceNode) && (isOutputNode(targetNode) || isIntermediateNode(targetNode))) {
				if (sourceNodeScrollOffset !== 0) {
					inputNodes.forEach(node => {
						node.setPosition(node.getX(), node.getY() - sourceNodeScrollOffset);
					});
				}
				
				if (targetNodeScrollOffset !== 0) {
					[...outputNodes, ...intermediateNodes].forEach(node => {
						node.setPosition(node.getX(), node.getY() - targetNodeScrollOffset);
					});
				}
			}
			
			engine.repaintCanvas();
		};
		
		// Register the event listener on the document
		document.addEventListener(FOCUS_LINKED_NODES_EVENT, handleFocusLinkedNodes as EventListener);
		
		// Clean up the event listener when the component unmounts
		return () => {
			document.removeEventListener(FOCUS_LINKED_NODES_EVENT, handleFocusLinkedNodes as EventListener);
		};
	}, [engine]);

	useEffect(() => {
		getScreenWidthRef.current = () => screenWidth;
	}, [screenWidth]);

	useEffect(() => {
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

	useEffect(() => {
        if (!isFetching) {
            setDiagramModel(updatedModel);
        }
    }, [isFetching, updatedModel]);

	useEffect(() => {
		if (!isFetching && engine.getModel()) {
			const modelNodes = engine.getModel().getNodes();
			const nodesToUpdate = modelNodes.filter(node => 
				node instanceof LinkConnectorNode || node instanceof QueryExprConnectorNode
			);

			nodesToUpdate.forEach((node: LinkConnectorNode | QueryExprConnectorNode) => {
				const targetPortPosition = node.targetMappedPort?.getPosition();
				if (targetPortPosition) {
					node.setPosition(targetPortPosition.x - 155, targetPortPosition.y - 6.5);
				}
			});
	
			if (nodesToUpdate.length > 0) {
				forceUpdate({});
			}

			// Update the expression bar focused output port if any
			const focusedPort = useDMExpressionBarStore.getState().focusedPort;
			const outputPorts = (modelNodes.find(node => isOutputNode(node)) as DataMapperNodeModel)?.getPorts();
			const outputPortEntries = outputPorts ? Object.entries(outputPorts) : [];
			outputPortEntries.forEach((entry) => {
				const port = entry[1] as InputOutputPortModel;
				if (port.getName() === focusedPort?.getName() && port.getID() !== focusedPort?.getID()) {
					useDMExpressionBarStore.getState().setFocusedPort(port);
				}
			});
		}
	}, [diagramModel, isFetching, screenWidth]);

	const handleResize = throttle(() => {
		const newScreenWidth = window.innerWidth;
		const newDevicePixelRatio = window.devicePixelRatio;

		if (newDevicePixelRatio === devicePixelRatioRef.current && newScreenWidth !== getScreenWidthRef.current()) {
			setScreenWidth(newScreenWidth);
		}
		devicePixelRatioRef.current = newDevicePixelRatio;
	}, 100);

	return (
		<>
			{engine && engine.getModel() && (
				<DataMapperCanvasContainerWidget hideCanvas={hideCanvas}>
					<DataMapperCanvasWidget engine={engine} />
				</DataMapperCanvasContainerWidget>
			)}
		</>
	);
}

export default React.memo(DataMapperDiagram);
