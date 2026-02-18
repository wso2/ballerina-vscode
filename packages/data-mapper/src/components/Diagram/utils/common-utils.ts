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
import { PortModel } from "@projectstorm/react-diagrams-core";

import { InputOutputPortModel, ValueType } from "../Port";
import { getDMTypeDim, getGenericTypeKind, getTypeName, isNumericType, isPrimitive } from "./type-utils";
import { DataMapperLinkModel, MappingType } from "../Link";

import { IOType, Mapping, TypeKind } from "@wso2/ballerina-core";
import { DataMapperNodeModel } from "../Node/commons/DataMapperNode";
import { ErrorNodeKind } from "../../DataMapper/Error/RenderingError";
import {
    ARRAY_OUTPUT_NODE_TYPE,
    EmptyInputsNode,
    INPUT_NODE_TYPE,
    InputNode,
    OBJECT_OUTPUT_NODE_TYPE,
    PRIMITIVE_OUTPUT_NODE_TYPE,
    QueryOutputNode
} from "../Node";
import { IDataMapperContext } from "../../../utils/DataMapperContext/DataMapperContext";
import { View } from "../../DataMapper/Views/DataMapperView";
import { useDMExpandedFieldsStore } from "../../../store/store";

const MERGEABLE_TYPES = new Set([
	TypeKind.String,
	TypeKind.Int,
	TypeKind.Float,
	TypeKind.Decimal,
	"anydata",
	"any"
]);

export function findMappingByOutput(mappings: Mapping[], outputId: string): Mapping {
    return mappings.find(mapping => (mapping.output === outputId || mapping.output.replaceAll("\"", "") === outputId));
}

export function hasChildMappingsForOutput(mappings: Mapping[], outputId: string): boolean {
    return mappings.some(mapping => 
        mapping.output.startsWith(outputId + ".")
    );
}

export function hasChildMappingsForInput(mappings: Mapping[], inputId: string): boolean {
    return mappings.some(mapping => {
        if (mapping.inputs.some(input => input.startsWith(inputId + "."))) return true;
        return mapping.elements?.some(element => hasChildMappingsForInput(element.mappings, inputId));
    }
    );
}

export function isPendingMappingRequired(mappingType: MappingType): boolean {
    return mappingType !== MappingType.Default && mappingType !== MappingType.SeqToArray;
}

export function getMappingType(sourcePort: PortModel, targetPort: PortModel): MappingType {

    if (sourcePort instanceof InputOutputPortModel &&
        targetPort instanceof InputOutputPortModel &&
        targetPort.attributes.field &&
        sourcePort.attributes.field
    ) {

        const targetNode = targetPort.getNode();
        if (targetNode instanceof QueryOutputNode && targetNode.outputType.kind !== TypeKind.Array) {
            return MappingType.ArrayToSingletonAggregate;
        }

        const sourceNode = sourcePort.getNode();

        let sourceField = sourcePort.attributes.field;
        if (sourceNode instanceof InputNode
            && sourceNode.filteredInputType?.kind === TypeKind.Enum
        ) {
            sourceField = sourceNode.filteredInputType;
        }

        const targetField = targetPort.attributes.field;

        if (sourceField.kind === TypeKind.Union || targetField.kind === TypeKind.Union) {
            return MappingType.ContainsUnions;
        }

        if (sourceField.isSeq) {
            if (isPrimitive(targetField.kind)){
                return MappingType.SeqToPrimitive;
            }
            if (targetField.kind === TypeKind.Array) {
                return MappingType.SeqToArray;
            }
        }
            
        const sourceDim = getDMTypeDim(sourceField);
        const targetDim = getDMTypeDim(targetField);

        if (sourceDim > 0) {
            const dimDelta = sourceDim - targetDim;
            if (dimDelta == 0) {
                if(isQueryHeaderPort(targetPort)) {
                    return MappingType.ArrayConnect;
                }
                return MappingType.ArrayToArray;
            }
            if (dimDelta > 0) {
                return MappingType.ArrayToSingleton;
            }
        }

        if (targetField.kind !== sourceField.kind &&
            (targetField.kind !== TypeKind.Byte || sourceField.kind !== TypeKind.String) &&
            targetField.kind === getGenericTypeKind(targetField.kind) &&
            sourceField.kind === getGenericTypeKind(sourceField.kind) &&
            isPrimitive(targetField.kind) &&
            isPrimitive(sourceField.kind)) {
            return MappingType.ConvertiblePrimitives;
        }

        if ((sourceField.kind !== targetField.kind ||
            sourceField.typeName !== targetField.typeName ||
            sourceField.typeName === TypeKind.Record) &&
            !(isPrimitive(sourceField.kind) && isPrimitive(targetField.kind))
        ) {
            return MappingType.Incompatible;
        }

    }

    return MappingType.Default;
}

