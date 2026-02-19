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
    CodeData,
    ELineRange,
    Flow,
    NodePosition,
    ProjectStructureArtifactResponse,
    TextEdit,
    traverseFlow,
    RecordType,
    DMModel,
    IOType,
    TypeKind,
    IOTypeField,
    IORoot,
    ExpandModelOptions,
    ExpandedDMModel,
    MACHINE_VIEW,
    IntermediateClauseType,
    InputCategory
} from "@wso2/ballerina-core";
import { updateSourceCode, UpdateSourceCodeRequest } from "../../utils";
import { StateMachine, updateDataMapperView } from "../../stateMachine";
import { VariableFindingVisitor } from "./VariableFindingVisitor";

const MAX_NESTED_DEPTH = 4;

/**
 * Shared state for data mapper operations
 */
export let hasStopped: boolean = false;

/**
 * Sets the stopped state for data mapper operations
 */
export function setHasStopped(stopped: boolean): void {
    hasStopped = stopped;
}

/**
 * Gets the current stopped state
 */
export function getHasStopped(): boolean {
    return hasStopped;
}

/**
 * Resets the stopped state to false
 */
export function resetHasStopped(): void {
    hasStopped = false;
}

/**
 * Fetches the latest code data for the data mapper.
 */
export async function fetchDataMapperCodeData(
    filePath: string,
    codedata: CodeData,
    varName: string
): Promise<CodeData> {
    // TODO: Remove this modification once the server supports code shrinking scenarios
    const modifiedCodeData = { ...codedata, lineRange: { ...codedata.lineRange, endLine: codedata.lineRange.startLine } };
    const response = await StateMachine
        .langClient()
        .getDataMapperCodedata({ filePath, codedata: modifiedCodeData, name: varName });
    if (response.codedata && StateMachine.context().view === MACHINE_VIEW.DataMapper) {
        // Following is a temporary hack to remove the node property from the code data
        // TODO: Remove this once the LS API is updated (https://github.com/wso2/product-ballerina-integrator/issues/1732)
        const { node, ...cleanCodeData } = response.codedata;
        return cleanCodeData;
    }
    return response.codedata;
}

/**
 * Fetches the latest code data for the sub mapping.
 */
export async function fetchSubMappingCodeData(
    filePath: string,
    codedata: CodeData,
    name: string
): Promise<CodeData> {
    const response = await StateMachine
        .langClient()
        .getDataMapperCodedata({ filePath, codedata, name });
    return response.codedata;
}

/**
 * Updates the source code iteratively by applying text edits.
 * If only one file is edited, it directly updates that file.
 * @param updateSourceCodeRequest - The request containing text edits to apply.
 * @returns Updated artifacts after applying the last text edits.
 */

export async function updateSourceCodeIteratively(updateSourceCodeRequest: UpdateSourceCodeRequest) {
    const textEdits = updateSourceCodeRequest.textEdits;
    const filePaths = Object.keys(textEdits);

    if (filePaths.length == 1) {
        return await updateSourceCode({ ...updateSourceCodeRequest, description: 'Data Mapper Update' }, undefined, true);
    }

    // TODO: Remove this once the designModelService/publishArtifacts API supports simultaneous file changes
    filePaths.sort((a, b) => {
        // Priority: functions.bal > data_mappings.bal > any other file
        const getPriority = (filePath: string): number => {
            if (filePath.endsWith("functions.bal")) { return 2; }
            if (filePath.endsWith("data_mappings.bal")) { return 1; }
            return 0;
        };

        const aPriority = getPriority(a);
        const bPriority = getPriority(b);
        return bPriority - aPriority; // Sort descending (highest priority first)
    });

    const requests: UpdateSourceCodeRequest[] = filePaths.map(filePath => ({
        textEdits: { [filePath]: textEdits[filePath] }
    }));

    let updatedArtifacts: ProjectStructureArtifactResponse[];
    for (const request of requests) {
        updatedArtifacts = await updateSourceCode({ ...request, description: 'Data Mapper Update' }, undefined, true);
    }

    return updatedArtifacts;
}

/**
 * Updates the source code with text edits and retrieves the updated code data for the variable being edited.
 * @throws {Error} When source update fails or required data cannot be found
 */
