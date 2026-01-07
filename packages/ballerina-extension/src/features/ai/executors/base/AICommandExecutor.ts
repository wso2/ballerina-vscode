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
import { chatStateStorage, ChatStateStorage } from '../../../../views/ai-panel/chatStateStorage';
import { getTempProject, cleanupTempProject } from '../../utils/project/temp-project';
import { getErrorMessage } from '../../utils/ai-utils';
import * as fs from 'fs';
import * as path from 'path';
import { sendAgentDidCloseBatch } from '../../utils/project/ls-schema-notifications';

/**
 * Unified configuration for all AI command executors
 * Consolidates execution config and command-specific parameters into single object
 */
export interface AICommandConfig<TParams = any> {
    /** Execution context with original workspace paths */
    executionContext: ExecutionContext;
    /** Event handler for communicating with frontend */
    eventHandler: CopilotEventHandler;
    /** Unique message ID for this execution */
    generationId: string;
    /** Abort controller for cancellation */
    abortController: AbortController;
    /** Command-specific parameters */
    params: TParams;

    /** Optional chat storage configuration */
    chatStorage?: {
        workspaceId: string;
        threadId: string;
        enabled: boolean;
    };

    /** Optional lifecycle configuration */
    lifecycle?: {
        /** Existing temp path to reuse (for review continuation) */
        existingTempPath?: string;
        /** Cleanup strategy: 'immediate' (DataMapper) or 'review' (Agent) */
        cleanupStrategy: 'immediate' | 'review';
    };
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
 * Provides unified lifecycle management with template method pattern:
 * - run(): Single method that handles full lifecycle (init, execute, cleanup)
 * - Template stages: chat storage → temp project → execute → cleanup
 * - Optional chat storage integration for multi-turn conversations
 * - Configurable cleanup strategies (immediate vs review mode)
 */
export abstract class AICommandExecutor<TParams = any> {
    protected config: AICommandConfig<TParams>;

    constructor(config: AICommandConfig<TParams>) {
        this.config = config;
    }

    /**
     * Main execution method - handles full lifecycle with template pattern
     *
     * Stages:
     * 1. Register active execution for abort support
     * 2. Initialize chat storage (if enabled)
     * 3. Initialize temp project (create or reuse)
     * 4. Execute command logic (abstract method)
     * 5. Perform cleanup (strategy-dependent)
     * 6. Clear active execution
     *
     * @returns Execution result with temp path and modified files
     */
    async run(): Promise<AIExecutionResult> {
        const { workspaceId, threadId } = this.config.chatStorage || {
            workspaceId: this.config.executionContext.projectPath,
            threadId: 'default'
        };

        try {
            console.log(`[AICommandExecutor] Starting ${this.getCommandType()} execution: ${this.config.generationId}`);

            // Stage 1: Register active execution for abort support
            chatStateStorage.setActiveExecution(workspaceId, threadId, {
                generationId: this.config.generationId,
                abortController: this.config.abortController
            });

            // Stage 2: Initialize workspace/thread in chat storage
            await this.initializeWorkspaceThread();

            // Stage 3: Temp project initialization
            await this.initializeTempProject();

            // Stage 4: Command execution
            const result = await this.execute();

            // Stage 5: Cleanup
            await this.performCleanup(result);

            console.log(`[AICommandExecutor] Completed ${this.getCommandType()} execution: ${this.config.generationId}`);
            return result;

        } catch (error) {
            await this.handleExecutionError(error);
            throw error;
        } finally {
            // Stage 6: Always clear active execution on completion (success or error)
            chatStateStorage.clearActiveExecution(workspaceId, threadId);
        }
    }

    /**
     * Stage 1: Initialize workspace/thread in chat storage (if enabled)
     */
    protected async initializeWorkspaceThread(): Promise<void> {
        try {
            const { workspaceId, threadId } = this.config.chatStorage;

            // Initialize workspace and thread
            chatStateStorage.getOrCreateThread(workspaceId, threadId);

            console.log(`[AICommandExecutor] Chat storage initialized: workspace=${workspaceId}, thread=${threadId}`);
        } catch (error) {
            console.error('[AICommandExecutor] Failed to initialize chat storage:', error);
            // Don't throw - chat storage is optional
        }
    }

