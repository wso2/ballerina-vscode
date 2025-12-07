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

import { GenerateAgentCodeRequest } from "@wso2/ballerina-core";
import { CopilotEventHandler } from "../event";
import { generateDesignCore } from "./design";
import { StateMachine } from "../../../../stateMachine";

/**
 * Parameters for test-mode code generation
 */
export interface GenerateDesignForTestParams extends GenerateAgentCodeRequest {
    /** Path to the isolated test project (created by eval from template) */
    projectPath: string;
}

/**
 * Result returned from test-mode code generation
 */
export interface GenerateDesignForTestResult {
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
 * - This function sets StateMachine.context().projectPath to the isolated project
 * - generateDesignCore creates temp copy from StateMachine.context().projectPath
 * - Changes are NOT integrated back to workspace (controlled by AI_TEST_ENV)
 * - Temp project is NOT cleaned up (AI_TEST_ENV prevents cleanup)
 * - Returns paths for validation and manual cleanup
 *
 * @param params Generation parameters including isolated project path
 * @param eventHandler Handler for capturing generation events
 * @returns Object containing temp project path and isolated project path
 * @throws Error if AI_TEST_ENV not set or projectPath not provided
 */
export async function generateDesignForTest(
    params: GenerateDesignForTestParams,
    eventHandler: CopilotEventHandler
): Promise<GenerateDesignForTestResult> {
    if (!process.env.AI_TEST_ENV) {
        throw new Error('[Test Mode] AI_TEST_ENV must be set to use test mode generation');
    }

    if (!params.projectPath) {
        throw new Error('[Test Mode] projectPath is required in test mode');
    }

    try {
        // Set StateMachine.context().projectPath to the isolated project
        // This ensures getTempProject() creates a temp copy from the isolated project
        const langClient = StateMachine.langClient();
        if (!langClient) {
            throw new Error('[Test Mode] Language client not available');
        }

        const projectInfo = await langClient.getProjectInfo({ projectPath: params.projectPath });
        await StateMachine.updateProjectRootAndInfo(params.projectPath, projectInfo);

        // Verify the update
        if (StateMachine.context().projectPath !== params.projectPath) {
            throw new Error(`[Test Mode] Failed to set StateMachine projectPath. Expected: ${params.projectPath}, Got: ${StateMachine.context().projectPath}`);
        }

        // generateDesignCore creates temp project from StateMachine.context().projectPath
        const tempProjectPath = await generateDesignCore(params, eventHandler);

        return {
            tempProjectPath,
            isolatedProjectPath: params.projectPath
        };
    } catch (error) {
        console.error(`[Test Mode] Generation failed:`, error);
        throw error;
    }
}
