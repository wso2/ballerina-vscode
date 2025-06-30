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

import { InputOutputPortModel, MappingType, ValueType } from "../Port";
import { getDMTypeDim } from "./type-utils";
import { DataMapperLinkModel } from "../Link";
import { IOType, Mapping, TypeKind } from "@wso2/ballerina-core";
import { useDMCollapsedFieldsStore, useDMExpandedFieldsStore } from "../../../store/store";
import { DataMapperNodeModel } from "../Node/commons/DataMapperNode";
import { ErrorNodeKind } from "../../../components/DataMapper/Error/RenderingError";
import { ARRAY_OUTPUT_NODE_TYPE, INPUT_NODE_TYPE, OBJECT_OUTPUT_NODE_TYPE } from "../Node";

export function findMappingByOutput(mappings: Mapping[], outputId: string): Mapping {
    return mappings.find(mapping => (mapping.output === outputId || mapping.output.replaceAll("\"", "") === outputId));
}

export function getMappingType(sourcePort: PortModel, targetPort: PortModel): MappingType {

    if (sourcePort instanceof InputOutputPortModel
        && targetPort instanceof InputOutputPortModel
        && targetPort.field && sourcePort.field) {
            
        const sourceDim = getDMTypeDim(sourcePort.field);
        const targetDim = getDMTypeDim(targetPort.field);

        if (sourceDim > 0) {
            const dimDelta = sourceDim - targetDim;
            if (dimDelta == 0) return MappingType.ArrayToArray;
            if (dimDelta > 0) return MappingType.ArrayToSingleton;
        }
    }

    return MappingType.Default;
}

export function genArrayElementAccessSuffix(sourcePort: PortModel, targetPort: PortModel) {
    if (sourcePort instanceof InputOutputPortModel && targetPort instanceof InputOutputPortModel) {
        let suffix = '';
        const sourceDim = getDMTypeDim(sourcePort.field);
        const targetDim = getDMTypeDim(targetPort.field);
        const dimDelta = sourceDim - targetDim;
        for (let i = 0; i < dimDelta; i++) {
            suffix += '[0]';
        }
        return suffix;
    }
    return '';
};

export function getValueType(lm: DataMapperLinkModel): ValueType {
    const { field, value } = lm.getTargetPort() as InputOutputPortModel;

    if (value !== undefined) {
        return isDefaultValue(field, value.expression) ? ValueType.Default : ValueType.NonEmpty;
    }

    return ValueType.Empty;
}

export function isDefaultValue(field: IOType, value: string): boolean {
	const defaultValue = getDefaultValue(field.kind);
    const targetValue =  value?.trim().replace(/(\r\n|\n|\r|\s)/g, "")
	return targetValue === "null" ||  defaultValue === targetValue;
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

export function isCollapsed(portName: string, portType: "IN" | "OUT"): boolean {
    const collapsedFields = useDMCollapsedFieldsStore.getState().fields;
    const expandedFields = useDMExpandedFieldsStore.getState().fields;

    // In Inline Data Mapper, the inputs are always collapsed by default.
    // Hence we explicitly check expandedFields for input header ports.
    return portType === "IN" ? collapsedFields.includes(portName) : !expandedFields.includes(portName);
}

export function fieldFQNFromPortName(portName: string): string {
    return portName.split('.').slice(1).join('.');
}

export function getErrorKind(node: DataMapperNodeModel): ErrorNodeKind {
	const nodeType = node.getType();
	switch (nodeType) {
		case OBJECT_OUTPUT_NODE_TYPE:
		case ARRAY_OUTPUT_NODE_TYPE:
			return ErrorNodeKind.Output;
		case INPUT_NODE_TYPE:
			return ErrorNodeKind.Input;
		default:
			return ErrorNodeKind.Other;
	}
}
