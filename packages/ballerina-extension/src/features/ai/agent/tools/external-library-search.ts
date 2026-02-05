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

import { tool, jsonSchema } from "ai";
import { CopilotEventHandler } from "../../utils/events";
import { langClient } from "../../activator";
import { CopilotSearchPackagesByPromptRequest, CopilotSearchPackagesByPromptResponse, ExternalLibrarySearchResult, MinifiedLibrary } from "@wso2/ballerina-core";

export const EXTERNAL_LIBRARY_SEARCH_TOOL = "ExternalLibrarySearchTool";

const ExternalLibrarySearchToolSchema = jsonSchema<{
    userPrompt: string;
}>({
    type: "object",
    properties: {
        userPrompt: {
            type: "string",
            description: "User query to search for relevant external library names from Ballerina Central",
        },
    },
    required: ["userPrompt"],
});

function emitExternalLibrarySearchResult(
    eventHandler: CopilotEventHandler,
    toolName: string,
    libraries: MinifiedLibrary[]
): void {
    const libraryNames = libraries.map(lib => lib.name);
    eventHandler({
        type: "tool_result",
        toolName,
        toolOutput: libraryNames
    });
}

export async function ExternalLibrarySearchTool(
    params: { userPrompt: string },
    eventHandler: CopilotEventHandler
): Promise<ExternalLibrarySearchResult> {
    try {
        // Emit tool_call event
        eventHandler({
            type: "tool_call",
            toolName: EXTERNAL_LIBRARY_SEARCH_TOOL,
        });

        const startTime = Date.now();

        // Call the LS API to search for packages by prompt
        const request: CopilotSearchPackagesByPromptRequest = {
            userPrompt: params.userPrompt
        };

        const response: CopilotSearchPackagesByPromptResponse =
            await langClient.getCopilotPackagesByPrompt(request);

        const libraryNames = response.libraries.map(lib => lib.name);
        console.log(
            `[ExternalLibrarySearchTool] Found ${response.libraries.length} libraries: ${libraryNames.join(
                ", "
            )}, took ${(Date.now() - startTime) / 1000}s`
        );

        // Emit tool_result event
        emitExternalLibrarySearchResult(eventHandler, EXTERNAL_LIBRARY_SEARCH_TOOL, response.libraries);

        return { libraries: response.libraries };
    } catch (error) {
        console.error(`[ExternalLibrarySearchTool] Error searching libraries: ${error}`);

        // Emit error result
        eventHandler({
            type: "tool_result",
            toolName: EXTERNAL_LIBRARY_SEARCH_TOOL,
            toolOutput: []
        });

        return { libraries: [] };
    }
}

export function getExternalLibrarySearchTool(
    eventHandler: CopilotEventHandler
) {
    return tool({
        description: `Searches for external Ballerina libraries from Ballerina Central based on a user query.

**Purpose:**
This tool searches Ballerina Central to find relevant external libraries (packages not listed in the core Ballerina libraries) that match the user's requirements. Returns both library names AND descriptions for better context.

It searches for external libraries, primarily:
- **ballerinax/*** - Extended/connector packages (e.g., ballerinax/stripe, ballerinax/aws.s3, ballerinax/github)
- **xlibb/*** - C library bindings (e.g., xlibb/docreader)
- Any other organization packages available in Ballerina Central

Note: Core Ballerina libraries (ballerina/*) are typically pre-loaded and don't require searching, but if a ballerina/* package is not in the pre-loaded list, this tool can find it.

**When to use this tool:**
- When the user's query requires libraries starting with **ballerinax/** or **xlibb/** (external libraries)
- When you need to discover what external packages are available for a specific use case
- Before calling LibraryProviderTool with external library names
- For third-party connectors, service integrations, or C library bindings

**Important:**
- This tool returns library names WITH descriptions for better selection context
- After getting libraries from this tool, you MUST call LibraryProviderTool to get the detailed library information (functions, types, etc.)
- This tool searches ALL packages from Ballerina Central that are not already in the pre-loaded core library list

**Workflow for external libraries:**
1. First, call this tool (ExternalLibrarySearchTool) with the user query to get relevant libraries with descriptions
2. Review the library names and descriptions to select the most appropriate ones
3. Then, call LibraryProviderTool with the selected library names to get detailed library information (functions, types, clients, etc.)

**Example:**
User query: "I need to integrate with Stripe payment gateway"
1. Call ExternalLibrarySearchTool with userPrompt: "Stripe payment gateway integration"
   → Returns: [
       { name: "ballerinax/stripe", description: "Connects to Stripe API for payment processing" }
     ]
2. Call LibraryProviderTool with libraryNames: ["ballerinax/stripe"] to get full library details with functions and types

**Tool Response:**
Returns an array of library objects with name and description:
[
  { name: "ballerinax/stripe", description: "Stripe payment connector..." },
  { name: "ballerinax/aws.s3", description: "AWS S3 connector..." },
  { name: "xlibb/docreader", description: "Document reader C library binding..." }
]

Note: Core libraries (ballerina/*) are typically pre-loaded and don't require searching.
`,
        inputSchema: ExternalLibrarySearchToolSchema,
        execute: async (input: { userPrompt: string }) => {
            console.log(
                `[ExternalLibrarySearchTool] Called with prompt: ${input.userPrompt}`
            );
            return await ExternalLibrarySearchTool(input, eventHandler);
        },
    });
}
