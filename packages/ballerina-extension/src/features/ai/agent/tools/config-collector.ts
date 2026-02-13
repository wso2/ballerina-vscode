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
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { CopilotEventHandler } from "../../utils/events";
import { approvalManager } from "../../state/ApprovalManager";
import {
    ConfigVariable,
    createConfigWithPlaceholders,
    getAllConfigStatus,
    validateVariableName,
    writeConfigValuesToConfig,
    createStatusMetadata,
    readExistingConfigValues,
} from "../../../../utils/toml-utils";

export const CONFIG_COLLECTOR_TOOL = "ConfigCollector";

// Constants for config file paths
const CONFIG_FILE_PATH = "Config.toml";
const TEST_CONFIG_FILE_PATH = "tests/Config.toml";

const ConfigVariableSchema = z.object({
    name: z.string().describe("Variable name (e.g., API_KEY)"),
    description: z.string().describe("Human-readable description"),
    type: z.enum(["string", "int"]).optional().describe("Data type: string (default) or int"),
});

const ConfigCollectorSchema = z.object({
    mode: z.enum(["create", "create_and_collect", "collect", "check"]).describe("Operation mode"),
    filePath: z.string().optional().describe("Path to config file (for check mode)"),
    variables: z.array(ConfigVariableSchema).optional().describe("Configuration variables"),
    variableNames: z.array(z.string()).optional().describe("Variable names for check mode"),
    isTestConfig: z.boolean().optional().describe("Set to true when collecting configuration for tests. Tool will automatically read from Config.toml and write to tests/Config.toml"),
});

interface ConfigCollectorInput {
    mode: "create" | "create_and_collect" | "collect" | "check";
    filePath?: string;
    variables?: ConfigVariable[];
    variableNames?: string[];
    isTestConfig?: boolean;
}

export interface ConfigCollectorResult {
    success: boolean;
    message: string;
    status?: Record<string, "filled" | "missing">;
    error?: string;
    errorCode?: string;
}

export interface ConfigCollectorPaths {
    tempPath: string;
    workspacePath: string;
}

// Helper functions
function getConfigPath(basePath: string, isTestConfig?: boolean): string {
    return isTestConfig
        ? path.join(basePath, "tests", "Config.toml")
        : path.join(basePath, "Config.toml");
}

function getConfigFileName(isTestConfig?: boolean): string {
    return isTestConfig ? TEST_CONFIG_FILE_PATH : CONFIG_FILE_PATH;
}

function validateConfigVariables(
    variables: ConfigVariable[]
): ConfigCollectorResult | null {
    for (const variable of variables) {
        if (!validateVariableName(variable.name)) {
            return createErrorResult(
                "INVALID_VARIABLE_NAME",
                `Invalid variable name: ${variable.name}. Use uppercase with underscores (e.g., API_KEY)`
            );
        }
    }
    return null; // Valid
}

function createErrorResult(errorCode: string, message: string): ConfigCollectorResult {
    return {
        success: false,
        message,
        error: message,
        errorCode,
    };
}

