// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/)
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import { GenerateAgentCodeRequest, ExecutionContext } from "@wso2/ballerina-core";
import { CopilotEventHandler } from "../utils/events";
import { createExecutionContext } from ".";
import { AgentExecutor } from "../executors/agent/AgentExecutor";
import { AIExecutionConfig } from "../executors/base/AICommandExecutor";

/**
 * Parameters for test-mode code generation
 */
export interface GenerateAgentForTestParams extends GenerateAgentCodeRequest {
    /** Path to the isolated test project (created by eval from template) */
    projectPath: string;
}

/**
 * Result returned from test-mode code generation
 */
export interface GenerateAgentForTestResult {
    /** Path to the temp project where code was generated (created by getTempProject) */
    tempProjectPath: string;
    /** Path to the isolated test project (source) */
    isolatedProjectPath: string;
}

/**
 * Generates code in test mode without workspace integration.
 *
 * This function is specifically designed for evaluation and testing scenarios where:
 * - Tests create isolated project from template and pass its path
 * - This function creates an isolated ExecutionContext for each test
 * - Uses AgentExecutor directly (no state machine!)
 * - Changes are NOT integrated back to workspace (controlled by AI_TEST_ENV)
 * - Temp project is NOT cleaned up (AI_TEST_ENV prevents cleanup)
 * - Returns paths for validation and manual cleanup
 *
 * @param params Generation parameters including isolated project path
 * @param eventHandler Handler for capturing generation events
 * @returns Object containing temp project path and isolated project path
 * @throws Error if AI_TEST_ENV not set or projectPath not provided
 */
export async function generateAgentForTest(
    params: GenerateAgentForTestParams,
    eventHandler: CopilotEventHandler
): Promise<GenerateAgentForTestResult> {
    if (!process.env.AI_TEST_ENV) {
        throw new Error('[Test Mode] AI_TEST_ENV must be set to use test mode generation');
    }

    if (!params.projectPath) {
        throw new Error('[Test Mode] projectPath is required in test mode');
    }

    try {
        // Create isolated ExecutionContext for this test
        const ctx: ExecutionContext = createExecutionContext(params.projectPath);

        // Create execution config
        const config: AIExecutionConfig = {
            executionContext: ctx,
            eventHandler,
            messageId: params.messageId || `test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            abortController: new AbortController()
        };

        // Create executor instance
        const executor = new AgentExecutor(config, params);

        // Execute with automatic lifecycle management
        await executor.initialize();
        const result = await executor.execute();
        await executor.cleanup();

        return {
            tempProjectPath: result.tempProjectPath,
            isolatedProjectPath: params.projectPath
        };
    } catch (error) {
        console.error(`[Test Mode] Generation failed for project ${params.projectPath}:`, error);
        throw error;
    }
}
