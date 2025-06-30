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
import { findMappingByOutput, isCollapsed } from '../../utils/common-utils';

export interface DataMapperNodeModelGenerics {
	PORT: InputOutputPortModel;
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

	// extend this class to add link init, port init logics
	abstract initPorts(): void;
	abstract initLinks(): void;

	protected addPortsForInputField(
		field: IOType,
		portType: "IN" | "OUT",
		parentId: string,
		unsafeParentId: string,
		portPrefix?: string,
		parent?: InputOutputPortModel,
		collapsedFields?: string[],
		hidden?: boolean,
		isOptional?: boolean
	): number {

		const fieldName = field.variableName;

		const fieldFQN = parentId
			? `${parentId}${fieldName && isOptional
				? `?.${fieldName}`
				: `.${fieldName}`}`
			: fieldName && fieldName;
		const unsafeFieldFQN = unsafeParentId
			? `${unsafeParentId}.${fieldName}`
			: fieldName || '';

		const portName = portPrefix ? `${portPrefix}.${unsafeFieldFQN}` : unsafeFieldFQN;
		const isCollapsed = !hidden && collapsedFields && collapsedFields.includes(portName);
		const fieldPort = new InputOutputPortModel(
			field, portName, portType, undefined, undefined, fieldFQN, unsafeFieldFQN, parent, isCollapsed, hidden
		);

		this.addPort(fieldPort);

		let numberOfFields = 1;
		if (field.kind === TypeKind.Record) {
			const fields = field?.fields;

			if (fields && !!fields.length) {
				fields.forEach(subField => {
					numberOfFields += this.addPortsForInputField(
						subField, portType, fieldFQN, unsafeFieldFQN, portPrefix, fieldPort,
						collapsedFields, isCollapsed ? true : hidden, subField.optional || isOptional
					);
				});
			}
		}
		return hidden ? 0 : numberOfFields;
	}

	protected addPortsForOutputField(
		field: IOType,
		type: "IN" | "OUT",
		parentId: string,
		mappings: Mapping[],
		portPrefix?: string,
		parent?: InputOutputPortModel,
		collapsedFields?: string[],
		hidden?: boolean,
		elementIndex?: number
	) {
		const fieldName = field?.variableName || '';
		if (elementIndex !== undefined) {
			parentId = `${parentId}.${elementIndex}`
		}
		const fieldFQN = parentId !== '' ? fieldName !== '' ? `${parentId}.${fieldName}` : parentId : fieldName;
		const portName = portPrefix ? `${portPrefix}.${fieldFQN}` : fieldFQN;
		const isCollapsed = !hidden && collapsedFields && collapsedFields.includes(portName);
		const mapping = findMappingByOutput(mappings, fieldFQN);

		const fieldPort = new InputOutputPortModel(
			field, portName, type, mapping, elementIndex, field.variableName, field.variableName,
			parent, isCollapsed, hidden, false, false
		);
		this.addPort(fieldPort);

		if (field.kind === TypeKind.Record) {
			const fields = field?.fields.filter(f => f !== null);
			if (fields && !!fields.length) {
				fields.forEach((subField) => {
					this.addPortsForOutputField(
						subField, type, fieldFQN, mappings, portPrefix, fieldPort, collapsedFields, isCollapsed || hidden
					);
				});
			}
		} else if (field.kind === TypeKind.Array) {
			const elements: MappingElement[] = mapping?.elements || [];

			elements.forEach((element, index) => {
				this.addPortsForOutputField(
					field.member, type, fieldFQN, element.mappings, portPrefix, fieldPort, collapsedFields, isCollapsed || hidden, index
				);
			});
		}
	}

	protected addPortsForHeader(
		dmType: IOType,
		name: string,
		portType: "IN" | "OUT",
		portPrefix: string,
		mappings?: Mapping[],
		isWithinMapFunction?: boolean,
	): InputOutputPortModel {

		let portName = name;

		if (portPrefix) {
			portName = name ? `${portPrefix}.${name}` : portPrefix;
		}
		const mapping = mappings && findMappingByOutput(mappings, name);

		const headerPort = new InputOutputPortModel(
			dmType, portName, portType, mapping, undefined, name, name, undefined,
			isCollapsed(portName, portType), false, false, false, isWithinMapFunction
		);

		this.addPort(headerPort)

		return headerPort;
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
