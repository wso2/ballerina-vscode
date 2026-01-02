// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

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

import { Command, ExecutionContext, GenerateAgentCodeRequest } from "@wso2/ballerina-core";
import { workspace } from 'vscode';
import { StateMachine } from "../../../stateMachine";
import { chatStateStorage } from '../../../views/ai-panel/chatStateStorage';
import { AICommandConfig } from "../executors/base/AICommandExecutor";
import { createWebviewEventHandler } from "../utils/events";
import { AgentExecutor } from './AgentExecutor';

// ==================================
// ExecutionContext Factory Functions
// ==================================

/**
 * Creates an ExecutionContext from StateMachine's current state.
 * Used by tests to create context from current UI state.
 *
 * @returns ExecutionContext with paths from StateMachine
 */
export function createExecutionContextFromStateMachine(): ExecutionContext {
    const context = StateMachine.context();
    return {
        projectPath: context.projectPath,
        workspacePath: context.workspacePath
    };
}

// ==================================
// Agent Generation Functions
// ==================================

/**
 * Factory function to create unified executor configuration
 * Eliminates repetitive config creation in RPC methods
 */
export function createExecutorConfig<TParams>(
    params: TParams,
    options: {
        command: Command;
        chatStorageEnabled?: boolean;
        cleanupStrategy?: 'immediate' | 'review';
        existingTempPath?: string;
    }
): AICommandConfig<TParams> {
    const ctx = StateMachine.context();
    return {
        executionContext: createExecutionContextFromStateMachine(),
        eventHandler: createWebviewEventHandler(options.command),
        messageId: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        abortController: new AbortController(),
        params,
        chatStorage: options.chatStorageEnabled ? {
            workspaceId: ctx.projectPath,
            threadId: 'default',
            enabled: true,
        } : undefined,
        lifecycle: {
            cleanupStrategy: options.cleanupStrategy || 'immediate',
            existingTempPath: options.existingTempPath,
        }
    };
}

/**
 * Generates agent code based on user request
 * Handles plan mode configuration and review state management
 */
export async function generateAgent(params: GenerateAgentCodeRequest): Promise<boolean> {
    try {
        const isPlanModeEnabled = workspace.getConfiguration('ballerina.ai').get<boolean>('planMode', false);

        if (!isPlanModeEnabled) {
            params.isPlanMode = false;
        }

        // Check for pending review to reuse temp project path
        const workspaceId = StateMachine.context().projectPath;
        const threadId = params.threadId || 'default';
        const pendingReview = chatStateStorage.getPendingReviewGeneration(workspaceId, threadId);

        // Create config using factory function
        const config = createExecutorConfig(params, {
            command: Command.Agent,
            chatStorageEnabled: true,  // Agent uses chat storage for multi-turn conversations
            cleanupStrategy: 'review', // Review mode - temp persists until user accepts/declines
            existingTempPath: pendingReview?.reviewState.tempProjectPath
        });

        await new AgentExecutor(config).run();

        return true;
    } catch (error) {
        console.error('[Agent] Error in generateAgent:', error);
        throw error;
    }
}