export async function updateSource(
    textEdits: { [key: string]: TextEdit[] },
    filePath: string,
    codedata: CodeData,
    varName: string
): Promise<CodeData> {
    // Validate input parameters
    if (!filePath?.trim() || !varName?.trim() || !codedata?.lineRange) {
        throw new Error("Missing required parameters for updateSource");
    }

    try {
        // Update source code and get artifacts
        const updatedArtifacts = await updateSourceCodeIteratively({ textEdits });

        // Find the artifact that contains our code changes
        const relevantArtifact = findRelevantArtifact(updatedArtifacts, filePath, varName, codedata.lineRange);
        if (!relevantArtifact) {
            throw new Error(`No artifact found for file: ${filePath} within the specified line range`);
        }

        // If the artifact is a data mapper(reusable), return the code data for the data mapper
        if (relevantArtifact.type === "DATA_MAPPER") {
            return {
                lineRange: {
                    fileName: relevantArtifact.path,
                    startLine: {
                        line: relevantArtifact.position?.startLine,
                        offset: relevantArtifact.position?.startColumn
                    },
                    endLine: {
                        line: relevantArtifact.position?.endLine,
                        offset: relevantArtifact.position?.endColumn
                    }
                }
            };
        }

        // Get the flow model for the updated artifact
        const flowModel = await getFlowModelForArtifact(relevantArtifact, filePath);
        if (!flowModel) {
            throw new Error("Failed to retrieve flow model for the updated code");
        }

        // Find the variable declaration in the flow model
        const variableCodeData = findVariableInFlowModel(flowModel, varName);
        if (!variableCodeData) {
            throw new Error(`Variable "${varName}" not found in the updated flow model`);
        }

        return variableCodeData;

    } catch (error) {
        console.error(`Failed to update source for variable "${varName}" in ${filePath}:`, error);
        throw error;
    }
}

/**
 * Updates the source code within sub mappings and returns the updated code data.
 */
export async function updateSubMappingSource(
    textEdits: { [key: string]: TextEdit[] },
    filePath: string,
    codedata: CodeData,
    name: string
): Promise<CodeData> {
    try {
        await updateSourceCode({ textEdits: textEdits, description: 'Sub Mapping Update' }, undefined, true);
        return await fetchSubMappingCodeData(filePath, codedata, name);
    } catch (error) {
        console.error(`Failed to update source for sub mapping "${name}" in ${filePath}:`, error);
        throw error;
    }
}

/**
 * Finds the artifact that contains the code changes within the specified line range.
 * Recursively searches through artifact hierarchy to find the most specific match.
 */
function findRelevantArtifact(
    artifacts: ProjectStructureArtifactResponse[],
    filePath: string,
    identifier: string,
    lineRange: ELineRange,
): ProjectStructureArtifactResponse | null {
    if (!artifacts || artifacts.length === 0) {
        return null;
    }

    for (const currentArtifact of artifacts) {
        if (currentArtifact.type === "DATA_MAPPER") {
            if (currentArtifact.name === identifier) {
                return currentArtifact;
            }
        } else if (isWithinArtifact(currentArtifact.path, filePath, currentArtifact.position, lineRange)) {
            // If this artifact has resources, recursively search for a more specific match
            if (currentArtifact.resources && currentArtifact.resources.length > 0) {
                const nestedMatch = findRelevantArtifact(currentArtifact.resources, filePath, identifier, lineRange);
                // Return the nested match if found, otherwise return the current artifact
                return nestedMatch || currentArtifact;
            }

            // No nested resources
            return currentArtifact;
        }
    }

    return null;
}

/**
 * Retrieves the flow model for the given artifact.
 */
async function getFlowModelForArtifact(artifact: ProjectStructureArtifactResponse, filePath: string): Promise<Flow | null> {
    try {
        const flowModelResponse = await StateMachine
            .langClient()
            .getFlowModel({
                filePath: filePath,
                startLine: {
                    line: artifact.position.startLine,
                    offset: artifact.position.startColumn
                },
                endLine: {
                    line: artifact.position.endLine,
                    offset: artifact.position.endColumn
                }
            });

        console.log("Flow model retrieved for data mapper:", flowModelResponse);

        return flowModelResponse.flowModel || null;
    } catch (error) {
        console.error("Failed to retrieve flow model:", error);
        return null;
    }
}

/**
 * Finds the specified variable in the flow model and returns its code data.
 */
function findVariableInFlowModel(flowModel: Flow, varName: string): CodeData | null {
    if (!flowModel?.nodes) {
        return null;
    }

    const variableFindingVisitor = new VariableFindingVisitor(varName);
    traverseFlow(flowModel, variableFindingVisitor);
    const variableNode = variableFindingVisitor.getVarNode();

    return variableNode?.codedata || null;
}

