import { generateObject, CoreMessage, generateText } from "ai";

import { BACKEND_URL } from "../../utils";
import { GetFunctionResponse, GetFunctionsRequest, GetFunctionsResponse, getFunctionsResponseSchema, MinifiedClient, MinifiedRemoteFunction, MinifiedResourceFunction } from "./funcs_inter_types";
import { Client, GetTypeResponse, Library, RemoteFunction, ResourceFunction } from "./libs_types";
import { anthropic } from "../connection";
import { GenerationType } from "./libs";
import { getRequiredTypesFromLibJson } from "../healthcare/healthcare";
import { langClient } from "../../activator";
import { getGenerationMode } from "../utils";


export async function selectRequiredFunctions(prompt: string, selectedLibNames: string[], generationType: GenerationType): Promise<Library[]> {
    const selectedLibs: Library[] = await getMaximizedSelectedLibs(selectedLibNames, generationType);
    const functionsResponse: GetFunctionResponse[] = await getRequiredFunctions(selectedLibNames, prompt, selectedLibs);
    let typeLibraries: Library[] = [];
    if (generationType === GenerationType.HEALTHCARE_GENERATION) { 
        const resp: GetTypeResponse[] = await getRequiredTypesFromLibJson(selectedLibNames, prompt, selectedLibs);
        typeLibraries = toTypesToLibraries(resp, selectedLibs);
    }
    const maximizedLibraries: Library[] = toMaximizedLibrariesFromLibJson(functionsResponse, selectedLibs);
    
    // Merge typeLibraries and maximizedLibraries without duplicates
    const mergedLibraries = mergeLibrariesWithoutDuplicates(maximizedLibraries, typeLibraries);
    
    return mergedLibraries;
}

function getClientFunctionCount(clients: MinifiedClient[]): number {
    return clients.reduce((count, client) => count + client.functions.length, 0);
}

function toTypesToLibraries(types: GetTypeResponse[], fullLibs: Library[]): Library[] {
    const librariesWithTypes: Library[] = [];
    
    for (const minifiedSelectedLib of types) {
        try {
            const fullDefOfSelectedLib = getLibraryByNameFromLibJson(minifiedSelectedLib.libName, fullLibs);
            if (!fullDefOfSelectedLib) {
                continue;
            }
            
            const filteredTypes = selectTypes(fullDefOfSelectedLib.typeDefs, minifiedSelectedLib);
            
            librariesWithTypes.push({
                name: fullDefOfSelectedLib.name,
                description: fullDefOfSelectedLib.description,
                typeDefs: filteredTypes,
                services: fullDefOfSelectedLib.services,
                clients: []
            });
        } catch (error) {
            console.error(`Error processing library ${minifiedSelectedLib.libName}:`, error);
        }
    }
    
    return librariesWithTypes;
}

function getLibraryByNameFromLibJson(libName: string, librariesJson: Library[]): Library | null {
    return librariesJson.find(lib => lib.name === libName) || null;
}

function selectTypes(fullDefOfSelectedLib: any[], minifiedSelectedLib: GetTypeResponse): any[] {
    const typesResult = minifiedSelectedLib.types;
    if (!typesResult) {
        return [];
    }
    
    const output: any[] = [];
    
    if (fullDefOfSelectedLib.length === 0) {
        throw new Error("Complete type list is not available");
    }
    
    for (const miniType of typesResult) {
        const miniTypeName = miniType.name;
        
        for (const item of fullDefOfSelectedLib) {
            if (item.name === miniTypeName) {
                output.push(item);
                break;
            }
        }
    }
    
    return output;
}

async function getRequiredFunctions(libraries: string[], prompt: string, librariesJson: Library[]): Promise<GetFunctionResponse[]> {
    if (librariesJson.length === 0) {
        return [];
    }
    const startTime = Date.now();
    
    const libraryList: GetFunctionsRequest[] = librariesJson
        .filter(lib => libraryContains(lib.name, libraries))
        .map(lib => ({
            name: lib.name,
            description: lib.description,
            clients: filteredClients(lib.clients),
            functions: filteredNormalFunctions(lib.functions)
        }));

    const largeLibs = libraryList.filter(lib => getClientFunctionCount(lib.clients) >= 100);
    const smallLibs = libraryList.filter(lib => !largeLibs.includes(lib));

    const suggestedFunctions: Promise<GetFunctionResponse>[] = [];

    // Process large libraries individually
    for (const funcItem of largeLibs) {
        suggestedFunctions.push(getSuggestedFunctions(prompt, [funcItem])[0]);
    }

    let collectiveResp: GetFunctionResponse[] = [];
    
    // Process small libraries in bulk
    if (smallLibs.length !== 0) {
        collectiveResp = await getSuggestedFunctions(prompt, smallLibs);
    }

    // Wait for all individual large library processing
    const individualResults = await Promise.all(suggestedFunctions);
    collectiveResp.push(...individualResults);

    const endTime = Date.now();
    console.log(`Time taken to get the functions: ${(endTime - startTime) / 1000} seconds`);
    
    return collectiveResp;
}

