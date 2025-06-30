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
// tslint:disable: jsx-no-lambda jsx-no-multiline-js
import * as React from 'react';

import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import { DiagramEngine } from '@projectstorm/react-diagrams-core';
import { STKindChecker, STNode } from '@wso2/syntax-tree';
import "reflect-metadata";
import { container, injectable, singleton } from "tsyringe";

import { RecordFieldPortModel } from '../../Port';
import { FUNCTION_BODY_QUERY, LIST_CONSTRUCTOR_TARGET_PORT_PREFIX } from '../../utils/constants';
import { ArrayTypeOutputWidget } from "../commons/DataManipulationWidget/ArrayTypeOutputWidget";
import { IDataMapperNodeFactory } from '../commons/DataMapperNode';
import { OutputSearchNoResultFound, SearchNoResultFoundKind } from "../commons/Search";

import { ListConstructorNode, LIST_CONSTRUCTOR_NODE_TYPE } from './ListConstructorNode';

@injectable()
@singleton()
export class ListConstructorNodeFactory extends AbstractReactFactory<ListConstructorNode, DiagramEngine> implements IDataMapperNodeFactory {
	constructor() {
		super(LIST_CONSTRUCTOR_NODE_TYPE);
	}

	generateReactWidget(event: { model: ListConstructorNode; }): JSX.Element {
		let valueLabel;
		if (STKindChecker.isSelectClause(event.model.value)
			&& event.model.context.selection.selectedST.fieldPath !== FUNCTION_BODY_QUERY)
		{
			valueLabel = event.model.typeIdentifier.value || event.model.typeIdentifier.source;
		}
		return (
			<>
				{event.model.hasNoMatchingFields ? (
					<OutputSearchNoResultFound kind={SearchNoResultFoundKind.OutputField} />
				) : (
					<ArrayTypeOutputWidget
						id={`${LIST_CONSTRUCTOR_TARGET_PORT_PREFIX}${event.model.rootName ? `.${event.model.rootName}` : ''}`}
						engine={this.engine}
						field={event.model.recordField}
						getPort={(portId: string) => event.model.getPort(portId) as RecordFieldPortModel}
						context={event.model.context}
						typeName={event.model.typeName}
						valueLabel={valueLabel}
						deleteField={(node: STNode) => event.model.deleteField(node)}
					/>
				)}
			</>
		);
	}

	generateModel(event: { initialConfig: any }): any {
		return undefined;
	}
}
container.register("NodeFactory", { useClass: ListConstructorNodeFactory });