export async function extractVariableDefinitionSource(
    filePath: string,
    codeData: CodeData,
    varName: string
): Promise<string | null> {
    try {
        const variableCodeData = await fetchDataMapperCodeData(filePath, codeData, varName);

        if (!variableCodeData?.lineRange) {
            return null;
        }

        const fs = require('fs');
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.split('\n');

        const startLine = variableCodeData.lineRange.startLine.line;
        const endLine = variableCodeData.lineRange.endLine.line;

        const variableLines = lines.slice(startLine, endLine + 1);

        const formattedCode = formatExtractedCode(variableLines);
        return formattedCode;
    } catch (error) {
        console.error(`Failed to extract variable definition for "${varName}":`, error);
        return null;
    }
}

// Formats extracted code lines by:
function formatExtractedCode(lines: string[]): string {
    if (lines.length === 0) {
        return '';
    }

    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    if (nonEmptyLines.length === 0) {
        return '';
    }

    const minIndent = Math.min(
        ...nonEmptyLines.map(line => {
            const match = line.match(/^(\s*)/);
            return match ? match[1].length : 0;
        })
    );

    const formattedLines = lines.map(line => {
        if (line.trim().length === 0) {
            return '';
        }
        return line.substring(minIndent);
    });

    return formattedLines.join('\n').trimEnd();
}

/**
 * Applies a temporary hack to update the source code with a random string.
 * TODO: Remove this once the lang server is updated to return the new source code
 */
function applySourceCodeHack(codeData: CodeData): void {
    if (codeData) {
        const newSrc = Math.random().toString(36).substring(2) + Date.now().toString(36);
        codeData.sourceCode = newSrc;
    }
}

/**
 * Updates the data mapper view with the provided code data after applying necessary transformations.
 */
function updateView(codeData: CodeData | null, varName: string): void {
    if (!codeData) {
        console.warn(`No code data available for variable: ${varName}`);
        return;
    }

    applySourceCodeHack(codeData);
    updateDataMapperView(codeData, varName);
}

/**
 * Updates the source code with text edits and refreshes the data mapper view with the latest code data.
 */
export async function updateAndRefreshDataMapper(
    textEdits: { [key: string]: TextEdit[] },
    filePath: string,
    codedata: CodeData,
    varName: string,
    targetField?: string,
    subMappingName?: string
): Promise<void> {
    try {
        const newCodeData = subMappingName
            ? await updateSubMappingSource(textEdits, filePath, codedata, subMappingName)
            : await updateSource(textEdits, filePath, codedata, varName);
        updateView(newCodeData, varName);
    } catch (error) {
        console.error(`Failed to update and refresh data mapper for variable "${varName}":`, error);
        throw new Error(`Data mapper update failed`);
    }
}

/**
 * Refreshes the data mapper view with the latest code data.
 */
export async function refreshDataMapper(
    filePath: string,
    codedata: CodeData,
    varName: string
): Promise<void> {
    try {
        const newCodeData = await fetchDataMapperCodeData(filePath, codedata, varName);
        updateView(newCodeData, varName);
    } catch (error) {
        console.error(`Failed to refresh data mapper for variable "${varName}":`, error);
        throw new Error(`Data mapper refresh failed.`);
    }
}

/**
 * Determines whether a variable declaration range is completely contained within an artifact's position range.
 */
function isWithinArtifact(
    artifactPath: string,
    filePath: string,
    artifactPosition: NodePosition,
    originalRange: ELineRange
) {
    if (artifactPath !== filePath) {
        return false;
    }

    const artifactStartLine = artifactPosition.startLine;
    const artifactEndLine = artifactPosition.endLine;
    const originalStartLine = originalRange.startLine.line;

    return artifactStartLine <= originalStartLine && artifactEndLine >= originalStartLine;
}

/**
 * Expands a DMModel into an ExpandedDMModel
 */
export function expandDMModel(
    model: DMModel,
    rootViewId: string,
    options: ExpandModelOptions = {}
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
        rootViewId,
        triggerRefresh: model.triggerRefresh,
        focusInputRootMap: model.focusInputRootMap
    };
}

/**
 * Preprocesses inputs of the DMModel (separates focus inputs from regular inputs)
 * Processes each regular input into an IOType
 */
function processInputRoots(model: DMModel): IOType[] {
    const inputs: IORoot[] = [];
    const moduleLevelInputs: IORoot[] = [];
    const focusInputs: Record<string, IOTypeField> = {};
    for (const input of model.inputs) {
        if (input.focusExpression && (input.isIterationVariable || input.isSeq || input.isGroupingKey)) {
            focusInputs[input.focusExpression] = input as IOTypeField;
        } else if (isModuleLevelInput(input)) {
            moduleLevelInputs.push(input);
        } else {
            inputs.push(input);
        }
    }

    model.focusInputRootMap = {};
    const preProcessedModel: DMModel = {
        ...model,
        inputs,
        focusInputs
    };

    const processedInputs = inputs.map(input => {
        preProcessedModel.traversingRoot = input.name;
        return processIORoot(input, preProcessedModel);
    });

    return moduleLevelInputs.length
        ? [buildModuleLevelInputsGroup(moduleLevelInputs, preProcessedModel), ...processedInputs]
        : processedInputs;
}

