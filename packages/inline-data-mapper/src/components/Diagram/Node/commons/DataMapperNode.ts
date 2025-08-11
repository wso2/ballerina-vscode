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
import { IOType, Mapping, MappingElement, TypeKind } from '@wso2/ballerina-core';

import { IDataMapperContext } from '../../../../utils/DataMapperContext/DataMapperContext';
import { MappingMetadata } from '../../Mappings/MappingMetadata';
import { InputOutputPortModel } from "../../Port";
import { findMappingByOutput } from '../../utils/common-utils';

export interface DataMapperNodeModelGenerics {
	PORT: InputOutputPortModel;
}

interface InputPortAttributes {
	field: IOType;
	portType: "IN" | "OUT";
	parentId: string;
	unsafeParentId: string;
	portPrefix?: string;
	parent?: InputOutputPortModel;
	collapsedFields?: string[];
	expandedFields?: string[];
	hidden?: boolean;
	collapsed?: boolean;
	isOptional?: boolean;
	focusedFieldFQNs?: string[];
	isPreview?: boolean;
};

interface OutputPortAttributes {
	field: IOType;
	type: "IN" | "OUT";
	parentId: string;
	mappings: Mapping[];
	portPrefix?: string;
	parent?: InputOutputPortModel;
	collapsedFields?: string[];
	expandedFields?: string[];
	hidden?: boolean;
	elementIndex?: number;
	isPreview?: boolean;
};

