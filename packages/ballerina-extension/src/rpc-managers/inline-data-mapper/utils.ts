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
import { CodeData, InlineAllDataMapperSourceRequest, InlineDataMapperSourceRequest, InlineDataMapperSourceResponse, TextEdit } from "@wso2/ballerina-core";
import { updateSourceCode } from "../../utils";
import { StateMachine, updateInlineDataMapperView } from "../../stateMachine";

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
 * Applies text edits to the source code.
 */
export async function applyTextEdits(textEdits: { [key: string]: TextEdit[] }) {
    await updateSourceCode({ textEdits });
}

/**
 * Fetches the latest code data for the data mapper.
 */
export async function fetchDataMapperCodeData(
    filePath: string,
    codedata: CodeData,
    varName: string
): Promise<CodeData> {
    const response = await StateMachine
        .langClient()
        .getDataMapperCodedata({ filePath, codedata, name: varName });
    return response.codedata;
}

/**
 * Orchestrates the update and refresh process for the data mapper.
 */
export async function updateAndRefreshDataMapper(
    textEdits: { [key: string]: TextEdit[] },
    filePath: string,
    codedata: CodeData,
    varName: string
) {
    await applyTextEdits(textEdits);
    const newCodeData = await fetchDataMapperCodeData(filePath, codedata, varName);

    // Hack to update the codedata with the new source code
    // TODO: Remove this once the lang server is updated to return the new source code
    if (newCodeData) {
        const newSrc = Array.isArray(Object.values(textEdits))
            ? Object.values(textEdits)[0][0].newText
            : Math.random().toString(36).substring(2) + Date.now().toString(36);
        newCodeData.sourceCode = newSrc;
    }

    updateInlineDataMapperView(newCodeData);
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
 * Updates the source code with the provided text edits.
 */
export async function updateSourceCodeWithEdits(params: { textEdits: { [key: string]: TextEdit[] } }): Promise<void> {
    try {
        await updateSourceCode(params);
    } catch (error) {
        console.error("Failed to update source code:", error);
        throw new Error("Source code update failed");
    }
}

/**
 * Updates the inline data mapper view with fresh code data.
 */
export async function updateInlineDataMapperViewWithParams(params: InlineAllDataMapperSourceRequest): Promise<void> {
    try {
        const finalCodedataResp = await StateMachine
            .langClient()
            .getDataMapperCodedata({
                filePath: params.filePath,
                codedata: params.codedata,
                name: params.varName
            });

        updateInlineDataMapperView(finalCodedataResp.codedata);
    } catch (error) {
        console.error("Failed to update inline data mapper view:", error);
        throw new Error("View update failed");
    }
}