    /**
     * Stage 2: Initialize temp project (create new or reuse existing)
     * Sets tempProjectPath and updates execution context
     */
    protected async initializeTempProject(): Promise<void> {
        const lifecycle = this.config.lifecycle;

        // Check if we should reuse existing temp project
        if (lifecycle?.existingTempPath) {
            this.config.executionContext.tempProjectPath = lifecycle.existingTempPath;
            console.log(`[AICommandExecutor] Reusing temp project: ${lifecycle.existingTempPath}`);
            return;
        }

        // Create new temp project
        try {
            const { path: tempPath } = await getTempProject(this.config.executionContext);
            this.config.executionContext.tempProjectPath = tempPath;
            console.log(`[AICommandExecutor] Created temp project: ${tempPath}`);
        } catch (error) {
            console.error('[AICommandExecutor] Failed to create temp project:', error);
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
     * Stage 4: Perform cleanup based on strategy
     */
    protected async performCleanup(result: AIExecutionResult): Promise<void> {
        const strategy = this.config.lifecycle?.cleanupStrategy || 'immediate';

        if (strategy === 'immediate') {
            await this.cleanupImmediate();
        } else if (strategy === 'review') {
            await this.cleanupForReview(result);
        }
    }

    /**
     * Immediate cleanup - removes temp project right away
     * Used by DataMapper executors
     */
    protected async cleanupImmediate(): Promise<void> {
        const tempProjectPath = this.config.executionContext.tempProjectPath;
        if (!tempProjectPath) {
            console.log(`[AICommandExecutor] No temp project to cleanup`);
            return;
        }

        // Skip in test environment
        if (process.env.AI_TEST_ENV) {
            console.log(`[AICommandExecutor] Skipping cleanup (test mode): ${tempProjectPath}`);
            return;
        }

        try {
            console.log(`[AICommandExecutor] Immediate cleanup: ${tempProjectPath}`);

            // Send didClose notifications for .bal files
            const balFiles = this.findAllBalFiles(tempProjectPath);
            if (balFiles.length > 0) {
                sendAgentDidCloseBatch(tempProjectPath, balFiles);
                await new Promise(resolve => setTimeout(resolve, 300)); // Let LS process
            }

            // Remove temp project
            cleanupTempProject(tempProjectPath);
            console.log(`[AICommandExecutor] Cleanup completed`);
        } catch (error) {
            console.error('[AICommandExecutor] Cleanup failed:', error);
            // Don't throw - cleanup failure shouldn't break flow
        }
    }

    /**
     * Review mode cleanup - persists temp project for user review
     * Used by AgentExecutor. Subclasses can override for custom behavior.
     */
    protected async cleanupForReview(result: AIExecutionResult): Promise<void> {
        console.log(`[AICommandExecutor] Review mode - temp project persisted: ${this.config.executionContext.tempProjectPath}`);
        // No immediate cleanup - temp persists for review
        // Actual cleanup happens when user accepts/declines via RPC
    }

    /**
     * Handle execution errors
     * Emits error or abort event and attempts cleanup
     */
    protected async handleExecutionError(error: any): Promise<void> {
        // Check if this was an abort
        if (error.name === 'AbortError' || this.config.abortController.signal.aborted) {
            console.log(`[AICommandExecutor] Execution aborted by user for ${this.getCommandType()}`);

            // Emit abort event to frontend
            this.config.eventHandler({
                type: "abort",
                command: this.getCommandType()
            });
        } else {
            // Regular error - emit error event
            const errorMsg = getErrorMessage(error);
            console.error(`[AICommandExecutor] Error in ${this.getCommandType()}:`, errorMsg, error);

            this.config.eventHandler({
                type: "error",
                content: errorMsg
            });
        }

        // Attempt cleanup on error
        const tempProjectPath = this.config.executionContext.tempProjectPath;
        if (tempProjectPath && !process.env.AI_TEST_ENV) {
            try {
                cleanupTempProject(tempProjectPath);
            } catch (cleanupError) {
                console.warn(`[AICommandExecutor] Failed to cleanup after error:`, cleanupError);
            }
        }
    }

    /**
     * Get chat history from storage (helper for executors)
     * @returns Array of chat messages, or empty array if storage disabled
     */
    protected getChatHistory(): any[] {
        const { workspaceId, threadId } = this.config.chatStorage;
        return chatStateStorage.getChatHistoryForLLM(workspaceId, threadId);
    }

    /**
     * Add generation to chat storage (helper for executors)
     * @param userPrompt - User's prompt/request
     * @param metadata - Generation metadata (operation type, etc.)
     */
    protected addGeneration(userPrompt: string, metadata: any): any {
        const { workspaceId, threadId } = this.config.chatStorage;
        return chatStateStorage.addGeneration(
            workspaceId,
            threadId,
            userPrompt,
            metadata,
            this.config.generationId
        );
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
