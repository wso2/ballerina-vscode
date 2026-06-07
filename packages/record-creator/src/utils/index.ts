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
import { ModulePart, NodePosition, STKindChecker, STNode, TypeDefinition } from "@wso2/syntax-tree";
import {
    DIAGNOSTIC_SEVERITY,
    JsonToRecord,
    NOT_SUPPORTED_TYPE,
    PartialSTParams,
    STModification,
    XMLToRecord,
    getComponentSource,
} from "@wso2/ballerina-core";
import { LangClientRpcClient, RecordCreatorRpcClient } from "@wso2/ballerina-rpc-client";
import { RecordItemModel } from "../types";

export const isNotSupportedType = (resp: JsonToRecord | NOT_SUPPORTED_TYPE): resp is NOT_SUPPORTED_TYPE => {
    return  !("diagnostics" in resp);
};

export async function convertJsonToRecordUtil(
    json: string,
    name: string,
    isClosed: boolean,
    isSeparateDefinitions: boolean,
    recordCreatorRpcClient: RecordCreatorRpcClient
): Promise<JsonToRecord> {
    const resp: JsonToRecord | NOT_SUPPORTED_TYPE = await recordCreatorRpcClient.convertJsonToRecord({
        jsonString: json,
        recordName: name,
        isClosed,
        isRecordTypeDesc: !isSeparateDefinitions,
    });
    if (isNotSupportedType(resp)) {
        return {
            diagnostics: [{ message: "Please enter a valid JSON", severity: DIAGNOSTIC_SEVERITY.ERROR }],
            codeBlock: "",
        };
    }
    if ((resp as JsonToRecord).diagnostics === undefined) {
        try {
            JSON.parse(json);
            (resp as JsonToRecord).diagnostics = [];
        } catch (e) {
            (resp as JsonToRecord).diagnostics = [
                { message: "Please enter a valid JSON", severity: DIAGNOSTIC_SEVERITY.ERROR },
            ];
        }
    }
    return resp;
}

export async function convertXmlToRecordUtil(
    xml: string,
    recordCreatorRpcClient: RecordCreatorRpcClient
): Promise<XMLToRecord> {
    const resp: XMLToRecord | NOT_SUPPORTED_TYPE = await recordCreatorRpcClient.convertXMLToRecord({
        xmlValue: xml,
        isClosed: false,
        forceFormatRecordFields: false,
        isRecordTypeDesc: false,
    });
    if (isNotSupportedType(resp)) {
        return {
            diagnostics: [{ message: "Please enter a valid XML", severity: DIAGNOSTIC_SEVERITY.ERROR }],
            codeBlock: "",
        };
    }

    if ((resp as XMLToRecord).diagnostics === undefined) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, "text/xml");
            (resp as XMLToRecord).diagnostics = [];
        } catch (e) {
            (resp as XMLToRecord).diagnostics = [
                { message: "Please enter a valid XML", severity: DIAGNOSTIC_SEVERITY.ERROR },
            ];
        }
    }
    return resp;
}

export async function getRecordST(
    partialSTRequest: PartialSTParams,
    langServerRpcClient: LangClientRpcClient
): Promise<STNode> {
    const resp = await langServerRpcClient.getSTForModuleMembers(partialSTRequest);
    return resp.syntaxTree;
}

export function getRootRecord(modulePartSt: ModulePart, name: string): TypeDefinition {
    return modulePartSt.members.find(
        (record) => STKindChecker.isTypeDefinition(record) && record.typeName.value.replace(/\\/g, "") === name
    ) as TypeDefinition;
}

export async function getModulePartST(
    partialSTRequest: PartialSTParams,
    langServerRpcClient: LangClientRpcClient
): Promise<STNode> {
    const resp = await langServerRpcClient.getSTForModulePart(partialSTRequest);
    return resp.syntaxTree;
}

export function createPropertyStatement(
    property: string,
    targetPosition?: NodePosition,
    isLastMember?: boolean
): STModification {
    const propertyStatement: STModification = {
        startLine: targetPosition ? targetPosition.startLine : 0,
        startColumn: isLastMember ? targetPosition.endColumn : 0,
        endLine: targetPosition ? targetPosition.startLine : 0,
        endColumn: isLastMember ? targetPosition.endColumn : 0,
        type: "PROPERTY_STATEMENT",
        config: {
            PROPERTY: property,
        },
    };

    return propertyStatement;
}