async function getSuggestedFunctions(prompt: string, libraryList: GetFunctionsRequest[]): Promise<GetFunctionResponse[]> {
    const getLibSystemPrompt = "You are an AI assistant tasked with filtering and removing unwanted functions and clients from a given set of libraries and clients based on a user query. Your goal is to return only the relevant libraries, clients, and functions that match the user's needs.";
    const getLibUserPrompt = `
You will be provided with a list of libraries, clients, and their functions and user query.

<QUERY>
${prompt}
</QUERY>

<Library_Context_JSON>
${JSON.stringify(libraryList)}
</Library_Context_JSON>

To process the user query and filter the libraries, clients, and functions, follow these steps:

1. Analyze the user query to understand the specific requirements or needs.
2. Review the list of libraries, clients, and their functions.
3. Identify which libraries, clients, and functions are relevant to the user query.
4. Remove any libraries, clients, and functions that are not directly related to the user's needs.
5. Organize the remaining relevant information.

Ensure that you only include libraries, clients, and functions that are directly relevant to the user query. If no relevant results are found, return an empty array for the libraries.

Now, based on the provided libraries, clients, and functions, and the user query, please filter and return the relevant information.
`;

    const messages: CoreMessage[] = [
        { role: "system", content: getLibSystemPrompt },
        { role: "user", content: getLibUserPrompt }
    ];
    try {
        const { object } = await generateObject({
            model: anthropic("claude-3-5-haiku-20241022"),
            maxTokens: 8192,
            temperature: 0,
            messages: messages,
            schema: getFunctionsResponseSchema
        });

        const libList = object as GetFunctionsResponse;
        printSelectedFunctions(libList.libraries);
        return libList.libraries;
    } catch (error) {
        throw new Error(`Failed to parse bulk functions response: ${error}`);
    }
}

function printSelectedFunctions(libraries: GetFunctionResponse[]): void {
    console.log("Selected functions:", JSON.stringify(libraries, null, 2));
}

export function libraryContains(library: string, libraries: string[]): boolean {
    return libraries.includes(library);
}

function filteredClients(clients: Client[]): MinifiedClient[] {
    return clients.map(cli => ({
        name: cli.name,
        description: cli.description,
        functions: filteredFunctions(cli.functions)
    }));
}

function filteredFunctions(functions: (RemoteFunction | ResourceFunction)[]): (MinifiedRemoteFunction | MinifiedResourceFunction)[] {
    const output: (MinifiedRemoteFunction | MinifiedResourceFunction)[] = [];
    
    for (const item of functions) {
        if ('accessor' in item) { // ResourceFunction
            const res: MinifiedResourceFunction = {
                accessor: item.accessor,
                paths: item.paths,
                parameters: item.parameters.map(param => param.name),
                returnType: item.return.type.name
            };
            output.push(res);
        } else { // RemoteFunction
            if (item.type !== "Constructor") {
                const rem: MinifiedRemoteFunction = {
                    name: item.name,
                    parameters: item.parameters.map(param => param.name),
                    returnType: item.return.type.name
                };
                output.push(rem);
            }
        }
    }
    
    return output;
}

function filteredNormalFunctions(functions?: RemoteFunction[]): MinifiedRemoteFunction[] | undefined {
    if (!functions) {
        return undefined;
    }
    
    return functions.map(item => ({
        name: item.name,
        parameters: item.parameters.map(param => param.name),
        returnType: item.return.type.name
    }));
}

export async function getMaximizedSelectedLibs(libNames:string[], generationType: GenerationType): Promise<Library[]> {
    const result = await langClient.getCopilotFilteredLibraries({
        libNames: libNames,
        mode: getGenerationMode(generationType)
    }) as { libraries: Library[] };
    return result.libraries as Library[];
}

export function toMaximizedLibrariesFromLibJson(functionResponses: GetFunctionResponse[], originalLibraries: Library[]): Library[] {
    const maximizedLibraries: Library[] = [];
    
    for (const funcResponse of functionResponses) {
        // Find the original library to get complete information
        const originalLib = originalLibraries.find(lib => lib.name === funcResponse.name);
        if (!originalLib) {
            continue;
        }
        
        const maximizedLib: Library = {
            name: funcResponse.name,
            description: originalLib.description,
            typeDefs: originalLib.typeDefs, // Include all type definitions
            clients: [],
            functions: [],
            services: originalLib.services
        };
        
        // Convert minified clients back to full clients
        if (funcResponse.clients) {
            for (const minClient of funcResponse.clients) {
                const originalClient = originalLib.clients.find(c => c.name === minClient.name);
                if (originalClient) {
                    const maximizedClient: Client = {
                        name: minClient.name,
                        description: originalClient.description,
                        functions: []
                    };
                    
                    // Convert minified functions back to full functions
                    for (const minFunc of minClient.functions) {
                        const originalFunc = originalClient.functions.find(f => {
                            if ('accessor' in minFunc && 'accessor' in f) {
                                return f.accessor === minFunc.accessor;
                            } else if ('name' in minFunc && 'name' in f) {
                                return f.name === minFunc.name;
                            }
                            return false;
                        });
                        
                        if (originalFunc) {
                            maximizedClient.functions.push(originalFunc);
                        }
                    }
                    
                    maximizedLib.clients.push(maximizedClient);
                }
            }
        }
        
        // Convert minified standalone functions back to full functions
        if (funcResponse.functions && originalLib.functions) {
            for (const minFunc of funcResponse.functions) {
                const originalFunc = originalLib.functions.find(f => f.name === minFunc.name);
                if (originalFunc) {
                    maximizedLib.functions!.push(originalFunc);
                }
            }
        }
        
        maximizedLibraries.push(maximizedLib);
    }
    
    return maximizedLibraries;
}

function mergeLibrariesWithoutDuplicates(maximizedLibraries: Library[], typeLibraries: Library[]): Library[] {
    const finalLibraries: Library[] = maximizedLibraries;
    
    for (const typeLib of typeLibraries) {
        const finalLib = findLibraryByName(typeLib.name, finalLibraries);
        if (finalLib) {
            finalLib.typeDefs.push(...typeLib.typeDefs);
        } else {
            finalLibraries.push(typeLib);
        }
    }
    
    return finalLibraries;
}

function findLibraryByName(name: string, libraries: Library[]): Library | null {
    return libraries.find(lib => lib.name === name) || null;
}
