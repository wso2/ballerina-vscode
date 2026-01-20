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

import { CodeData, ConfigVariable, FlowNode, LinePosition, LineRange, NodeKind, SearchNodesQueryParams } from "@wso2/ballerina-core";
import { BallerinaRpcClient } from "@wso2/ballerina-rpc-client";
import { cloneDeep } from "lodash";
import { URI, Utils } from "vscode-uri";
import { BALLERINA } from "../../../constants";

export const getNodeTemplate = async (
    rpcClient: BallerinaRpcClient,
    codeData: CodeData,
    filePath: string,
    position: LinePosition = { line: 0, offset: 0 }
) => {
    const response = await rpcClient.getBIDiagramRpcClient().getNodeTemplate({
        position: position,
        filePath: filePath,
        id: codeData,
    });
    console.log(">>> get node template response", response);
    return response?.flowNode;
};

export const getAiModuleOrg = async (rpcClient: BallerinaRpcClient, nodeKind?: NodeKind) => {
    if (nodeKind && (nodeKind === "NP_FUNCTION" || nodeKind === "NP_FUNCTION_DEFINITION")) return BALLERINA;
    const visualizerContext = await rpcClient.getVisualizerLocation();
    const aiModuleOrgResponse = await rpcClient
        .getAIAgentRpcClient()
        .getAiModuleOrg({ projectPath: visualizerContext.projectPath });
    console.log(">>> agent org", aiModuleOrgResponse.orgName);
    return aiModuleOrgResponse.orgName;
}

export const getAgentFilePath = async (rpcClient: BallerinaRpcClient) => {
    // Create the agent file path
    const agentFilePath = (await rpcClient.getVisualizerRpcClient().joinProjectPath({ segments: ['agents.bal'] })).filePath;
    return agentFilePath;
};

export const getNPFilePath = async (rpcClient: BallerinaRpcClient) => {
    const visualizerContext = await rpcClient.getVisualizerLocation();
    // Create the NP file path
    const agentFilePath = Utils.joinPath(URI.file(visualizerContext.projectPath), "functions.bal").fsPath;
    return agentFilePath;
};

export const getMainFilePath = async (rpcClient: BallerinaRpcClient) => {
    // Get the main file path and update the node
    const visualizerContext = await rpcClient.getVisualizerLocation();
    // Create the main file path
    const mainFilePath = Utils.joinPath(URI.file(visualizerContext.projectPath), "main.bal").fsPath;
    return mainFilePath;
};

export const findFlowNodeByModuleVarName = async (variableName: string, rpcClient: BallerinaRpcClient) => {
    try {
        const sanitizedVarName = variableName.trim().replace(/\n/g, "");

        // Get connections either from parameter or by fetching module nodes
        const nodeList = (await rpcClient.getBIDiagramRpcClient().getModuleNodes()).flowModel;

        // Find the node with matching variable name
        let flowNode = nodeList?.connections.find((node) => {
            const value = node.properties?.variable?.value;
            return typeof value === "string" && value === sanitizedVarName;
        });

        // If not found in connections, search in variables
        if (!flowNode) {
            flowNode = nodeList?.variables.find((node) => {
                const value = node.properties?.variable?.value;
                return typeof value === "string" && value === sanitizedVarName;
            });
        }
        if (!flowNode) {
            console.error(`Flow node with variable name '${variableName}' not found`);
            return null;
        }

        return flowNode;
    } catch (error) {
        console.error("Error finding flow node by variable name:", error);
        return null;
    }
};

export const findFlowNode = async (
    rpcClient: BallerinaRpcClient,
    filePath: string,
    position?: LinePosition,
    queryMap?: SearchNodesQueryParams
) => {
    try {
        const searchResult = await rpcClient.getBIDiagramRpcClient().searchNodes({
            filePath,
            position,
            queryMap
        });

        if (!searchResult?.output?.length) {
            console.error("Flow node not found");
            return null;
        }

        return searchResult.output;
    } catch (error) {
        console.error("Error finding flow node:", error);
        return null;
    }
};