export function getValueType(lm: DataMapperLinkModel): ValueType {
	const { attributes: { field, value } } = lm.getTargetPort() as InputOutputPortModel;

	if (value !== undefined) {
        const isDefault = isDefaultValue(field, value.expression);
        if (isDefault) {
            return ValueType.Replaceable;
        } else {
            return isMergeable(field.kind)
                ? ValueType.Mergeable
                : ValueType.Replaceable;
        }
	}

	return ValueType.Empty;
}

export function isMergeable(typeName: string): boolean {
	return MERGEABLE_TYPES.has(typeName);
}


export function genArrayElementAccessSuffix(link: DataMapperLinkModel): string {
    const sourcePort = link.getSourcePort() as InputOutputPortModel;
    const targetPort = link.getTargetPort() as InputOutputPortModel;
    
    const sourceDim = getDMTypeDim(sourcePort.attributes.field);
    const targetDim = getDMTypeDim(targetPort.attributes.field);
    
    return '[0]'.repeat(sourceDim - targetDim);
};

export function isDefaultValue(field: IOType, value: string): boolean {
    // For numeric types, compare the parsed values instead of string comparison
	if (field?.kind === TypeKind.Int || 
		field?.kind === TypeKind.Float || 
		field?.kind === TypeKind.Decimal
    ) {

		// Clean the value by removing suffixes like 'f' for floats and 'd' for decimals
		const cleanValue = value?.trim().replace(/[fd]$/i, '');
		const numericValue = parseFloat(cleanValue);
		
		// Check if it's a valid number and equals 0
		return !isNaN(numericValue) && numericValue === 0;
	}

	const defaultValue = getDefaultValue(field?.kind);
    const targetValue =  value?.trim().replace(/(\r\n|\n|\r|\s)/g, "")
	return targetValue === "null" || targetValue === "()" ||  defaultValue === targetValue;
}

export function getDefaultValue(typeKind: TypeKind): string {
	let draftParameter = "";
	switch (typeKind) {
		case TypeKind.String:
			draftParameter = `""`;
			break;
		case TypeKind.Int:
			draftParameter = `0`;
			break;
        case TypeKind.Float:
            draftParameter = `0.0`;
            break;
        case TypeKind.Decimal:
            draftParameter = `0.0d`;
            break;
		case TypeKind.Boolean:
			draftParameter = `true`;
			break;
		case TypeKind.Array:
			draftParameter = `[]`;
			break;
		default:
			draftParameter = `{}`;
			break;
	}
	return draftParameter;
}

export function fieldFQNFromPortName(portName: string): string {
    return portName.split('.').slice(1).join('.');
}

export function getErrorKind(node: DataMapperNodeModel): ErrorNodeKind {
	const nodeType = node.getType();
	switch (nodeType) {
		case OBJECT_OUTPUT_NODE_TYPE:
		case ARRAY_OUTPUT_NODE_TYPE:
        case PRIMITIVE_OUTPUT_NODE_TYPE:
			return ErrorNodeKind.Output;
		case INPUT_NODE_TYPE:
			return ErrorNodeKind.Input;
		default:
			return ErrorNodeKind.Other;
	}
}

