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

import { TestConfiguration } from '../types';

/**
 * Default test configuration
 */
export const DEFAULT_TEST_CONFIG: TestConfiguration = {
    maxConcurrency: 1,
    iterations: 1
} as const;

/**
 * Timing constants
 */
export const TIMING = {
    WORKSPACE_SETUP_DELAY: 10000,
    WORKSPACE_SETTLE_DELAY: 3000,
    EXTENSION_ACTIVATION_RETRY_INTERVAL: 2000,
    MAX_ACTIVATION_ATTEMPTS: 30,
    INTER_BATCH_DELAY: 2000,
    TEST_WAIT_TIME: 15000,
    BAL_TEST_TIMEOUT: 60000,
    FILE_WRITE_DELAY: 2000,
    PRE_BAL_TEST_DELAY: 3000
} as const;

/**
 * Path constants
 */
export const PATHS = {
    PROJECT_ROOT_RELATIVE: "../../../../../test/data/ai_datamapper",
    ENV_FILE_RELATIVE: "../../../../.env",
    DEFAULT_RESULTS_DIR: "../../../../../../test/ai/evals/datamapper/results"
} as const;

/**
 * File constants
 */
export const FILES = {
    MAIN_BAL: "main.bal",
    TYPES_BAL: "types.bal",
    BALLERINA_TOML: "Ballerina.toml"
} as const;

/**
 * VS Code commands
 */
export const VSCODE_COMMANDS = {
    CLOSE_ALL_EDITORS: "workbench.action.closeAllEditors",
    OPEN: "vscode.open",
    AI_GENERATE_MAPPING_CODE_CORE: "ballerina.test.ai.generatemappingCodecore"
} as const;

/**
 * Wait utility function
 */
export async function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
