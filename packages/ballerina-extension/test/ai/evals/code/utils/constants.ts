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
    // ExecutionContext pattern enables parallel execution without race conditions!
    maxConcurrency: 5,
    iterations: 1
} as const;

/**
 * Timing constants
 */
export const TIMING = {
    WORKSPACE_SETUP_DELAY: 10000,
    WORKSPACE_SETTLE_DELAY: 3000,
    FILE_OPEN_DELAY: 5000,
    EXTENSION_ACTIVATION_RETRY_INTERVAL: 2000,
    MAX_ACTIVATION_ATTEMPTS: 30,
    INTER_BATCH_DELAY: 2000,
    TEST_WAIT_TIME: 15000
} as const;

/**
 * Path constants
 */
export const PATHS = {
    PROJECT_ROOT_RELATIVE: "../../../../../test/data",
    ENV_FILE_RELATIVE: "../../../../.env",
    DEFAULT_RESULTS_DIR: "../../../../../../test/ai/evals/code/results"
} as const;

/**
 * File constants
 */
export const FILES = {
    MAIN_BAL: "main.bal",
    BALLERINA_TOML: "Ballerina.toml",
    RESPONSE_MD: "resp.md",
    ERROR_TXT: "error.txt"
} as const;

/**
 * Ballerina project template
 */
export const BALLERINA_TOML_TEMPLATE = (index: number): string => `[package]
name = "test_usecase_${index}"
version = "0.1.0"
distribution = "2201.10.0"

[build-options]
observabilityIncluded = true
`;

/**
 * VS Code commands
 */
export const VSCODE_COMMANDS = {
    CLOSE_ALL_EDITORS: "workbench.action.closeAllEditors",
    OPEN: "vscode.open",
    AI_GENERATE_DESIGN_FOR_TEST: "ballerina.test.ai.generateDesignForTest"
} as const;