export function expandArrayFn(context: IDataMapperContext, inputIds: string[], outputId: string, viewId: string): void {

    const { addView, views } = context;
    
    if (!views || views.length === 0) {
        throw new Error('Views array is required and cannot be empty');
    }

    const lastView = views[views.length - 1];

    const outputIdDotIndex = outputId.indexOf(".");
    let label: string;
    let targetField: string;
    if (outputIdDotIndex !== -1) {
        label = outputId.slice(outputIdDotIndex + 1);
        targetField = viewId + "." + label;
    } else {
        label = "[]";
        targetField = viewId + ".0";
    }

    // Create base view properties
    const baseView: View = {
        label: label,
        sourceFields: inputIds,
        targetField: targetField
    };

    // Create the new view with or without sub-mapping info
    const newView: View = lastView.subMappingInfo 
        ? {
            ...baseView,
            subMappingInfo: {
                ...lastView.subMappingInfo,
                focusedOnSubMappingRoot: false
            }
        }
        : baseView;

    addView(newView);
}

export function genVariableName(originalName: string, existingNames: string[]): string {
	let modifiedName: string = originalName;
	let index = 0;
	while (existingNames.includes(modifiedName)) {
		index++;
		modifiedName = originalName + index;
	}
	return modifiedName;
}

export function getSubMappingViewLabel(subMappingName: string, subMappingType: IOType): string {
    let label = subMappingName;
    if (subMappingType.kind === TypeKind.Array) {
        const typeName = getTypeName(subMappingType);
        const bracketsCount = (typeName.match(/\[\]/g) || []).length; // Count the number of pairs of brackets
        label = label + `${"[]".repeat(bracketsCount)}`;
    }

    return label;
}

export function excludeEmptyInputNodes(nodes: DataMapperNodeModel[]): DataMapperNodeModel[] {
    const filtered = nodes.filter(node =>
        !(node instanceof InputNode) ||
        node instanceof InputNode && node.getSearchFilteredType() !== undefined
    );
    const hasInputNode = filtered.some(node => node instanceof InputNode || node instanceof EmptyInputsNode);
    if (!hasInputNode) {
        const inputNode = new InputNode(undefined, undefined, true);
        filtered.unshift(inputNode);
    }
    return filtered;
}

export function handleExpand(id: string, expanded: boolean) {
	const expandedFields = useDMExpandedFieldsStore.getState().fields;
	if (expanded) {
		useDMExpandedFieldsStore.getState().setFields(expandedFields.filter((element) => element !== id));
	} else {
		useDMExpandedFieldsStore.getState().setFields([...expandedFields, id]);
	}
}

export function isExpandable(field: IOType): boolean {
    return field?.kind === TypeKind.Record ||
        field?.kind === TypeKind.Array ||
        field?.kind === TypeKind.Enum;
}

export function getTargetField(viewId: string, outputId: string){
    const outputIdParts = outputId.split(".").slice(1);
    // Added to support multi dimensional arrays
    if (outputIdParts.length === 0) {
        outputIdParts.push("0");
    }
    return [...viewId.split("."), ...outputIdParts].join(".");
}


export function isWithinSubMappingRootView(views: View[]): boolean {
    return views.length > 1 && views[views.length - 1].subMappingInfo?.focusedOnSubMappingRoot;
}

export function isQueryHeaderPort(port: InputOutputPortModel): boolean {
    // This function intentionally placed here instead of port-utils.ts to avoid cyclic dependency issues
    return port.attributes.portName.endsWith(".#");
}

export function isGroupHeaderPort(port: InputOutputPortModel): boolean {
    // This function intentionally placed here instead of port-utils.ts to avoid cyclic dependency issues
    return port.attributes.portName.endsWith("$");
}

