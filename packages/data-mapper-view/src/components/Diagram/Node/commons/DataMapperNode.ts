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
// tslint:disable: no-empty-interface
import { DiagramModel, NodeModel, NodeModelGenerics } from '@projectstorm/react-diagrams';
import { PrimitiveBalType, TypeField } from "@wso2/ballerina-core";
import {
	AnydataTypeDesc,
	AnyTypeDesc,
	ArrayTypeDesc,
	BooleanTypeDesc,
	ByteTypeDesc,
	DecimalTypeDesc,
	DistinctTypeDesc,
	ErrorTypeDesc,
	FloatTypeDesc,
	FunctionTypeDesc,
	FutureTypeDesc,
	HandleTypeDesc,
	IntersectionTypeDesc,
	IntTypeDesc,
	JsonTypeDesc,
	MapTypeDesc,
	NeverTypeDesc,
	NilTypeDesc,
	ObjectTypeDesc,
	OptionalTypeDesc,
	ParenthesisedTypeDesc,
	QualifiedNameReference,
	ReadonlyTypeDesc,
	RecordTypeDesc,
	SimpleNameReference,
	SingletonTypeDesc,
	STKindChecker,
	STNode,
	StreamTypeDesc,
	StringTypeDesc,
	TableTypeDesc,
	TupleTypeDesc,
	TypedescTypeDesc,
	UnionTypeDesc,
	XmlTypeDesc
} from '@wso2/syntax-tree';

import { IDataMapperContext } from '../../../../utils/DataMapperContext/DataMapperContext';
import { ArrayElement, EditableRecordField } from "../../Mappings/EditableRecordField";
import { FieldAccessToSpecificFied } from '../../Mappings/FieldAccessToSpecificFied';
import { RecordFieldPortModel } from "../../Port";
import {
	getBalRecFieldName,
	getFieldName,
	getFnDefForFnCall,
	getInnermostExpressionBody,
	getInputNodes,
	getOptionalRecordField,
	isComplexExpression,
	isOptionalAndNillableField
} from "../../utils/dm-utils";

export interface DataMapperNodeModelGenerics {
	PORT: RecordFieldPortModel;
}

export type TypeDescriptor = AnyTypeDesc | AnydataTypeDesc | ArrayTypeDesc | BooleanTypeDesc | ByteTypeDesc | DecimalTypeDesc
	| DistinctTypeDesc | ErrorTypeDesc | FloatTypeDesc | FunctionTypeDesc | FutureTypeDesc | HandleTypeDesc | IntTypeDesc
	| IntersectionTypeDesc | JsonTypeDesc | MapTypeDesc | NeverTypeDesc | NilTypeDesc | ObjectTypeDesc | OptionalTypeDesc
	| ParenthesisedTypeDesc | QualifiedNameReference | ReadonlyTypeDesc | RecordTypeDesc | SimpleNameReference
	| SingletonTypeDesc | StreamTypeDesc | StringTypeDesc | TableTypeDesc | TupleTypeDesc | TypedescTypeDesc | UnionTypeDesc
	| XmlTypeDesc;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IDataMapperNodeFactory {

}

export abstract class DataMapperNodeModel extends NodeModel<NodeModelGenerics & DataMapperNodeModelGenerics> {

	private diagramModel: DiagramModel;

	constructor(
		public id: string,
		public context: IDataMapperContext,
		type: string
	) {
		super({
			type
		});
	}

	public setModel(model: DiagramModel) {
		this.diagramModel = model;
	}

	public getModel() {
		return this.diagramModel;
	}

	abstract initPorts(): void;
	abstract initLinks(): void;
	// extend this class to add link init, port init logics

	protected addPortsForInputRecordField(
		field: TypeField,
		type: "IN" | "OUT",
		parentId: string,
		unsafeParentId: string,
		portPrefix?: string,
		parent?: RecordFieldPortModel,
		collapsedFields?: string[],
		hidden?: boolean,
		isOptional?: boolean
	): number {

		const fieldName = field?.name ? getBalRecFieldName(field.name) : '';

		const fieldFQN = parentId
			? `${parentId}${fieldName && isOptional
				? `?.${fieldName}`
				: `.${fieldName}`}`
			: fieldName && fieldName;
		const unsafeFieldFQN = unsafeParentId
			? `${unsafeParentId}.${fieldName}`
			: fieldName || '';

		if (fieldName.startsWith("$missingNode$")) {
			return;
		}

		const portName = portPrefix ? `${portPrefix}.${unsafeFieldFQN}` : unsafeFieldFQN;
		const isCollapsed = !hidden && collapsedFields && collapsedFields.includes(portName);
		const fieldPort = new RecordFieldPortModel(
			field, portName, type, parentId, undefined, undefined, fieldFQN,
			unsafeFieldFQN, parent, isCollapsed, hidden);

		this.addPort(fieldPort);

		let numberOfFields = 1;		
		const optionalRecordField = getOptionalRecordField(field);
		if (optionalRecordField) {
			optionalRecordField?.fields.forEach((subField) => {
				numberOfFields += this.addPortsForInputRecordField(
					subField, type, fieldFQN, unsafeFieldFQN, portPrefix, fieldPort,
					collapsedFields, isCollapsed ? true : hidden, true)
				;
			});
		} else if (field.typeName === PrimitiveBalType.Record) {
			const fields = field?.fields;
			if (fields && !!fields.length) {
				fields.forEach((subField) => {
					numberOfFields += this.addPortsForInputRecordField(
						subField, type, fieldFQN, unsafeFieldFQN, portPrefix, fieldPort,
						collapsedFields, isCollapsed || hidden, subField.optional || isOptional
					);
				});
			}
		}
		return hidden ? 0 : numberOfFields;
	}

