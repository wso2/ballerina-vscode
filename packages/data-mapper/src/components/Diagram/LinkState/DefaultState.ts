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
import { MouseEvent } from 'react';

import {
	Action,
	ActionEvent,
	DragCanvasState,
	InputType,
	State
} from '@projectstorm/react-canvas-core';
import { DiagramEngine, DragDiagramItemsState, PortModel } from '@projectstorm/react-diagrams-core';

import { DMCanvasContainerID } from "../Canvas/DataMapperCanvasWidget";
import { ArrayOutputNode, InputNode, ObjectOutputNode, QueryOutputNode, SubMappingNode } from '../Node';
import { DataMapperNodeModel } from "../Node/commons/DataMapperNode";
import { LinkOverayContainerID } from '../OverriddenLinkLayer/LinkOverlayPortal';
import { CreateLinkState } from './CreateLinkState';
import { removePendingMappingTempLinkIfExists } from '../utils/link-utils';

export class DefaultState extends State<DiagramEngine> {
	dragCanvas: DragCanvasState;
	createLink: CreateLinkState;
	dragItems: DragDiagramItemsState;

	constructor(resetState: boolean = false) {
		super({ name: 'starting-state' });
		this.dragCanvas = new DragCanvasState({allowDrag: false});
		this.createLink = new CreateLinkState(resetState);
		this.dragItems = new DragDiagramItemsState();

		// determine what was clicked on
		this.registerAction(
			new Action({
				type: InputType.MOUSE_DOWN,
				fire: (event: ActionEvent<MouseEvent>) => {
					const element = this.engine.getActionEventBus().getModelForEvent(event);
					const isExpandOrCollapse = (event.event.target as Element)
						.closest('div[id^="expand-or-collapse"]');

					// the canvas was clicked on, transition to the dragging canvas state
					if (!element) {
						const targetElement = event.event.target as Element;
						const dmCanvasContainer = targetElement.closest(`#${DMCanvasContainerID}`);
						const linkOverlayContainer = targetElement.closest(`#${LinkOverayContainerID}`);
						if (linkOverlayContainer) {
							// Clicked on a link overlay item or a diagnostic tooltip,
							// hence, do not propagate as a canvas drag
						} else if (dmCanvasContainer) {
							this.deselectLinks();
							this.transitionWithEvent(this.dragCanvas, event);
						}
					}
					// initiate dragging a new link
					else if ((element instanceof PortModel || element instanceof DataMapperNodeModel) && !isExpandOrCollapse) {
						return;
					}
					// move the items (and potentially link points)
					else {
						this.transitionWithEvent(this.dragItems, event);
					}
				}
			})
		);

		this.registerAction(
			new Action({
				type: InputType.MOUSE_UP,
				fire: (actionEvent: ActionEvent<MouseEvent>) => {
					const element = this.engine.getActionEventBus().getModelForEvent(actionEvent);
					const isFieldAction = (actionEvent.event.target as Element)
						.closest('div[id^="expand-or-collapse"], div[id^="add-array-element"], [id^="field-action"]');

					if (!isFieldAction
						&& (element instanceof PortModel
							|| element instanceof ObjectOutputNode
							|| element instanceof ArrayOutputNode
							|| element instanceof QueryOutputNode
							|| element instanceof InputNode
							|| element instanceof SubMappingNode
						)
					) {
						this.transitionWithEvent(this.createLink, actionEvent);
					}
				}
			})
		);


		this.registerAction(
			new Action({
				type: InputType.KEY_UP,
				fire: (actionEvent) => {
					// On esc press unselect any selected link
					if ((actionEvent.event as any).keyCode === 27) {
						this.deselectLinks();
						this.transitionWithEvent(this.dragCanvas, actionEvent);
					}
				}
			})
		);
	}

	deselectLinks() {
		this.engine.getModel().getLinks().forEach((link) => {
			link.setSelected(false);
			link.getSourcePort()?.fireEvent({}, "link-unselected");
			link.getTargetPort()?.fireEvent({}, "link-unselected");
			removePendingMappingTempLinkIfExists(link);
		});
	}
}
