import { KeyboardEvent, MouseEvent } from 'react';

import { Action, ActionEvent, InputType, State } from '@projectstorm/react-canvas-core';
import { DiagramEngine, LinkModel, PortModel } from '@projectstorm/react-diagrams-core';

import { ExpressionLabelModel } from "../Label";
import { ListConstructorNode, MappingConstructorNode, PrimitiveTypeNode, RequiredParamNode } from '../Node';
import { EnumTypeNode } from '../Node/EnumType';
import { FromClauseNode } from '../Node/FromClause';
import { JoinClauseNode } from "../Node/JoinClause";
import { LetClauseNode } from "../Node/LetClause";
import { LetExpressionNode } from "../Node/LetExpression";
import { LinkConnectorNode } from '../Node/LinkConnector';
import { ModuleVariableNode } from "../Node/ModuleVariable";
import { UnionTypeNode } from "../Node/UnionType";
import { IntermediatePortModel } from '../Port';
import { RecordFieldPortModel } from '../Port/model/RecordFieldPortModel';
import { getMappingType, isLinkModel } from '../utils/dm-utils';
import { DataMapperLinkModel } from '../Link';
import { removePendingMappingTempLinkIfExists, userActionRequiredMapping } from '../Link/link-utils';
import { DataMapperNodeModel } from '../Node/commons/DataMapperNode';

/**
 * This state is controlling the creation of a link.
 */
export class CreateLinkState extends State<DiagramEngine> {
	sourcePort: PortModel;
	link: LinkModel;
	temporaryLink: LinkModel;

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

					if (element === null) {
						this.clearState();
					} else if (!(element instanceof PortModel)) {
						if (element instanceof MappingConstructorNode
							|| element instanceof ListConstructorNode
							|| element instanceof PrimitiveTypeNode
							|| element instanceof UnionTypeNode
						) {
							const recordFieldElement = (event.target as Element).closest('div[id^="recordfield"]')
							if (recordFieldElement) {
								const fieldId = (recordFieldElement.id.split("-"))[1] + ".IN";
								const portModel = element.getPort(fieldId) as RecordFieldPortModel
								if (portModel) {
									element = portModel;
								}
							}
						}

						if (element instanceof RequiredParamNode
							|| element instanceof  FromClauseNode
							|| element instanceof LetExpressionNode
							|| element instanceof ModuleVariableNode
							|| element instanceof EnumTypeNode
							|| element instanceof LetClauseNode
							|| element instanceof JoinClauseNode
						) {
							const recordFieldElement = (event.target as Element).closest('div[id^="recordfield"]')
							if (recordFieldElement) {
								const fieldId = (recordFieldElement.id.split("-"))[1] + ".OUT";
								const portModel = element.getPort(fieldId) as RecordFieldPortModel
								if (portModel) {
									element = portModel;
								}
							}
						}

						if (isLinkModel(element)) {
							element = (element as DataMapperLinkModel).getTargetPort();
						}
					}

					if (this.temporaryLink) {
						removePendingMappingTempLinkIfExists(this.temporaryLink);
						this.temporaryLink = undefined;
					}

					if (element instanceof PortModel && !this.sourcePort) {
						if (element instanceof RecordFieldPortModel) {
							if (element.portType === "OUT" && !element.isDisabled()) {
								this.sourcePort = element;
								element.fireEvent({}, "mappingStartedFrom");
								element.linkedPorts.forEach((linkedPort) => {
									linkedPort.fireEvent({}, "disableNewLinking")
								})
								const link = this.sourcePort.createLinkModel();
								link.setSourcePort(this.sourcePort);
								link.addLabel(new ExpressionLabelModel({
									link: link as DataMapperLinkModel,
									value: undefined,
									context: (element.getNode() as DataMapperNodeModel).context
								}));
								this.link = link;

							} else {
								// TODO: show a message: select input port first
								element.fireEvent({}, "mappingStartedTo");
								this.clearState();
								this.eject();
							}
						}
					} else if (element instanceof PortModel && this.sourcePort && element !== this.sourcePort) {
						if ((element instanceof RecordFieldPortModel)
						|| ((element instanceof IntermediatePortModel) && (element.getParent() instanceof LinkConnectorNode))) {
							if (element.portType === "IN") {
								let isDisabled = false;
								if (element instanceof RecordFieldPortModel) {
									isDisabled = element.isDisabled();
								}
								if (!isDisabled) {
									element.fireEvent({}, "mappingFinishedTo");
									if (this.sourcePort.canLinkToPort(element)) {

										this.link?.setTargetPort(element);

										const connectingMappingType = getMappingType(this.sourcePort, element);
										if (userActionRequiredMapping(connectingMappingType, element)) {
											const label = this.link.getLabels()
												.find(label => label instanceof ExpressionLabelModel) as ExpressionLabelModel;
											label.setPendingMappingType(connectingMappingType);
											this.temporaryLink = this.link;
										}

										this.engine.getModel().addAll(this.link)
										if (this.sourcePort instanceof RecordFieldPortModel) {
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
								if (this.sourcePort instanceof RecordFieldPortModel) {
									this.sourcePort.linkedPorts.forEach((linkedPort) => {
										linkedPort.fireEvent({}, "enableNewLinking")
									})
								}
								this.sourcePort.removeLink(this.link);
								if (!(element instanceof RecordFieldPortModel) || !element.isDisabled()) {
									this.sourcePort = element;
									this.link?.setSourcePort(element);
									element.fireEvent({}, "mappingStartedFrom");
									if (element instanceof RecordFieldPortModel) {
										element.linkedPorts.forEach((linkedPort) => {
											linkedPort.fireEvent({}, "disableNewLinking")
										})
									}
								}
							}
						}
					} else if (element === this.link?.getLastPoint()) {
						this.link?.point(0, 0, -1);
					} else if (element === this.sourcePort) {
						element.fireEvent({}, "mappingStartedFromSelectedAgain");
						if (element instanceof RecordFieldPortModel) {
							element.linkedPorts.forEach((linkedPort) => {
								linkedPort.fireEvent({}, "enableNewLinking")
							})
						}
						this.link?.remove();
						this.clearState();
						this.eject();
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