/** 
 * Checks if the given input is a module level input
 */
function isModuleLevelInput(input: IORoot): boolean {
    return input.category === InputCategory.Constant
        || input.category === InputCategory.Configurable
        || input.category === InputCategory.ModuleVariable
        || input.category === InputCategory.Enum;
}

/**
 * Builds an IOType to group module level inputs
 */
function buildModuleLevelInputsGroup(moduleLevelInputs: IORoot[], model: DMModel): IOType {
    
    const id = "MODULE_LEVEL_INPUTS$"; // Suffix $ to avoid conflicts with user defined names and special case port handling
    model.traversingRoot = id;
    const fields = moduleLevelInputs.map(input => {
        model.focusInputRootMap[input.name] = model.traversingRoot;
        return processIORoot(input, model);
    });

    return {
        id,
        name: id,
        displayName: "Global Inputs",
        kind: TypeKind.Record,
        fields
    };
}

/**
 * Processes type-specific logic based on TypeKind and returns the appropriate structure
 */
function processTypeKind(
    type: IORoot | IOTypeField,
    parentId: string,
    model: DMModel,
    visitedRefs: Set<string>
): Partial<IOType> {
    switch (type.kind) {
        case TypeKind.Array:
            if (type.member) {
                return {
                    member: processArray(parentId, type.member, model, visitedRefs)
                };
            }
            break;

        case TypeKind.Union:
            if (type.members) {
                return {
                    members: processUnion(type.members, parentId, model, visitedRefs)
                };
            }
            break;

        case TypeKind.Enum:
            if (type.members) {
                return {
                    members: processEnum(type.members, parentId)
                };
            }
            break;

        case TypeKind.Record:
            if (type.ref) {
                return processTypeReference(type.ref, parentId, model, visitedRefs);
            }
            break;
        case TypeKind.Json:
        case TypeKind.Xml:
            if (type.convertedVariable) {
                return {
                    convertedField: processConvertedVariable(type.convertedVariable, model, visitedRefs)
                };
            } else if (type.fields) {
                return {
                    fields: processTypeFields(type as RecordType, parentId, model, visitedRefs)
                };
            }
    }
    return {};
}

/**
 * Processes an IORoot (input or output) into an IOType
 */
export function processIORoot(root: IORoot, model: DMModel): IOType {
    const ioType = createBaseIOType(root);

    const typeSpecificProps = processTypeKind(root, root.name, model, new Set<string>());

    return {
        ...ioType,
        ...typeSpecificProps
    };
}

/**
 * Creates a base IOType from an IORoot
 */
function createBaseIOType(root: IORoot): IOType {
    const isEnum = root.kind === 'enum' || root.category === 'enum';

    const baseType: IOType = {
        id: root.name,
        name: root.name,
        typeName: root.typeName,
        kind: root.kind,
        ...(root.category && { category: root.category }),
        ...(root.optional && { optional: root.optional }),
        ...(root.typeInfo && { typeInfo: root.typeInfo })
    };

    if (isEnum && root.members) {
        baseType.members = root.members.map(member => ({
            id: member.name,
            name: member.displayName || member.name,
            typeName: member.typeName,
            kind: member.kind,
            ...(member.optional && { optional: member.optional })
        }));
    }

    return baseType;
}

/**
 * Processes array members
 */
function processArray(
    parentId: string,
    member: IOTypeField,
    model: DMModel,
    visitedRefs: Set<string>
): IOType {
    let fieldId = generateFieldId(parentId, member.name);

    let isFocused = false;
    let isGroupByIdUpdated = false;
    const prevGroupById = model.groupById;

    if (model.focusInputs) {
        const focusMember = model.focusInputs[parentId];
        if (focusMember) {
            member = focusMember;
            parentId = member.name;
            fieldId = member.name;
            isFocused = true;
            model.focusInputRootMap[fieldId] = model.traversingRoot;

            if(member.isSeq && model.query!.fromClause.properties.name === fieldId){
                const groupByClause = model.query!.intermediateClauses?.find(clause => clause.type === IntermediateClauseType.GROUP_BY);
                if(groupByClause){
                    model.groupById = groupByClause.properties.name;
                    isGroupByIdUpdated = true;
                }
            }
        }
    }

    const ioType: IOType = {
        id: parentId,
        name: member.name,
        displayName: member.displayName,
        typeName: member.typeName!,
        kind: member.kind,
        ...(isFocused && { isFocused }),
        ...(member.optional && { optional: member.optional }),
        ...(member.typeInfo && { typeInfo: member.typeInfo })
    };

    const typeSpecificProps = processTypeKind(member, parentId, model, visitedRefs);

    if(isGroupByIdUpdated){
        model.groupById = prevGroupById;
    }

    return {
        ...ioType,
        ...typeSpecificProps
    };
}

