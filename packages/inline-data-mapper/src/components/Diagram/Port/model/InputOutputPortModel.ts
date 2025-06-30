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

import { DataMapperLinkModel } from "../../Link";
import { IntermediatePortModel } from "../IntermediatePort";
import { createNewMapping, updateExistingMapping } from "../../utils/modification-utils";
import { getMappingType } from "../../utils/common-utils";
import { getValueType } from "../../utils/common-utils";

export interface InputOutputPortModelGenerics {
	PORT: InputOutputPortModel;
}

export const INPUT_OUTPUT_PORT = "input-output-port";

export enum ValueType {
	Default,
	Empty,
	NonEmpty
}

export enum MappingType {
	ArrayToArray = "array-array",
	ArrayToSingleton = "array-singleton",
	Default = undefined // This is for non-array mappings currently
}

export class InputOutputPortModel extends PortModel<PortModelGenerics & InputOutputPortModelGenerics> {

	public linkedPorts: PortModel[];

	constructor(
		public field: IOType,
		public portName: string,
		public portType: "IN" | "OUT",
		public value?: Mapping,
		public index?: number,
		public fieldFQN?: string, // Field FQN with optional included, ie. person?.name?.firstName
		public optionalOmittedFieldFQN?: string, // Field FQN without optional, ie. person.name.firstName
		public parentModel?: InputOutputPortModel,
		public collapsed?: boolean,
		public hidden?: boolean,
		public descendantHasValue?: boolean,
		public ancestorHasValue?: boolean,
		public isWithinMapFunction?: boolean,
	) {
		super({
			type: INPUT_OUTPUT_PORT,
			name: `${portName}.${portType}`
		});
		this.linkedPorts = [];
	}
	
	createLinkModel(): LinkModel {
		const lm = new DataMapperLinkModel();
		lm.registerListener({
			targetPortChanged: (async () => {
				const sourcePort = lm.getSourcePort();
				const targetPort = lm.getTargetPort();
				
				const mappingType = getMappingType(sourcePort, targetPort);
				if (mappingType === MappingType.ArrayToArray) {
					// Source update behavior is determined by the user when connecting arrays.
					return;
				}

                const targetPortHasLinks = Object.values(targetPort.links)
                    ?.some(link => link instanceof DataMapperLinkModel && link.isActualLink);
                const valueType = getValueType(lm);

				if (targetPortHasLinks || valueType === ValueType.NonEmpty) {
					await updateExistingMapping(lm);
				} else {
					await createNewMapping(lm);
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

	addLinkedPort(port: PortModel): void{
		this.linkedPorts.push(port);
	}

	setDescendantHasValue(): void {
		this.descendantHasValue = true;
		if (this.parentModel){
			this.parentModel.setDescendantHasValue();
		}
	}

	isDisabled(): boolean {
		return this.ancestorHasValue || this.descendantHasValue
	}

	canLinkToPort(port: InputOutputPortModel): boolean {
		let isLinkExists = false;
		if (port.portType === "IN") {
			isLinkExists = this.linkedPorts.some((linkedPort) => {
				return port.getID() === linkedPort.getID()
			})
		}
		return this.portType !== port.portType && !isLinkExists
				&& ((port instanceof IntermediatePortModel) || (!port.isDisabled()));
	}
}
