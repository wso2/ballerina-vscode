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
import { IOType, Mapping } from "@wso2/ballerina-core";

import { DataMapperLinkModel, MappingType } from "../../Link";
import { IntermediatePortModel } from "../IntermediatePort";
import { createNewMapping, mapSeqToX, mapWithClause } from "../../utils/modification-utils";
import { getMappingType, isPendingMappingRequired } from "../../utils/common-utils";
import { DataMapperNodeModel } from "../../Node/commons/DataMapperNode";

export interface InputOutputPortModelGenerics {
	PORT: InputOutputPortModel;
}

export const INPUT_OUTPUT_PORT = "input-output-port";

export enum ValueType {
	Empty,
	Mergeable,
	Replaceable,
}

export interface PortAttributes {
	field: IOType;
	portName: string;
	portType: "IN" | "OUT";
	value?: Mapping;
	index?: number;
	fieldFQN?: string; // Field FQN with optional included, ie. person?.name?.firstName
	optionalOmittedFieldFQN?: string; // Field FQN without optional, ie. person.name.firstName
	parentModel?: InputOutputPortModel;
	collapsed?: boolean;
	hidden?: boolean;
	descendantHasValue?: boolean;
	ancestorHasValue?: boolean;
	isPreview?: boolean;
};

export class InputOutputPortModel extends PortModel<PortModelGenerics & InputOutputPortModelGenerics> {

	public linkedPorts: PortModel[];
	public attributes: PortAttributes;

	constructor(public portAttributes: PortAttributes) {
		super({
			type: INPUT_OUTPUT_PORT,
			name: `${portAttributes.portName}.${portAttributes.portType}`
		});
		this.attributes = portAttributes;
		this.linkedPorts = [];
	}
	
	createLinkModel(): LinkModel {
		const lm = new DataMapperLinkModel();
		lm.registerListener({
			targetPortChanged: (async () => {
				const sourcePort = lm.getSourcePort();
				const targetPort = lm.getTargetPort();
				
				const mappingType = getMappingType(sourcePort, targetPort);
				if (isPendingMappingRequired(mappingType)) {
					// Source update behavior is determined by the user when connecting arrays.
					return;
				}
				if (mappingType === MappingType.SeqToArray) {
					const targetNode = targetPort.getNode() as DataMapperNodeModel;
					await mapSeqToX(lm, targetNode.context, (expr: string) => `[${expr}]`);
					return;
				}

				await createNewMapping(lm);
			})
		});

		return lm;
	}

	addLink(link: LinkModel<LinkModelGenerics>): void {
		if (this.attributes.portType === 'IN' && (link as DataMapperLinkModel).pendingMappingType){
			this.attributes.parentModel?.setDescendantHasValue();
		}
		super.addLink(link);
	}

	addLinkedPort(port: PortModel): void{
		this.linkedPorts.push(port);
	}

	setDescendantHasValue(): void {
		this.attributes.descendantHasValue = true;
		if (this.attributes.parentModel){
			this.attributes.parentModel.setDescendantHasValue();
		}
	}

	isDisabled(): boolean {
		return (this.attributes.ancestorHasValue || this.attributes.descendantHasValue) && !this.attributes.isPreview
	}

	canLinkToPort(port: InputOutputPortModel): boolean {
		let isLinkExists = false;
		if (port.attributes.portType === "IN") {
			isLinkExists = this.linkedPorts.some((linkedPort) => {
				return port.getID() === linkedPort.getID()
			})
		}
		return this.attributes.portType !== port.attributes.portType && !isLinkExists
				&& ((port instanceof IntermediatePortModel) || (!port.isDisabled()));
	}
}
