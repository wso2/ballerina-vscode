
import * as React from 'react';

import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import { DiagramEngine } from '@projectstorm/react-diagrams-core';
import "reflect-metadata";
import { container, injectable, singleton } from "tsyringe";

import { IDataMapperNodeFactory } from '../commons/DataMapperNode';

import { QueryExpressionNode, QUERY_EXPR_NODE_TYPE } from './QueryExpressionNode';
import { QueryExpressionNodeWidget } from './QueryExpressionNodeWidget';
import { expandArrayFn } from '../../utils/dm-utils';
import { useDMFocusedViewStateStore } from '../../../../store/store';

@injectable()
@singleton()
export class QueryExpressionNodeFactory extends AbstractReactFactory<QueryExpressionNode, DiagramEngine> implements IDataMapperNodeFactory {
	constructor() {
		super(QUERY_EXPR_NODE_TYPE);
	}

	generateReactWidget(event: { model: QueryExpressionNode; }): JSX.Element {
		const { sourcePortFQN, targetPortFQN, resetFocusedViewState } = useDMFocusedViewStateStore.getState();
		const { sourcePort: queryExprSrcPort, targetPort: queryExprTgtPort } = event.model;

		if (queryExprSrcPort?.fieldFQN === sourcePortFQN && queryExprTgtPort?.fieldFQN === targetPortFQN) {
			// Handle automatic navigation to the focused node
			resetFocusedViewState();
			expandArrayFn(event.model);
		}

		const inputPortHasLinks = Object.keys(event.model.inPort.links).length;
		const outputPortHasLinks = Object.keys(event.model.outPort.links).length;
		if (inputPortHasLinks && outputPortHasLinks) {
			return <QueryExpressionNodeWidget engine={this.engine} node={event.model} />;
		}
		return null;
	}

	generateModel(): QueryExpressionNode {
		return undefined;
	}
}

container.register("NodeFactory",  {useClass: QueryExpressionNodeFactory});
