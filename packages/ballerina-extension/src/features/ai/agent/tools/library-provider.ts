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
import { GenerationType } from "../../utils/libs/libraries";
import { jsonSchema } from "ai";
import { Library } from "../../utils/libs/library-types";
import { selectRequiredFunctions } from "../../utils/libs/function-registry";
import { CopilotEventHandler } from "../../utils/events";
import { LIBRARY_PROVIDER_TOOL } from "../../utils/libs/libraries";
import { EXTERNAL_LIBRARY_SEARCH_TOOL } from "./external-library-search";

/**
 * Emits tool_result event for library provider with filtering
 */
function emitLibraryToolResult(
    eventHandler: CopilotEventHandler,
    toolName: string,
    libraries: Library[],
    requestedLibraryNames: string[]
): void {
    const libraryNames = libraries.map(lib => lib.name);
    const filteredNames = libraryNames.filter(name => requestedLibraryNames.includes(name));

    eventHandler({
        type: "tool_result",
        toolName,
        toolOutput: filteredNames
    });
}

const LibraryProviderToolSchema = jsonSchema<{
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

export async function LibraryProviderTool(
    params: { libraryNames: string[]; userPrompt: string },
    generationType: GenerationType,
    eventHandler: CopilotEventHandler
): Promise<Library[]> {
    try {
        // Emit tool_call event
        eventHandler({
            type: "tool_call",
            toolName: LIBRARY_PROVIDER_TOOL,
        });

        const startTime = Date.now();
        const libraries = await selectRequiredFunctions(params.userPrompt, params.libraryNames, generationType);
        console.log(
            `[LibraryProviderTool] Fetched ${libraries.length} libraries: ${libraries
                .map((lib) => lib.name)
                .join(", ")}, took ${(Date.now() - startTime) / 1000}s`
        );

        // Emit tool_result event with filtered library names
        emitLibraryToolResult(eventHandler, LIBRARY_PROVIDER_TOOL, libraries, params.libraryNames);

        return libraries;
    } catch (error) {
        console.error(`[LibraryProviderTool] Error fetching libraries: ${error}`);

        // Emit error result
        eventHandler({
            type: "tool_result",
            toolName: LIBRARY_PROVIDER_TOOL,
            toolOutput: []
        });

        return [];
    }
}

export function getLibraryProviderTool(
    libraryDescriptions: string,
    generationType: GenerationType,
    eventHandler: CopilotEventHandler
) {
    return tool({
        description: `Fetches detailed information about Ballerina libraries along with their API documentation, including services, clients, functions, and types.
This tool analyzes a user query and returns **only the relevant** services, clients, functions, and types from the selected Ballerina libraries based on the provided user prompt.

**This tool has a single purpose: fetch library descriptions. However, there are two cases for how to obtain library names:**

## Case 1: Core Ballerina Libraries (Direct Usage)
For core Ballerina libraries (packages starting with **ballerina/**) listed below, you can directly call this tool with the library names.

Available core libraries:
<AVAILABLE LIBRARIES>
${libraryDescriptions}
</AVAILABLE LIBRARIES>

**Workflow for core libraries:**
1. Review the library names and descriptions above
2. Analyze the user query to identify relevant core Ballerina libraries (ballerina/*)
3. Call this tool directly with the selected library names and user prompt

## Case 2: External Libraries (Two-Step Process)
For external libraries NOT listed in the core libraries above, you MUST follow a two-step process.

**External libraries include:**
- **ballerinax/*** - Extended/connector packages
- **xlibb/*** - C library bindings
- Any other organization packages available in Ballerina Central

**Workflow for external libraries:**
1. **FIRST**: Call ${EXTERNAL_LIBRARY_SEARCH_TOOL} with the user prompt to search for relevant external libraries from Ballerina Central
   - This searches across ballerinax/*, xlibb/*, and any other organization packages
2. **THEN**: Call this tool ${LIBRARY_PROVIDER_TOOL} with the library names returned from step 1

**How to decide which case applies:**
- If the library starts with **ballerina/** and is in the "Available core libraries" list above → Use Case 1 (direct call)
- If the library starts with **ballerinax/**, **xlibb/**, or any other organization → Use Case 2 (search first)

Tool Response:
Tool responds with the following information about the requested libraries:
name, description, type definitions (records, objects, enums, type aliases), clients (if any), functions and services (if any).
`,
        inputSchema: LibraryProviderToolSchema,
        execute: async (input: { libraryNames: string[]; userPrompt: string }) => {
            console.log(
                `[LibraryProviderTool] Called with ${input.libraryNames.length} libraries: ${input.libraryNames.join(
                    ", "
                )} and prompt: ${input.userPrompt}`
            );
            return await LibraryProviderTool(input, generationType, eventHandler);
        },
    });
}
