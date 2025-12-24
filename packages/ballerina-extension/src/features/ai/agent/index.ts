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

/**
 * @deprecated This file is deprecated. All agent functionality has been moved to AgentExecutor.
 *
 * - For production use: Import AgentExecutor from './AgentExecutor' and use it via RPC manager
 * - For tests: Import from './index-for-test'
 *
 * This file is kept only for the factory functions used by tests.
 */

import { ExecutionContext } from "@wso2/ballerina-core";
import { StateMachine } from "../../../stateMachine";

// ==================================
// ExecutionContext Factory Functions
// (Kept for test compatibility)
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

/**
 * Creates an ExecutionContext with explicit paths.
 * Used by tests to create isolated contexts per test case.
 *
 * @param projectPath - Absolute path to the project
 * @param workspacePath - Optional workspace path
 * @returns ExecutionContext with specified paths
 */
export function createExecutionContext(
    projectPath: string,
    workspacePath?: string
): ExecutionContext {
    return { projectPath, workspacePath };
}
