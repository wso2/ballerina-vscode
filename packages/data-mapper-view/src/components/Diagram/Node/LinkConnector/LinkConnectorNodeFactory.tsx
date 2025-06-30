import * as React from 'react';

import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import { DiagramEngine } from '@projectstorm/react-diagrams-core';
import "reflect-metadata";
import { container, injectable, singleton } from "tsyringe";

import { IDataMapperNodeFactory } from '../commons/DataMapperNode';

import { LinkConnectorNode, LINK_CONNECTOR_NODE_TYPE } from './LinkConnectorNode';
import { LinkConnectorNodeWidget } from './LinkConnectorNodeWidget';

@injectable()
@singleton()
export class LinkConnectorNodeFactory extends AbstractReactFactory<LinkConnectorNode, DiagramEngine> implements IDataMapperNodeFactory {
	constructor() {
		super(LINK_CONNECTOR_NODE_TYPE);
	}

	generateReactWidget(event: { model: LinkConnectorNode; }): JSX.Element {
		const inputPortHasLinks = Object.keys(event.model.inPort.links).length;
		const outputPortHasLinks = Object.keys(event.model.outPort.links).length;
		if (inputPortHasLinks && outputPortHasLinks) {
			return <LinkConnectorNodeWidget engine={this.engine} node={event.model} />;
		}
		return null;
	}

	generateModel(): LinkConnectorNode {
		return undefined;
	}
}

container.register("NodeFactory",  {useClass: LinkConnectorNodeFactory});
