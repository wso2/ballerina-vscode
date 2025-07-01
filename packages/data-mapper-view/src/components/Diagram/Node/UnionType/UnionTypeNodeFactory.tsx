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
// tslint:disable: jsx-no-multiline-js jsx-no-lambda
import * as React from 'react';

import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import { DiagramEngine } from '@projectstorm/react-diagrams-core';
import { PrimitiveBalType } from "@wso2/ballerina-core";
import { STKindChecker, STNode } from '@wso2/syntax-tree';
import "reflect-metadata";
import { container, injectable, singleton } from "tsyringe";

import { RecordFieldPortModel } from "../../Port";
import {
	FUNCTION_BODY_QUERY,
	LIST_CONSTRUCTOR_TARGET_PORT_PREFIX,
	MAPPING_CONSTRUCTOR_TARGET_PORT_PREFIX,
	PRIMITIVE_TYPE_TARGET_PORT_PREFIX,
	UNION_TYPE_TARGET_PORT_PREFIX
} from '../../utils/constants';
import { getTypeName } from "../../utils/dm-utils";
import { UnionTypeInfo } from "../../utils/union-type-utils";
import { ArrayTypeOutputWidget } from "../commons/DataManipulationWidget/ArrayTypeOutputWidget";
import { EditableMappingConstructorWidget } from "../commons/DataManipulationWidget/EditableMappingConstructorWidget";
import { PrimitiveTypeOutputWidget } from "../commons/DataManipulationWidget/PrimitiveTypeOutputWidget";
import { IDataMapperNodeFactory } from '../commons/DataMapperNode';

import {
	UnionTypeNode,
	UNION_TYPE_NODE_TYPE
} from './UnionTypeNode';
import { UnionTypeTreeWidget } from "./UnionTypeTreeWidget";

@injectable()
@singleton()
export class UnionTypeNodeFactory extends AbstractReactFactory<UnionTypeNode, DiagramEngine> implements IDataMapperNodeFactory {
	constructor() {
		super(UNION_TYPE_NODE_TYPE);
	}

	generateReactWidget(event: { model: UnionTypeNode; }): JSX.Element {
		let valueLabel: string;
		const resolvedType = event.model.resolvedType;
		const resolvedTypeName = getTypeName(resolvedType);
		const shouldRenderUnionType = event.model.shouldRenderUnionType();

		if (STKindChecker.isSelectClause(event.model.value)
			&& event.model.context.selection.selectedST.fieldPath !== FUNCTION_BODY_QUERY)
		{
			valueLabel = event.model.typeIdentifier.value as string || event.model.typeIdentifier.source;
		}

		const unionTypeInfo: UnionTypeInfo = {
			unionType: event.model.unionTypeDef,
			typeNames: event.model.unionTypes,
			resolvedTypeName,
			isResolvedViaTypeCast: !!event.model.typeCastExpr,
			valueExpr: event.model.value
		};

		return (
			<>
				{shouldRenderUnionType && (
					<UnionTypeTreeWidget
						id={`${UNION_TYPE_TARGET_PORT_PREFIX}${event.model.rootName ? `.${event.model.rootName}` : ''}`}
						engine={this.engine}
						context={event.model.context}
						typeName={event.model.typeName}
						typeIdentifier={event.model.typeIdentifier}
						typeDef={event.model.unionTypeDef}
						hasInvalidTypeCast={event.model.hasInvalidTypeCast}
						innermostExpr={event.model.innermostExpr}
						typeCastExpr={event.model.typeCastExpr}
						unionTypeInfo={unionTypeInfo}
						getPort={(portId: string) => event.model.getPort(portId) as RecordFieldPortModel}
					/>
				)}
				{!shouldRenderUnionType && resolvedType && resolvedType.typeName === PrimitiveBalType.Record && (
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
						unionTypeInfo={unionTypeInfo}
					/>
				)}
				{!shouldRenderUnionType && resolvedType && resolvedType.typeName === PrimitiveBalType.Array && (
					<ArrayTypeOutputWidget
						id={`${LIST_CONSTRUCTOR_TARGET_PORT_PREFIX}${event.model.rootName ? `.${event.model.rootName}` : ''}`}
						engine={this.engine}
						field={event.model.recordField}
						getPort={(portId: string) => event.model.getPort(portId) as RecordFieldPortModel}
						context={event.model.context}
						typeName={event.model.typeName}
						valueLabel={valueLabel}
						deleteField={(node: STNode) => event.model.deleteField(node)}
						unionTypeInfo={unionTypeInfo}
					/>
				)}
				{!shouldRenderUnionType
					&& resolvedType
					&& resolvedType.typeName !== PrimitiveBalType.Record
					&& resolvedType.typeName !== PrimitiveBalType.Array
					&& (
					<PrimitiveTypeOutputWidget
						id={PRIMITIVE_TYPE_TARGET_PORT_PREFIX}
						engine={this.engine}
						field={event.model.recordField}
						getPort={(portId: string) => event.model.getPort(portId) as RecordFieldPortModel}
						context={event.model.context}
						typeName={event.model.typeName}
						valueLabel={valueLabel}
						deleteField={(node: STNode) => event.model.deleteField(node)}
						unionTypeInfo={unionTypeInfo}
					/>
				)}
			</>
		);
	}

	generateModel(): UnionTypeNode {
		return undefined;
	}
}
container.register("NodeFactory", { useClass: UnionTypeNodeFactory });