export const findAgentNodeFromAgentCallNode = async (agentCallNode: FlowNode, rpcClient: BallerinaRpcClient) => {
    // Validate input node type
    if (!agentCallNode || agentCallNode.codedata?.node !== "AGENT_CALL") {
        return null;
    }

    // Extract and validate agent name from connection property
    let agentName = agentCallNode.properties?.connection?.value;
    if (typeof agentName !== "string") {
        console.error("Agent connection value is not a string");
        return null;
    }

    // Resolve file path from agent call node location
    const fileName = agentCallNode.codedata?.lineRange?.fileName;
    if (!fileName) {
        console.error("File name not found in agent call node");
        return null;
    }

    const filePath = (await rpcClient.getVisualizerRpcClient().joinProjectPath({ segments: [fileName] })).filePath;

    // Extract line position for search context
    const startLine = agentCallNode.codedata?.lineRange?.startLine;
    const linePosition: LinePosition | undefined = startLine
        ? {
            line: startLine.line,
            offset: startLine.offset
        }
        : undefined;

    // Search for the agent node by name
    const queryMap: SearchNodesQueryParams = {
        kind: "AGENT",
        exactMatch: agentName
    };

    const nodes = await findFlowNode(rpcClient, filePath, linePosition, queryMap);
    console.log(">>> agent nodes found", { nodes });
    if (nodes && nodes.length > 0) {
        return nodes[0];
    }

    return;
};

export const removeToolFromAgentNode = async (agentNode: FlowNode, toolName: string) => {
    if (!agentNode || agentNode.codedata?.node !== "AGENT") return null;
    // clone the node to avoid modifying the original
    const updatedAgentNode = cloneDeep(agentNode);
    let toolsValue = updatedAgentNode.properties.tools.value;
    // remove new lines from the tools value
    toolsValue = toolsValue.toString().replace(/\n/g, "");
    // Remove the tools from the tools array
    if (typeof toolsValue === "string") {
        const toolsArray = parseToolsString(toolsValue);
        if (toolsArray.length > 0) {
            // Remove the tool
            const existingTools = toolsArray.filter((t) => t !== toolName);
            // Update the tools value
            toolsValue = existingTools.length === 1 ? `[${existingTools[0]}]` : `[${existingTools.join(", ")}]`;
        } else {
            toolsValue = `[]`;
        }
    } else {
        console.error("Tools value is not a string", toolsValue);
        return agentNode;
    }
    // update the node
    updatedAgentNode.properties.tools.value = toolsValue;
    updatedAgentNode.codedata.isNew = false;
    return updatedAgentNode;
};

export const addToolToAgentNode = async (agentNode: FlowNode, toolName: string) => {
    if (!agentNode || agentNode.codedata?.node !== "AGENT") return null;
    // clone the node to avoid modifying the original
    const updatedAgentNode = cloneDeep(agentNode);
    let toolsValue = updatedAgentNode.properties.tools.value;
    // remove new lines and normalize whitespace from the tools value
    // toolsValue = toolsValue.toString().replace(/\s+/g, "");
    if (toolsValue == undefined) {
        toolsValue = `[]`;
    }
    if (typeof toolsValue === "string") {
        const toolsArray = parseToolsString(toolsValue);
        if (toolsArray.length > 0) {
            // Add the tool if not exists
            if (!toolsArray.includes(toolName)) {
                toolsArray.push(toolName);
            }
            // Update the tools value
            toolsValue = toolsArray.length === 1 ? `[${toolsArray[0]}]` : `[${toolsArray.join(", ")}]`;
        } else {
            toolsValue = `[${toolName}]`;
        }
    } else {
        console.error("Tools value is not a string", toolsValue);
        return agentNode;
    }
    updatedAgentNode.properties.tools.value = toolsValue;
    updatedAgentNode.codedata.isNew = false;
    return updatedAgentNode;
};

export interface McpServerConfig {
    name: string;
    serviceUrl: string;
    configs: Record<string, string>;
    toolSelection: string;
    selectedTools: string[];
};