/**
 * Generates a unique field ID by combining parent ID and field name
 */
function generateFieldId(parentId: string, fieldName: string): string {
    return `${parentId}.${fieldName}`;
}

/**
 * Processes union type members and returns an array of IOType objects
 */
function processUnion(
    unionMembers: IOTypeField[],
    parentFieldId: string,
    model: DMModel,
    visitedRefs: Set<string>
): IOType[] {
    return unionMembers.map(unionMember => {
        const unionMemberType: IOType = {
            id: parentFieldId,
            name: unionMember.name,
            displayName: unionMember.displayName,
            typeName: unionMember.typeName,
            kind: unionMember.kind,
            ...(unionMember.optional && { optional: unionMember.optional }),
            ...(unionMember.typeInfo && { typeInfo: unionMember.typeInfo })
        };

        const typeSpecificProps = processTypeKind(unionMember, parentFieldId, model, visitedRefs);

        return {
            ...unionMemberType,
            ...typeSpecificProps
        };
    });
}

/**
 * Processes a converted variable for JSON/XML types
 */
function processConvertedVariable(
    convertedVariable: IORoot,
    model: DMModel,
    visitedRefs: Set<string>
): IOType {
    const fieldId = convertedVariable.name;

    if (model.traversingRoot) {
        model.focusInputRootMap[fieldId] = model.traversingRoot;
    }
    
    return {
        id: fieldId,
        name: fieldId,
        displayName: convertedVariable.displayName,
        typeName: convertedVariable.typeName,
        kind: convertedVariable.kind,
        category: convertedVariable.category,
        isFocused: true,
        ...(convertedVariable.optional && { optional: convertedVariable.optional }),
        ...(convertedVariable.typeInfo && { typeInfo: convertedVariable.typeInfo }),
        ...processTypeKind(convertedVariable, fieldId, model, visitedRefs)
    };
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
    const refType = model.refs[ref];
    if ('fields' in refType) {
        if (visitedRefs.has(ref)) {
            return {
                ref: ref,
                fields: [],
                isRecursive: true,
                isDeepNested: true,
            };
        }
        visitedRefs.add(ref);
        if (visitedRefs.size > MAX_NESTED_DEPTH) {
            return {
                ref: ref,
                fields: [],
                isDeepNested: true
            };
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
 * Processes fields of a record type
 */
function processTypeFields(
    type: RecordType,
    parentId: string,
    model: DMModel,
    visitedRefs: Set<string>
): IOType[] {
    if (!type.fields) { return []; }

    return type.fields.map(field => {
        let fieldId = generateFieldId(parentId, field.name!);

        let isFocused = false;
        let isSeq = !!model.groupById;
        if (isSeq && model.focusInputs) {
            const focusMember = model.focusInputs[fieldId];
            if (focusMember) {
                field = focusMember;
                fieldId = field.name;
                isFocused = true;
                model.focusInputRootMap[fieldId] = model.traversingRoot;
                if (fieldId === model.groupById){
                    isSeq = false;
                }
            }
        }

        const ioType: IOType = {
            id: fieldId,
            name: field.name,
            displayName: field.displayName,
            typeName: field.typeName,
            kind: field.kind,
            ...(isFocused && { isFocused }),
            ...(isSeq && { isSeq }),
            ...(field.optional && { optional: field.optional }),
            ...(field.typeInfo && { typeInfo: field.typeInfo })
        };

        const typeSpecificProps = processTypeKind(field, fieldId, model, new Set(visitedRefs));

        return {
            ...ioType,
            ...typeSpecificProps
        };
    });
}

/**
 * Processes enum type members and returns an IOType with processed members
 */
function processEnum(
    enumMembers: IOTypeField[],
    parentId: string
): IOType[] {
    return enumMembers.map(member => ({
        id: parentId,
        name: member.typeName,
        displayName: member.typeName,
        typeName: member.typeName,
        kind: member.kind,
        ...(member.optional && { optional: member.optional })
    }));
}
