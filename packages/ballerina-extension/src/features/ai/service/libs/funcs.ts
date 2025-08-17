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

import { generateObject, CoreMessage } from "ai";

import { GetFunctionResponse, GetFunctionsRequest, GetFunctionsResponse, getFunctionsResponseSchema, MinifiedClient, MinifiedRemoteFunction, MinifiedResourceFunction, PathParameter } from "./funcs_inter_types";
import { Client, GetTypeResponse, Library, RemoteFunction, ResourceFunction } from "./libs_types";
import { TypeDefinition, AbstractFunction, Type, RecordTypeDefinition } from "./libs_types";
import { getAnthropicClient, ANTHROPIC_HAIKU } from "../connection";
import { GenerationType } from "./libs";
import { getRequiredTypesFromLibJson } from "../healthcare/healthcare";
import { langClient } from "../../activator";
import { getGenerationMode } from "../utils";
import { AIPanelAbortController } from "../../../../../src/rpc-managers/ai-panel/utils";


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

    console.log(`[Parallel Execution Plan] Large libraries: ${largeLibs.length} (${largeLibs.map(lib => lib.name).join(', ')}), Small libraries: ${smallLibs.length} (${smallLibs.map(lib => lib.name).join(', ')})`);

    // Create promises for large libraries (each processed individually)
    const largeLiberiesPromises: Promise<GetFunctionResponse[]>[] = largeLibs.map(funcItem => 
        getSuggestedFunctions(prompt, [funcItem])
    );

    // Create promise for small libraries (processed in bulk)
    const smallLibrariesPromise = smallLibs.length !== 0 
        ? getSuggestedFunctions(prompt, smallLibs)
        : Promise.resolve([]);

    console.log(`[Parallel Execution Start] Starting ${largeLiberiesPromises.length} large library requests + 1 small libraries bulk request`);
    const parallelStartTime = Date.now();

    // Wait for all promises to complete
    const [smallLibResults, ...largeLibResults] = await Promise.all([
        smallLibrariesPromise,
        ...largeLiberiesPromises
    ]);

    const parallelEndTime = Date.now();
    const parallelDuration = (parallelEndTime - parallelStartTime) / 1000;
    
    console.log(`[Parallel Execution Complete] Total parallel execution time: ${parallelDuration}s`);

    // Flatten the results
    const collectiveResp: GetFunctionResponse[] = [
        ...smallLibResults,
        ...largeLibResults.flat()
    ];
    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000;
    
    console.log(`[getRequiredFunctions Complete] Total function count: ${collectiveResp.reduce((total, lib) => total + (lib.clients?.reduce((clientTotal, client) => clientTotal + client.functions.length, 0) || 0) + (lib.functions?.length || 0), 0)}, Total duration: ${totalDuration}s, Preparation time: ${(parallelStartTime - startTime) / 1000}s, Parallel time: ${parallelDuration}s`);
    
    return collectiveResp;
}