export const updateMcpServerToAgentNode = async (
    agentNode: FlowNode,
    toolConfig: McpServerConfig,
    originalToolName: string
) => {
    if (!agentNode || agentNode.codedata?.node !== "AGENT") return null;

    const updatedAgentNode = cloneDeep(agentNode);
    let toolsValue = updatedAgentNode.properties.tools.value;

    if (typeof toolsValue === "string") {
        console.log(">>> Current tools string", toolsValue);

        // Prepare the new tool string based on tool selection
        let newToolString;
        if (toolConfig.toolSelection.includes("Selected")) {
            const toolsString = toolConfig.selectedTools.map(tool => `"${tool}"`).join(", ");
            newToolString = `check new ai:McpToolKit("${toolConfig.serviceUrl}", permittedTools = [${toolsString}], info = {name: "${toolConfig.name}", version: ""})`;
        } else {
            newToolString = `check new ai:McpToolKit("${toolConfig.serviceUrl}", permittedTools = (), info = {name: "${toolConfig.name}", version: ""})`;
        }

        // Fixed regex pattern that matches only the specific McpToolKit with the target name
        // Uses negated character classes to prevent crossing boundaries
        const pattern = new RegExp(
            `check new ai:McpToolKit\\([^}]*name:\\s*"${originalToolName}"[^}]*\\}\\)`,
            'g'
        );

        console.log(">>> Regex pattern:", pattern);
        console.log(">>> Testing pattern against toolsValue:", pattern.test(toolsValue));

        // Reset the regex lastIndex since test() modifies it
        pattern.lastIndex = 0;

        if (pattern.test(toolsValue)) {
            console.log(">>> Found existing tool to replace");
            // Reset lastIndex again before replace
            pattern.lastIndex = 0;
            toolsValue = toolsValue.replace(pattern, newToolString);
        } else {
            const trimmedValue = toolsValue.trim();
            const isWrappedInBrackets = trimmedValue.startsWith('[') && trimmedValue.endsWith(']');
            const innerContent = isWrappedInBrackets
                ? trimmedValue.slice(1, -1).trim()
                : trimmedValue;
            toolsValue = innerContent
                ? `[${innerContent}, ${newToolString}]`
                : `[${newToolString}]`;
        }
    } else {
        console.error("Tools value is not a string", toolsValue);
        return agentNode;
    }

    updatedAgentNode.properties.tools.value = toolsValue;
    updatedAgentNode.codedata.isNew = false;

    console.log(">>> Final updated tools value", toolsValue);
    return updatedAgentNode;
};

export const addMcpServerToAgentNode = async (agentNode: FlowNode, toolConfig: McpServerConfig) => {
    if (!agentNode || agentNode.codedata?.node !== "AGENT") return null;
    // clone the node to avoid modifying the original
    const updatedAgentNode = cloneDeep(agentNode);
    let toolsValue = updatedAgentNode.properties.tools.value;
    // remove new lines and normalize whitespace from the tools value

    console.log(">>> add tools", toolConfig);
    const toolsString = toolConfig.selectedTools.map(tool => `"${tool}"`).join(", ");
    let toolString = `check new ai:McpToolKit("${toolConfig.serviceUrl}", permittedTools = (), info = {name: "${toolConfig.name}", version: ""})`;
    if (toolConfig.toolSelection.includes("Selected")) {
        toolString = `check new ai:McpToolKit("${toolConfig.serviceUrl}", permittedTools = [${toolsString}], info = {name: "${toolConfig.name}", version: ""})`;
    }
    if (typeof toolsValue === "string") {
        const toolsArray = parseToolsString(toolsValue);
        if (toolsArray.length > 0) {
            // Add the tool if not exists
            if (!toolsArray.includes(toolString)) {
                toolsArray.push(toolString);
            }
            // Update the tools value
            toolsValue = toolsArray.length === 1 ? `[${toolsArray[0]}]` : `[${toolsArray.join(", ")}]`;
        } else {
            toolsValue = `[${toolString}]`;
        }
    } else {
        console.error("Tools value is not a string", toolsValue);
        return agentNode;
    }
    // update the node
    updatedAgentNode.properties.tools.value = toolsValue;
    updatedAgentNode.codedata.isNew = false;
    return updatedAgentNode;
};

