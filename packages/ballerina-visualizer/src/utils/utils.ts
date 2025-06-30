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

import { STModification, FunctionParameters } from "@wso2/ballerina-core";
import { BallerinaRpcClient } from "@wso2/ballerina-rpc-client";
import { Parameter } from "@wso2/ballerina-side-panel";
import { NodePosition } from "@wso2/syntax-tree";
import { ParamConfig } from "@wso2/ui-toolkit";
import { URI } from "vscode-uri";

export interface MatchResult {
    start: number;
    end: number;
    matchedText: string;
}

export function transformNodePosition(position: NodePosition) {
    return {
        start: {
            line: position.startLine,
            character: position.startColumn,
        },
        end: {
            line: position.endLine,
            character: position.endColumn,
        },
    };
}

export async function handleUndo(rpcClient: BallerinaRpcClient) {
    const lastsource = await rpcClient.getVisualizerRpcClient().undo();
    const docUri = (await rpcClient.getVisualizerLocation()).documentUri;
    if (lastsource) {
        rpcClient.getLangClientRpcClient().updateFileContent({
            filePath: docUri,
            content: lastsource,
        });
    }
}

export async function handleRedo(rpcClient: BallerinaRpcClient) {
    const lastsource = await rpcClient.getVisualizerRpcClient().redo();
    const docUri = (await rpcClient.getVisualizerLocation()).documentUri;
    if (lastsource) {
        rpcClient.getLangClientRpcClient().updateFileContent({
            filePath: docUri,
            content: lastsource,
        });
    }
}

const colors = {
    GET: "#3d7eff",
    PUT: "#fca130",
    POST: "#49cc90",
    DELETE: "#f93e3e",
    PATCH: "#986ee2",
    OPTIONS: "#0d5aa7",
    HEAD: "#9012fe",
};

export function getColorByMethod(method: string) {
    switch (method.toUpperCase()) {
        case "GET":
            return colors.GET;
        case "PUT":
            return colors.PUT;
        case "POST":
            return colors.POST;
        case "DELETE":
            return colors.DELETE;
        case "PATCH":
            return colors.PATCH;
        case "OPTIONS":
            return colors.OPTIONS;
        case "HEAD":
            return colors.HEAD;
        default:
            return "#876036"; // Default color
    }
}

export const textToModifications = (text: string, position: NodePosition): STModification[] => {
    return [
        {
            ...position,
            type: "INSERT",
            config: {
                STATEMENT: text,
            },
            isImport: false,
        },
    ];
};

export const applyModifications = async (rpcClient: BallerinaRpcClient, modifications: STModification[], sourceFilePath?: string) => {
    const langServerRPCClient = rpcClient.getLangClientRpcClient();
    const filePath = sourceFilePath ? sourceFilePath : (await rpcClient.getVisualizerLocation()).documentUri;

    const { parseSuccess, source: newSource } = await langServerRPCClient?.stModify({
        astModifications: modifications,
        documentIdentifier: {
            uri: URI.file(filePath).toString(),
        },
    });
    if (parseSuccess) {
        rpcClient.getVisualizerRpcClient().addToUndoStack(newSource);
        await langServerRPCClient.updateFileContent({
            content: newSource,
            filePath
        });
    }
};

// Parameter object for ParamManager
export const parameterConfig: ParamConfig = {
    paramValues: [],
    paramFields: [
        {
            type: "Dropdown",
            label: "Type",
            defaultValue: "string",
            values: ["string", "int", "float", "anydata"],
            isRequired: true
        },
        {
            type: "TextField",
            label: "Name",
            defaultValue: "",
            isRequired: true
        },
        {
            type: "TextField",
            label: "Default Value",
            defaultValue: "",
            isRequired: false
        }
    ]
};

export const getFunctionParametersList = (params: Parameter[]) => {
    const paramList: FunctionParameters[] = [];
    params.forEach(param => {
        paramList.push({
            type: param.formValues['type'] as string,
            name: param.formValues['variable'] as string,
            defaultValue: param.formValues['defaultable'] as string
        });
    })
    return paramList;
}

export const getDataMapperParametersList = (params: string[]) => {
    const paramList: FunctionParameters[] = [];
    const paramNames: string[] = [];

    params.forEach(param => {
        const varName = lowercaseFirstLetter(param);
        const generatedName = createUniqueName(varName);
        paramNames.push(generatedName);

        paramList.push({
            type: param,
            name: generatedName
        });
    })
    return paramList;

    function lowercaseFirstLetter(input: string): string {
        if (!input) return input;
        return input.charAt(0).toLowerCase() + input.slice(1);
    }

    function createUniqueName(name: string): string {
        let newName = name;
        let counter = 1;
        while (paramNames.includes(newName)) {
            newName = name + counter;
            counter++;
        }
        return newName;
    }
}

export function findRegexMatches(input: string): MatchResult[] {
    // Define the regular expression using a RegExp literal
    const regex = /\<(c(o(d(e((?:[ ]+(f(i(l(e(n(a(m(e(=("([^ "\n]+("(\>)?([ \n]+(`(`(`)?)?)?)?)?)?)?)?)?)?)?)?)?)?)?)?)?)?)?)?)?)?/g;

    const matches: MatchResult[] = [];
    let match: RegExpExecArray | null;

    // Use exec in a loop to find all matches
    while ((match = regex.exec(input)) !== null) {
        // Avoid infinite loops with zero-length matches
        if (match.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        matches.push({
            start: match.index,
            end: regex.lastIndex,
            matchedText: match[0],
        });
    }

    return matches;
}

export const isPositionChanged = (prev: NodePosition, current: NodePosition) => {
    return prev.startLine !== current.startLine ||
        prev.startColumn !== current.startColumn ||
        prev.endLine !== current.endLine ||
        prev.endColumn !== current.endColumn;
};
