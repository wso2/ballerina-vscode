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

import { tool, jsonSchema } from "ai";
import { CopilotEventHandler } from "../../utils/events";
import { langClient } from "../../activator";
import { CopilotSearchLibrariesBySearchRequest, CopilotSearchLibrariesBySearchResponse, MinifiedLibrary } from "@wso2/ballerina-core";

export const LIBRARY_SEARCH_TOOL = "LibrarySearchTool";

// Maximum number of keywords allowed for library search
const MAX_SEARCH_KEYWORDS = 10;

const LibrarySearchToolSchema = jsonSchema<{
    keywords: string[];
    searchDescription?: string;
}>({
    type: "object",
    properties: {
        keywords: {
            type: "array",
            items: { type: "string" },
            description: `Array of search keywords to find relevant Ballerina libraries. Keywords are weighted by order - first keyword has highest weight, subsequent keywords have decreasing weight. Maximum ${MAX_SEARCH_KEYWORDS} keywords allowed. Examples: ["GitHub", "API", "integration"], ["Stripe", "payment", "gateway"], ["HTTP", "REST", "service"]`,
            minItems: 1,
            maxItems: MAX_SEARCH_KEYWORDS,
        },
        searchDescription: {
            type: "string",
            description: "Optional user-friendly description of what libraries are being searched for (e.g., 'payment processing libraries', 'GitHub API connectors', 'email sending services'). This will be shown to the user during the search to provide context about what is being looked for.",
        },
    },
    required: ["keywords"],
});

function emitLibrarySearchResult(
    eventHandler: CopilotEventHandler,
    toolName: string,
    libraries: MinifiedLibrary[],
    toolCallId: string,
    searchDescription?: string
): void {
    const libraryNames = libraries.map(lib => lib.name);
    eventHandler({
        type: "tool_result",
        toolName,
        toolOutput: {
            libraries: libraryNames,
            searchDescription
        },
        toolCallId
    });
}

export async function LibrarySearchTool(
    params: { keywords: string[]; searchDescription?: string },
    eventHandler: CopilotEventHandler,
    toolCallId: string
): Promise<CopilotSearchLibrariesBySearchResponse> {
    try {
        // Emit tool_call event with ID and description
        eventHandler({
            type: "tool_call",
            toolName: LIBRARY_SEARCH_TOOL,
            toolInput: {
                keywords: params.keywords,
                searchDescription: params.searchDescription
            },
            toolCallId
        });

        const startTime = Date.now();

        // Validate keyword count
        const keywords = params.keywords.slice(0, MAX_SEARCH_KEYWORDS);
        if (keywords.length === 0) {
            console.warn(`[LibrarySearchTool] No keywords provided`);
            return { libraries: [] };
        }
        
        const request: CopilotSearchLibrariesBySearchRequest = {
            keywords
        };

        const response: CopilotSearchLibrariesBySearchResponse =
            await langClient.getCopilotLibrariesBySearch(request);

        const libraryNames = response.libraries.map(lib => lib.name);
        console.log(
            `[LibrarySearchTool] Searched with keywords: [${keywords.join(", ")}], found ${response.libraries.length} libraries: ${libraryNames.join(
                ", "
            )}, took ${(Date.now() - startTime) / 1000}s`
        );

        // Emit tool_result event with same ID and description
        emitLibrarySearchResult(eventHandler, LIBRARY_SEARCH_TOOL, response.libraries, toolCallId, params.searchDescription);

        return { libraries: response.libraries };
    } catch (error) {
        console.error(`[LibrarySearchTool] Error searching libraries: ${error}`);

        // Emit error result with same ID and description
        eventHandler({
            type: "tool_result",
            toolName: LIBRARY_SEARCH_TOOL,
            toolOutput: {
                libraries: [],
                searchDescription: params.searchDescription
            },
            toolCallId
        });

        return { libraries: [] };
    }
}

