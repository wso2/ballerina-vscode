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
import { STKindChecker, STNode } from '@wso2/syntax-tree';
import "reflect-metadata";
import { container, injectable, singleton } from "tsyringe";

import { RecordFieldPortModel } from '../../Port';
import { FUNCTION_BODY_QUERY, MAPPING_CONSTRUCTOR_TARGET_PORT_PREFIX } from '../../utils/constants';
import { getExprBodyFromLetExpression } from "../../utils/dm-utils";
import { EditableMappingConstructorWidget } from "../commons/DataManipulationWidget/EditableMappingConstructorWidget";
import { IDataMapperNodeFactory } from '../commons/DataMapperNode';
import { OutputSearchNoResultFound, SearchNoResultFoundKind } from "../commons/Search";

import { MappingConstructorNode, MAPPING_CONSTRUCTOR_NODE_TYPE } from './MappingConstructorNode';

@injectable()
@singleton()
export class ExpressionFunctionBodyFactory extends AbstractReactFactory<MappingConstructorNode, DiagramEngine> implements IDataMapperNodeFactory {
	constructor() {
		super(MAPPING_CONSTRUCTOR_NODE_TYPE);
	}

	generateReactWidget(event: { model: MappingConstructorNode; }): JSX.Element {
		let valueLabel: string;
		if (STKindChecker.isSelectClause(event.model.value)
			&& event.model.context.selection.selectedST.fieldPath !== FUNCTION_BODY_QUERY)
		{
			valueLabel = event.model.typeIdentifier.value as string || event.model.typeIdentifier.source;
		}
		return (
			<>
				{event.model.hasNoMatchingFields ? (
					<OutputSearchNoResultFound kind={SearchNoResultFoundKind.OutputField}/>
				) : (
					<EditableMappingConstructorWidget
						engine={this.engine}
						id={`${MAPPING_CONSTRUCTOR_TARGET_PORT_PREFIX}${event.model.rootName ? `.${event.model.rootName}` : ''}`}
						editableRecordField={event.model.recordField}
						typeName={event.model.typeName}
						value={event.model.innermostExpr}
						getPort={(portId: string) => event.model.getPort(portId) as RecordFieldPortModel}
						context={event.model.context}
						mappings={event.model.mappings}
						valueLabel={valueLabel}
						deleteField={(node: STNode) => event.model.deleteField(node)}
						originalTypeName={event.model.typeDef.originalTypeName}
					/>
				)}
			</>
		);
	}

	generateModel(): MappingConstructorNode {
		return undefined;
	}
}
container.register("NodeFactory", { useClass: ExpressionFunctionBodyFactory });
