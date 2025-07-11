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
import { CodeData, TextEdit } from "@wso2/ballerina-core";
import { updateSourceCode } from "../../utils";
import { StateMachine, updateInlineDataMapperView } from "../../stateMachine";

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
        const newSrc = Math.random().toString(36).substring(2) + Date.now().toString(36);
        newCodeData.sourceCode = newSrc;
    }

    updateInlineDataMapperView(newCodeData);
}
