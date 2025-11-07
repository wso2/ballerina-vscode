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
 * software distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'toml';
import { OTLP_PORT } from './constants';

/**
 * Sets tracing configuration in Config.toml and Ballerina.toml files
 * 
 * This function will:
 * - Read existing Config.toml if it exists
 * - Update or add [ballerina.observe] section with tracingEnabled = true and tracingProvider = "idetraceprovider"
 * - Update or add [ballerinax.idetraceprovider] section with endpoint = "http://localhost:<port>/v1/traces"
 * - Read existing Ballerina.toml if it exists
 * - Update or add [build-options] section with observabilityIncluded = true
 * - Preserve all other existing configuration
 * 
 * @param workspaceDir The workspace directory where Config.toml and Ballerina.toml should be created/updated
 * @returns Promise<void> Resolves when configuration is successfully written
 * @throws Error if file operations fail
 */
export async function setTracingConfig(workspaceDir: string): Promise<void> {
    // Update Config.toml
    const configFilePath = path.join(workspaceDir, 'Config.toml');
    
    // Read existing Config.toml content if it exists
    let existingContent = '';
    let parsedConfig: any = {};
    
    if (fs.existsSync(configFilePath)) {
        try {
            existingContent = fs.readFileSync(configFilePath, 'utf-8');
            parsedConfig = parse(existingContent);
        } catch (error) {
            console.error('Failed to parse existing Config.toml:', error);
            // Continue with empty config if parsing fails
        }
    }
    
    // Update the parsed config object
    if (!parsedConfig['ballerina']) {
        parsedConfig['ballerina'] = {};
    }
    if (!parsedConfig['ballerina']['observe']) {
        parsedConfig['ballerina']['observe'] = {};
    }
    
    parsedConfig['ballerina']['observe']['tracingEnabled'] = true;
    parsedConfig['ballerina']['observe']['tracingProvider'] = 'idetraceprovider';
    
    // Convert the updated config object back to TOML string
    const updatedContent = convertObjectToToml(parsedConfig, existingContent);
    
    // Write the updated content to Config.toml
    fs.writeFileSync(configFilePath, updatedContent, 'utf-8');
    
    // Update Ballerina.toml
    const ballerinaTomlPath = path.join(workspaceDir, 'Ballerina.toml');
    
    // Read existing Ballerina.toml content if it exists
    let ballerinaTomlContent = '';
    if (fs.existsSync(ballerinaTomlPath)) {
        try {
            ballerinaTomlContent = fs.readFileSync(ballerinaTomlPath, 'utf-8');
        } catch (error) {
            console.error('Failed to read existing Ballerina.toml:', error);
            // Continue with empty content if reading fails
        }
    }
    
    // Update or add [build-options] section with observabilityIncluded = true
    ballerinaTomlContent = updateOrAddSection(
        ballerinaTomlContent,
        'build-options',
        {
            observabilityIncluded: true
        }
    );
    
    // Ensure file ends with newline
    if (!ballerinaTomlContent.endsWith('\n')) {
        ballerinaTomlContent += '\n';
    }
    
    // Write the updated content to Ballerina.toml
    fs.writeFileSync(ballerinaTomlPath, ballerinaTomlContent, 'utf-8');
}

/**
 * Converts a JavaScript object to TOML format string
 * Uses a simpler approach: updates existing sections or appends new ones
 * 
 * @param config The parsed config object
 * @param originalContent Original TOML content for reference
 * @returns TOML formatted string
 */
function convertObjectToToml(config: any, originalContent: string): string {
    let updatedContent = originalContent || '';
    
    // Update or add [ballerina.observe] section
    updatedContent = updateOrAddSection(
        updatedContent,
        'ballerina.observe',
        {
            tracingEnabled: config.ballerina?.observe?.tracingEnabled ?? true,
            tracingProvider: config.ballerina?.observe?.tracingProvider ?? 'idetraceprovider'
        }
    );
    
    // Ensure file ends with newline
    if (!updatedContent.endsWith('\n')) {
        updatedContent += '\n';
    }
    
    return updatedContent;
}

/**
 * Updates an existing TOML section or adds it if it doesn't exist
 * 
 * @param content Original TOML content
 * @param sectionName Section name (e.g., 'ballerina.observe')
 * @param values Object with key-value pairs to set in the section
 * @returns Updated TOML content
 */