export function createConfigCollectorTool(
    eventHandler: CopilotEventHandler,
    paths: ConfigCollectorPaths,
    modifiedFiles?: string[]
) {
    return tool({
        description: `
Manages configuration values in Config.toml for Ballerina integrations securely. Use this tool when user requirements involve API keys, passwords, database credentials, or other sensitive configuration.

IMPORTANT: Before calling COLLECT or CREATE_AND_COLLECT modes, briefly tell the user what configuration values you need and why.

Operation Modes:
1. CREATE: Create Config.toml with placeholder variables only
   - If file already exists, returns current variable status (same as check mode) instead of overwriting
   - Use when you need to set up config structure before collecting configuration values
   - Example: { mode: "create", variables: [{ name: "API_KEY", description: "Stripe API key", type: "string" }] }

2. CREATE_AND_COLLECT: Create config AND immediately request configuration values (most efficient)
   - If file already exists, skips create and goes straight to collect
   - Use for new integrations that need configuration values right away
   - Tell user first what you need
   - Example: { mode: "create_and_collect", variables: [{ name: "API_KEY", description: "Stripe API key", type: "string" }] }

3. COLLECT: Request configuration values from user
   - Creates Config.toml if it doesn't exist
   - Pre-populates existing values for easy editing
   - Use when Config.toml already exists and needs configuration values
   - Tell user first what you need
   - Example: { mode: "collect", variables: [{ name: "API_KEY", description: "Stripe API key", type: "string" }] }

4. CHECK: Check which configuration values are filled/missing
   - Returns status metadata only, NEVER actual configuration values
   - Example: { mode: "check", variableNames: ["API_KEY", "DB_PASSWORD"], filePath: "Config.toml" }
   - Returns: { success: true, status: { API_KEY: "filled", DB_PASSWORD: "missing" } }

5. COLLECT with isTestConfig: Request configuration values for test Config.toml
   - Use when generating tests that need configuration values
   - Set isTestConfig: true
   - Tool automatically:
     * Reads existing configuration from Config.toml (if exists)
     * Writes to tests/Config.toml
     * Creates tests/ directory if needed
   - UI behavior depends on what's in main config:
     * If placeholders found: Shows "Configuration values needed"
     * If actual values found: Shows "Found existing values. You can reuse or update them for testing."
     * If mixed: Shows "Complete the remaining configuration values"
   - Works even if main Config.toml doesn't exist (shows empty form)
   - Example: { mode: "collect", variables: [{ name: "API_KEY", description: "Stripe API key", type: "string" }], isTestConfig: true }

IMPORTANT: When generating tests that use configurables, ALWAYS use isTestConfig: true.
This ensures tests have their own Config.toml in the tests/ directory.

VARIABLE NAMING (CRITICAL):
Variable names are converted: API_KEY → apikey, DB_HOST → dbhost (lowercase, no underscores).
You MUST use identical names in Config.toml and Ballerina code.

Correct:
  Tool: { name: "DB_HOST" }
  Config.toml: dbhost = "localhost"
  Code: configurable string dbhost = ?;

Incorrect (DO NOT DO):
  Tool: { name: "DB_HOST" }
  Config.toml: dbhost = "localhost"
  Code: configurable string dbHost = ?;  // WRONG - mismatch causes runtime error

SECURITY:
- You NEVER see actual configuration values
- Tool returns only status: { API_KEY: "filled" }
- NEVER hardcode configuration values in code`,
        inputSchema: ConfigCollectorSchema,
        execute: async (input) => {
            return await ConfigCollectorTool(
                input as ConfigCollectorInput,
                eventHandler,
                paths,
                modifiedFiles
            );
        },
    });
}

/**
 * Analyze existing configuration values to determine their status and appropriate UI message
 */
function analyzeExistingConfig(
    existingValues: Record<string, string>,
    variableNames: string[]
): {
    hasActualValues: boolean;
    hasPlaceholders: boolean;
    filledCount: number;
    message: string;
} {
    let filledCount = 0;
    let placeholderCount = 0;

    for (const name of variableNames) {
        const value = existingValues[name];
        if (value && !value.startsWith('${')) {
            filledCount++;
        } else {
            placeholderCount++;
        }
    }

    let message = "";
    if (filledCount === 0) {
        message = "Configuration values needed";
    } else if (placeholderCount === 0) {
        message = "Found existing values. You can reuse or update them.";
    } else {
        message = "Complete the remaining configuration values";
    }

    return {
        hasActualValues: filledCount > 0,
        hasPlaceholders: placeholderCount > 0,
        filledCount,
        message
    };
}

export async function ConfigCollectorTool(
    input: ConfigCollectorInput,
    eventHandler: CopilotEventHandler,
    paths: ConfigCollectorPaths,
    modifiedFiles?: string[]
): Promise<ConfigCollectorResult> {
    if (!eventHandler) {
        return createErrorResult("INVALID_INPUT", "Event handler is required");
    }

    const requestId = crypto.randomUUID();

    try {
        switch (input.mode) {
            case "create":
                return await handleCreateMode(
                    input.variables,
                    paths,
                    eventHandler,
                    requestId,
                    input.isTestConfig,
                    modifiedFiles
                );

            case "create_and_collect":
                return await handleCreateAndCollectMode(
                    input.variables,
                    paths,
                    eventHandler,
                    requestId,
                    input.isTestConfig,
                    modifiedFiles
                );

            case "collect":
                return await handleCollectMode(
                    input.variables,
                    paths,
                    eventHandler,
                    requestId,
                    input.isTestConfig,
                    modifiedFiles
                );

            case "check":
                return await handleCheckMode(
                    input.variableNames,
                    input.filePath,
                    paths,
                    input.isTestConfig
                );

            default:
                // TypeScript should prevent this with discriminated unions
                return createErrorResult("INVALID_MODE", `Unknown mode: ${(input as any).mode}`);
        }
    } catch (error: any) {
        return handleError(error, requestId, eventHandler);
    }
}

