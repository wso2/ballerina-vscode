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

import { generateObject, CoreMessage, tool, generateText, Output } from "ai";
import { z } from "zod";
import {
    MinifiedLibrary,
    QueryIcon,
    RelevantLibrariesAndFunctionsRequest,
    RelevantLibrariesAndFunctionsResponse,
} from "@wso2/ballerina-core";
import { Client, Library, RemoteFunction, ResourceFunction, TypeDefinition } from "./libs_types";
import { getMaximizedSelectedLibs, selectRequiredFunctions } from "./funcs";
import { getAnthropicClient, ANTHROPIC_HAIKU, ANTHROPIC_SONNET_3_5, ANTHROPIC_SONNET_4 } from "../connection";
import { AIPanelAbortController } from "../../../../rpc-managers/ai-panel/utils";

import { getAllLibraries } from "./libs";

export enum GenerationType {
    CODE_GENERATION = "CODE_GENERATION",
    HEALTHCARE_GENERATION = "HEALTHCARE_GENERATION",
}

interface LibraryListResponse {
    libraries: string[];
}

export const RelevantLibSubsetSchema = z.array(
    z.object({
        name: z.string(),
        clients: z.array(z.string()).optional(),
        functions: z.array(z.string()).optional(),
    })
);

export async function getRelevantLibrariesAndFunctionsFromTool(
    params: RelevantLibrariesAndFunctionsRequest,
    generationType: GenerationType
): Promise<RelevantLibrariesAndFunctionsResponse> {
    const relevantTrimmedFuncs: Library[] = await getRequiredFunctions(params.query, generationType);
    console.log("Selected Trimmed Functions:", relevantTrimmedFuncs);

    return {
        libraries: relevantTrimmedFuncs,
    };
}

export async function getRequiredFunctions(prompt: string, generationType: GenerationType): Promise<Library[]> {
    const allLibraries = await getAllLibraries(generationType);

    let selectedLibs: Library[] = [];
    if (allLibraries.length === 0) {
        return [];
    }

    console.log("Available libraries:", allLibraries.map((lib) => lib.name).join(", "));

    const systemPrompt = `
You are an AI assistant that helps select and filter relevant Ballerina libraries, clients, and functions based on a user query.

You will be given:
- A user query describing an application or task
- A list of available libraries (names + descriptions) in the tool description

Your responsibilities:
1. **Step 1**: Identify which libraries are relevant to the query.
2. **Step 2**: Call the tool \`GetRequiredFunctions\` with those library names. It will return all clients and functions in those libraries.
3. **Step 3**: Analyze the returned data and **filter out any irrelevant clients and functions**, keeping only those directly related to the query.

**Important Notes**:
- If the query is healthcare-related (mentions FHIR, HL7, patient data, clinical systems, etc.), always include all of the following libraries in the tool input:
  - ballerinax/health.base
  - ballerinax/health.fhir.r4
  - ballerinax/health.fhir.r4.parser
  - ballerinax/health.fhir.r4.international401
  - ballerinax/health.hl7v2commons
  - ballerinax/health.hl7v2

**Filtering Instructions**:
- Use the tool output as your working set.
- Then, apply reasoning to select only the relevant:
  - Libraries
  - Clients
  - Functions (inside clients or top-level functions)
- Remove any unrelated items.
- Return only the final filtered data.

**Final Output Format**:
Return a valid JSON array where each item has:
- "name": the library name
- "clients": (optional) relevant client names
- "functions": (optional) relevant function names

Example:
[
  {
    "name": "ballerina/http",
    "clients": ["Client"],
    "functions": ["get", "post"]
  }
]

- Do not include any markdown, code blocks, or explanations.
- Return only JSON — plain, valid, and parsable.
- Provide experimental output in the \`experimental_output\` according to the schema.


Think step-by-step. Use the tool to get full data, then prune it carefully based on the query.
`.trim();

    const userPrompt = `
# USER QUERY
${prompt}
`.trim();

    const GetRequiredFunctions = tool({
        description: `
This tool analyzes a user query and returns **all** clients and functions from the selected Ballerina libraries.

Before calling this tool:
- **Review all library descriptions** below.
- Select only the libraries that might be needed to fulfill the user query.

Available libraries:
${allLibraries.map((lib) => `- ${lib.name}: ${lib.description}`).join("\n")}

### Input
- \`selectedLibs\` (string[]): An array of Ballerina library names (e.g., ["ballerinax/github", "ballerinax/slack"])

### Instruction
After calling this tool, you will receive **all clients and functions** in the selected libraries.
Then, you must **filter and return only** those clients/functions relevant to the user's query in your final output.

Treat the tool output as raw input — **your final response must contain only filtered, relevant information**.
  `.trim(),

        parameters: z.object({
            selectedLibNames: z.array(z.string()),
        }),

        async execute({ selectedLibNames }) {
            console.log("Selected libraries for function extraction:", selectedLibNames);
            selectedLibs = await getMaximizedSelectedLibs(selectedLibNames, generationType);
            console.log("Maximized selected libraries:", selectedLibs);
            return selectedLibs;
        },
    });

    const messages: CoreMessage[] = [
        {
            role: "system",
            content: systemPrompt,
            providerOptions: {
                anthropic: { cacheControl: { type: "ephemeral" } },
            },
        },
        {
            role: "user",
            content: userPrompt, // Your user input or question
        },
    ];
    console.log("Generating library selection prompt");
    const startTime = Date.now();

    const results = await generateText({
        model: await getAnthropicClient(ANTHROPIC_SONNET_4),
        maxTokens: 4096,
        temperature: 0,
        maxSteps: 5,
        tools: { GetRequiredFunctions },
        messages,
        experimental_output: Output.object({
            schema: getFunctionsResponseSchema,
        }),
        abortSignal: AIPanelAbortController.getInstance().signal,
    });

    const endTime = Date.now();
    console.log(`Library selection took ${endTime - startTime}ms`);
    console.log("Generated library selection:", results);

    console.log("Generated library selection raw text:\n", results.text);

    // Try experimental output first, with type guard and filter
    let filteredOutput = undefined;
    console.log("Using experimental output for library selection", results.experimental_output);

    if (results.experimental_output && Array.isArray(results.experimental_output.libraries)) {
        console.log("Using experimental output for library selection", results.experimental_output);
        filteredOutput = results.experimental_output.libraries.filter((item) => !!item.name);
    }

    // If no valid experimental output, fallback to parsing raw text output
    if (!filteredOutput || filteredOutput.length === 0) {
        filteredOutput = extractJsonFromMarkdown(results.text);

        console.log("Extracted JSON from markdown:", filteredOutput);
        console.log("Filtered output type:", typeof filteredOutput, Array.isArray(filteredOutput));
        // If extractJsonFromMarkdown returns something invalid or not an array, fallback to empty
        if (!Array.isArray(filteredOutput)) {
            filteredOutput = [];
        } else {
            // Filter again for safety
            filteredOutput = filteredOutput.filter(
                (item): item is { name: string; clients?: string[]; functions?: string[] } => !!item.name
            );
        }
    }

    // Now map the filtered subset to full libraries using your function
    const mappedLibraries = mapSubsetToFullLibraries(filteredOutput, selectedLibs);
    console.log("Mapped libraries:", mappedLibraries);

    return mappedLibraries;
}

