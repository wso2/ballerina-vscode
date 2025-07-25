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
import { QUERY_OUTPUT_TARGET_PORT_PREFIX } from '../../utils/constants';
import { QueryOutputWidget } from "./QueryOutputWidget";
import { OutputSearchNoResultFound, SearchNoResultFoundKind } from "../commons/Search";

import { QueryOutputNode, QUERY_OUTPUT_NODE_TYPE } from './QueryOutputNode';

export class QueryOutputNodeFactory extends AbstractReactFactory<QueryOutputNode, DiagramEngine> {
	constructor() {
		super(QUERY_OUTPUT_NODE_TYPE);
	}

	generateReactWidget(event: { model: QueryOutputNode; }): JSX.Element {
		return (
			<>
				{event.model.hasNoMatchingFields ? (
					<OutputSearchNoResultFound kind={SearchNoResultFoundKind.OutputField}/>
				) : (
					<QueryOutputWidget
						engine={this.engine}
						id={`${QUERY_OUTPUT_TARGET_PORT_PREFIX}.${event.model.rootName}`}
						outputType={event.model.outputType}
						typeName={event.model.typeName}
						value={undefined}
						getPort={(portId: string) => event.model.getPort(portId) as InputOutputPortModel}
						context={event.model.context}
						mappings={event.model.filteredMappings}
						valueLabel={event.model.outputType.variableName}
						originalTypeName={event.model.filteredOutputType?.variableName}
					/>
				)}
			</>
		);
	}

	generateModel(): QueryOutputNode {
		return undefined;
	}
}
