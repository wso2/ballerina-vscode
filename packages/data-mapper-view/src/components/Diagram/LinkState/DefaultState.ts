import { MouseEvent } from 'react';

import {
	Action,
	ActionEvent,
	DragCanvasState,
	InputType,
	SelectingState,
	State
} from '@projectstorm/react-canvas-core';
import { DiagramEngine, DragDiagramItemsState, PortModel } from '@projectstorm/react-diagrams-core';

import { DMCanvasContainerID } from "../Canvas/DataMapperCanvasWidget";
import { DiagnosticTooltipID } from "../Diagnostic/DiagnosticTooltip/DiagnosticTooltip";
import { ListConstructorNode, MappingConstructorNode, PrimitiveTypeNode, RequiredParamNode } from '../Node';
import { DataMapperNodeModel } from "../Node/commons/DataMapperNode";
import { EnumTypeNode } from '../Node/EnumType';
import { FromClauseNode } from '../Node/FromClause';
import { JoinClauseNode } from "../Node/JoinClause";
import { LetClauseNode } from "../Node/LetClause";
import { LetExpressionNode } from "../Node/LetExpression";
import { ModuleVariableNode } from "../Node/ModuleVariable";
import { UnionTypeNode } from "../Node/UnionType";
import { LinkOverayContainerID } from '../OverriddenLinkLayer/LinkOverlayPortal';

import { CreateLinkState } from './CreateLinkState';
import { removePendingMappingTempLinkIfExists } from '../Link/link-utils';

export class DefaultState extends State<DiagramEngine> {
	dragCanvas: DragCanvasState;
	createLink: CreateLinkState;
	dragItems: DragDiagramItemsState;

	constructor(resetState: boolean = false) {
		super({ name: 'starting-state' });
		this.childStates = [new SelectingState()];
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
						const diagnosticsTooltip = targetElement.closest(`#${DiagnosticTooltipID}`);
						if (linkOverlayContainer || diagnosticsTooltip) {
							// Clicked on a link overlay item or a diagnostic tooltip,
							// hence, do not propagate as a canvas drag
						} else if (dmCanvasContainer) {
							// deselect links when clicking on the canvas
							this.deselectLinks();
							this.transitionWithEvent(this.dragCanvas, event);
						}
					}
					// initiate dragging a new link
					else if (element instanceof PortModel || element instanceof DataMapperNodeModel && !isExpandOrCollapse) {
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
					const isExpandOrCollapse = (actionEvent.event.target as Element)
						.closest('button[id^="expand-or-collapse"]');
					const isAddElement = (actionEvent.event.target as Element)
						.closest('button[id^="add-array-element"]');
					const isAddLocalVariable = (actionEvent.event.target as Element)
						.closest('button[id^="add-local-variable"]');
					const isEditLocalVariables = (actionEvent.event.target as Element)
						.closest('button[id^="edit-local-variables"]');

					if (!isExpandOrCollapse && !isAddElement && !isAddLocalVariable && !isEditLocalVariables
						&& (element instanceof PortModel
							|| element instanceof MappingConstructorNode
							|| element instanceof ListConstructorNode
							|| element instanceof PrimitiveTypeNode
							|| element instanceof UnionTypeNode
							|| element instanceof RequiredParamNode
							|| element instanceof FromClauseNode
							|| element instanceof LetExpressionNode
							|| element instanceof ModuleVariableNode
							|| element instanceof EnumTypeNode
							|| element instanceof LetClauseNode
							|| element instanceof JoinClauseNode
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
						this.engine.getModel().getLinks().forEach((link) => {
							this.deselectLinks();
							this.transitionWithEvent(this.dragCanvas, actionEvent);
						});
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