export function mapSubsetToFullLibraries(
    subset: {
        name: string;
        clients?: {
            name: string;
            functions: { name: string; parameters: string[]; returnType: string }[];
        }[];
        functions?: { name: string; parameters: string[]; returnType: string }[];
    }[],
    allLibraries: Library[]
): Library[] {
    return subset
        .map((subLib) => {
            const fullLib = allLibraries.find((lib) => lib.name === subLib.name);
            if (!fullLib) {
                return null;
            }

            const usedTypes = new Set<string>();

            // Extract function names
            const selectedFunctionNames = subLib.functions?.map((f) => f.name) ?? [];

            // Collect top-level functions
            const filteredFunctions = (fullLib.functions || []).filter((func) => {
                const keep = selectedFunctionNames.includes(func.name) || func.name === "init";
                if (keep) {
                    func.parameters.forEach((p) => usedTypes.add(p.type.name));
                    usedTypes.add(func.return.type.name);
                }
                return keep;
            });

            // Extract selected client names
            const selectedClientNames = subLib.clients?.map((c) => c.name) ?? [];

            // Filter clients
            const filteredClients = fullLib.clients.filter((client) => selectedClientNames.includes(client.name));

            // Filter client functions
            const mappedClients = filteredClients.map((client) => {
                const selectedClient = subLib.clients?.find((c) => c.name === client.name);
                const selectedFuncNames = selectedClient?.functions?.map((f) => f.name) ?? [];

                const filteredFuncs = client.functions.filter((func) => {
                    if ("accessor" in func) {
                        func.parameters.forEach((p) => usedTypes.add(p.type.name));
                        usedTypes.add(func.return.type.name);
                        return true; // keep all resource functions
                    } else {
                        const keep = selectedFuncNames.includes(func.name) || func.name === "init";
                        if (keep) {
                            func.parameters.forEach((p) => usedTypes.add(p.type.name));
                            usedTypes.add(func.return.type.name);
                        }
                        return keep;
                    }
                });

                return {
                    ...client,
                    functions: filteredFuncs,
                };
            });

            // Normalize type names and match
            const filteredTypeDefs = fullLib.typeDefs.filter((td) => {
                const normTd = normalizeTypeName(td.name);
                for (const used of usedTypes) {
                    if (normalizeTypeName(used) === normTd) {
                        return true;
                    }
                }
                return false;
            });

            return {
                ...fullLib,
                clients: mappedClients,
                functions: filteredFunctions.length ? filteredFunctions : undefined,
                typeDefs: filteredTypeDefs,
            };
        })
        .filter((lib) => lib !== null) as Library[];
}