export function getLibrarySearchTool(
    eventHandler: CopilotEventHandler
) {
    return tool({
        description: `Searches for Ballerina libraries from Ballerina Central based on weighted keywords.

**Purpose:**
This tool discovers relevant Ballerina libraries using keyword-based search. It searches against library names, descriptions, and function names. Keywords are weighted by order - the first keyword has the highest weight, with decreasing weight for subsequent keywords.

**Scope - ALL Ballerina Libraries:**
- **ballerina/*** - Standard/core libraries (e.g., ballerina/http, ballerina/io, ballerina/sql)
- **ballerinax/*** - Extended/connector packages (e.g., ballerinax/stripe, ballerinax/aws.s3, ballerinax/github)
- **xlibb/*** - C library bindings (e.g., xlibb/docreader)
- Other organization packages available in Ballerina Central

**Keyword Guidelines:**
- Provide 1-${MAX_SEARCH_KEYWORDS} keywords ordered by importance
- First keyword = most important (highest weight in search)
- Subsequent keywords = less important (decreasing weight)
- Use specific terms (e.g., "Stripe", "GitHub", "PostgreSQL") before generic ones (e.g., "payment", "API", "database")

**When to use this tool:**
- To discover which libraries are available for a specific use case or integration
- Before calling LibraryProviderTool to retrieve full library details
- When the user query mentions integrations, services, connectors, or specific functionality
- Whenever you need to find relevant libraries but don't know the exact library names

**Important - Two-Step Workflow:**
1. First, call THIS tool (LibrarySearchTool) with weighted keywords to discover relevant libraries
2. Review the returned library names and descriptions
3. Select the most appropriate libraries (typically 1-5 libraries)
4. Then, call LibraryProviderTool with the selected library names to get detailed API documentation (functions, types, clients, services, etc.)

**Example Workflows:**

Example 1 - Stripe Integration:
User query: "I need to integrate with Stripe payment gateway"
Keywords: ["Stripe", "payment", "gateway"]  // "Stripe" has highest weight
Call LibrarySearchTool with keywords: ["Stripe", "payment", "gateway"]
→ Returns: [
    { name: "ballerinax/stripe", description: "Connects to Stripe API for payment processing" }
  ]
Then call LibraryProviderTool with libraryNames: ["ballerinax/stripe"]

Example 2 - GitHub API:
User query: "Create a GitHub integration to list issues"
Keywords: ["GitHub", "API", "issues"]  // "GitHub" has highest weight
Call LibrarySearchTool with keywords: ["GitHub", "API", "issues"]
→ Returns: [
    { name: "ballerinax/github", description: "GitHub API connector for repository management" }
  ]
Then call LibraryProviderTool with libraryNames: ["ballerinax/github"]

Example 3 - HTTP Service:
User query: "Create a REST API"
Keywords: ["HTTP", "REST", "API"]  // "HTTP" has highest weight
Call LibrarySearchTool with keywords: ["HTTP", "REST", "API"]
→ Returns: [
    { name: "ballerina/http", description: "HTTP client and server implementation" }
  ]
Then call LibraryProviderTool with libraryNames: ["ballerina/http"]

**Tool Response Format:**
Returns an array of library objects, each containing name and description:
[
  { name: "ballerinax/stripe", description: "Stripe payment connector for processing payments..." },
  { name: "ballerinax/aws.s3", description: "AWS S3 connector for object storage operations..." },
  { name: "ballerina/http", description: "HTTP client and server implementation..." }
]
`,
        inputSchema: LibrarySearchToolSchema,
        execute: async (input: { keywords: string[]; searchDescription?: string }, context?: { toolCallId?: string }) => {
            // Extract toolCallId from AI SDK context
            const toolCallId = context?.toolCallId || `fallback-${Date.now()}`;

            console.log(
                `[LibrarySearchTool] Called with keywords: [${input.keywords.join(", ")}] [toolCallId: ${toolCallId}] [description: ${input.searchDescription || 'none'}]`
            );
            return await LibrarySearchTool(input, eventHandler, toolCallId);
        },
    });
}
