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
import { LinkModel, LinkModelGenerics, PortModel, PortModelGenerics } from "@projectstorm/react-diagrams";
import { PrimitiveBalType, TypeField } from "@wso2/ballerina-core";
import { STKindChecker } from "@wso2/syntax-tree";

import { DataMapperLinkModel } from "../../Link";
import { EditableRecordField } from "../../Mappings/EditableRecordField";
import {
	createSourceForMapping,
	generateDestructuringPattern,
	getInnermostExpressionBody,
	getMappingType,
	getModificationForFromClauseBindingPattern,
	getModificationForSpecificFieldValue,
	getValueType,
	isDefaultValue,
	modifySpecificFieldSource,
	replaceSpecificFieldValue,
	updateExistingValue
} from "../../utils/dm-utils";
import { IntermediatePortModel } from "../IntermediatePort";
import { DataMapperNodeModel } from "../../Node/commons/DataMapperNode";
import { QueryExprMappingType } from "../../Node";
import { FromClauseNode } from "../../Node/FromClause";
import { userActionRequiredMapping } from "../../Link/link-utils";

export interface RecordFieldNodeModelGenerics {
	PORT: RecordFieldPortModel;
}

export const FORM_FIELD_PORT = "form-field-port";

export enum ValueType {
	Default,
	Empty,
	NonEmpty
}

export enum MappingType {
	ArrayToArray = "array-array",
	ArrayToSingleton = "array-singleton",
	RecordToRecord = "record-record",
	UnionToAny = "union-any",
	Default = "" // All other mapping types
}

export class RecordFieldPortModel extends PortModel<PortModelGenerics & RecordFieldNodeModelGenerics> {

	public linkedPorts: PortModel[];
	public pendingMappingType: MappingType;

	constructor(
		public field: TypeField,
		public portName: string,
		public portType: "IN" | "OUT",
		public parentId: string,
		public index?: number,
		public editableRecordField?: EditableRecordField,
		public fieldFQN?: string, // Field FQN with optional included, ie. person?.name?.firstName
		public optionalOmittedFieldFQN?: string, // Field FQN without optional, ie. person.name.firstName
		public parentModel?: RecordFieldPortModel,
		public collapsed?: boolean,
		public hidden?: boolean,
		public isWithinSelectClause?: boolean,
		public descendantHasValue?: boolean,
		public ancestorHasValue?: boolean,
		public isDisabledDueToCollectClause?: boolean) {
		super({
			type: FORM_FIELD_PORT,
			name: `${portName}.${portType}`
		});
		this.linkedPorts = [];
	}


	createLinkModel(): LinkModel {
		const lm = new DataMapperLinkModel();
		lm.registerListener({
			targetPortChanged: (async () => {
				if (!lm.getSourcePort() || !lm.getTargetPort()) {
					return;
				}
				const sourcePort = lm.getSourcePort() as RecordFieldPortModel;
				const targetPort = lm.getTargetPort() as RecordFieldPortModel;

				const targetPortHasLinks = Object.values(targetPort.links)
					?.some(link => (link as DataMapperLinkModel)?.isActualLink);

				const mappingType = getMappingType(sourcePort, targetPort);
				if (userActionRequiredMapping(mappingType, targetPort)) {
					// Source update behavior is determined by the user.
					return;
				}

				const targetNode = targetPort.getNode() as DataMapperNodeModel;
				const { position, mappingType: queryExprMappingType, stNode } = targetNode.context.selection.selectedST;
				const valueType = getValueType(lm);
				if (queryExprMappingType === QueryExprMappingType.A2SWithCollect && valueType !== ValueType.Empty) {
					const modifications = [];
					let sourceField = sourcePort.fieldFQN;
					const fieldParts = sourceField.split('.');
					if ((sourcePort.getParent() as FromClauseNode).typeDef.typeName === PrimitiveBalType.Record) {
						const bindingPatternSrc = generateDestructuringPattern(fieldParts.slice(1).join('.'));
						modifications.push(
							getModificationForFromClauseBindingPattern(position, bindingPatternSrc, stNode),
						);
					}
					// by default, use the sum operator to aggregate the values
					sourceField = `sum(${fieldParts[fieldParts.length - 1]})`;
					modifications.push(getModificationForSpecificFieldValue(targetPort, sourceField));
					replaceSpecificFieldValue(targetPort, modifications);
				} else if (valueType === ValueType.Default) {
					updateExistingValue(sourcePort, targetPort);
				} else if (targetPortHasLinks) {
					modifySpecificFieldSource(sourcePort, targetPort, lm.getID());
				} else {
					await createSourceForMapping(sourcePort, targetPort);
				}
			})
		});
		return lm;
	}

	addLink(link: LinkModel<LinkModelGenerics>): void {
		if (this.portType === 'IN'){
			this.parentModel?.setDescendantHasValue();
		}
		super.addLink(link);
	}

	addLinkedPort(port: PortModel): void {
		this.linkedPorts.push(port);
	}

	setPendingMappingType(mappingType: MappingType): void {
		this.pendingMappingType = mappingType;
	}

	setDescendantHasValue(): void {
		this.descendantHasValue = true;
		if (this.parentModel){
			this.parentModel.setDescendantHasValue();
		}
	}

	isDisabled(): boolean {
		return this.ancestorHasValue || this.descendantHasValue || this.isDisabledDueToCollectClause;
	}

	canLinkToPort(port: RecordFieldPortModel): boolean {
		let isLinkExists = false;
		if (port.portType === "IN") {
			isLinkExists = this.linkedPorts.some((linkedPort) => {
				return port.getID() === linkedPort.getID()
			})
		}
		return this.portType !== port.portType && !isLinkExists
				&& ((port instanceof IntermediatePortModel) || (!port.isDisabled()));
	}

	getValueType(lm: DataMapperLinkModel): ValueType {
		const editableRecordField = (lm.getTargetPort() as RecordFieldPortModel).editableRecordField;

		if (editableRecordField?.value) {
			let expr = editableRecordField.value;
			if (STKindChecker.isSpecificField(expr)) {
				expr = expr.valueExpr;
			}
			const innerExpr = getInnermostExpressionBody(expr);
			const value: string = innerExpr?.value || innerExpr?.source;
			if (value !== undefined) {
				return isDefaultValue(editableRecordField.type, value) ? ValueType.Default : ValueType.NonEmpty;
			}
		}

		return ValueType.Empty;
	}
}