// export function mapSubsetToFullLibraries(
//     subset: { name: string; clients?: string[]; functions?: string[] }[],
//     allLibraries: Library[]
// ): Library[] {
//     return subset
//         .map((subLib) => {
//             const fullLib = allLibraries.find((lib) => lib.name === subLib.name);
//             if (!fullLib) return null;

//             const usedTypes = new Set<string>();

//             // Filter top-level functions
//             const filteredFunctions: RemoteFunction[] = subLib.functions
//                 ? (fullLib.functions || []).filter((func) => {
//                       const keep = subLib.functions!.includes(func.name) || func.name === "init";
//                       if (keep) {
//                           func.parameters.forEach((p) => usedTypes.add(p.type.name));
//                           usedTypes.add(func.return.type.name);
//                       }
//                       return keep;
//                   })
//                 : fullLib.functions;

//             // Filter clients and their functions
//             const filteredClients = subLib.clients
//                 ? fullLib.clients.filter((client) => subLib.clients!.includes(client.name))
//                 : fullLib.clients;

//             const mappedClients = filteredClients.map((client) => {
//                 const filteredFuncs = client.functions.filter((func) => {
//                     if ("accessor" in func) {
//                         // Resource function - keep only if all retained
//                         func.parameters.forEach((p) => usedTypes.add(p.type.name));
//                         usedTypes.add(func.return.type.name);
//                         return true;
//                     } else {
//                         const keep = !subLib.functions || subLib.functions.includes(func.name) || func.name === "init";
//                         if (keep) {
//                             func.parameters.forEach((p) => usedTypes.add(p.type.name));
//                             usedTypes.add(func.return.type.name);
//                         }
//                         return keep;
//                     }
//                 });

//                 return {
//                     ...client,
//                     functions: filteredFuncs,
//                 };
//             });

//             console.log("Used types:", usedTypes);
//             // Include only used typedefs
//             const filteredTypeDefs = fullLib.typeDefs.filter((td) => {
//                 const normalized = normalizeTypeName(td.name);
//                 for (const used of usedTypes) {
//                     if (normalizeTypeName(used) === normalized) {
//                         return true;
//                     }
//                 }
//                 return false;
//             });

//             return {
//                 ...fullLib,
//                 clients: mappedClients,
//                 functions: filteredFunctions?.length ? filteredFunctions : undefined,
//                 typeDefs: filteredTypeDefs,
//             };
//         })
//         .filter((lib) => lib !== null) as Library[];
// }

function normalizeTypeName(name: string): string {
    return name
        .replace(/\?$/, "") // remove trailing ?
        .replace(/^map<(.+)>$/, "$1") // unwrap map<>
        .replace(/^\[(.+)\]$/, "$1") // unwrap []
        .replace(/\|.*$/, "") // remove unions like <>|error
        .trim();
}

function extractJsonFromMarkdown(text: string): any {
    let jsonStr = text.trim();

    // Remove ```json blocks
    if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7); // remove ```json
    }
    if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3); // remove ending ```
    }

    // Optional: basic fix for missing commas between top-level fields (e.g., between ] } or } { )
    jsonStr = jsonStr.replace(/}\s*{/g, "},\n{"); // patch object to array if accidentally concatenated

    try {
        return JSON.parse(jsonStr);
    } catch (err) {
        console.error("Failed to parse extracted JSON:", err);
        console.error("Broken JSON string:\n", jsonStr);
        return null;
    }
}

const getFunctionsResponseSchema = z.object({
    libraries: z.array(
        z.object({
            name: z.string(),
            clients: z
                .array(
                    z.object({
                        name: z.string(),
                        description: z.string(),
                        functions: z.array(
                            z.union([
                                z.object({
                                    name: z.string(),
                                    parameters: z.array(z.string()),
                                    returnType: z.string(),
                                }),
                                z.object({
                                    accessor: z.string(),
                                    paths: z.array(
                                        z.union([
                                            z.string(),
                                            z.object({
                                                name: z.string(),
                                                type: z.string(),
                                            }),
                                        ])
                                    ),
                                    parameters: z.array(z.string()),
                                    returnType: z.string(),
                                }),
                            ])
                        ),
                    })
                )
                .optional(), // mark as optional if it's not always present
            functions: z
                .array(
                    z.object({
                        name: z.string(),
                        parameters: z.array(z.string()),
                        returnType: z.string(),
                    })
                )
                .optional(), // mark as optional if not always present
        })
    ),
});