export function getInitialSource(modification: STModification): string {
    const source = getComponentSource(modification.type, modification.config);
    return source;
}

export function mutateTypeDefinition(
    typeName: string,
    typeDesc: string,
    targetPosition: NodePosition,
    isNew: boolean,
    accessModifier?: string
): STModification {
    let modification: STModification;
    if (isNew) {
        modification = {
            startLine: targetPosition.startLine,
            endLine: targetPosition.startLine,
            startColumn: 0,
            endColumn: 0,
            type: "",
        };
    } else {
        modification = {
            ...targetPosition,
            type: "",
        };
    }

    return {
        ...modification,
        type: "TYPE_DEFINITION",
        config: {
            ACCESS_MODIFIER: accessModifier,
            TYPE_NAME: typeName,
            TYPE_DESCRIPTOR: typeDesc,
        },
    };
}

export function updatePropertyStatement(property: string, targetPosition: NodePosition): STModification {
    const propertyStatement: STModification = {
        startLine: targetPosition.startLine,
        startColumn: targetPosition.startColumn,
        endLine: targetPosition.endLine,
        endColumn: targetPosition.endColumn,
        type: "PROPERTY_STATEMENT",
        config: {
            PROPERTY: property,
        },
    };

    return propertyStatement;
}

export function extractImportedRecordNames(definitions: ModulePart | TypeDefinition): RecordItemModel[] {
    const recordName: { name: string, checked: boolean }[] = [];
    if (STKindChecker.isModulePart(definitions)) {
        const typeDefs: TypeDefinition[] = definitions.members
            .filter(definition => STKindChecker.isTypeDefinition(definition)) as TypeDefinition[];
        typeDefs.forEach(typeDef => recordName.push({ name: typeDef?.typeName?.value, checked: false }));
    } else if (STKindChecker.isTypeDefinition(definitions)) {
        recordName.push({ name: definitions.typeName.value, checked: false });
    }
    return recordName;
}

export function getActualRecordST(syntaxTree: STNode, recordName: string): TypeDefinition {
    let typeDef: TypeDefinition;
    if (STKindChecker.isModulePart(syntaxTree)) {
        typeDef = (syntaxTree.members
            .filter(definition => STKindChecker.isTypeDefinition(definition)) as TypeDefinition[])
            .find(record => record.typeName.value === recordName);
    }
    return typeDef;
}

export function getAvailableCreatedRecords(recordNames: RecordItemModel[], syntaxTree: STNode): RecordItemModel[] {
    const records: RecordItemModel[] = [];
    if (STKindChecker.isModulePart(syntaxTree)) {
        const typeDefs: TypeDefinition[] = syntaxTree.members
            .filter(definition => STKindChecker.isTypeDefinition(definition)) as TypeDefinition[];
        const avaibaleRecords = typeDefs.filter(record => recordNames.some(res => res.name === record.typeName.value));
        if (avaibaleRecords.length > 0) {
            avaibaleRecords.forEach((record) => {
                records.push({ name: record.typeName.value, checked: false });
            })
        }
    }
    return records;
}

function removeStatement(targetPosition: NodePosition): STModification {
    const removeLine: STModification = {
        startLine: targetPosition.startLine,
        startColumn: targetPosition.startColumn,
        endLine: targetPosition.endLine,
        endColumn: targetPosition.endColumn,
        type: 'DELETE'
    };

    return removeLine;
}

export function getRemoveCreatedRecordRange(recordNames: string[], syntaxTree: STNode): STModification[] {
    const modifications: STModification[] = [];
    if (STKindChecker.isModulePart(syntaxTree)) {
        const typeDefs: TypeDefinition[] = syntaxTree.members
            .filter(definition => STKindChecker.isTypeDefinition(definition)) as TypeDefinition[];
        const createdRecords = typeDefs.filter(record => recordNames.includes(record.typeName.value));
        if (createdRecords.length > 0) {
            createdRecords.forEach((record) => {
                modifications.push(removeStatement(record.position));
            })
        }
    }
    return modifications;
}
