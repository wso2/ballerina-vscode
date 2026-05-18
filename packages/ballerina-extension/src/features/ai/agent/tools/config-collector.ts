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
    getAllConfigStatus,
    validateVariableName,
    writeConfigValuesToConfig,
    createStatusMetadata,
    readExistingConfigValues,
} from "../../../../utils/toml-utils";
import { resolveContained, resolvePackageBasePath } from "./path-utils";
import { getOrgPackageName } from "../../../../utils/config";
import { langClient } from "../../activator";

export const CONFIG_COLLECTOR_TOOL = "ConfigCollector";

// Constants for config file paths
const CONFIG_FILE_PATH = "Config.toml";
const TEST_CONFIG_FILE_PATH = "tests/Config.toml";

const ConfigVariableSchema = z.object({
    name: z.string().describe("Variable name in camelCase — must match the Ballerina configurable identifier exactly"),
    description: z.string().describe("Human-readable description"),
    secret: z.boolean().optional().describe("Mark as true for sensitive values (API keys, passwords, tokens) to render as a masked input"),
});

const ConfigCollectorSchema = z.object({
    mode: z.enum(["collect", "check"]).describe("Operation mode"),
    filePath: z.string().optional().describe("Path to config file (for check mode)"),
    variables: z.array(ConfigVariableSchema).optional().describe("Configuration variables"),
    variableNames: z.array(z.string()).optional().describe(
        "Variable names to verify in check mode. " +
        "Omit to discover ALL existing variable names in the file — useful when you want to reuse names that are already there."
    ),
    isTestConfig: z.boolean().optional().describe("Set to true when collecting configuration for tests. Tool will automatically read from Config.toml and write to tests/Config.toml"),
    packagePath: z.string().optional().describe(
        "Relative path to the target package within the workspace project (e.g., \"pkg1\"). " +
        "Required for workspace projects so Config.toml is written inside the correct package, not the workspace root. " +
        "Omit for single-package (non-workspace) projects."
    ),
});