async function getSuggestedFunctions(prompt: string, libraryList: GetFunctionsRequest[]): Promise<GetFunctionResponse[]> {
    const startTime = Date.now();
    const libraryNames = libraryList.map(lib => lib.name).join(', ');
    const functionCount = libraryList.reduce((total, lib) => total + getClientFunctionCount(lib.clients) + (lib.functions?.length || 0), 0);
    
    console.log(`[AI Request Start] Libraries: [${libraryNames}], Function Count: ${functionCount}`);
    
    const getLibSystemPrompt = "You are an AI assistant tasked with filtering and removing unwanted functions and clients from a given set of libraries and clients based on a user query. Your goal is to return only the relevant libraries, clients, and functions that match the user's needs.";

    // TODO: Improve prompt to strictly avoid hallucinations, e.g., "Return ONLY libraries from the provided context; do not add new ones."
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
            model: await getAnthropicClient(ANTHROPIC_HAIKU),
            maxTokens: 8192,
            temperature: 0,
            messages: messages,
            schema: getFunctionsResponseSchema,
            abortSignal: AIPanelAbortController.getInstance().signal
        });

        const libList = object as GetFunctionsResponse;
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        // Filter to remove hallucinated libraries
        const filteredLibList = libList.libraries.filter((lib) =>
            libraryList.some((inputLib) => inputLib.name === lib.name)
        );
        
        console.log(`[AI Request Complete] Libraries: [${libraryNames}], Duration: ${duration}s, Selected Functions: ${libList.libraries.reduce((total, lib) => total + (lib.clients?.reduce((clientTotal, client) => clientTotal + client.functions.length, 0) || 0) + (lib.functions?.length || 0), 0)}`);
        
        printSelectedFunctions(filteredLibList);
        return filteredLibList;
    } catch (error) {
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        console.error(`[AI Request Failed] Libraries: [${libraryNames}], Duration: ${duration}s, Error: ${error}`);
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
    const minifiedLibrariesWithoutRecords: Library[] = [];
    
    for (const funcResponse of functionResponses) {
        // Find the original library to get complete information
        const originalLib = originalLibraries.find(lib => lib.name === funcResponse.name);
        if (!originalLib) {
            continue;
        }
        
        const filteredClients = selectClients(originalLib.clients, funcResponse);
        const filteredFunctions = selectFunctions(originalLib.functions, funcResponse);
        
        const maximizedLib: Library = {
            name: funcResponse.name,
            description: originalLib.description,
            clients: filteredClients,
            functions: filteredFunctions,
            // Get only the type definitions that are actually used by the selected functions and clients
            typeDefs: getOwnTypeDefsForLib(filteredClients, filteredFunctions, originalLib.typeDefs),
            services: originalLib.services
        };
        
        minifiedLibrariesWithoutRecords.push(maximizedLib);
    }
    
    // Handle external type references
    const externalRecordsRefs = getExternalTypeDefsRefs(minifiedLibrariesWithoutRecords);
    getExternalRecords(minifiedLibrariesWithoutRecords, externalRecordsRefs, originalLibraries);
    
    return minifiedLibrariesWithoutRecords;
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

// Helper functions for type definition handling

function selectClients(originalClients: Client[], funcResponse: GetFunctionResponse): Client[] {
    if (!funcResponse.clients) {
        return [];
    }
    
    const newClients: Client[] = [];
    
    for (const minClient of funcResponse.clients) {
        const originalClient = originalClients.find(c => c.name === minClient.name);
        if (!originalClient) {
            continue;
        }
        
        const completeClient: Client = {
            name: originalClient.name,
            description: originalClient.description,
            functions: []
        };
        
        const output: (RemoteFunction | ResourceFunction)[] = [];
        
        // Add constructor if there are functions to add
        if (minClient.functions.length > 0) {
            const constructor = getConstructor(originalClient.functions);
            if (constructor) {
                output.push(constructor);
            }
        }
        
        // Add selected functions
        for (const minFunc of minClient.functions) {
            const completeFunc = getCompleteFuncForMiniFunc(minFunc, originalClient.functions);
            if (completeFunc) {
                output.push(completeFunc);
            }
        }
        
        completeClient.functions = output;
        newClients.push(completeClient);
    }
    
    return newClients;
}

function selectFunctions(originalFunctions: RemoteFunction[] | undefined, funcResponse: GetFunctionResponse): RemoteFunction[] | undefined {
    if (!funcResponse.functions || !originalFunctions) {
        return undefined;
    }
    
    const output: RemoteFunction[] = [];
    
    for (const minFunc of funcResponse.functions) {
        const originalFunc = originalFunctions.find(f => f.name === minFunc.name);
        if (originalFunc) {
            output.push(originalFunc);
        }
    }
    
    return output.length > 0 ? output : undefined;
}

function getConstructor(functions: (RemoteFunction | ResourceFunction)[]): RemoteFunction | null {
    for (const func of functions) {
        if ('type' in func && func.type === "Constructor") {
            return func as RemoteFunction;
        }
    }
    return null;
}

function normalizePaths(paths: (PathParameter | string)[]): string[] {
    return paths.map((path) => {
        const pathStr = typeof path === "string" ? path : path.name;
        return pathStr.replace(/\\./g, ".");
    });
}

function getCompleteFuncForMiniFunc(
    minFunc: MinifiedRemoteFunction | MinifiedResourceFunction, 
    fullFunctions: (RemoteFunction | ResourceFunction)[]
): (RemoteFunction | ResourceFunction) | null {
    if ('name' in minFunc) {
        // MinifiedRemoteFunction
        return fullFunctions.find(f => 'name' in f && f.name === minFunc.name) || null;
    } else {
        // MinifiedResourceFunction
        return (
            fullFunctions.find(
                (f) =>
                    'accessor' in f &&
                    f.accessor === minFunc.accessor &&
                    JSON.stringify(normalizePaths(f.paths)) === JSON.stringify(normalizePaths(minFunc.paths))
            ) || null
        );
    }
}

function getOwnTypeDefsForLib(
    clients: Client[], 
    functions: RemoteFunction[] | undefined, 
    allTypeDefs: TypeDefinition[]
): TypeDefinition[] {
    const allFunctions: AbstractFunction[] = [];
    
    // Collect all functions from clients
    for (const client of clients) {
        allFunctions.push(...client.functions);
    }
    
    // Add standalone functions
    if (functions) {
        allFunctions.push(...functions);
    }
    
    return getOwnRecordRefs(allFunctions, allTypeDefs);
}

function getOwnRecordRefs(functions: AbstractFunction[], allTypeDefs: TypeDefinition[]): TypeDefinition[] {
    const ownRecords = new Map<string, TypeDefinition>();
    
    // Process all functions to find type references
    for (const func of functions) {
        // Check parameter types
        for (const param of func.parameters) {
            addInternalRecord(param.type, ownRecords, allTypeDefs);
        }
        
        // Check return type
        addInternalRecord(func.return.type, ownRecords, allTypeDefs);
    }
    
    // Recursively process found type definitions to include dependent types
    const processedTypes = new Set<string>();
    const typesToProcess = Array.from(ownRecords.values());
    
    while (typesToProcess.length > 0) {
        const typeDef = typesToProcess.shift()!;
        
        if (processedTypes.has(typeDef.name)) {
            continue;
        }
        
        processedTypes.add(typeDef.name);
        
        if (typeDef.type === 'record') {
            const recordDef = typeDef as RecordTypeDefinition;
            for (const field of recordDef.fields) {
                const foundTypes = addInternalRecord(field.type, ownRecords, allTypeDefs);
                typesToProcess.push(...foundTypes);
            }
        }
        // TODO: Handle EnumTypeDefinition and UnionTypeDefinition
    }
    
    return Array.from(ownRecords.values());
}

function addInternalRecord(
    paramType: Type, 
    ownRecords: Map<string, TypeDefinition>, 
    allTypeDefs: TypeDefinition[]
): TypeDefinition[] {
    const foundTypes: TypeDefinition[] = [];
    
    if (!paramType.links) {
        return foundTypes;
    }
    
    for (const link of paramType.links) {
        if (link.category === "internal") {
            if (isIgnoredRecordName(link.recordName)) {
                continue;
            }
            
            const typeDefResult = getTypeDefByName(link.recordName, allTypeDefs);
            if (typeDefResult) {
                ownRecords.set(link.recordName, typeDefResult);
                foundTypes.push(typeDefResult);
            } else {
                console.warn(`Type ${link.recordName} definition not found.`);
            }
        }
    }
    
    return foundTypes;
}

function isIgnoredRecordName(recordName: string): boolean {
    const ignoredRecords = [
        "CodeScanningAnalysisToolGuid",
        "AlertDismissedAt",
        "AlertFixedAt",
        "AlertAutoDismissedAt",
        "NullableAlertUpdatedAt",
        "ActionsCanApprovePullRequestReviews",
        "CodeScanningAlertDismissedComment",
        "ActionsEnabled",
        "PreventSelfReview",
        "SecretScanningAlertResolutionComment",
        "Conference_enum_update_status",
        "Message_enum_schedule_type",
        "Message_enum_update_status",
        "Siprec_enum_update_status",
        "Stream_enum_update_status"
    ];
    return ignoredRecords.includes(recordName);
}

function getTypeDefByName(name: string, typeDefs: TypeDefinition[]): TypeDefinition | null {
    return typeDefs.find(def => def.name === name) || null;
}

function getExternalTypeDefsRefs(libraries: Library[]): Map<string, string[]> {
    const externalRecords = new Map<string, string[]>();
    
    for (const lib of libraries) {
        const allFunctions: AbstractFunction[] = [];
        
        // Collect all functions from clients
        for (const client of lib.clients) {
            allFunctions.push(...client.functions);
        }
        
        // Add standalone functions
        if (lib.functions) {
            allFunctions.push(...lib.functions);
        }
        
        getExternalTypeDefRefs(externalRecords, allFunctions, lib.typeDefs);
    }
    
    return externalRecords;
}

function getExternalTypeDefRefs(
    externalRecords: Map<string, string[]>, 
    functions: AbstractFunction[], 
    allTypeDefs: TypeDefinition[]
): void {
    // Check function parameters and return types
    for (const func of functions) {
        for (const param of func.parameters) {
            addExternalRecord(param.type, externalRecords);
        }
        addExternalRecord(func.return.type, externalRecords);
    }
    
    // Check type definition fields
    for (const typeDef of allTypeDefs) {
        if (typeDef.type === 'record') {
            const recordDef = typeDef as RecordTypeDefinition;
            for (const field of recordDef.fields) {
                addExternalRecord(field.type, externalRecords);
            }
        }
        // TODO: Handle EnumTypeDefinition and UnionTypeDefinition
    }
}

function addExternalRecord(paramType: Type, externalRecords: Map<string, string[]>): void {
    if (!paramType.links) {
        return;
    }
    
    for (const link of paramType.links) {
        if (link.category === "external" && link.libraryName) {
            addLibraryRecords(externalRecords, link.libraryName, link.recordName);
        }
    }
}

function addLibraryRecords(externalRecords: Map<string, string[]>, libraryName: string, recordName: string): void {
    if (externalRecords.has(libraryName)) {
        const records = externalRecords.get(libraryName)!;
        if (!records.includes(recordName)) {
            records.push(recordName);
        }
    } else {
        externalRecords.set(libraryName, [recordName]);
    }
}

function getExternalRecords(
    newLibraries: Library[], 
    libRefs: Map<string, string[]>, 
    originalLibraries: Library[]
): void {
    for (const [libName, recordNames] of libRefs.entries()) {
        if (libName.startsWith("ballerina/lang.int")) {
            // TODO: find a proper solution
            continue;
        }
        
        const library = originalLibraries.find(lib => lib.name === libName);
        if (!library) {
            console.warn(`Library ${libName} is not found in the context. Skipping the library.`);
            continue;
        }
        
        for (const recordName of recordNames) {
            const typeDef = getTypeDefByName(recordName, library.typeDefs);
            if (!typeDef) {
                console.warn(`Record ${recordName} is not found in the context. Skipping the record.`);
                continue;
            }
            
            let newLibrary = newLibraries.find(lib => lib.name === libName);
            if (!newLibrary) {
                newLibrary = {
                    name: libName,
                    description: library.description,
                    clients: [],
                    functions: undefined,
                    typeDefs: [typeDef],
                    services: library.services
                };
                newLibraries.push(newLibrary);
            } else {
                // Check if type definition already exists
                const existingTypeDef = newLibrary.typeDefs.find(def => def.name === recordName);
                if (!existingTypeDef) {
                    newLibrary.typeDefs.push(typeDef);
                }
            }
        }
    }
}
