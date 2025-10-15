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

import { Library, Client, RemoteFunction, ResourceFunction } from "../../../../src/features/ai/service/libs/libs_types";
import { GetFunctionResponse, MinifiedClient, MinifiedRemoteFunction, MinifiedResourceFunction } from "../../../../src/features/ai/service/libs/funcs_inter_types";

/**
 * Transforms a Library to GetFunctionResponse format for testing
 * This mimics the Ballerina test logic in test.bal
 */
export function transformLibraryToGetFunctionResponse(library: Library): GetFunctionResponse {
    return {
        name: library.name,
        clients: filteredClientsForTest(library.clients),
        functions: filteredNormalFunctionsForTest(library.functions)
    };
}

/**
 * Filters and transforms clients to minified format
 */
function filteredClientsForTest(clients: Client[]): MinifiedClient[] {
    return clients.map((client) => ({
        name: client.name,
        description: client.description,
        functions: filteredFunctionsForTest(client.functions)
    }));
}

/**
 * Filters and transforms client functions to minified format
 */
function filteredFunctionsForTest(
    functions: (RemoteFunction | ResourceFunction)[]
): (MinifiedRemoteFunction | MinifiedResourceFunction)[] {
    const output: (MinifiedRemoteFunction | MinifiedResourceFunction)[] = [];

    for (const item of functions) {
        if ("accessor" in item) {
            // ResourceFunction
            const res: MinifiedResourceFunction = {
                accessor: item.accessor,
                paths: item.paths,
                parameters: item.parameters.map((param) => param.name),
                returnType: item.return.type.name
            };
            output.push(res);
        } else {
            // RemoteFunction (skip Constructor type)
            if (item.type !== "Constructor") {
                const rem: MinifiedRemoteFunction = {
                    name: item.name,
                    parameters: item.parameters.map((param) => param.name),
                    returnType: item.return.type.name
                };
                output.push(rem);
            }
        }
    }

    return output;
}

/**
 * Filters and transforms normal functions to minified format
 */
function filteredNormalFunctionsForTest(functions?: RemoteFunction[]): MinifiedRemoteFunction[] | undefined {
    if (!functions) {
        return undefined;
    }

    return functions.map((item) => ({
        name: item.name,
        parameters: item.parameters.map((param) => param.name),
        returnType: item.return.type.name
    }));
}

/**
 * VS Code test commands for library integration tests
 */
export const VSCODE_COMMANDS = {
    GET_ALL_LIBRARIES: "ballerina.test.ai.getAllLibraries",
    GET_SELECTED_LIBRARIES: "ballerina.test.ai.getSelectedLibraries",
    GET_RELEVANT_LIBRARIES_AND_FUNCTIONS: "ballerina.test.ai.getRelevantLibrariesAndFunctions",
    SELECT_REQUIRED_FUNCTIONS: "ballerina.test.ai.selectRequiredFunctions",
    GET_MAXIMIZED_SELECTED_LIBS: "ballerina.test.ai.getMaximizedSelectedLibs",
    TO_MAXIMIZED_LIBRARIES_FROM_LIB_JSON: "ballerina.test.ai.toMaximizedLibrariesFromLibJson",
} as const;
