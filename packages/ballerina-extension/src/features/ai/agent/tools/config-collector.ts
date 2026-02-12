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
    checkConfigurationStatus,
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
    tempPath: string;      // Where files are created/modified during execution
    workspacePath: string; // Original workspace for reading existing configs
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
   - Use when you need to set up config structure before collecting configuration values
   - Example: { mode: "create", variables: [{ name: "API_KEY", description: "Stripe API key", type: "string" }] }

2. CREATE_AND_COLLECT: Create config AND immediately request configuration values (most efficient)
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
                    paths
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

    // Determine output path based on isTestConfig flag
    const configPath = getConfigPath(paths.tempPath, isTestConfig);
    const configFileName = getConfigFileName(isTestConfig);

    console.log(`[ConfigCollector] CREATE mode - Creating ${configFileName} with placeholders`);

    // Emit creating_file stage
    eventHandler({
        type: "configuration_collection_event",
        requestId,
        stage: "creating_file",
        message: isTestConfig
            ? "Creating configuration file for tests..."
            : "Creating configuration file...",
        isTestConfig,
    });

    // Create config with placeholder values
    createConfigWithPlaceholders(configPath, variables, false);

    // Track modified file
    if (modifiedFiles) {
        if (!modifiedFiles.includes(configFileName)) {
            modifiedFiles.push(configFileName);
        }
    }

    // Emit done stage
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
    // First create the config in temp
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

    // Then immediately collect configuration values and write to temp
    // Temp files are automatically synced to workspace by agent system
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
    const sourceConfigPath = isTestConfig
        ? path.join(paths.tempPath, "Config.toml")  // Read from main config
        : configPath;  // Read from same file

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
            ? "Found existing values. You can reuse or update them for testing."
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
    paths: ConfigCollectorPaths
): Promise<ConfigCollectorResult> {
    // Determine config path (use provided path or default)
    let configPath: string;
    if (filePath) {
        // Use provided path relative to workspace
        configPath = path.join(paths.workspacePath, filePath);
    } else {
        // Default to workspace Config.toml
        configPath = path.join(paths.workspacePath, "Config.toml");
    }

    // Check configuration value status
    const status = checkConfigurationStatus(configPath, variableNames);

    const filledCount = Object.values(status).filter((s) => s === "filled").length;
    const missingCount = Object.values(status).filter((s) => s === "missing").length;

    return {
        success: true,
        message: `Checked ${variableNames.length} configuration value(s): ${filledCount} filled, ${missingCount} missing`,
        status,
    };
}

function handleError(
    error: any,
    requestId: string,
    eventHandler: CopilotEventHandler
): ConfigCollectorResult {
    console.error("[ConfigCollector] Error:", error);

    eventHandler({
        type: "configuration_collection_event",
        requestId,
        stage: "error",
        message: `Error: ${error.message}`,
        error: {
            message: error.message,
            code: error.code || "UNKNOWN_ERROR",
        },
    });

    return {
        success: false,
        message: `Failed to manage configuration: ${error.message}`,
        error: error.message,
        errorCode: error.code || "UNKNOWN_ERROR",
    };
}