export const removeMcpServerFromAgentNode = (
    agentNode: FlowNode,
    toolkitNameToRemove: string
) => {
    if (!agentNode || agentNode.codedata?.node !== "AGENT") return null;

    const updatedAgentNode = cloneDeep(agentNode);
    let toolsValue = updatedAgentNode.properties.tools.value;

    if (typeof toolsValue !== "string") {
        console.error("Tools value is not a string", toolsValue);
        return agentNode;
    }

    const startPattern = 'check new ai:McpToolKit(';
    let startIndex = 0;
    let found = false;

    while (!found && startIndex < toolsValue.length) {
        startIndex = toolsValue.indexOf(startPattern, startIndex);
        if (startIndex === -1) break;

        let endIndex = toolsValue.indexOf('})', startIndex);
        if (endIndex === -1) break;
        endIndex += 2; // Include the '})'

        const declaration = toolsValue.substring(startIndex, endIndex);
        if (declaration.includes(`name: "${toolkitNameToRemove}"`)) {
            let hasCommaAfter = false;
            if (toolsValue[endIndex] === ',') {
                endIndex++;
                hasCommaAfter = true;
            }
            let hasCommaBefore = false;
            let newStartIndex = startIndex;
            if (startIndex > 0 && toolsValue[startIndex - 1] === ',') {
                newStartIndex--;
                hasCommaBefore = true;
            }

            let isLastItem = !hasCommaAfter;

            let before = toolsValue.substring(0, newStartIndex);
            let after = toolsValue.substring(endIndex);

            if (hasCommaBefore && hasCommaAfter) {
                after = after.trim();
            } else if (isLastItem) {
                before = before.trim();
                if (before.endsWith(',')) {
                    before = before.substring(0, before.length - 1).trim();
                }
            }

            toolsValue = before + after;
            found = true;
        } else {
            startIndex = endIndex;
        }
    }

    toolsValue = toolsValue
        .replace(/,+/g, ',')
        .replace(/, ,/g, ', ')
        .replace(/\s*,\s*/g, ', ')
        .replace(/, $/, '')
        .replace(/^, /, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (toolsValue === '[' || toolsValue === '[]') {
        toolsValue = '[]';
    }

    updatedAgentNode.properties.tools.value = toolsValue;
    return updatedAgentNode;
};

// remove agent node, model node when removing ag
export const removeAgentNode = async (agentCallNode: FlowNode, rpcClient: BallerinaRpcClient): Promise<boolean> => {
    if (!agentCallNode || agentCallNode.codedata?.node !== "AGENT_CALL") return false;
    // get agent node
    const agentNode = await findAgentNodeFromAgentCallNode(agentCallNode, rpcClient);
    console.log(">>> agent node", agentNode);
    if (!agentNode) {
        console.error("Agent node not found", agentCallNode);
        return false;
    }

    // get file path
    const agentFileName = agentNode.codedata.lineRange.fileName;
    const agentFilePath = (await rpcClient.getVisualizerRpcClient().joinProjectPath({ segments: [agentFileName] })).filePath;

    // delete the agent node
    await rpcClient.getBIDiagramRpcClient().deleteFlowNode({
        filePath: agentFilePath,
        flowNode: agentNode,
    });

    // get model name
    const modelName = agentNode?.properties.model.value;
    console.log(">>> model name", modelName);

    if (typeof modelName !== "string") {
        console.error("Model name is not a string");
        return false;
    }

    // get model node
    const startLine = agentNode.codedata?.lineRange?.startLine;
    const linePosition: LinePosition | undefined = startLine
        ? {
            line: startLine.line,
            offset: startLine.offset
        }
        : undefined;

    const queryMap: SearchNodesQueryParams = {
        kind: "MODEL_PROVIDER",
        exactMatch: modelName
    };
    const modelNodes = await findFlowNode(rpcClient, agentFilePath, linePosition, queryMap);
    const modelNode = modelNodes && modelNodes.length > 0 ? modelNodes[0] : null;
    console.log(">>> model node", modelNode);
    if (!modelNode) {
        console.error("Model node not found", agentCallNode);
        return false;
    }

    // get file path
    const modelFileName = modelNode.codedata?.lineRange?.fileName;
    const modelFilePath = (await rpcClient.getVisualizerRpcClient().joinProjectPath({ segments: [modelFileName] })).filePath;

    // delete the model node
    await rpcClient.getBIDiagramRpcClient().deleteFlowNode({
        filePath: modelFilePath,
        flowNode: modelNode,
    });
    return true;
};

export const updateFlowNodePropertyValuesWithKeys = (flowNode: FlowNode) => {
    const excludedKeys = ["variable", "type", "checkError", "targetType"];
    for (const key in flowNode.properties) {
        if (!excludedKeys.includes(key)) {
            (flowNode.properties as Record<string, { value: string }>)[key].value = key;
        }
    }
};

export const parseToolsString = (toolsStr: string, removeQuotes: boolean = false): string[] => {
    // Remove brackets and split by comma
    const trimmed = toolsStr.trim();
    if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
        return [];
    }
    const inner = trimmed.substring(1, trimmed.length - 1).trim();
    // Handle empty array case
    if (!inner) {
        return [];
    }
    // Split by comma and process each element
    return inner.split(",").map((tool) => {
        const trimmedTool = tool.trim();
        // Remove surrounding single or double quotes if requested
        if (
            removeQuotes &&
            ((trimmedTool.startsWith('"') && trimmedTool.endsWith('"')) ||
                (trimmedTool.startsWith("'") && trimmedTool.endsWith("'")))
        ) {
            return trimmedTool.substring(1, trimmedTool.length - 1);
        }
        return trimmedTool;
    });
};