function updateOrAddSection(content: string, sectionName: string, values: Record<string, any>): string {
    const sectionHeader = `[${sectionName}]`;
    
    // Build the new section content
    let sectionLines: string[] = [sectionHeader];
    for (const [key, value] of Object.entries(values)) {
        const formattedValue = typeof value === 'string' ? `"${value}"` : String(value);
        sectionLines.push(`${key} = ${formattedValue}`);
    }
    const sectionContent = sectionLines.join('\n');
    
    // Check if section exists
    const lines = content.split('\n');
    const sectionStartIndex = lines.findIndex(line => line.trim() === sectionHeader);
    
    if (sectionStartIndex !== -1) {
        // Section exists - find where it ends
        let sectionEndIndex = lines.length;
        for (let i = sectionStartIndex + 1; i < lines.length; i++) {
            const trimmedLine = lines[i].trim();
            // Check if this is the start of a new section
            if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
                sectionEndIndex = i;
                break;
            }
        }
        
        // Replace the section
        const beforeSection = lines.slice(0, sectionStartIndex);
        const afterSection = lines.slice(sectionEndIndex);
        
        // Combine: before + new section + after
        const resultLines: string[] = [];
        if (beforeSection.length > 0) {
            resultLines.push(...beforeSection);
        }
        resultLines.push(...sectionLines);
        if (afterSection.length > 0) {
            resultLines.push(...afterSection);
        }
        
        return resultLines.join('\n');
    }
    
    // Section doesn't exist - append it
    const trimmedLines = lines.filter((line, index) => {
        // Remove trailing empty lines
        if (index >= lines.length - 1 && line.trim() === '') {
            return false;
        }
        return true;
    });
    
    // Add the new section
    if (trimmedLines.length > 0 && trimmedLines[trimmedLines.length - 1].trim() !== '') {
        trimmedLines.push('');
    }
    trimmedLines.push(...sectionLines);
    
    return trimmedLines.join('\n');
}

/**
 * Removes tracing configuration from Config.toml and Ballerina.toml files
 * 
 * This function will:
 * - Read existing Config.toml if it exists
 * - Remove tracingEnabled and tracingProvider from [ballerina.observe] section
 *   (removes the entire section if it becomes empty)
 * - Remove the entire [ballerinax.idetraceprovider] section
 * - Read existing Ballerina.toml if it exists
 * - Remove observabilityIncluded from [build-options] section
 *   (removes the entire section if it becomes empty)
 * - Preserve all other existing configuration
 * 
 * @param workspaceDir The workspace directory where Config.toml and Ballerina.toml should be updated
 * @returns Promise<void> Resolves when configuration is successfully written
 * @throws Error if file operations fail
 */
export async function removeTracingConfig(workspaceDir: string): Promise<void> {
    // Remove from Config.toml
    const configFilePath = path.join(workspaceDir, 'Config.toml');
    
    // If file doesn't exist, nothing to do
    if (!fs.existsSync(configFilePath)) {
        return;
    }
    
    // Read existing Config.toml content
    let existingContent = '';
    try {
        existingContent = fs.readFileSync(configFilePath, 'utf-8');
    } catch (error) {
        console.error('Failed to read Config.toml:', error);
        throw error;
    }
    
    // Remove the tracing configuration sections
    let updatedContent = removeSection(existingContent, 'ballerinax.idetraceprovider');
    
    // Remove tracing keys from [ballerina.observe] section
    updatedContent = removeKeysFromSection(
        updatedContent,
        'ballerina.observe',
        ['tracingEnabled', 'tracingProvider']
    );
    
    // Clean up trailing newlines but ensure file ends with one
    updatedContent = updatedContent.trimEnd();
    if (updatedContent.length > 0 && !updatedContent.endsWith('\n')) {
        updatedContent += '\n';
    }
    
    // Write the updated content to Config.toml
    fs.writeFileSync(configFilePath, updatedContent, 'utf-8');
    
    // Remove from Ballerina.toml
    const ballerinaTomlPath = path.join(workspaceDir, 'Ballerina.toml');
    
    // If file doesn't exist, nothing to do
    if (!fs.existsSync(ballerinaTomlPath)) {
        return;
    }
    
    // Read existing Ballerina.toml content
    let ballerinaTomlContent = '';
    try {
        ballerinaTomlContent = fs.readFileSync(ballerinaTomlPath, 'utf-8');
    } catch (error) {
        console.error('Failed to read Ballerina.toml:', error);
        throw error;
    }
    
    // Remove observabilityIncluded from [build-options] section
    ballerinaTomlContent = removeKeysFromSection(
        ballerinaTomlContent,
        'build-options',
        ['observabilityIncluded']
    );
    
    // Clean up trailing newlines but ensure file ends with one
    ballerinaTomlContent = ballerinaTomlContent.trimEnd();
    if (ballerinaTomlContent.length > 0 && !ballerinaTomlContent.endsWith('\n')) {
        ballerinaTomlContent += '\n';
    }
    
    // Write the updated content to Ballerina.toml
    fs.writeFileSync(ballerinaTomlPath, ballerinaTomlContent, 'utf-8');
}

