/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
import "reflect-metadata";
import { container } from "tsyringe";

import { DataMapperDIContext } from '../../utils/DataMapperDIContext/DataMapperDIContext';
import { ErrorNodeKind } from "../DataMapper/Error/RenderingError";

import { DataMapperCanvasContainerWidget } from './Canvas/DataMapperCanvasContainerWidget';
import { DataMapperCanvasWidget } from './Canvas/DataMapperCanvasWidget';
import { DataMapperLinkModel } from './Link/model/DataMapperLink';
import { DefaultState as LinkState } from './LinkState/DefaultState';
import { DataMapperNodeModel } from './Node/commons/DataMapperNode';
import { LinkConnectorNode } from './Node/LinkConnector';
import { QueryExpressionNode } from './Node/QueryExpression';
import { OverlayLayerFactory } from './OverlayLayer/OverlayLayerFactory';
import { OverriddenLinkLayerFactory } from './OverriddenLinkLayer/LinkLayerFactory';
import { useDiagramModel, useRepositionedNodes, useSearchScrollReset } from '../Hooks';
import { throttle } from 'lodash';
import { defaultModelOptions } from './utils/constants';
import { calculateZoomLevel } from './utils/diagram-utils';
import { IONodesScrollCanvasAction } from './Actions/IONodesScrollCanvasAction';
import { ArrowLinkFactory } from './Link/ArrowLink';
import { useDMSearchStore } from '../../store/store';

interface DataMapperDiagramProps {
	nodes?: DataMapperNodeModel[];
	links?: DataMapperLinkModel[];
	hideCanvas?: boolean;
	onError?: (kind: ErrorNodeKind) => void;
}

function initDiagramEngine() {
	const diContext = container.resolve(DataMapperDIContext);

	const engine = new DiagramEngine({
		registerDefaultPanAndZoomCanvasAction: false,
		registerDefaultZoomCanvasAction: false,
	});

	// register model factories
	engine.getLayerFactories().registerFactory(new NodeLayerFactory());
	engine.getLayerFactories().registerFactory(new OverriddenLinkLayerFactory());
	engine.getLayerFactories().registerFactory(new SelectionBoxLayerFactory());

	engine.getLabelFactories().registerFactory(new DefaultLabelFactory());
	engine.getNodeFactories().registerFactory(new DefaultNodeFactory());
	engine.getLinkFactories().registerFactory(new DefaultLinkFactory());
	engine.getLinkFactories().registerFactory(new PathFindingLinkFactory());
	engine.getPortFactories().registerFactory(new DefaultPortFactory());
	engine.getLinkFactories().registerFactory(new ArrowLinkFactory());

	// register the default interaction behaviours
	engine.getStateMachine().pushState(new DefaultDiagramState());
	engine.getLayerFactories().registerFactory(new OverlayLayerFactory());

	engine.getActionEventBus().registerAction(new IONodesScrollCanvasAction());

	diContext.nodeFactories.forEach((nf) =>
		engine.getNodeFactories().registerFactory(nf));
	diContext.portFactories.forEach((pf) =>
		engine.getPortFactories().registerFactory(pf));
	diContext.linkFactories.forEach((lf) =>
		engine.getLinkFactories().registerFactory(lf));
	diContext.labelFactories.forEach((lbf) =>
		engine.getLabelFactories().registerFactory(lbf));

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
	const getScreenWidthRef = useRef(() => screenWidth);
	const devicePixelRatioRef = useRef(window.devicePixelRatio);
	const [, forceUpdate] = useState({});

	const { inputSearch, outputSearch } = useDMSearchStore.getState();

	const zoomLevel = calculateZoomLevel(screenWidth);

	const repositionedNodes = useRepositionedNodes(nodes, zoomLevel, diagramModel);
	const { updatedModel, isFetching } = useDiagramModel(repositionedNodes, diagramModel, onError, zoomLevel, screenWidth);
	useSearchScrollReset(diagramModel);

	engine.setModel(diagramModel);

	useEffect(() => {
		engine.getStateMachine().pushState(new LinkState(true));
	}, [inputSearch, outputSearch]);

	useEffect(() => {
		getScreenWidthRef.current = () => screenWidth;
	}, [screenWidth]);

	const handleResize = throttle(() => {
		const newScreenWidth = window.innerWidth;
		const newDevicePixelRatio = window.devicePixelRatio;

		if (newDevicePixelRatio === devicePixelRatioRef.current && newScreenWidth !== getScreenWidthRef.current()) {
			setScreenWidth(newScreenWidth);
		}
		devicePixelRatioRef.current = newDevicePixelRatio;
	}, 100);

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
				node instanceof LinkConnectorNode || node instanceof QueryExpressionNode
			);

			nodesToUpdate.forEach((node: LinkConnectorNode | QueryExpressionNode) => {
				node.initLinks();
				const targetPortPosition = node.targetPort?.getPosition();
				if (targetPortPosition) {
					node.setPosition(targetPortPosition.x - 180, targetPortPosition.y - 6.5);
				}
			});
	
			if (nodesToUpdate.length > 0) {
				forceUpdate({});
			}
		}
	}, [diagramModel, isFetching, screenWidth]);

	return (
		<>
			{engine && engine.getModel() && (
				<>
					<DataMapperCanvasContainerWidget hideCanvas={hideCanvas}>
						<DataMapperCanvasWidget engine={engine} />
					</DataMapperCanvasContainerWidget>
				</>
			)}
		</>
	);


}

export default React.memo(DataMapperDiagram);
