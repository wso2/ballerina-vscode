// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { generateObject, ModelMessage } from "ai";
import { z } from 'zod';
import {
    MinifiedLibrary,
    RelevantLibrariesAndFunctionsRequest,
    RelevantLibrariesAndFunctionsResponse,
} from "@wso2/ballerina-core";
import { Library } from "./libs_types";
import { selectRequiredFunctions } from "./funcs";
import { getAnthropicClient, ANTHROPIC_HAIKU, getProviderCacheControl } from "../connection";
import { langClient } from "../../activator";
import { getGenerationMode } from "../utils";
import { AIPanelAbortController } from "../../../../../src/rpc-managers/ai-panel/utils";

interface LibraryListResponse {
    libraries: string[];
}

const LibraryListSchema = z.object({
    libraries: z.array(z.string()),
});

export const LIBRARY_PROVIDER_TOOL = "LibraryProviderTool";

// export async function getRelevantLibs(params: GenerateCodeParams): Promise<Library[]> {
//     // const prompt = getReadmeQuery(params);
//     const selectedLibs: string[] = await getSelectedLibraries(prompt);
//     return selectRequiredFunctions(prompt, selectedLibs)
// }

export enum GenerationType {
    CODE_GENERATION = "CODE_GENERATION",
    HEALTHCARE_GENERATION = "HEALTHCARE_GENERATION",
}

export async function getRelevantLibrariesAndFunctions(
    params: RelevantLibrariesAndFunctionsRequest,
    generationType: GenerationType
): Promise<RelevantLibrariesAndFunctionsResponse> {
    const selectedLibs: string[] = await getSelectedLibraries(params.query, generationType);
    const relevantTrimmedFuncs: Library[] = await selectRequiredFunctions(params.query, selectedLibs, generationType);
    return {
        libraries: relevantTrimmedFuncs,
    };
}

export async function getSelectedLibraries(prompt: string, generationType: GenerationType): Promise<string[]> {
    const allLibraries = await getAllLibraries(generationType);
    if (allLibraries.length === 0) {
        return [];
    }
    const cacheOptions = await getProviderCacheControl();
    const messages: ModelMessage[] = [
        {
            role: "system",
            content: getSystemPrompt(allLibraries),
            providerOptions: cacheOptions,
        },
        {
            role: "user",
            content: getUserPrompt(prompt, generationType),
        },
    ];

    //TODO: Add thinking and test with claude haiku
    const startTime = Date.now();
    const { object } = await generateObject({
        model: await getAnthropicClient(ANTHROPIC_HAIKU),
        maxOutputTokens: 4096,
        temperature: 0,
        messages: messages,
        schema: LibraryListSchema,
        abortSignal: AIPanelAbortController.getInstance().signal,
    });
    const endTime = Date.now();
    console.log(`Library selection took ${endTime - startTime}ms`);

    console.log("Selected libraries:", object.libraries);
    return object.libraries;
}

function getSystemPrompt(libraryList: MinifiedLibrary[]): string {
    return `You are an assistant tasked with selecting all the Ballerina libraries needed to answer a specific question from a given set of libraries provided in the context as a JSON. RESPOND ONLY WITH A JSON.
# Library Context JSON
${JSON.stringify(libraryList)}`;
}

function getUserPrompt(prompt: string, generationType: GenerationType): string {
    return `
# QUESTION
${prompt}

# Example
Context:
[
    {
        "name": "ballerinax/azure.openai.chat",
        "description": "Provides a Ballerina client for the Azure OpenAI Chat API."
    },
    {
        "name": "ballerinax/github",
        "description": "Provides a Ballerina client for the GitHub API."
    },
    {
        "name": "ballerinax/slack",
        "description": "Provides a Ballerina client for the Slack API."
    },
    {
        "name": "ballerinax/http",
        "description": "Allows to intract with HTTP services."
    }

]
Question: 
Write an application to read github issue, summarize them and post the summary to a slack channel.

Response: 
{
    "libraries": ["ballerinax/github", "ballerinax/slack", "ballerinax/azure.openai.chat"]
}
${
    generationType === GenerationType.CODE_GENERATION
        ? ""
        : " ALWAYS include `ballerinax/health.base`, `ballerinax/health.fhir.r4`, `ballerinax/health.fhir.r4.parser`, `ballerinax/health.fhir.r4utils`, `ballerinax/health.fhir.r4.international401`, `ballerinax/health.hl7v2commons` and `ballerinax/health.hl7v2` libraries in the selection in addition to what you selected."
}`;
}

export async function getAllLibraries(generationType: GenerationType): Promise<MinifiedLibrary[]> {
    const result = (await langClient.getCopilotCompactLibraries({
        mode: getGenerationMode(generationType),
    })) as { libraries: MinifiedLibrary[] };
    return result.libraries as MinifiedLibrary[];
}