/**
 * Extracts access token from auth value string.
 * Expected format: {token: "..."}
 */
export const extractAccessToken = (authValue: string): string | null => {
    if (authValue === null) return null;

    try {
        const tokenMatch = authValue.match(/token:\s*"([^"]*)"/);
        return tokenMatch?.[1] ?? null;
    } catch (error) {
        console.error("Failed to parse auth token:", error);
        return "";
    }
};

/**
 * Gets the end of file line range for a given file.
 * Returns a LineRange object pointing to the end of the file.
 */
export const getEndOfFileLineRange = async (
    fileName: string,
    rpcClient: BallerinaRpcClient
): Promise<LineRange> => {
    try {
        // Get the full file path by joining with project path
        const filePath = (await rpcClient.getVisualizerRpcClient().joinProjectPath({ segments: [fileName] })).filePath;

        // Get the end of file position using the BIDiagram RPC client
        const endPosition = await rpcClient.getBIDiagramRpcClient().getEndOfFile({
            filePath: filePath
        });

        // Return a LineRange object with both start and end at the file's end position
        return {
            fileName: fileName,
            startLine: endPosition,
            endLine: endPosition
        };
    } catch (error) {
        console.error(`Error getting end of file line range for ${fileName}:`, error);
        // Return a default LineRange at position 0,0 if there's an error
        return {
            fileName: fileName,
            startLine: { line: 0, offset: 0 },
            endLine: { line: 0, offset: 0 }
        };
    }
};

/**
 * Checks if a value is a string literal (enclosed in double quotes).
 */
export const isStringLiteral = (value: string): boolean => {
    const trimmed = value.trim();
    return (trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("string `") && trimmed.endsWith("`"));
};

/**
 * Removes enclosing double quotes from a string literal.
 */
export const removeQuotes = (value: string): string => {
    const trimmed = value.trim();
    if (isStringLiteral(trimmed)) {
        if (trimmed.startsWith("string `") && trimmed.endsWith("`")) {
            return trimmed.substring(8, trimmed.length - 1);
        }
        return trimmed.substring(1, trimmed.length - 1);
    }
    return trimmed;
};

/**
 * Finds a variable value in module variables.
 */
export const findValueInModuleVariables = async (
    variableName: string,
    rpcClient: BallerinaRpcClient,
    filePath: string
): Promise<string | null> => {
    const queryMap: SearchNodesQueryParams = {
        kind: "VARIABLE",
        exactMatch: variableName
    };

    const variables = await findFlowNode(rpcClient, filePath, undefined, queryMap);

    if (!variables || variables.length === 0) {
        return null;
    }

    const variable = variables[0];

    if (variable?.properties?.expression?.value && !variable?.codedata?.sourceCode?.includes("configurable")) {
        return variable.properties.expression.value as string;
    }

    return null;
};