async function handleCreateMode(
    variables: ConfigVariable[],
    paths: ConfigCollectorPaths,
    eventHandler: CopilotEventHandler,
    requestId: string,
    isTestConfig?: boolean,
    modifiedFiles?: string[]
): Promise<ConfigCollectorResult> {
    // Validate variable names
    const validationError = validateConfigVariables(variables);
    if (validationError) { return validationError; }

    const configPath = getConfigPath(paths.tempPath, isTestConfig);
    const configFileName = getConfigFileName(isTestConfig);

    // If file already exists, delegate to check mode to inform the agent of current status
    if (fs.existsSync(configPath)) {
        console.log(`[ConfigCollector] CREATE mode - ${configFileName} already exists, delegating to check mode`);
        const variableNames = variables.map((v) => v.name);
        const checkResult = await handleCheckMode(variableNames, undefined, paths, isTestConfig);
        return {
            ...checkResult,
            message: `${configFileName} already exists. ${checkResult.message}. Use collect mode to update values.`,
        };
    }

    console.log(`[ConfigCollector] CREATE mode - Creating ${configFileName} with placeholders`);

    eventHandler({
        type: "configuration_collection_event",
        requestId,
        stage: "creating_file",
        message: isTestConfig
            ? "Creating configuration file for tests..."
            : "Creating configuration file...",
        isTestConfig,
    });

    createConfigWithPlaceholders(configPath, variables, false);

    if (modifiedFiles && !modifiedFiles.includes(configFileName)) {
        modifiedFiles.push(configFileName);
    }

    eventHandler({
        type: "configuration_collection_event",
        requestId,
        stage: "done",
        message: isTestConfig
            ? "Configuration file for tests created"
            : "Configuration file created",
        isTestConfig,
    });

    return {
        success: true,
        message: `Created ${configFileName} with ${variables.length} placeholder variable(s). Use collect mode to request configuration values from user.`,
    };
}

async function handleCreateAndCollectMode(
    variables: ConfigVariable[],
    paths: ConfigCollectorPaths,
    eventHandler: CopilotEventHandler,
    requestId: string,
    isTestConfig?: boolean,
    modifiedFiles?: string[]
): Promise<ConfigCollectorResult> {
    const configPath = getConfigPath(paths.tempPath, isTestConfig);

    // If file already exists, skip create and go straight to collect
    if (!fs.existsSync(configPath)) {
        const createResult = await handleCreateMode(
            variables,
            paths,
            eventHandler,
            requestId,
            isTestConfig,
            modifiedFiles
        );
        if (!createResult.success) {
            return createResult;
        }
    }

    return await handleCollectMode(
        variables,
        paths,
        eventHandler,
        requestId,
        isTestConfig,
        modifiedFiles
    );
}