interface ConfigCollectorInput {
    mode: "collect" | "check";
    filePath?: string;
    variables?: ConfigVariable[];
    variableNames?: string[];
    isTestConfig?: boolean;
    packagePath?: string;
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
    variables: ConfigVariable[] | undefined
): ConfigCollectorResult | null {
    if (!variables || variables.length === 0) {
        return createErrorResult(
            "NO_VARIABLES",
            "No variables provided to collect. " +
            "Always pass `variables` with the configurable identifiers from the code. " +
            "Use mode: 'check' first if you need to discover existing variable names in Config.toml."
        );
    }
    for (const variable of variables) {
        if (!validateVariableName(variable.name)) {
            return createErrorResult(
                "INVALID_VARIABLE_NAME",
                `Invalid variable name: ${variable.name}. Use camelCase alphanumeric names (e.g., apiKey)`
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
Manages configuration values in Config.toml for Ballerina integrations securely.

The codebase listing includes a <config_files main="present|absent" tests="present|absent"/> tag per project showing the initial state.
Before collecting, always call CHECK first (without variableNames) to discover any existing variable names and reuse them — Config.toml may have been added mid-session even if the listing shows absent.

IMPORTANT: Only call COLLECT mode immediately before executing the project (running or testing). Do NOT call it during code writing or implementation — even if the code has sensitive configurables. Write the code first, then collect config only when you are about to run or test.

REQUIRED ORDER:
1. Write the Ballerina source code including all 'configurable' declarations and save the file.
2. Only then call collect. Variable names are validated against the LS's view of the source.
   - If a name is not declared in source, you get UNKNOWN_CONFIGURABLE — check the code first.
   - If no configurables are found at all, you get NO_CONFIGURABLES_IN_SOURCE — write the code first.
Variable type is derived automatically from the source declaration — do NOT pass a type field.

Operation Modes:
1. COLLECT: Collect configuration values from the user
   - ALWAYS provide 'variables' — never call collect without them
   - Call ONLY immediately before running or testing the project — never during code writing
   - Shows a form; nothing is written until the user confirms. If skipped, no file is created or modified
   - Pre-populates from existing Config.toml if it exists
   - When running tests, use isTestConfig: true — this is the only collect call needed; writes to tests/Config.toml after user confirms
   - For workspace projects, you MUST pass packagePath so the file is written inside the target package (not the workspace root)
   - Example: { mode: "collect", variables: [{ name: "stripeApiKey", description: "Stripe API key", secret: true }] }
   - Example (test): { mode: "collect", variables: [...], isTestConfig: true }
   - Example (workspace): { mode: "collect", variables: [...], packagePath: "pkg1" }

2. CHECK: Inspect which values are filled or missing — can be called at any time
   - Returns variable names and status; never actual values
   - For workspace projects, pass packagePath to inspect the Config.toml of a specific package
   - Example (discover): { mode: "check" }
   - Example (verify): { mode: "check", variableNames: ["dbPassword", "apiKey"], filePath: "Config.toml" }
   - Example (workspace): { mode: "check", packagePath: "pkg1" }
   - Returns: { status: { dbPassword: "filled", apiKey: "missing" } }

VARIABLE NAMING:
Use camelCase names that match exactly the Ballerina configurable identifier. The name is written as-is to Config.toml.

SECURITY:
- You NEVER see actual configuration values
- Tool returns only status: { dbPassword: "filled" }
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
            case "collect":
                return await handleCollectMode(
                    input.variables,
                    paths,
                    eventHandler,
                    requestId,
                    input.isTestConfig,
                    modifiedFiles,
                    input.packagePath
                );

            case "check":
                return await handleCheckMode(
                    input.variableNames,
                    input.filePath,
                    paths,
                    input.isTestConfig,
                    input.packagePath
                );

            default:
                // TypeScript should prevent this with discriminated unions
                return createErrorResult("INVALID_MODE", `Unknown mode: ${(input as any).mode}`);
        }
    } catch (error: any) {
        return handleError(error, requestId, eventHandler);
    }
}

// Returns null on LS error (transient failure), {} when LS responded but found no configurables.
async function getConfigurableTypesFromSource(
    projectPath: string,
    orgName: string,
    packageName: string
): Promise<Record<string, string> | null> {
    try {
        const response = await langClient.getConfigVariablesV2({ projectPath, includeLibraries: false }) as any;
        const configVariables = response?.configVariables;
        if (!configVariables || typeof configVariables !== "object") {
            return {};
        }

        // Response is { [pkgKey: string]: { [moduleName: string]: ConfigVariable[] } }
        // where pkgKey is "org/packageName"
        const pkgKey = `${orgName}/${packageName}`;
        const modules = configVariables[pkgKey];
        if (!modules || typeof modules !== "object") {
            return {};
        }

        const types: Record<string, string> = {};
        for (const moduleVars of Object.values(modules)) {
            if (!Array.isArray(moduleVars)) { continue; }
            for (const variable of moduleVars) {
                const name = variable?.properties?.variable?.value;
                const type = variable?.properties?.type?.value;
                if (typeof name === "string" && name) {
                    types[name] = typeof type === "string" && type ? type : "string";
                }
            }
        }
        return types;
    } catch (error) {
        console.error("[ConfigCollector] Failed to query configurables from LS:", error);
        return null;
    }
}

async function handleCollectMode(
    variables: ConfigVariable[] | undefined,
    paths: ConfigCollectorPaths,
    eventHandler: CopilotEventHandler,
    requestId: string,
    isTestConfig?: boolean,
    modifiedFiles?: string[],
    packagePath?: string
): Promise<ConfigCollectorResult> {
    const validationError = validateConfigVariables(variables);
    if (validationError) { return validationError; }

    // Resolve and validate the package base path. For workspace projects, the
    // agent must pass packagePath so Config.toml lands inside the target
    // package rather than the workspace root. The helper rejects directory
    // traversal attempts and missing-but-required values.
    const packageBasePath = resolvePackageBasePath(paths.tempPath, packagePath);
    const { orgName, packageName } = getOrgPackageName(packageBasePath);
    if (!orgName || !packageName) {
        return createErrorResult(
            "MISSING_PACKAGE_INFO",
            "Ballerina.toml is missing or does not declare both 'org' and 'name' under [package]. Cannot scope Config.toml to the correct section."
        );
    }

    // Derive variable types from the LS rather than accepting them from the agent.
    // The LS reads the 'configurable' declarations already written in source.
    const sourceTypes = await getConfigurableTypesFromSource(packageBasePath, orgName, packageName);
    if (sourceTypes === null) {
        return createErrorResult(
            "LS_UNAVAILABLE",
            "Language server is unavailable or failed to respond. Wait a moment and retry."
        );
    }
    if (Object.keys(sourceTypes).length === 0) {
        return createErrorResult(
            "NO_CONFIGURABLES_IN_SOURCE",
            "No configurables found in source. Write the 'configurable' declarations in code first and save, then call collect again."
        );
    }

    const unknownNames = variables.filter(v => !(v.name in sourceTypes));
    if (unknownNames.length > 0) {
        return createErrorResult(
            "UNKNOWN_CONFIGURABLE",
            `Variables not declared in source: ${unknownNames.map(v => v.name).join(", ")}. ` +
            `Available in source: ${Object.keys(sourceTypes).join(", ")}. ` +
            `Verify the configurable declarations in your .bal files match the names you're passing, then retry.`
        );
    }

    // Enrich variables with LS-derived types so the writer uses the correct type.
    const enrichedVariables: ConfigVariable[] = variables.map(v => ({ ...v, type: sourceTypes[v.name] }));

    // Determine paths based on isTestConfig flag
    const configPath = getConfigPath(packageBasePath, isTestConfig);

    // Priority: tests/Config.toml → Config.toml → empty
    const mainConfigPath = path.join(packageBasePath, "Config.toml");
    const sourceConfigPath = isTestConfig
        ? (fs.existsSync(configPath) ? configPath : mainConfigPath)
        : configPath;

    // Read existing configuration values from source config (if they exist) for pre-populating the form
    const existingValues = readExistingConfigValues(
        sourceConfigPath,
        variables.map(v => v.name),
        orgName,
        packageName
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
            ? "Found values from main config. You can reuse or update them for testing."
            : "Test configuration values needed")
        : (analysis.hasActualValues
            ? "Update configuration values"
            : "Configuration values needed");

    // Request configuration values from user via ApprovalManager
    // This returns ACTUAL values (not exposed to agent)
    const userResponse = await approvalManager.requestConfiguration(
        requestId,
        enrichedVariables,
        existingValues,
        eventHandler,
        isTestConfig,
        userMessage
    );

    if (!userResponse.provided) {
        eventHandler({
            type: "configuration_collection_event",
            requestId,
            stage: "skipped",
            message: `Configuration collection skipped${userResponse.comment ? ": " + userResponse.comment : ""}`,
            isTestConfig,
        });

        return {
            success: false,
            message: `User skipped configuration collection${userResponse.comment ? ": " + userResponse.comment : ""}. You can ask user to provide values later using collect mode.`,
            error: `User skipped${userResponse.comment ? ": " + userResponse.comment : ""}`,
            errorCode: "USER_CANCELLED",
        };
    }

    // Write actual configuration values to determined config path
    writeConfigValuesToConfig(configPath, userResponse.configValues!, enrichedVariables, orgName, packageName);

    // Track modified file for syncing to workspace.
    // Path is relative to tempProjectPath, so prefix with packagePath for workspace projects.
    if (modifiedFiles) {
        const configFileName = getConfigFileName(isTestConfig);
        const relativeConfigPath = packagePath
            ? path.join(packagePath, configFileName)
            : configFileName;
        if (!modifiedFiles.includes(relativeConfigPath)) {
            modifiedFiles.push(relativeConfigPath);
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
        message: `Successfully collected ${enrichedVariables.length} configuration value(s) and saved to ${configFileName}${userResponse.comment ? ". User note: " + userResponse.comment : ""}`,
        status: statusMetadata,
    };
}

async function handleCheckMode(
    variableNames: string[] | undefined,
    filePath: string | undefined,
    paths: ConfigCollectorPaths,
    isTestConfig?: boolean,
    packagePath?: string
): Promise<ConfigCollectorResult> {
    // Resolve and validate the package base path. For workspace projects the
    // agent must pass packagePath to inspect a specific package's Config.toml.
    const packageBasePath = resolvePackageBasePath(paths.tempPath, packagePath);
    const { orgName, packageName } = getOrgPackageName(packageBasePath);
    if (!orgName || !packageName) {
        return createErrorResult(
            "MISSING_PACKAGE_INFO",
            "Ballerina.toml is missing or does not declare both 'org' and 'name' under [package]. Cannot scope Config.toml to the correct section."
        );
    }

    let configPath: string;
    let configFileName: string;
    if (filePath) {
        // filePath is also untrusted agent input — validate containment so
        // it cannot escape the package directory via `..` segments.
        configPath = resolveContained(packageBasePath, filePath);
        configFileName = path.basename(filePath);
    } else {
        configPath = getConfigPath(packageBasePath, isTestConfig);
        configFileName = getConfigFileName(isTestConfig);
    }

    if (!fs.existsSync(configPath)) {
        return {
            success: false,
            message: `${configFileName} not found. Use collect mode to create it.`,
            error: "FILE_NOT_FOUND",
            errorCode: "FILE_NOT_FOUND",
        };
    }

    const status = getAllConfigStatus(configPath, orgName, packageName);

    // When specific names are provided, pad any that are absent from the file as "missing"
    if (variableNames && variableNames.length > 0) {
        for (const name of variableNames) {
            if (!(name in status)) {
                status[name] = "missing";
            }
        }
    }

    const filledNames = Object.entries(status).filter(([, s]) => s === "filled").map(([n]) => n);
    const missingNames = Object.entries(status).filter(([, s]) => s === "missing").map(([n]) => n);

    console.log(`[ConfigCollector] check ${configFileName} — filled: [${filledNames.join(", ") || "none"}], missing: [${missingNames.join(", ") || "none"}]`);

    return {
        success: true,
        message:
            `${configFileName} — ` +
            `filled: [${filledNames.join(", ") || "none"}], ` +
            `missing: [${missingNames.join(", ") || "none"}]`,
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
