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
    type?: "string" | "int" | "decimal";
    secret?: boolean;
}

function readTomlSection(
    configPath: string,
    orgName: string,
    packageName: string
): Record<string, any> | null {
    if (!fs.existsSync(configPath)) {
        return null;
    }
    try {
        const config = parse(fs.readFileSync(configPath, "utf-8")) as Record<string, any>;
        const section = config[orgName]?.[packageName];
        return section && typeof section === "object" ? section : null;
    } catch (error) {
        console.error(`[TOML Utils] Error reading ${configPath}:`, error);
        return null;
    }
}

export function getAllConfigStatus(
    configPath: string,
    orgName: string,
    packageName: string
): Record<string, "filled" | "missing"> {
    const status: Record<string, "filled" | "missing"> = {};
    const section = readTomlSection(configPath, orgName, packageName);
    if (!section) {
        return status;
    }
    for (const [key, value] of Object.entries(section)) {
        if (value !== null && typeof value !== "object") {
            status[key] = "filled";
        }
    }
    return status;
}

export function writeConfigValuesToConfig(
    configPath: string,
    configValues: Record<string, string>,
    variables: ConfigVariable[] | undefined,
    orgName: string,
    packageName: string
): void {
    let config: Record<string, any> = {};

    if (fs.existsSync(configPath)) {
        try {
            config = parse(fs.readFileSync(configPath, "utf-8")) as Record<string, any>;
        } catch (error) {
            console.error(`[TOML Utils] Error reading config for value write:`, error);
            throw error;
        }
    }

    if (!config[orgName]) { config[orgName] = {}; }
    if (!config[orgName][packageName]) { config[orgName][packageName] = {}; }
    const section = config[orgName][packageName];

    const typeMap = new Map<string, string>();
    if (variables) {
        for (const variable of variables) {
            typeMap.set(variable.name, variable.type || "string");
        }
    }

    const intKeys = new Set<string>();
    for (const [variableName, value] of Object.entries(configValues)) {
        const varType = typeMap.get(variableName) || "string";
        if (varType === "int") {
            const intValue = parseInt(value, 10);
            if (isNaN(intValue)) {
                throw new Error(`Invalid integer value for ${variableName}`);
            }
            section[variableName] = intValue;
            intKeys.add(variableName);
        } else if (varType === "decimal") {
            const decimalValue = parseFloat(value);
            if (isNaN(decimalValue)) {
                throw new Error(`Invalid decimal value for ${variableName}`);
            }
            section[variableName] = decimalValue;
        } else {
            section[variableName] = value;
        }
    }

    try {
        const dirPath = path.dirname(configPath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        let tomlContent = stringify(config);

        // @iarna/toml formats large integers with underscores (e.g. 8_080); Ballerina requires plain digits
        for (const intKey of intKeys) {
            const intValue = section[intKey];
            if (typeof intValue === "number") {
                const escapedKey = intKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const formattedPattern = new RegExp(`^\\s*${escapedKey}\\s*=\\s*[0-9_]+`, "gm");
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

export function validateVariableName(name: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9]*$/.test(name);
}

export function readExistingConfigValues(
    configPath: string,
    variableNames: string[],
    orgName: string,
    packageName: string
): Record<string, string> {
    const existingValues: Record<string, string> = {};
    const section = readTomlSection(configPath, orgName, packageName);
    if (!section) {
        return existingValues;
    }
    for (const name of variableNames) {
        const value = section[name];
        if (value !== undefined && value !== null) {
            if (typeof value === "string") {
                existingValues[name] = value;
            } else if (typeof value === "number") {
                existingValues[name] = value.toString();
            }
        }
    }
    return existingValues;
}

export function createStatusMetadata(
    configValues: Record<string, string>
): Record<string, "filled" | "missing"> {
    const status: Record<string, "filled" | "missing"> = {};
    for (const [key, value] of Object.entries(configValues)) {
        status[key] = value && value.trim() !== "" ? "filled" : "missing";
    }
    return status;
}
