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
