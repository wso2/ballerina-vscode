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

import { ExecutionContext, Command } from '@wso2/ballerina-core';
import { CopilotEventHandler } from '../../utils/events';
import { getTempProject, cleanupTempProject } from '../../utils/project/temp-project';
import { getErrorMessage } from '../../utils/ai-utils';
import * as fs from 'fs';
import * as path from 'path';
import { sendAgentDidCloseBatch } from '../../utils/project/ls-schema-notifications';

/**
 * Configuration required to execute an AI command
 */
export interface AIExecutionConfig {
    /** Execution context with original workspace paths */
    executionContext: ExecutionContext;
    /** Event handler for communicating with frontend */
    eventHandler: CopilotEventHandler;
    /** Unique message ID for this execution */
    messageId: string;
    /** Abort controller for cancellation */
    abortController: AbortController;
}

/**
 * Result returned from command execution
 */
export interface AIExecutionResult {
    /** Path to the temporary project */
    tempProjectPath: string;
    /** Array of modified file paths (relative to temp project) */
    modifiedFiles: string[];
    /** Optional source files (for datamapper) */
    sourceFiles?: any[];
    /** Optional error */
    error?: Error;
}

/**
 * Base executor class for all AI commands
 *
 * Provides common lifecycle management:
 * - initialize(): Creates temp project, sets ExecutionContext.tempProjectPath
 * - abstract execute(): Each command implements its own execution logic
 * - cleanup(): Sends didClose notifications and removes temp project
 */
export abstract class AICommandExecutor {
    protected config: AIExecutionConfig;
    protected shouldCleanup: boolean;
    protected startTime?: number;
    protected endTime?: number;

    constructor(config: AIExecutionConfig) {
        this.config = config;
        // Don't cleanup in test environment (for debugging)
        this.shouldCleanup = !process.env.AI_TEST_ENV;
    }

    /**
     * Initialize execution by creating temp project
     * Sets ExecutionContext.tempProjectPath for use in execute()
     */
    async initialize(): Promise<void> {
        try {
            console.log(`[AICommandExecutor] Initializing for message ${this.config.messageId}`);

            // Create temp project from workspace
            const { path: tempProjectPath } = await getTempProject(this.config.executionContext);

            // Update execution context with temp project path
            this.config.executionContext.tempProjectPath = tempProjectPath;

            console.log(`[AICommandExecutor] Temp project created at: ${tempProjectPath}`);
        } catch (error) {
            console.error('[AICommandExecutor] Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * Abstract execute method - each command implements its own logic
     * Should use config.executionContext.tempProjectPath for operations
     *
     * @returns Execution result with modified files
     */
    abstract execute(): Promise<AIExecutionResult>;

    /**
     * Get the command type for this executor
     * Used for event notifications
     */
    protected abstract getCommandType(): Command;

    /**
     * Cleanup execution by sending didClose notifications and removing temp project
     */
    async cleanup(): Promise<void> {
        const tempProjectPath = this.config.executionContext.tempProjectPath;

        if (!tempProjectPath) {
            console.warn('[AICommandExecutor] No temp project path found, skipping cleanup');
            return;
        }

        if (!this.shouldCleanup) {
            console.log(`[AICommandExecutor] Skipping cleanup (test environment), temp project preserved at: ${tempProjectPath}`);
            return;
        }

        try {
            console.log(`[AICommandExecutor] Cleaning up temp project: ${tempProjectPath}`);

            // Find all .bal files in temp project for didClose notifications
            const balFiles = this.findAllBalFiles(tempProjectPath);

            if (balFiles.length > 0) {
                console.log(`[AICommandExecutor] Sending didClose for ${balFiles.length} files`);
                sendAgentDidCloseBatch(tempProjectPath, balFiles);

                // Small delay to ensure LS processes didClose
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // Remove temp project directory
            cleanupTempProject(tempProjectPath);

            console.log(`[AICommandExecutor] Cleanup completed`);
        } catch (error) {
            console.error('[AICommandExecutor] Failed to cleanup:', error);
            // Don't throw - cleanup failure shouldn't break the flow
        }
    }

    /**
     * Handle errors during execution
     * Emits error event to frontend
     *
     * @param error - Error that occurred
     */
    protected handleError(error: any): void {
        const errorMsg = getErrorMessage(error);
        console.error(`[AICommandExecutor] Error: ${errorMsg}`, error);

        this.config.eventHandler({
            type: "error",
            content: errorMsg
        });
    }

    /**
     * Recursively find all .bal files in a directory
     *
     * @param dir - Directory to search
     * @param baseDir - Base directory for relative paths (defaults to dir)
     * @returns Array of relative file paths
     */
    private findAllBalFiles(dir: string, baseDir?: string): string[] {
        const base = baseDir || dir;
        const files: string[] = [];

        if (!fs.existsSync(dir)) {
            return files;
        }

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    // Recursively search subdirectories
                    files.push(...this.findAllBalFiles(fullPath, base));
                } else if (entry.isFile() && entry.name.endsWith('.bal')) {
                    // Add relative path to list
                    const relativePath = path.relative(base, fullPath);
                    files.push(relativePath);
                }
            }
        } catch (error) {
            console.warn(`[AICommandExecutor] Error reading directory ${dir}:`, error);
        }

        return files;
    }

    /**
     * Check if execution was aborted
     *
     * @returns true if aborted, false otherwise
     */
    protected isAborted(): boolean {
        return this.config.abortController.signal.aborted;
    }
}
