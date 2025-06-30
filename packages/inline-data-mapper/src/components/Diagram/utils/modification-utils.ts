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
import { IDMModel, Mapping } from "@wso2/ballerina-core";
import { DataMapperLinkModel } from "../Link";
import { DataMapperNodeModel } from "../Node/commons/DataMapperNode";
import { InputOutputPortModel } from "../Port";
import { IDataMapperContext } from "src/utils/DataMapperContext/DataMapperContext";
import { MappingFindingVisitor } from "../../../visitors/MappingFindingVisitor";
import { traverseNode } from "../../../utils/model-utils";
import { MappingDeletionVisitor } from "../../../visitors/MappingDeletionVisitor";

export async function createNewMapping(link: DataMapperLinkModel) {
	const targetPort = link.getTargetPort();
	if (!targetPort) {
		return;
	}

	const outputPortModel = targetPort as InputOutputPortModel;
	const targetNode = outputPortModel.getNode() as DataMapperNodeModel;
	const { mappings } = targetNode.context.model;
	const input = (link.getSourcePort() as InputOutputPortModel).optionalOmittedFieldFQN;
	const outputPortParts = outputPortModel.portName.split('.');
	const isWithinArray = outputPortParts.some(part => !isNaN(Number(part)));
	const model = targetNode.context.model;

	if (isWithinArray) {
		createNewMappingWithinArray(outputPortParts.slice(1), input, model);
		const updatedMappings = mappings;
		return await targetNode.context.applyModifications(updatedMappings);
	} else {
		const mappingFindingVisitor = new MappingFindingVisitor(outputPortParts.slice(1).join('.'));
        traverseNode(model, mappingFindingVisitor);
        const targetMapping = mappingFindingVisitor.getTargetMapping();

		if (targetMapping) {
			// Update the existing mapping with the new input
			targetMapping.expression = input;
			targetMapping.inputs.push(input);
		} else {
			const newMapping = {
				output: outputPortParts.slice(1).join('.'),
				inputs: [input],
				expression: input
			};
		
			mappings.push(newMapping);
		}
	}

	return await targetNode.context.applyModifications(mappings);
}

export async function updateExistingMapping(link: DataMapperLinkModel) {
	const targetPort = link.getTargetPort();
	if (!targetPort) {
		return;
	}

	const outputPortModel = targetPort as InputOutputPortModel;
	const targetNode = outputPortModel.getNode() as DataMapperNodeModel;
	const { model } = targetNode.context;
	const input = (link.getSourcePort() as InputOutputPortModel).optionalOmittedFieldFQN;
	const outputPortParts = outputPortModel.portName.split('.');
	const targetId = outputPortParts.slice(1).join('.');

	const mappingFindingVisitor = new MappingFindingVisitor(targetId);
	traverseNode(model, mappingFindingVisitor);
	const targetMapping = mappingFindingVisitor.getTargetMapping();

	if (targetMapping) {
		targetMapping.inputs.push(input);
		targetMapping.expression = `${targetMapping.expression} + ${input}`;
	}

	return await targetNode.context.applyModifications(model.mappings);
}

export async function addValue(fieldId: string, value: string, context: IDataMapperContext) {
	const { mappings } = context.model;
	const isWithinArray = fieldId.split('.').some(part => !isNaN(Number(part)));

	if (isWithinArray) {
		createNewMappingWithinArray(fieldId.split('.'), value, context.model);
		const updatedMappings = mappings;
		return await context.applyModifications(updatedMappings);
	} else {
		const newMapping: Mapping = {
			output: fieldId,
			inputs: [],
			expression: value
		};
	
		mappings.push(newMapping);
	}

	return await context.applyModifications(mappings);
}

export async function removeMapping(fieldId: string, context: IDataMapperContext) {
	const deletionVisitor = new MappingDeletionVisitor(fieldId);
	traverseNode(context.model, deletionVisitor);
	const remainingMappings = deletionVisitor.getRemainingMappings();

	return await context.applyModifications(remainingMappings);
}

export function buildInputAccessExpr(fieldFqn: string): string {
    // Regular expression to match either quoted strings or non-quoted strings with dots
    const regex = /"([^"]+)"|'([^"]+)'|([^".]+)/g;

    const result = fieldFqn.replace(regex, (match, doubleQuoted, singleQuoted, unquoted) => {
        if (doubleQuoted) { 
            return `["${doubleQuoted}"]`; // If the part is enclosed in double quotes, wrap it in square brackets
        } else if (singleQuoted) {
			return `['${singleQuoted}']`; // If the part is enclosed in single quotes, wrap it in square brackets
		} else {
            return unquoted; // Otherwise, leave the part unchanged
        }
    });

	return result.replace(/(?<!\?)\.\[/g, '['); // Replace occurrences of '.[' with '[' to handle consecutive bracketing
}

function createNewMappingWithinArray(outputPortParts: string[], input: string, model: IDMModel) {
	for(let i = outputPortParts.length; i >= 1; i--) {
		const targetId = outputPortParts.slice(0, i).join('.');

		const mappingFindingVisitor = new MappingFindingVisitor(targetId);
        traverseNode(model, mappingFindingVisitor);
        const targetMapping = mappingFindingVisitor.getTargetMapping();

		if (targetMapping) {
			const arrayIndex = Number(outputPortParts[i]);
			const arrayElement = targetMapping.elements.length > 0 ? targetMapping.elements[arrayIndex] : undefined;

			if (arrayElement) {
				arrayElement.mappings.push({
					output: outputPortParts.join('.'),
					inputs: [input],
					expression: input,
					elements: []
				});
			} else if (isNaN(arrayIndex)) {
				// When mapped directly to an array element
				targetMapping.expression = input;
				targetMapping.inputs.push(input);
			} else {
				const newMapping: Mapping = {
					output: targetId,
					inputs: [input],
					expression: input,
					elements: []
				};
				targetMapping.elements.push({
					mappings: [newMapping]
				});
			}
			break;
		}
	}
}
