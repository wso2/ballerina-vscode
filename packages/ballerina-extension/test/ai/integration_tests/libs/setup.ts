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

import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import { commands, Uri, workspace } from "vscode";
import * as dotenv from "dotenv";

const TIMING = {
    WORKSPACE_SETUP_DELAY: 10000,
    WORKSPACE_SETTLE_DELAY: 3000,
    FILE_OPEN_DELAY: 5000,
    EXTENSION_ACTIVATION_RETRY_INTERVAL: 2000,
    MAX_ACTIVATION_ATTEMPTS: 30,
};

const PATHS = {
    PROJECT_ROOT_RELATIVE: "../../../../../test/data/bi_empty_project",
    ENV_FILE_RELATIVE: "../../../../.env",
};

const VSCODE_COMMANDS = {
    CLOSE_ALL_EDITORS: "workbench.action.closeAllEditors",
    OPEN: "vscode.open"
};

/**
 * Sets up the test environment for library integration tests
 */
export async function setupTestEnvironment(): Promise<void> {
    // Load environment variables from .env file if it exists
    const envPath = path.resolve(__dirname, PATHS.ENV_FILE_RELATIVE);
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log("Loaded .env file for library integration tests");
    }

    // Wait for VSCode startup to complete
    await new Promise(resolve => setTimeout(resolve, TIMING.WORKSPACE_SETUP_DELAY));

    await commands.executeCommand(VSCODE_COMMANDS.CLOSE_ALL_EDITORS);

    // Note: Workspace is already opened by VS Code via launch.json args
    // Wait for workspace to settle and extension to activate
    await new Promise(resolve => setTimeout(resolve, TIMING.WORKSPACE_SETTLE_DELAY));

    // Wait for extension to activate (it activates onStartupFinished)
    // Give it sufficient time to load language server and initialize
    console.log("Waiting for extension activation and language server initialization...");
    await new Promise(resolve => setTimeout(resolve, 20000)); // 20 seconds for full activation including LS
    console.log("✓ Extension should be activated");

    // Log API key availability for test visibility
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicApiKey && anthropicApiKey.trim() !== "") {
        console.log("ANTHROPIC_API_KEY found - tests will use BYOK authentication");
    } else {
        console.log("No ANTHROPIC_API_KEY found - tests may fail without authentication");
    }
}