type ConfigVariablesState = {
    [category: string]: {
        [module: string]: ConfigVariable[];
    };
};

/**
 * Finds a variable value in configurable variables using the API.
 */
export const findValueInConfigVariables = async (
    variableName: string,
    rpcClient: BallerinaRpcClient,
    projectPathUri: string
): Promise<string | null> => {
    try {
        const response = await rpcClient
            .getBIDiagramRpcClient()
            .getConfigVariablesV2({
                includeLibraries: false,
                projectPath: projectPathUri
            });

        if (!response?.configVariables) {
            return null;
        }

        const configVars = (response as any).configVariables as ConfigVariablesState;

        for (const category in configVars) {
            for (const module in configVars[category]) {
                const variable = configVars[category][module].find(
                    (v: ConfigVariable) => v.properties?.variable?.value === variableName
                );
                if (variable) {
                    // Return the value from configValue or defaultValue
                    const configValue = variable.properties?.configValue?.value as string | null;
                    if (configValue === "" || configValue === null) return null;
                    return configValue;
                }
            }
        }

        return null;
    } catch (error) {
        console.error(`Error fetching config variables for ${variableName}:`, error);
        return null;
    }
};

export const isUrl = (value: string): boolean => {
    const trimmed = value.trim();
    try {
        // Handle localhost without protocol
        if (trimmed.startsWith('localhost:')) {
            new URL('http://' + trimmed);
            return true;
        }
        new URL(trimmed);
        return true;
    } catch {
        return false;
    }
};

export const resolveVariableValue = async (
    value: string,
    rpcClient: BallerinaRpcClient,
    projectPathUri: string,
    filePath: string
): Promise<string | null> => {
    if (!value) {
        return null;
    }

    const trimmed = value.trim();

    // String literal - remove quotes and check for interpolation
    if (isStringLiteral(trimmed)) {
        const content = removeQuotes(trimmed);
        const interpolationMatch = content.match(/^\s*\$\{([^}]+)\}\s*$/);
        if (interpolationMatch) {
            const variableName = interpolationMatch[1];
            return resolveVariableValue(variableName, rpcClient, projectPathUri, filePath);
        }
        return content;
    }

    // URL - return as-is to skip variable lookups
    if (isUrl(trimmed)) {
        return trimmed;
    }

    // Check module variables
    const moduleValue = await findValueInModuleVariables(trimmed, rpcClient, filePath);
    if (moduleValue) {
        return removeQuotes(moduleValue);
    }

    // Check config variables
    const configValue = await findValueInConfigVariables(trimmed, rpcClient, projectPathUri);
    if (configValue) {
        return removeQuotes(configValue);
    }

    return null;
};

/**
 * Extracts variable names from an auth config string and resolves them.
 * Expected format: {token: "value"} or {token: variableName}
 */
export const resolveAuthConfig = async (
    authValue: string,
    rpcClient: BallerinaRpcClient,
    projectPathUri: string,
    filePath: string
): Promise<string | null> => {
    if (!authValue) {
        return "";
    }

    let resolvedAuth = authValue;

    // Find all variable references in the auth config
    // Matches patterns like: token: variableName (without quotes)
    const variablePattern = /(\w+):\s*([^",}\s]+)/g;
    const matches = [...authValue.matchAll(variablePattern)];

    for (const match of matches) {
        const [fullMatch, key, variableOrValue] = match;

        // Skip if it's already a quoted string
        if (variableOrValue.startsWith('"') || variableOrValue.startsWith("'")) {
            continue;
        }

        // Resolve the variable
        const resolvedValue = await resolveVariableValue(
            variableOrValue,
            rpcClient,
            projectPathUri,
            filePath
        );

        // Return null if the variable cannot be resolved
        if (resolvedValue === null) {
            return null;
        }

        // Replace in the auth string with quoted value
        resolvedAuth = resolvedAuth.replace(
            fullMatch,
            `${key}: "${resolvedValue}"`
        );
    }

    return resolvedAuth;
};
