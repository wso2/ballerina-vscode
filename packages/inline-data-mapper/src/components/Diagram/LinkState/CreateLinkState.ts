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
import { KeyboardEvent, MouseEvent } from 'react';

import { Action, ActionEvent, InputType, State } from '@projectstorm/react-canvas-core';
import { DiagramEngine, LinkModel, PortModel } from '@projectstorm/react-diagrams-core';

import { ExpressionLabelModel } from "../Label";
import { InputOutputPortModel } from '../Port/model/InputOutputPortModel';
import { isInputNode, isLinkModel, isOutputNode } from '../Actions/utils';
import { DataMapperLinkModel } from '../Link/DataMapperLink';
/**
 * This state is controlling the creation of a link.
 */
export class CreateLinkState extends State<DiagramEngine> {
	sourcePort: PortModel;
	link: LinkModel;

	constructor(resetState: boolean = false) {
		super({ name: 'create-new-link' });

		if (resetState) {
			this.clearState();
		}

		this.registerAction(
			new Action({
				type: InputType.MOUSE_UP,
				fire: (actionEvent: ActionEvent<MouseEvent>) => {
					let element = this.engine.getActionEventBus().getModelForEvent(actionEvent);
					const isValueConfig = (actionEvent.event.target as Element)
						.closest('div[id^="value-config"]');

					if (element === null) {
						this.clearState();
					} else if (!(element instanceof PortModel)) {
						if (isOutputNode(element)) {
							const recordFieldElement = (event.target as Element).closest('div[id^="recordfield"]');
							if (recordFieldElement) {
								const fieldId = (recordFieldElement.id.split("-"))[1] + ".IN";
								const portModel = (element as any).getPort(fieldId) as InputOutputPortModel;
								if (portModel) {
									element = portModel;
								}
							}
						}

						if (isInputNode(element)) {
							const isGoToSubMappingBtn = (actionEvent.event.target as Element)
								.closest('div[id^="go-to-sub-mapping-btn"]');
							if (isGoToSubMappingBtn) return;
							const recordFieldElement = (event.target as Element).closest('div[id^="recordfield"]');
							if (recordFieldElement) {
								const fieldId = (recordFieldElement.id.split("-"))[1] + ".OUT";
								const portModel = (element as any).getPort(fieldId) as InputOutputPortModel;
								if (portModel) {
									element = portModel;
								}
							}
						}

						if (isLinkModel(element) && this.sourcePort) {
							// If a source port is already selected and clicked on a link,
							// select the target port of the link to create a mapping
							element = (element as DataMapperLinkModel).getTargetPort();
						}
					}

					if (element instanceof PortModel && !this.sourcePort) {
						if (element instanceof InputOutputPortModel) {
							if (element.portType === "OUT") {
								this.sourcePort = element;
								element.fireEvent({}, "mappingStartedFrom");
								element.linkedPorts.forEach((linkedPort) => {
									linkedPort.fireEvent({}, "disableNewLinking")
								})
								const link = this.sourcePort.createLinkModel();
								link.setSourcePort(this.sourcePort);
								link.addLabel(new ExpressionLabelModel({
									value: undefined,
									context: undefined
								}));
								this.link = link;
							} else if (!isValueConfig) {
								element.fireEvent({}, "firstClickedOnOutput");
								this.clearState();
								this.eject();
							}
						}
					} else if (element instanceof PortModel && this.sourcePort && element !== this.sourcePort) {
						if ((element instanceof InputOutputPortModel)) {
							if (element.portType === "IN") {
								let isDisabled = false;
								if (element instanceof InputOutputPortModel) {
								isDisabled = element.isDisabled();
								}
								if (!isDisabled) {
									element.fireEvent({}, "mappingFinishedTo");
									if (this.sourcePort.canLinkToPort(element)) {

										this.link?.setTargetPort(element);
										this.engine.getModel().addAll(this.link)
										if (this.sourcePort instanceof InputOutputPortModel) {
											this.sourcePort.linkedPorts.forEach((linkedPort) => {
												linkedPort.fireEvent({}, "enableNewLinking")
											})
										}
										this.sourcePort = undefined;
										this.eject();
									}
								}
							} else {
								// Selected another input port, change selected port
								this.sourcePort.fireEvent({}, "link-unselected");
								if (this.sourcePort instanceof InputOutputPortModel) {
									this.sourcePort.linkedPorts.forEach((linkedPort) => {
										linkedPort.fireEvent({}, "enableNewLinking")
									})
								}
								this.sourcePort.removeLink(this.link);
								this.sourcePort = element;
								this.link?.setSourcePort(element);
								element.fireEvent({}, "mappingStartedFrom");
								if (element instanceof InputOutputPortModel) {
									element.linkedPorts.forEach((linkedPort) => {
										linkedPort.fireEvent({}, "disableNewLinking")
									})
								}
							}
						}
					} else if (element === this.link?.getLastPoint()) {
						this.link?.point(0, 0, -1);
					} else if (element === this.sourcePort) {
						element.fireEvent({}, "mappingStartedFromSelectedAgain");
						if (element instanceof InputOutputPortModel) {
							element.linkedPorts.forEach((linkedPort) => {
								linkedPort.fireEvent({}, "enableNewLinking")
							})
						}
						this.link?.remove();
						this.clearState();
						this.eject();
					} else {
						console.log("Invalid element selected");
					}

					this.engine.repaintCanvas();
				}
			})
		);

		this.registerAction(
			new Action({
				type: InputType.MOUSE_MOVE,
				fire: () => {
					if (!this.link) return;
					this.engine.repaintCanvas();
				}
			})
		);

		this.registerAction(
			new Action({
				type: InputType.KEY_UP,
				fire: (actionEvent: ActionEvent<KeyboardEvent>) => {
					// on esc press remove any started link and pop back to default state
					if (actionEvent.event.keyCode === 27) {
						this.link?.remove();
						this.clearState();
						this.eject();
						this.engine.repaintCanvas();
					}
				}
			})
		);
	}

	clearState() {
		if (this.sourcePort) {
			this.sourcePort.fireEvent({}, "link-unselected");
			this.sourcePort.removeLink(this.link);
		}
		this.link = undefined;
		this.sourcePort = undefined;
	}
}