	protected addPortsForOutputRecordField(
		field: EditableRecordField,
		type: "IN" | "OUT",
		parentId: string,
		elementIndex?: number,
		portPrefix?: string,
		parent?: RecordFieldPortModel,
		collapsedFields?: string[],
		hidden?: boolean,
		isWithinSelectClause?: boolean
	) {
		const fieldName = getFieldName(field);

		if (fieldName.startsWith("$missingNode$")) {
			return;
		}

		if (elementIndex !== undefined) {
			parentId = parentId ? `${parentId}.${elementIndex}` : elementIndex.toString();
		}
		const fieldFQN = parentId ? `${parentId}${fieldName && `.${fieldName}`}` : fieldName && fieldName;
		const portName = portPrefix ? `${portPrefix}.${fieldFQN}` : fieldFQN;
		const isCollapsed = !hidden && collapsedFields && collapsedFields.includes(portName);
		const fieldPort = new RecordFieldPortModel(
			field.type, portName, type, parentId, elementIndex, field,
			fieldFQN, fieldFQN, parent, isCollapsed, hidden, isWithinSelectClause);
		this.addPort(fieldPort);

		if (field.type.typeName === PrimitiveBalType.Record) {
			const fields = field?.childrenTypes;
			if (fields && !!fields.length) {
				fields.forEach((subField) => {
					this.addPortsForOutputRecordField(subField, type, fieldFQN, undefined, portPrefix,
						fieldPort, collapsedFields, isCollapsed ? true : hidden);
				});
			}
		} else if (field.type.typeName === PrimitiveBalType.Array) {
			const elements: ArrayElement[] = field?.elements;
			if (elements && !!elements.length) {
				elements.forEach((element, index) => {
					this.addPortsForOutputRecordField(element.member, type, fieldFQN, index, portPrefix,
						fieldPort, collapsedFields, isCollapsed ? true : hidden);
				});
			}
		}
	}

	protected addPortsForHeaderField(
		field: TypeField,
		name: string,
		type: "IN" | "OUT",
		portPrefix: string,
		collapsedFields?: string[],
		isWithinSelectClause?: boolean,
		editableRecordField?: EditableRecordField
	): RecordFieldPortModel {

		const fieldName = getBalRecFieldName(name);

		if (fieldName.startsWith("$missingNode$")) {
			return;
		}

		let portName = fieldName;
		if (portPrefix) {
			portName = fieldName ? `${portPrefix}.${fieldName}` : portPrefix;
		}
		const isCollapsed = collapsedFields && collapsedFields.includes(portName);
		const fieldPort = new RecordFieldPortModel(
			field, portName, type, undefined, undefined, editableRecordField,
			fieldName, fieldName, undefined, isCollapsed, false, isWithinSelectClause
		);
		this.addPort(fieldPort)

		return fieldPort;
	}

	protected genMappings(val: STNode, parentFields?: STNode[]) {
		let foundMappings: FieldAccessToSpecificFied[] = [];
		const currentFields = [...(parentFields ? parentFields : [])];
		if (val) {
			if (STKindChecker.isMappingConstructor(val)) {
				val.fields.forEach((field) => {
					if (!STKindChecker.isCommaToken(field)) {
						foundMappings = [...foundMappings, ...this.genMappings(field, [...currentFields, val])];
					}
				});
			} else if (STKindChecker.isSpecificField(val) && val.valueExpr) {
				const expr = getInnermostExpressionBody(val.valueExpr);
				const isMappingConstructor = STKindChecker.isMappingConstructor(expr);
				const isListConstructor = STKindChecker.isListConstructor(expr);
				if (isMappingConstructor || isListConstructor) {
					foundMappings = [...foundMappings, ...this.genMappings(expr, [...currentFields, val])];
				} else {
					foundMappings.push(this.getOtherMappings(val, currentFields));
				}
			} else if (STKindChecker.isListConstructor(val)) {
				val.expressions.forEach((expr) => {
					if (!STKindChecker.isCommaToken(expr)) {
						foundMappings = [...foundMappings, ...this.genMappings(expr, [...currentFields, val])];
					}
				})
			} else if (STKindChecker.isLetExpression(val) || STKindChecker.isTypeCastExpression(val)) {
				const expr = getInnermostExpressionBody(val);
				foundMappings = [...foundMappings, ...this.genMappings(expr, [...currentFields])];
			} else {
				foundMappings.push(this.getOtherMappings(val, currentFields));
			}
		}
		return foundMappings;
	}

	protected getOtherMappings(node: STNode, currentFields: STNode[]) {
		const valNode = STKindChecker.isSpecificField(node) ? node.valueExpr : node;
		if (valNode) {
			const inputNodes = getInputNodes(valNode);
			const valueExpr = STKindChecker.isCheckExpression(valNode) ? valNode.expression : valNode;
			const innerExpr = getInnermostExpressionBody(valueExpr);
			const isExprBodiedFunc = STKindChecker.isFunctionCall(innerExpr) && getFnDefForFnCall(innerExpr);
			if (inputNodes.length === 1
				&& !isComplexExpression(valNode)
				&& !STKindChecker.isQueryExpression(valNode)
				&& !isExprBodiedFunc
			) {
				return new FieldAccessToSpecificFied([...currentFields, node], inputNodes[0], valNode);
			}
			return new FieldAccessToSpecificFied([...currentFields, node], undefined, valNode);
		}
	}
}