async function handleCollectMode(
    variables: ConfigVariable[],
    paths: ConfigCollectorPaths,
    eventHandler: CopilotEventHandler,
    requestId: string,
    isTestConfig?: boolean,
    modifiedFiles?: string[]
): Promise<ConfigCollectorResult> {
    // Validate variable names
    const validationError = validateConfigVariables(variables);
    if (validationError) { return validationError; }

    // Determine paths based on isTestConfig flag
    const configPath = getConfigPath(paths.tempPath, isTestConfig);

    // Priority: tests/Config.toml → Config.toml → empty
    const mainConfigPath = path.join(paths.tempPath, "Config.toml");
    const sourceConfigPath = isTestConfig
        ? (fs.existsSync(configPath) ? configPath : mainConfigPath)
        : configPath;

    // Capture whether the test config already existed
    const testConfigPreExisted = isTestConfig && fs.existsSync(configPath);

    // Create config file if it doesn't exist
    if (!fs.existsSync(configPath)) {
        console.log(`[ConfigCollector] Creating ${getConfigFileName(isTestConfig)}`);

        // Emit creating_file stage
        eventHandler({
            type: "configuration_collection_event",
            requestId,
            stage: "creating_file",
            message: isTestConfig
                ? "Setting up tests/Config.toml..."
                : "Setting up Config.toml...",
            isTestConfig,
        });

        createConfigWithPlaceholders(configPath, variables, false);

        // Track modified file
        if (modifiedFiles) {
            const configFileName = getConfigFileName(isTestConfig);
            if (!modifiedFiles.includes(configFileName)) {
                modifiedFiles.push(configFileName);
            }
        }
    }

    // Read existing configuration values from source config (if they exist)
    const existingValues = readExistingConfigValues(
        sourceConfigPath,
        variables.map(v => v.name)
    );

    // Analyze existing values to determine appropriate messaging
    const analysis = analyzeExistingConfig(
        existingValues,
        variables.map(v => v.name)
    );

    console.log(`[ConfigCollector] ${isTestConfig ? 'Test' : 'Main'} configuration: ${analysis.filledCount} filled`);

    // Determine the message to show to user
    const userMessage = isTestConfig
        ? (analysis.hasActualValues
            ? (testConfigPreExisted
                ? "Found existing test values. You can update them."
                : "Found values from main config. You can reuse or update them for testing.")
            : "Test configuration values needed")
        : (analysis.hasActualValues
            ? "Update configuration values"
            : "Configuration values needed");

    // Request configuration values from user via ApprovalManager
    // This returns ACTUAL values (not exposed to agent)
    const userResponse = await approvalManager.requestConfiguration(
        requestId,
        variables,
        existingValues,
        eventHandler,
        isTestConfig,
        userMessage
    );

    if (!userResponse.provided) {
        // User cancelled
        const configFileName = getConfigFileName(isTestConfig);
        eventHandler({
            type: "configuration_collection_event",
            requestId,
            stage: "skipped",
            message: `Configuration collection cancelled${userResponse.comment ? ": " + userResponse.comment : ""}`,
            isTestConfig,
        });

        return {
            success: false,
            message: `User cancelled configuration collection${userResponse.comment ? ": " + userResponse.comment : ""}. ${configFileName} has placeholder values. You can ask user to provide values later using collect mode.`,
            error: `User cancelled${userResponse.comment ? ": " + userResponse.comment : ""}`,
            errorCode: "USER_CANCELLED",
        };
    }

    // Write actual configuration values to determined config path
    writeConfigValuesToConfig(configPath, userResponse.configValues!, variables);

    // Track modified file for syncing to workspace
    if (modifiedFiles) {
        const configFileName = getConfigFileName(isTestConfig);
        if (!modifiedFiles.includes(configFileName)) {
            modifiedFiles.push(configFileName);
        }
    }

    // Convert to status metadata (filled/missing) - NEVER return actual values to agent
    const statusMetadata = createStatusMetadata(userResponse.configValues!);

    // Clear values from memory
    userResponse.configValues = undefined;

    // Success - configuration values were collected and written
    const configFileName = getConfigFileName(isTestConfig);
    eventHandler({
        type: "configuration_collection_event",
        requestId,
        stage: "done",
        message: isTestConfig
            ? "Test configuration saved to tests/Config.toml"
            : "Configuration saved to Config.toml",
        isTestConfig,
    });

    return {
        success: true,
        message: `Successfully collected ${variables.length} configuration value(s) and saved to ${configFileName}${userResponse.comment ? ". User note: " + userResponse.comment : ""}`,
        status: statusMetadata,
    };
}

async function handleCheckMode(
    variableNames: string[],
    filePath: string | undefined,
    paths: ConfigCollectorPaths,
    isTestConfig?: boolean
): Promise<ConfigCollectorResult> {
    let configPath: string;
    let configFileName: string;
    if (filePath) {
        configPath = path.join(paths.tempPath, filePath);
        configFileName = path.basename(filePath);
    } else {
        configPath = getConfigPath(paths.tempPath, isTestConfig);
        configFileName = getConfigFileName(isTestConfig);
    }

    if (!fs.existsSync(configPath)) {
        return {
            success: false,
            message: `${configFileName} not found. Use create or collect mode to create it.`,
            error: "FILE_NOT_FOUND",
            errorCode: "FILE_NOT_FOUND",
        };
    }

    // Read all variables from the file
    const status = getAllConfigStatus(configPath);

    // Any requested variable names not found in file → mark as missing
    for (const name of variableNames) {
        if (!(name in status)) {
            status[name] = "missing";
        }
    }

    const filledCount = Object.values(status).filter((s) => s === "filled").length;
    const missingCount = Object.values(status).filter((s) => s === "missing").length;
    const totalCount = filledCount + missingCount;

    return {
        success: true,
        message: `${configFileName} has ${totalCount} variable(s): ${filledCount} filled, ${missingCount} with placeholder`,
        status,
    };
}

function handleError(
    error: any,
    requestId: string,
    eventHandler: CopilotEventHandler
): ConfigCollectorResult {
    const message = (error && typeof error.message === "string" && error.message) || String(error) || "Unknown error";
    const code = (error && error.code) || "UNKNOWN_ERROR";

    console.error("[ConfigCollector] Error:", error);

    eventHandler({
        type: "configuration_collection_event",
        requestId,
        stage: "error",
        message: `Error: ${message}`,
        error: {
            message,
            code,
        },
    });

    return {
        success: false,
        message: `Failed to manage configuration: ${message}`,
        error: message,
        errorCode: code,
    };
}
