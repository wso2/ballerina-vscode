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

import * as fs from "fs";
import * as path from "path";
import { parse, stringify } from "@iarna/toml";

export interface ConfigVariable {
    name: string;
    description: string;
    type?: "string" | "int";
    secret?: boolean;
}

// Cache regex for performance
const PLACEHOLDER_REGEX = /^\$\{([A-Z_0-9]+)\}$/;

/**
 * Read all keys from Config.toml and return their status — filled or placeholder.
 * Returns empty object if file doesn't exist.
 */
export function getAllConfigStatus(
    configPath: string
): Record<string, "filled" | "missing"> {
    const status: Record<string, "filled" | "missing"> = {};

    if (!fs.existsSync(configPath)) {
        return status;
    }

    try {
        const content = fs.readFileSync(configPath, "utf-8");
        const config = parse(content) as Record<string, any>;

        function collectStatus(obj: any, prefix: string = "") {
            for (const [key, value] of Object.entries(obj)) {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                if (Array.isArray(value)) {
                    // Arrays of tables [[...]] or primitive arrays
                    value.forEach((item, index) => {
                        if (item !== null && typeof item === "object") {
                            collectStatus(item, `${fullKey}[${index}]`);
                        } else if (typeof item === "string" && PLACEHOLDER_REGEX.test(item)) {
                            status[`${fullKey}[${index}]`] = "missing";
                        } else {
                            status[`${fullKey}[${index}]`] = "filled";
                        }
                    });
                    // Also mark the array key itself if empty
                    if (value.length === 0) {
                        status[fullKey] = "filled";
                    }
                } else if (value !== null && typeof value === "object") {
                    collectStatus(value, fullKey);
                } else if (typeof value === "string" && PLACEHOLDER_REGEX.test(value)) {
                    status[fullKey] = "missing";
                } else {
                    status[fullKey] = "filled";
                }
            }
        }

        collectStatus(config);
    } catch (error) {
        console.error(`[TOML Utils] Error reading config status:`, error);
    }

    return status;
}

/**
 * Create or update Config.toml with placeholder variables
 */

/**
 * Write configuration values to Config.toml - SECURITY: never logs values
 */
export function writeConfigValuesToConfig(
    configPath: string,
    configValues: Record<string, string>,
    variables?: ConfigVariable[]
): void {
    let config: Record<string, any> = {};

    if (fs.existsSync(configPath)) {
        try {
            const content = fs.readFileSync(configPath, "utf-8");
            config = parse(content) as Record<string, any>;
        } catch (error) {
            console.error(`[TOML Utils] Error reading config for value write:`, error);
            throw error;
        }
    }

    // Create a map of variable types for quick lookup
    const typeMap = new Map<string, string>();
    if (variables) {
        for (const variable of variables) {
            typeMap.set(variable.name, variable.type || "string");
        }
    }

    const intKeys = new Set<string>();
    for (const [variableName, value] of Object.entries(configValues)) {
        const tomlKey = variableName;
        const varType = typeMap.get(variableName) || "string";

        // Convert value based on type
        if (varType === "int") {
            const intValue = parseInt(value, 10);
            if (isNaN(intValue)) {
                throw new Error(`Invalid integer value for ${variableName}`);
            }
            config[tomlKey] = intValue;
            intKeys.add(tomlKey);
        } else {
            config[tomlKey] = value;
        }
    }

    try {
        const dirPath = path.dirname(configPath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        let tomlContent = stringify(config);

        // Fix TOML integer formatting - remove underscores from integer values
        // The @iarna/toml library adds underscores to large numbers for readability (e.g., 8_080)
        // We need to remove them for Ballerina compatibility
        for (const intKey of intKeys) {
            const intValue = config[intKey];
            if (typeof intValue === 'number') {
                // Replace formatted number (with underscores) with plain number
                const escapedKey = intKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const formattedPattern = new RegExp(`^\\s*${escapedKey}\\s*=\\s*[0-9_]+`, 'gm');
                tomlContent = tomlContent.replace(formattedPattern, `${intKey} = ${intValue}`);
            }
        }

        fs.writeFileSync(configPath, tomlContent, "utf-8");

        console.log(`[TOML Utils] Updated ${Object.keys(configValues).length} configuration value(s) in Config.toml`);
    } catch (error) {
        console.error(`[TOML Utils] Error writing configuration values:`, error);
        throw error;
    }
}

function getNestedValue(obj: any, key: string): any {
    if (key.includes(".")) {
        const parts = key.split(".");
        let current = obj;
        for (const part of parts) {
            if (current && typeof current === "object") {
                current = current[part];
            } else {
                return undefined;
            }
        }
        return current;
    }
    return obj[key];
}

export function validateVariableName(name: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9]*$/.test(name);
}

/**
 * Read existing configuration values from Config.toml
 * Returns actual values (to be shown in UI for editing)
 */
export function readExistingConfigValues(
    configPath: string,
    variableNames: string[]
): Record<string, string> {
    const existingValues: Record<string, string> = {};

    if (!fs.existsSync(configPath)) {
        return existingValues;
    }

    try {
        const content = fs.readFileSync(configPath, "utf-8");
        const config = parse(content) as Record<string, any>;

        for (const name of variableNames) {
            const tomlKey = name;
            const value = getNestedValue(config, tomlKey);

            // Include the value if it exists and is not a placeholder
            if (value !== undefined && value !== null) {
                if (typeof value === "string") {
                    // Don't include placeholder values like ${VARIABLE_NAME}
                    if (!value.startsWith("${")) {
                        existingValues[name] = value;
                    }
                } else if (typeof value === "number") {
                    // Convert number to string for UI display
                    existingValues[name] = value.toString();
                }
            }
        }
    } catch (error) {
        console.error(`[TOML Utils] Error reading existing configuration values:`, error);
    }

    return existingValues;
}

/**
 * Create status metadata from configuration values - returns only fill status, never values
 */
export function createStatusMetadata(
    configValues: Record<string, string>
): Record<string, "filled" | "missing"> {
    const status: Record<string, "filled" | "missing"> = {};

    for (const [key, value] of Object.entries(configValues)) {
        if (!value || value.trim() === "" || value.startsWith("${")) {
            status[key] = "missing";
        } else {
            status[key] = "filled";
        }
    }

    return status;
}
