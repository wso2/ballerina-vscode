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
    InlineAllDataMapperSourceRequest,
    InlineDataMapperSourceRequest,
    InlineDataMapperSourceResponse,
    NodePosition,
    ProjectStructureArtifactResponse,
    TextEdit,
    traverseFlow
} from "@wso2/ballerina-core";
import { updateSourceCode } from "../../utils";
import { StateMachine, updateInlineDataMapperView } from "../../stateMachine";
import { VariableFindingVisitor } from "./VariableFindingVisitor";

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
    const modifiedCodeData = { ...codedata, lineRange : { ...codedata.lineRange, endLine: codedata.lineRange.startLine } };
    const response = await StateMachine
        .langClient()
        .getDataMapperCodedata({ filePath, codedata: modifiedCodeData, name: varName });
    return response.codedata;
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
        const updatedArtifacts = await updateSourceCode({ textEdits });
        
        // Find the artifact that contains our code changes
        const relevantArtifact = findRelevantArtifact(updatedArtifacts, filePath, codedata.lineRange);
        if (!relevantArtifact) {
            throw new Error(`No artifact found for file: ${filePath} within the specified line range`);
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
 * Finds the artifact that contains the code changes within the specified line range.
 */
function findRelevantArtifact(
    artifacts: ProjectStructureArtifactResponse[], 
    filePath: string, 
    lineRange: ELineRange
): ProjectStructureArtifactResponse | null {
    return artifacts.find(artifact =>
        artifact.path === filePath && 
        isWithinArtifact(artifact.position, lineRange)
    ) || null;
}

/**
 * Retrieves the flow model for the given artifact.
 */
async function getFlowModelForArtifact(artifact: ProjectStructureArtifactResponse, filePath: string): Promise<Flow | null> {
    try {
        const flowModelResponse = await StateMachine
            .langClient()
            .getFlowModel({
                filePath,
                startLine: { 
                    line: artifact.position.startLine, 
                    offset: artifact.position.startColumn 
                },
                endLine: { 
                    line: artifact.position.endLine, 
                    offset: artifact.position.endColumn 
                }
            });

        console.log("Flow model retrieved for inline data mapper:", flowModelResponse);

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
function updateDataMapperView(codeData: CodeData | null, varName: string): void {
    if (!codeData) {
        console.warn(`No code data available for variable: ${varName}`);
        return;
    }

    applySourceCodeHack(codeData);
    updateInlineDataMapperView(codeData, varName);
}

/**
 * Updates the source code with text edits and refreshes the data mapper view with the latest code data.
 */
export async function updateAndRefreshDataMapper(
    textEdits: { [key: string]: TextEdit[] },
    filePath: string,
    codedata: CodeData,
    varName: string
): Promise<void> {
    try {
        const newCodeData = await updateSource(textEdits, filePath, codedata, varName);
        updateDataMapperView(newCodeData, varName);
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
        updateDataMapperView(newCodeData, varName);
    } catch (error) {
        console.error(`Failed to refresh data mapper for variable "${varName}":`, error);
        throw new Error(`Data mapper refresh failed.`);
    }
}

/**
 * Builds individual source requests from the provided parameters by mapping over each mapping.
 */
export function buildSourceRequests(params: InlineAllDataMapperSourceRequest): InlineDataMapperSourceRequest[] {
    return params.mappings.map(mapping => ({
        filePath: params.filePath,
        codedata: params.codedata,
        varName: params.varName,
        targetField: params.targetField,
        mapping: mapping
    }));
}

/**
 * Handles operation cancellation and error logging for each request.
 */
export async function processSourceRequests(requests: InlineDataMapperSourceRequest[]): Promise<PromiseSettledResult<InlineDataMapperSourceResponse>[]> {
    return Promise.allSettled(
        requests.map(async (request) => {
            if (getHasStopped()) {
                throw new Error("Operation was stopped");
            }
            try {
                return await StateMachine.langClient().getInlineDataMapperSource(request);
            } catch (error) {
                console.error("Error in getDataMapperSource:", error);
                throw error;
            }
        })
    );
}

/**
 * Consolidates text edits from multiple source responses into a single optimized collection.
 */
export function consolidateTextEdits(
    responses: PromiseSettledResult<InlineDataMapperSourceResponse>[],
    totalMappings: number
): { [key: string]: TextEdit[] } {
    const allTextEdits: { [key: string]: TextEdit[] } = {};

    responses.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            console.log(`>>> Completed mapping ${index + 1}/${totalMappings}`);
            mergeTextEdits(allTextEdits, result.value.textEdits);
        } else {
            console.error(`>>> Failed mapping ${index + 1}:`, result.reason);
        }
    });

    return optimizeTextEdits(allTextEdits);
}

/**
 * Merges new text edits into the existing collection, grouping by file path.
 */
export function mergeTextEdits(
    allTextEdits: { [key: string]: TextEdit[] },
    newTextEdits?: { [key: string]: TextEdit[] }
): void {
    if (!newTextEdits) { return; }

    Object.entries(newTextEdits).forEach(([key, edits]) => {
        if (!allTextEdits[key]) {
            allTextEdits[key] = [];
        }
        allTextEdits[key].push(...edits);
    });
}

/**
 * Optimizes text edits by sorting and combining them into single edits per file.
 */
export function optimizeTextEdits(allTextEdits: { [key: string]: TextEdit[] }): { [key: string]: TextEdit[] } {
    const optimizedEdits: { [key: string]: TextEdit[] } = {};

    Object.entries(allTextEdits).forEach(([key, edits]) => {
        if (edits.length === 0) { return; }

        const sortedEdits = sortTextEdits(edits);
        const combinedEdit = combineTextEdits(sortedEdits);

        optimizedEdits[key] = [combinedEdit];
    });

    return optimizedEdits;
}

/**
 * Sorts text edits by line number and character position to ensure proper ordering.
 */
export function sortTextEdits(edits: TextEdit[]): TextEdit[] {
    return edits.sort((a, b) => {
        if (a.range.start.line !== b.range.start.line) {
            return a.range.start.line - b.range.start.line;
        }
        return a.range.start.character - b.range.start.character;
    });
}

/**
 * Combines multiple text edits into a single edit with comma-separated content.
 */
export function combineTextEdits(edits: TextEdit[]): TextEdit {
    const formattedTexts = edits.map((edit, index) => {
        const text = edit.newText.trim();
        return index < edits.length - 1 ? `${text},` : text;
    });

    return {
        range: edits[0].range,
        newText: formattedTexts.join('\n').trimStart()
    };
}

/**
 * Determines whether a variable declaration range is completely contained within an artifact's position range.
 */
function isWithinArtifact(artifactPosition: NodePosition, varDeclRange: ELineRange) {
    const artifactStartLine = artifactPosition.startLine;
    const artifactEndLine = artifactPosition.endLine;
    const varDeclStartLine = varDeclRange.startLine.line;
    const varDeclEndLine = varDeclRange.endLine.line;

    return artifactStartLine <= varDeclStartLine && artifactEndLine >= varDeclEndLine;
}
