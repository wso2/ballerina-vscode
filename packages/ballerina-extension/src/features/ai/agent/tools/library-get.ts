// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

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
import { GenerationType } from "../../utils/libs/libraries";
import { jsonSchema } from "ai";
import { Library } from "../../utils/libs/library-types";
import { selectRequiredFunctions } from "../../utils/libs/function-registry";
import { toSyntaxString } from "../../utils/libs/to-syntax-string";
import { CopilotEventHandler } from "../../utils/events";
import * as fs from "fs";

export const LIBRARY_GET_TOOL = "LibraryGetTool";

/**
 * Counts tokens for the given content by calling the Anthropic token counting API.
 * This is a debug/measurement utility — safe to remove entirely.
 */
async function logTokenCount(content: string, label: string): Promise<void> {
    const apiKey = process.env.ANTHROPIC_API_KEY1;
    if (!apiKey) {
        console.log(`[LibraryGetTool][TokenCount] ANTHROPIC_API_KEY not set, skipping token count for ${label}.`);
        return;
    }

    try {
        const response = await fetch("https://api.anthropic.com/v1/messages/count_tokens", {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "content-type": "application/json",
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-5",
                messages: [{ role: "user", content }],
            }),
        });

        if (!response.ok) {
            console.error(`[LibraryGetTool][TokenCount] API error for ${label}: ${response.status} ${response.statusText}`);
            return;
        }

        const result: any = await response.json();
        console.log(`[LibraryGetTool][TokenCount] ${label}: ${result.input_tokens} tokens`);
    } catch (error) {
        console.error(`[LibraryGetTool][TokenCount] Failed to count tokens for ${label}: ${error}`);
    }
}

/**
 * Emits tool_result event for library get with filtering
 */
function emitLibraryToolResult(
    eventHandler: CopilotEventHandler,
    toolName: string,
    libraries: Library[],
    requestedLibraryNames: string[],
    toolCallId: string
): void {
    const libraryNames = libraries.map(lib => lib.name);
    const filteredNames = libraryNames.filter(name => requestedLibraryNames.includes(name));

    eventHandler({
        type: "tool_result",
        toolName,
        toolOutput: filteredNames,
        toolCallId
    });
}

const LibraryGetToolSchema = jsonSchema<{
    libraryNames: string[];
    userPrompt: string;
}>({
    type: "object",
    properties: {
        libraryNames: {
            type: "array",
            items: { type: "string" },
            description: "List of Ballerina libraries to fetch details for. Each library name should be in the format 'organization/libraryName'",
        },
        userPrompt: {
            type: "string",
            description: "User query to determine which libraries are needed to fulfill the request",
        },
    },
    required: ["libraryNames", "userPrompt"],
});

export async function LibraryGetTool(
    params: { libraryNames: string[]; userPrompt: string },
    generationType: GenerationType,
    eventHandler: CopilotEventHandler,
    toolCallId: string
): Promise<Library[]> {
    try {
        // Emit tool_call event with ID from AI SDK
        eventHandler({
            type: "tool_call",
            toolName: LIBRARY_GET_TOOL,
            toolCallId
        });

        const startTime = Date.now();
        const libraries = await selectRequiredFunctions(params.userPrompt, params.libraryNames, generationType);
        console.log(
            `[LibraryGetTool] Fetched ${libraries.length} libraries: ${libraries
                .map((lib) => lib.name)
                .join(", ")}, took ${(Date.now() - startTime) / 1000}s`
        );

        // Emit tool_result event with filtered library names and ID
        emitLibraryToolResult(eventHandler, LIBRARY_GET_TOOL, libraries, params.libraryNames, toolCallId);

        return libraries;
    } catch (error) {
        console.error(`[LibraryGetTool] Error fetching libraries: ${error}`);

        // Emit error result with same ID
        eventHandler({
            type: "tool_result",
            toolName: LIBRARY_GET_TOOL,
            toolOutput: [],
            toolCallId
        });

        return [];
    }
}

export function getLibraryGetTool(
    generationType: GenerationType,
    eventHandler: CopilotEventHandler
) {
    return tool({
        description: `Fetches detailed information about Ballerina libraries along with their API documentation, including services, clients, functions, and types.
This tool analyzes a user query and returns **only the relevant** services, clients, functions, and types from the selected Ballerina libraries based on the provided user prompt.

Before calling this tool:
- First use LibrarySearchTool to discover available libraries based on keywords
- Review the library names and descriptions returned from the search
- Analyze the user query to identify the relevant Ballerina libraries which can be utilized to fulfill the query
- Select the minimal set of libraries that can fulfill the query based on their descriptions

# Example
**Query**: Write an integration to read GitHub issues, summarize them, and post the summary to a Slack channel.
**Step 1**: Call LibrarySearchTool with keywords: ["GitHub", "Slack", "OpenAI"]
**Step 2**: Call this tool with libraryNames: ["ballerinax/github", "ballerinax/slack", "ballerinax/azure.openai.chat"]

Tool Response:
Tool responds with the following information about the requested libraries:
name, description, type definitions (records, objects, enums, type aliases), clients (if any), functions and services (if any).

`,
        inputSchema: LibraryGetToolSchema,
        execute: async (input: { libraryNames: string[]; userPrompt: string }, context?: { toolCallId?: string }) => {
            // Extract toolCallId from AI SDK context
            const toolCallId = context?.toolCallId || `fallback-${Date.now()}`;

            console.log(
                `[LibraryGetTool] Called with ${input.libraryNames.length} libraries: ${input.libraryNames.join(
                    ", "
                )} and prompt: ${input.userPrompt} [toolCallId: ${toolCallId}]`
            );
            const rawLibraries: Library[] = await LibraryGetTool(input, generationType, eventHandler, toolCallId);
            const beforeContent = JSON.stringify(rawLibraries);
            const afterContent = toSyntaxString(rawLibraries);
            await Promise.all([
                logTokenCount(beforeContent, "before toSyntaxString"),
                logTokenCount(afterContent, "after toSyntaxString"),
            ]);

            // --- Write beforeContent to test resource file (comment/uncomment to toggle) ---
            fs.writeFileSync("/Users/wso2/repos/vscode-extensions/workspaces/ballerina/ballerina-extension/test/ai/unit_tests/libs/resources/input/library-get-tool.json", beforeContent, "utf-8");
            // --- End test resource write ---

            return afterContent;
        },
    });
}
