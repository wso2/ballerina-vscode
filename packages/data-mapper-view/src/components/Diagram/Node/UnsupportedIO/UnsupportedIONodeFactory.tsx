/*
 * Copyright (c) 2023, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein is strictly forbidden, unless permitted by WSO2 in accordance with
 * the WSO2 Commercial License available at http://wso2.com/licenses.
 * For specific language governing the permissions and limitations under
 * this license, please see the license as well as any agreement you’ve
 * entered into with WSO2 governing the purchase of this software and any
 * associated services.
 */
// tslint:disable: jsx-no-multiline-js
import * as React from 'react';

import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import { DiagramEngine } from '@projectstorm/react-diagrams-core';
import "reflect-metadata";
import { container, injectable, singleton } from "tsyringe";

import { IDataMapperNodeFactory } from '../commons/DataMapperNode';

import { UnsupportedIONode, UNSUPPORTED_IO_NODE_TYPE } from './UnsupportedIONode';
import { UnsupportedExpr, UnsupportedIO } from "./UnsupportedIONodeWidget";

@injectable()
@singleton()
export class UnsupportedIONodeFactory extends AbstractReactFactory<UnsupportedIONode, DiagramEngine> implements IDataMapperNodeFactory {
	constructor() {
		super(UNSUPPORTED_IO_NODE_TYPE);
	}

	generateReactWidget(event: { model: UnsupportedIONode; }): JSX.Element {
		return (
			<>
				{event.model.message ? (
					<UnsupportedIO
						message={event.model.message}
					/>
				) : (
					<UnsupportedExpr
						filePath={event.model.filePath}
						unsupportedExpr={event.model.unsupportedExpr}
						context={event.model.context}
					/>
				)}
			</>
		);
	}

	generateModel(): UnsupportedIONode {
		return undefined;
	}
}
container.register("NodeFactory", { useClass: UnsupportedIONodeFactory });
