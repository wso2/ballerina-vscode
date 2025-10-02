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

import { tool } from "ai";
import { GenerationType } from "./libs";
import { jsonSchema } from "ai";
import { Library } from "./libs_types";
import { selectRequiredFunctions } from "./funcs";

const LibraryProviderToolSchema = jsonSchema<{
    libraryNames: string[];
    userPrompt: string;
}>({
    type: "object",
    properties: {
        libraryNames: {
            type: "array",
            items: { type: "string" },
            description: "List of Ballerina library names to fetch details for",
        },
        userPrompt: {
            type: "string",
            description: "User query to determine relevant functions and types",
        },
    },
    required: ["libraryNames", "userPrompt"],
});

export async function LibraryProviderTool(
    params: { libraryNames: string[]; userPrompt: string },
    generationType: GenerationType
): Promise<Library[]> {
    try {
        const startTime = Date.now();
        const libraries = await selectRequiredFunctions(params.userPrompt, params.libraryNames, generationType);
        console.log(
            `[LibraryProviderTool] Fetched ${libraries.length} libraries: ${libraries
                .map((lib) => lib.name)
                .join(", ")}, took ${(Date.now() - startTime) / 1000}s`
        );
        return libraries;
    } catch (error) {
        console.error(`[LibraryProviderTool] Error fetching libraries: ${error}`);
        return [];
    }
}

export function getLibraryProviderTool(libraryDescriptions: string, generationType: GenerationType) {
    return tool({
        description: `Fetches detailed information about Ballerina libraries, including clients, functions, and types.
This tool analyzes a user query and returns **only the relevant** clients, functions, and types from the selected Ballerina libraries based on the provided user prompt.

To use this tool:
- Analyze the user query provided in the user message to identify the relevant Ballerina libraries needed to fulfill the query.
- Select the minimal set of libraries that can fulfill the query based on their descriptions. Do not assume library contents unless provided by the tool.
- Call this tool with the selected libraryNames and the user query.

# Example
**Context** (library descriptions):
${JSON.stringify(
    [
        {
            name: "ballerinax/azure.openai.chat",
            description: "Provides a Ballerina client for the Azure OpenAI Chat API.",
        },
        {
            name: "ballerinax/github",
            description: "Provides a Ballerina client for the GitHub API.",
        },
        {
            name: "ballerinax/slack",
            description: "Provides a Ballerina client for the Slack API.",
        },
        {
            name: "ballerinax/http",
            description: "Allows to interact with HTTP services.",
        },
    ],
    null,
    2
)}
**Query**: Write an application to read GitHub issues, summarize them, and post the summary to a Slack channel.
**Tool Call**: Call with libraryNames: ["ballerinax/github", "ballerinax/slack", "ballerinax/azure.openai.chat"]

Before calling this tool:
- **Review all library descriptions** below.
- Select only the libraries that might be needed to fulfill the user query.

Available libraries:
${libraryDescriptions}`,
        inputSchema: LibraryProviderToolSchema,
        execute: async (input: { libraryNames: string[]; userPrompt: string }) => {
            console.log(
                `[LibraryProviderTool] Called with ${input.libraryNames.length} libraries: ${input.libraryNames.join(
                    ", "
                )} and prompt: ${input.userPrompt}`
            );
            return await LibraryProviderTool(input, generationType);
        },
    });
}