/**
 * Removes an entire section from TOML content
 * 
 * @param content Original TOML content
 * @param sectionName Section name (e.g., 'ballerinax.idetraceprovider')
 * @returns Updated TOML content with section removed
 */
function removeSection(content: string, sectionName: string): string {
    const sectionHeader = `[${sectionName}]`;
    const lines = content.split('\n');
    const sectionStartIndex = lines.findIndex(line => line.trim() === sectionHeader);
    
    if (sectionStartIndex === -1) {
        // Section doesn't exist, return original content
        return content;
    }
    
    // Find where the section ends
    let sectionEndIndex = lines.length;
    for (let i = sectionStartIndex + 1; i < lines.length; i++) {
        const trimmedLine = lines[i].trim();
        // Check if this is the start of a new section
        if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
            sectionEndIndex = i;
            break;
        }
    }
    
    // Remove the section
    const beforeSection = lines.slice(0, sectionStartIndex);
    const afterSection = lines.slice(sectionEndIndex);
    
    // Combine before and after, removing extra empty lines
    const resultLines: string[] = [];
    
    if (beforeSection.length > 0) {
        resultLines.push(...beforeSection);
    }
    
    if (afterSection.length > 0) {
        // Remove trailing empty line from before section if present
        if (resultLines.length > 0 && resultLines[resultLines.length - 1].trim() === '') {
            resultLines.pop();
        }
        // Remove leading empty line from after section if present
        let afterStart = 0;
        if (afterSection[0]?.trim() === '') {
            afterStart = 1;
        }
        resultLines.push(...afterSection.slice(afterStart));
    }
    
    return resultLines.join('\n');
}

/**
 * Removes specific keys from a TOML section
 * If the section becomes empty after removing keys, removes the entire section
 * 
 * @param content Original TOML content
 * @param sectionName Section name (e.g., 'ballerina.observe')
 * @param keysToRemove Array of keys to remove from the section
 * @returns Updated TOML content with keys removed
 */
function removeKeysFromSection(content: string, sectionName: string, keysToRemove: string[]): string {
    const sectionHeader = `[${sectionName}]`;
    const lines = content.split('\n');
    const sectionStartIndex = lines.findIndex(line => line.trim() === sectionHeader);
    
    if (sectionStartIndex === -1) {
        // Section doesn't exist, return original content
        return content;
    }
    
    // Find where the section ends
    let sectionEndIndex = lines.length;
    for (let i = sectionStartIndex + 1; i < lines.length; i++) {
        const trimmedLine = lines[i].trim();
        // Check if this is the start of a new section
        if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
            sectionEndIndex = i;
            break;
        }
    }
    
    // Extract section lines
    const sectionLines = lines.slice(sectionStartIndex, sectionEndIndex);
    
    // Remove keys from section
    const remainingLines = sectionLines.filter(line => {
        const trimmedLine = line.trim();
        // Keep the section header
        if (trimmedLine === sectionHeader) {
            return true;
        }
        // Check if this line contains a key we want to remove
        for (const key of keysToRemove) {
            // Match key = value (with or without quotes, with or without spaces)
            const keyPattern = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=`);
            if (keyPattern.test(trimmedLine)) {
                return false; // Remove this line
            }
        }
        // Keep all other lines
        return true;
    });
    
    // Check if section is empty (only header remains)
    const hasContent = remainingLines.some((line, index) => {
        // Skip the header line
        return index > 0 && line.trim() !== '';
    });
    
    // If section is empty, remove the entire section
    if (!hasContent) {
        return removeSection(content, sectionName);
    }
    
    // Rebuild content with remaining section lines
    const beforeSection = lines.slice(0, sectionStartIndex);
    const afterSection = lines.slice(sectionEndIndex);
    
    const resultLines: string[] = [];
    if (beforeSection.length > 0) {
        resultLines.push(...beforeSection);
    }
    resultLines.push(...remainingLines);
    if (afterSection.length > 0) {
        resultLines.push(...afterSection);
    }
    
    return resultLines.join('\n');
}

