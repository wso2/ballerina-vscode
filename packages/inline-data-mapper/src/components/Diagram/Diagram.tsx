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
import React, { useEffect, useRef, useState } from 'react';

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
import { LinkConnectorNode } from './Node';
import { OverlayLayerFactory } from './OverlayLayer/OverlayLayerFactory';
import { OverriddenLinkLayerFactory } from './OverriddenLinkLayer/LinkLayerFactory';
import { useDiagramModel, useRepositionedNodes } from '../Hooks';
import { throttle } from 'lodash';
import { defaultModelOptions } from './utils/constants';
import { IONodesScrollCanvasAction } from './Actions/IONodesScrollCanvasAction';
import { useDMExpressionBarStore, useDMSearchStore } from '../../store/store';
import { isOutputNode } from './Actions/utils';
import { InputOutputPortModel } from './Port';
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
	engine.getNodeFactories().registerFactory(new Nodes.ObjectOutputNodeFactory());
	engine.getNodeFactories().registerFactory(new Nodes.ArrayOutputNodeFactory());
	engine.getNodeFactories().registerFactory(new Nodes.LinkConnectorNodeFactory());
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

	const zoomLevel = defaultModelOptions.zoom;

	const repositionedNodes = useRepositionedNodes(nodes, zoomLevel, diagramModel);
	const { updatedModel, isFetching } = useDiagramModel(repositionedNodes, diagramModel, onError, zoomLevel);

	engine.setModel(diagramModel);

	useEffect(() => {
		engine.getStateMachine().pushState(new LinkState(true));
	}, [inputSearch, outputSearch]);

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
				node instanceof LinkConnectorNode
			);

			nodesToUpdate.forEach((node: LinkConnectorNode) => {
				node.initLinks();
				const targetPortPosition = node.targetPort?.getPosition();
				if (targetPortPosition) {
					node.setPosition(targetPortPosition.x - 150, targetPortPosition.y - 6.5);
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
