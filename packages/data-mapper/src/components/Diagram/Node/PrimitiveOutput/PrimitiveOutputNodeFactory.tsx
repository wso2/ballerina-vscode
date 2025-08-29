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
// tslint:disable: jsx-no-lambda  jsx-no-multiline-js
import * as React from 'react';

import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import { DiagramEngine } from '@projectstorm/react-diagrams-core';

import { InputOutputPortModel } from '../../Port';
import { PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX } from '../../utils/constants';
import { PrimitiveOutputWidget } from "./PrimitiveOutputWidget";
import { OutputSearchNoResultFound, SearchNoResultFoundKind } from "../commons/Search";

import { PrimitiveOutputNode, PRIMITIVE_OUTPUT_NODE_TYPE } from './PrimitiveOutputNode';

export class PrimitiveOutputNodeFactory extends AbstractReactFactory<PrimitiveOutputNode, DiagramEngine> {
	constructor() {
		super(PRIMITIVE_OUTPUT_NODE_TYPE);
	}

	generateReactWidget(event: { model: PrimitiveOutputNode; }): JSX.Element {
		return (
			<>
				{event.model.hasNoMatchingFields ? (
					<OutputSearchNoResultFound kind={SearchNoResultFoundKind.OutputField}/>
				) : (
					<PrimitiveOutputWidget
						engine={this.engine}
						id={PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX}
						outputType={event.model.outputType}
						typeName={event.model.typeName}
						getPort={(portId: string) => event.model.getPort(portId) as InputOutputPortModel}
						context={event.model.context}
						valueLabel={event.model.outputType.id}
					/>
				)}
			</>
		);
	}

	generateModel(): PrimitiveOutputNode {
		return undefined;
	}
}
