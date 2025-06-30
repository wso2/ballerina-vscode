import { PrimitiveBalType, TypeField } from "@wso2/ballerina-core";

import { MappingType, RecordFieldPortModel } from "../Port";
import {
    findTypeByInfoFromStore,
    genVariableName,
    getBalRecFieldName,
    getDefaultValue,
    getLinebreak,
    getTypeName,
    normalizeTypeName,
    toFirstLetterLowerCase,
    toFirstLetterUpperCase
} from "../utils/dm-utils";
import { getSupportedUnionTypes } from "../utils/union-type-utils";

import { LinkModel, PortModel } from "@projectstorm/react-diagrams-core";

export enum ClauseType {
    Select = "select",
    Collect = "collect"
}

interface FunctionNameComponents {
    sourceName: string;
    targetName: string;
}

export function generateQueryExpression(
    srcExpr: string,
    targetType: TypeField,
    isOptionalSource: boolean,
    clauseType: ClauseType,
    variableNames: string[]
) {

    let itemName = `${srcExpr.split('.').pop().trim()}Item`;
    itemName = genVariableName(itemName, variableNames);
    let selectExpr = '';

    if (!targetType?.typeName && targetType?.typeInfo) {
        targetType = findTypeByInfoFromStore(targetType.typeInfo) || targetType;
    }
    if (targetType.typeName === PrimitiveBalType.Record) {
        const srcFields = targetType.fields;
        selectExpr = `{
            ${targetType.fields.filter(field => !field.defaultable && !field.optional).map((field, index) =>
                `${getBalRecFieldName(field.name)}: ${(index !== srcFields.length - 1) ? `,${getLinebreak()}\t\t\t` : ''}`
            ).join("")}
        }`
    } else if (targetType.typeName === PrimitiveBalType.Union) {
        const firstTypeName = getSupportedUnionTypes(targetType)[0];
        const firstType = targetType?.members && targetType.members.find(member => {
            return getTypeName(member) === firstTypeName;
        });
        selectExpr = firstType && firstType?.typeName ? getDefaultValue(firstType.typeName) : "\"\"";
    } else {
        selectExpr = getDefaultValue(targetType?.typeName);
    }

    return `from var ${itemName} in ${srcExpr.trim()}${isOptionalSource ? ' ?: []' : ''} ${clauseType} ${selectExpr}`
}

export function generateCustomFunction(
    sourcePort: RecordFieldPortModel,
    targetPort: RecordFieldPortModel,
    existingFunctions: string[]
): [string, string] {
    const nameComponents = generateFunctionNameComponents(sourcePort, targetPort);
    const baseFunctionName = createBaseFunctionName(nameComponents);
    const functionName = getUniqueFunctionName(baseFunctionName, existingFunctions);
    
    let sourceType = getTypeName(sourcePort.field);
    let targetType = getTypeName(targetPort.field);
    let paramName = toFirstLetterLowerCase(nameComponents.sourceName);

    sourceType = formatRecordType(sourceType);
    targetType = formatRecordType(targetType);
    paramName = paramName === PrimitiveBalType.Record ? 'rec' : paramName;

    const functionSignature = `function ${functionName}(${sourceType} ${paramName}) returns ${targetType} {

    }`;

    return [functionName, functionSignature];
}

function generateFunctionNameComponents(
    sourcePort: RecordFieldPortModel,
    targetPort: RecordFieldPortModel
): FunctionNameComponents {
    const sourceType = getTypeName(sourcePort.field);
    const targetType = getTypeName(targetPort.field);
    
    return {
        sourceName: normalizeTypeName(sourceType),
        targetName: normalizeTypeName(targetType)
    };
}

function createBaseFunctionName({ sourceName, targetName }: FunctionNameComponents): string {
    return `map${toFirstLetterUpperCase(sourceName)}To${toFirstLetterUpperCase(targetName)}`;
}

function getUniqueFunctionName(baseName: string, existingFunctions: string[]): string {
    if (!existingFunctions.includes(baseName)) {
        return baseName;
    }

    let index = 1;
    let functionName = baseName;
    
    while (existingFunctions.includes(functionName)) {
        functionName = `${baseName}${index}`;
        index++;
    }
    
    return functionName;
}

function formatRecordType(type: string): string {
    return type === PrimitiveBalType.Record ? `${type}{}` : type;
}

export function removePendingMappingTempLinkIfExists(link: LinkModel) {
	const sourcePort = link.getSourcePort();
	const targetPort = link.getTargetPort();

	const pendingMappingType = sourcePort instanceof RecordFieldPortModel
		&& targetPort instanceof RecordFieldPortModel
		&& sourcePort.pendingMappingType
		&& targetPort.pendingMappingType;

	if (pendingMappingType) {
		sourcePort?.fireEvent({}, "link-removed");
		targetPort?.fireEvent({}, "link-removed");
		sourcePort.setPendingMappingType(MappingType.Default);
		targetPort.setPendingMappingType(MappingType.Default);
		link.remove();
	}
}

export function userActionRequiredMapping(mappingType: MappingType, targetPort: PortModel): boolean {
    if (targetPort instanceof RecordFieldPortModel && !targetPort?.parentModel) {
        // No user action required provided for root target ports.
        return false;
    }
    return mappingType === MappingType.ArrayToArray
        || mappingType === MappingType.ArrayToSingleton
        || mappingType === MappingType.RecordToRecord
        || mappingType === MappingType.UnionToAny;
}
