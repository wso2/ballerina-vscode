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

import {
    DMModel,
    EnumType,
    ExpandedDMModel,
    IORoot,
    IOType,
    IOTypeField,
    RecordType,
    TypeKind,
} from "@wso2/ballerina-core";

const MAX_NESTED_DEPTH = 4;

interface ExpandOptions {
    processInputs?: boolean;
    processOutput?: boolean;
    processSubMappings?: boolean;
    previousModel?: ExpandedDMModel;
}

/**
 * Generates a unique field ID by combining parent ID and field name
 */
function generateFieldId(parentId: string, fieldName: string): string {
    return `${parentId}.${fieldName}`;
}

/**
 * Processes a type reference and returns the appropriate IOType structure
 */
export function processTypeReference(
    ref: string,
    fieldId: string,
    model: DMModel,
    visitedRefs: Set<string>
): Partial<IOType> {
    const refType = model.refs[ref]
    if ('fields' in refType) {
        if (visitedRefs.has(ref)) {
            return {
                ref: ref,
                fields: [],
                isRecursive: true,
                isDeepNested: true,
            }
        }
        visitedRefs.add(ref);
        if (visitedRefs.size > MAX_NESTED_DEPTH) {
            return {
                ref: ref,
                fields: [],
                isDeepNested: true
            }
        }
        return {
            fields: processTypeFields(refType, fieldId, model, visitedRefs)
        };
    }
    if ('members' in refType) {
        return {
            members: refType.members || []
        };
    }
    return {};
}

/**
 * Processes array type fields and their members
 */
function processArray(
    field: IOTypeField,
    parentId: string,
    member: IOTypeField,
    model: DMModel,
    visitedRefs: Set<string>
): IOType {
    let fieldId = generateFieldId(parentId, member.name);

    let isFocused = false;
    if (model.focusInputs) {
        const focusMember = model.focusInputs[parentId];
        if (focusMember) {
            member = focusMember;
            parentId = member.name;
            fieldId = member.name;
            isFocused = true;
        }
    }

    const ioType: IOType = {
        id: fieldId,
        name: member.name,
        typeName: member.typeName!,
        kind: member.kind,
        ...(isFocused && { isFocused })
    };

    if (member.kind === TypeKind.Array && member.member) {
        return {
            ...ioType,
            member: processArray(field, parentId, member.member, model, visitedRefs)
        };
    }

    if (member.ref) {
        return {
            ...ioType,
            ...processTypeReference(member.ref, parentId, model, visitedRefs)
        };
    }

    return ioType;
}

/**
 * Processes fields of a record type
 */
function processTypeFields(
    type: RecordType,
    parentId: string,
    model: DMModel,
    visitedRefs: Set<string>
): IOType[] {
    if (!type.fields) return [];

    return type.fields.map(field => {
        const fieldId = generateFieldId(parentId, field.name!);
        const ioType: IOType = {
            id: fieldId,
            name: field.name,
            typeName: field.typeName,
            kind: field.kind
        };

        if (field.kind === TypeKind.Record && field.ref) {
            return {
                ...ioType,
                ...processTypeReference(field.ref, fieldId, model, new Set(visitedRefs))
            };
        }

        if (field.kind === TypeKind.Array && field.member) {
            return {
                ...ioType,
                member: processArray(field, fieldId, field.member, model, new Set(visitedRefs))
            };
        }

        return ioType;
    });
}

/**
 * Creates a base IOType from an IORoot
 */
function createBaseIOType(root: IORoot): IOType {
    return {
        id: root.name,
        name: root.name,
        typeName: root.typeName,
        kind: root.kind,
        ...(root.category && { category: root.category })
    };
}

/**
 * Preprocesses inputs of the DMModel (separates focus inputs from regular inputs)
 * Processes each regular input into an IOType
 */

function processInputRoots(model: DMModel): IOType[]{
    const inputs: IORoot[] = [];
    const focusInputs: Record<string, IOTypeField> = {};
    for (const input of model.inputs) {
        if (input.focusExpression) {
            focusInputs[input.focusExpression] = input as IOTypeField;
        } else {
            inputs.push(input);
        }
    }
    const preProcessedModel: DMModel = {
        ...model,
        inputs,
        focusInputs
    };

    return inputs.map(input => processIORoot(input, preProcessedModel));

}

/**
 * Processes an IORoot (input or output) into an IOType
 */
function processIORoot(root: IORoot, model: DMModel): IOType {
    const ioType = createBaseIOType(root);

    if (root.kind === TypeKind.Array && root.member) {
        return {
            ...ioType,
            member: processArray(root, root.name, root.member, model, new Set<string>())
        };
    }

    if (root.ref) {
        return {
            ...ioType,
            ...processTypeReference(root.ref, root.name, model, new Set<string>())
        };
    }

    return ioType;
}

/**
 * Expands a DMModel into an ExpandedDMModel
 */
export function expandDMModel(
    model: DMModel,
    options: ExpandOptions = {},
    rootViewId: string
): ExpandedDMModel {
    const {
        processInputs = true,
        processOutput = true,
        processSubMappings = true,
        previousModel
    } = options;

    return {
        inputs: processInputs
            ? processInputRoots(model)
            : previousModel?.inputs || [],
        output: processOutput
            ? processIORoot(model.output, model)
            : previousModel?.output!,
        subMappings: processSubMappings
            ? model.subMappings?.map(subMapping => processIORoot(subMapping, model))
            : previousModel?.subMappings || [],
        mappings: model.mappings,
        query: model.query,
        source: "",
        rootViewId
    };
}