interface HeaderPortAttributes {
	dmType: IOType;
	name: string;
	portType: "IN" | "OUT";
	portPrefix?: string;
	mappings?: Mapping[];
	collapsedFields?: string[];
	expandedFields?: string[];
	isPreview?: boolean;
	focusedFieldFQNs?: string[];
};

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

	// extend this class to add link init, port init logics
	abstract initPorts(): void;
	abstract initLinks(): void;

	protected addPortsForInputField(attributes: InputPortAttributes): number {
		const {
			field,
			portType,
			parentId,
			unsafeParentId,
			portPrefix,
			parent,
			collapsedFields,
			expandedFields,
			hidden,
			isOptional,
			focusedFieldFQNs
		} = attributes;

		const fieldName = field?.variableName;
		const isArray = this.isArrayTypedField(field);
		const fieldFQN = this.getInputFieldFQN(field?.isFocused ? "" : parentId, fieldName, isOptional);
		const unsafeFieldFQN = this.getUnsafeFieldFQN(field?.isFocused ? "" : unsafeParentId, fieldName);
		const portName = this.getPortName(portPrefix, unsafeFieldFQN);
		const isFocused = this.isFocusedField(focusedFieldFQNs, portName);
		const isPreview = parent.attributes.isPreview || this.isPreviewPort(focusedFieldFQNs, parent.attributes.field);
		const isCollapsed = this.isInputPortCollapsed(hidden, collapsedFields, expandedFields, portName, isArray, isFocused);

		const inputPort = new InputOutputPortModel({
			field: field,
			portName: portName,
			portType: portType,
			fieldFQN: fieldFQN,
			optionalOmittedFieldFQN: unsafeFieldFQN,
			parentModel: parent,
			collapsed: isCollapsed,
			hidden: hidden,
			isPreview: isPreview
		});
		this.addPort(inputPort);

		return this.createInputPortsForNestedFields({
			...attributes,
			parentId: fieldFQN,
			unsafeParentId: unsafeFieldFQN,
			parent: inputPort,
			hidden: hidden,
			collapsed: isCollapsed
		});
	}

	protected addPortsForOutputField(attributes: OutputPortAttributes) {
		const {
			field,
			type,
			parentId,
			mappings,
			portPrefix,
			parent,
			collapsedFields,
			expandedFields,
			hidden,
			elementIndex,
			isPreview
		} = attributes;

		const isArray = this.isArrayTypedField(field);
		const newParentId = this.getNewParentId(parentId, elementIndex);
		let fieldFQN = this.getOutputFieldFQN(newParentId, field, elementIndex);
		const portName = this.getPortName(portPrefix, fieldFQN);
		
		if(fieldFQN.endsWith('>')) fieldFQN = fieldFQN.split('.').slice(0, -1).join('.');
		const mapping = findMappingByOutput(mappings, fieldFQN);
		const isCollapsed = this.isOutputPortCollapsed(hidden, collapsedFields, expandedFields, 
			portName, type, isArray, false, mapping?.elements);

		const outputPort = new InputOutputPortModel({
			field: field,
			portName: portName,
			portType: type,
			value: mapping,
			index: elementIndex,
			fieldFQN: fieldFQN,
			optionalOmittedFieldFQN: fieldFQN,
			parentModel: parent,
			collapsed: isCollapsed,
			hidden: hidden,
			isPreview: isPreview
		});
		this.addPort(outputPort);

		this.processFieldKind({
			...attributes,
			parentId: fieldFQN,
			parent: outputPort,
			hidden: isCollapsed || hidden
		});
	}

	protected addPortsForHeader(attributes: HeaderPortAttributes): InputOutputPortModel {
		const {
			dmType,
			name,
			portType,
			portPrefix,
			mappings,
			collapsedFields,
			expandedFields,
			isPreview,
			focusedFieldFQNs
		} = attributes;

		let portName = name;

		if (portPrefix) {
			portName = name ? `${portPrefix}.${name}` : portPrefix;
		}
		const mapping = mappings && findMappingByOutput(mappings, name);
		const isFocused = this.isFocusedField(focusedFieldFQNs, portName);

		const headerPort = new InputOutputPortModel({
			field: dmType,
			portName: portName,
			portType: portType,
			value: mapping,
			fieldFQN: name,
			optionalOmittedFieldFQN: name,
			collapsed: this.isHeaderPortCollapsed(portName, portType, collapsedFields, expandedFields, isFocused),
			hidden: false,
			descendantHasValue: false,
			ancestorHasValue: false,
			isPreview: isPreview
		});

		this.addPort(headerPort);

		return headerPort;
	}

	private isArrayTypedField(field: IOType): boolean {
		return field?.kind === TypeKind.Array;
	}

	private isFocusedField(focusedFieldFQNs: string[], fieldFQN: string): boolean {
		return focusedFieldFQNs && focusedFieldFQNs.length > 0 && focusedFieldFQNs.some(fqn => fqn.startsWith(fieldFQN));
	}

	private getInputFieldFQN(parentId: string, fieldName: string, isOptional: boolean): string {
		return parentId
			? `${parentId}${fieldName && isOptional ? `?.${fieldName}` : `.${fieldName}`}`
			: fieldName || '';
	}

	private getUnsafeFieldFQN(unsafeParentId: string, fieldName: string): string {
		return unsafeParentId ? `${unsafeParentId}.${fieldName}` : fieldName || '';
	}

	private getNewParentId(parentId: string, elementIndex?: number): string {
		return elementIndex !== undefined ? `${parentId}.${elementIndex}` : parentId;
	}

	private getOutputFieldFQN(newParentId: string, field: IOType, elementIndex?: number): string {
		if (elementIndex !== undefined) {
			return newParentId;
		}
		const fieldName = field?.variableName || '';
		return newParentId !== '' ? fieldName !== '' ? `${newParentId}.${fieldName}` : newParentId : fieldName;
	}

	private getPortName(portPrefix: string | undefined, fieldFQN: string): string {
		return portPrefix ? `${portPrefix}.${fieldFQN}` : fieldFQN;
	}

	private isHeaderPortCollapsed(
		portName: string,
		portType: "IN" | "OUT",
		collapsedFields: string[],
		expandedFields: string[],
		isFocused: boolean
	): boolean {
		// In Inline Data Mapper, the inputs are always collapsed by default except focused view.
		// Hence we explicitly check expandedFields for input header ports. 
		if (portType === "IN" || isFocused) {
			return collapsedFields?.includes(portName);
		} else {
			return !expandedFields?.includes(portName);
		}
	}
	
	private isInputPortCollapsed(
		hidden: boolean,
		collapsedFields: string[],
		expandedFields: string[],
		portName: string,
		isArray: boolean,
		isFocused: boolean
	) {
		if (isArray){
			return isFocused ? false : expandedFields && !expandedFields.includes(portName);
		}
		return !hidden && collapsedFields && collapsedFields.includes(portName);
	}

	private isOutputPortCollapsed(
		hidden: boolean,
		collapsedFields: string[],
		expandedFields: string[],
		portName: string,
		portType: "IN" | "OUT",
		isArray: boolean,
		isFocused: boolean,
		mappingElements: MappingElement[]
	): boolean {
		if (isArray && !mappingElements?.length && !isFocused) {
			return expandedFields && !expandedFields.includes(portName);
		}
		return !hidden && collapsedFields && collapsedFields.includes(portName);
	}

	private isPreviewPort(focusedFieldFQNs: string[], parentField: IOType): boolean {
		return parentField.kind === TypeKind.Array && focusedFieldFQNs && !focusedFieldFQNs.includes(parentField.id) ;
	}

	private createInputPortsForNestedFields(attributes: InputPortAttributes): number {
		const isHidden = attributes.hidden || attributes.collapsed;
		let numberOfFields = 1;


		if (attributes.field?.kind === TypeKind.Record) {
			const fields = attributes.field?.fields?.filter(f => !!f);
			if (fields && fields.length) {
				fields.forEach(subField => {
					numberOfFields += this.addPortsForInputField({
						...attributes,
						hidden: isHidden,
						field: subField,
						isOptional: subField.optional || attributes.isOptional
					});
				});
			}
		} else if (attributes.field?.kind === TypeKind.Array) {

			const focusedMemberId = attributes.field?.focusedMemberId;
			if (focusedMemberId) {
				const focusedMemberField = this.context.model.inputs.find(input => input.id === focusedMemberId);
				if (focusedMemberField) {
					attributes.field.member = focusedMemberField;
				}
			}

			numberOfFields += this.addPortsForInputField({
				...attributes,
				hidden: isHidden,
				field: attributes.field?.member
			});
		}
		return attributes.hidden ? 0 : numberOfFields;
	}

	private processFieldKind(attributes: OutputPortAttributes) {
		if (attributes.field?.kind === TypeKind.Record) {
			this.processRecordField(attributes);
		} else if (attributes.field?.kind === TypeKind.Array) {
			this.processArrayField(attributes);
		}
	}

	private processRecordField(attributes: OutputPortAttributes) {
		const fields = attributes.field?.fields?.filter(f => !!f);
		if (fields && fields.length) {
			fields.forEach((subField) => {
				this.addPortsForOutputField({
					...attributes,
					field: subField,
					elementIndex: undefined
				});
			});
		}
	}

	private processArrayField(attributes: OutputPortAttributes) {
		const elements: MappingElement[] = findMappingByOutput(attributes.mappings, attributes.parentId)?.elements || [];
		if (elements.length > 0) {
			elements.forEach((element, index) => {
				this.addPortsForOutputField({
					...attributes,
					field: attributes.field?.member,
					mappings: element.mappings,
					elementIndex: index
				});
			});
		} else {
			this.addPortsForOutputField({
				...attributes,
				field: attributes.field?.member,
				isPreview: true
			});
		}
	}

	protected genMappings(val: Node, parentFields?: Node[]) {
		let foundMappings: MappingMetadata[] = [];
		const currentFields = [...(parentFields ? parentFields : [])];
		if (val) {
				foundMappings.push(this.getOtherMappings(val, currentFields));
				foundMappings.push(this.getOtherMappings(val, currentFields));
			// }
			foundMappings.push(this.getOtherMappings(val, currentFields));
			// }
		}
		return foundMappings;
	}

	protected getOtherMappings(node: Node, currentFields: Node[]) {
			return new MappingMetadata([...currentFields, node], undefined, undefined);
			return new MappingMetadata([...currentFields, node], undefined, undefined);
		// }
		return new MappingMetadata([...currentFields, node], undefined, undefined);
		// }
	}
}
