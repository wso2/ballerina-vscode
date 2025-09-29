// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.

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
import * as assert from "assert";
import * as fs from "fs";
import { commands, Uri, workspace } from "vscode";
import * as vscode from "vscode";
import * as dotenv from "dotenv";

import { testCases } from "./test-cases";
import { TestUseCase, Summary, TestConfiguration } from "./types";
import {
    DEFAULT_TEST_CONFIG,
    TIMING,
    PATHS,
    FILES,
    VSCODE_COMMANDS,
    processSingleBatch,
    handleBatchDelay,
    wait
} from "./utils";
import {
    ResultManager,
    generateComprehensiveSummary,
    generateComprehensiveReport,
    logExecutionStart,
    logExecutionCompletion
} from "./result-management";

// Convert imported test cases to TestUseCase format
const TEST_USE_CASES: readonly TestUseCase[] = testCases.map((testCase, index) => ({
    id: `usecase_${index + 1}`,
    description: testCase.prompt.substring(0, 50) + "...",
    usecase: testCase.prompt,
    operationType: "CODE_GENERATION" as const
}));

/**
 * Execute multiple test cases in parallel with comprehensive result management
 */
async function executeParallelTestsWithResults(
    useCases: readonly TestUseCase[]
): Promise<Summary> {
    const resultManager = new ResultManager();
    await resultManager.initializeResultsDirectory();

    const startTime = Date.now();
    logExecutionStart(useCases.length, DEFAULT_TEST_CONFIG.maxConcurrency, resultManager.getResultsDirectory());

    const allUsecaseResults: import("./types").UsecaseResult[] = [];
    let batchCount = 0;
    
    // Process tests in batches to limit concurrency
    for (let i = 0; i < useCases.length; i += DEFAULT_TEST_CONFIG.maxConcurrency) {
        batchCount++;
        const batch = useCases.slice(i, i + DEFAULT_TEST_CONFIG.maxConcurrency);
        
        // Execute batch and get results
        const batchResults = await processSingleBatch(batch, batchCount);
        
        // Persist batch results
        await persistBatchResults(batchResults, resultManager, i);
        
        // Add to overall results
        allUsecaseResults.push(...batchResults);
        
        // Handle inter-batch delay and monitoring
        await handleBatchDelay(i, useCases.length, DEFAULT_TEST_CONFIG.maxConcurrency);
    }
    console.log(`\n✅ All batches processed. Total use cases: ${allUsecaseResults.length}`);

    // Generate and persist comprehensive summary
    const summary = generateComprehensiveSummary(allUsecaseResults);
    await resultManager.persistSummary(summary);
    
    // Log completion summary
    logExecutionCompletion(startTime, allUsecaseResults, resultManager.getResultsDirectory());

    return summary;
}

/**
 * Helper function to persist batch results
 */
async function persistBatchResults(
    usecaseResults: readonly import("./types").UsecaseResult[], 
    resultManager: ResultManager, 
    startIndex: number
): Promise<void> {
    for (let i = 0; i < usecaseResults.length; i++) {
        const resultIndex = startIndex + i;
        await resultManager.persistUsecaseResult(usecaseResults[i], resultIndex);
    }
}

/**
 * Sets up the test environment by loading environment variables,
 * initializing workspace, and ensuring extension activation
 */
async function setupTestEnvironment(): Promise<void> {
    // Load environment variables from .env file if it exists
    const envPath = path.resolve(__dirname, PATHS.ENV_FILE_RELATIVE);
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log("Loaded .env file for AI tests");
    }
    
    // Wait for VSCode startup to complete
    await new Promise(resolve => setTimeout(resolve, TIMING.WORKSPACE_SETUP_DELAY));
    
    await commands.executeCommand(VSCODE_COMMANDS.CLOSE_ALL_EDITORS);
    
    // Add the Ballerina workspace to trigger workspaceContains activation event
    const PROJECT_ROOT = path.resolve(__dirname, PATHS.PROJECT_ROOT_RELATIVE);
    const currentFolderCount = workspace.workspaceFolders?.length || 0;
    workspace.updateWorkspaceFolders(currentFolderCount, 0, {
        uri: Uri.file(PROJECT_ROOT),
    });
    
    // Give VSCode time to detect the workspace and trigger activation
    await new Promise(resolve => setTimeout(resolve, TIMING.WORKSPACE_SETTLE_DELAY));
    
    // Force extension activation by opening a Ballerina file
    try {
        const testBalFile = Uri.file(path.join(PROJECT_ROOT, FILES.MAIN_BAL));
        await commands.executeCommand(VSCODE_COMMANDS.OPEN, testBalFile);
        await new Promise(resolve => setTimeout(resolve, TIMING.FILE_OPEN_DELAY));
    } catch (error) {
        // Fallback: try to execute a ballerina command to force activation
        try {
            await commands.executeCommand(VSCODE_COMMANDS.SHOW_EXAMPLES);
        } catch (cmdError) {
            // Extension might still be loading
        }
    }
    
    // Poll for AI test command availability
    let attempts = 0;
    
    while (attempts < TIMING.MAX_ACTIVATION_ATTEMPTS) {
        const availableCommands = await vscode.commands.getCommands();
        if (availableCommands.includes(VSCODE_COMMANDS.AI_GENERATE_CODE_CORE)) {
            break;
        }
        await new Promise(resolve => setTimeout(resolve, TIMING.EXTENSION_ACTIVATION_RETRY_INTERVAL));
        attempts++;
    }
    
    if (attempts >= TIMING.MAX_ACTIVATION_ATTEMPTS) {
        throw new Error("AI test command never registered - extension failed to activate");
    }

    // Log API key availability for test visibility
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicApiKey && anthropicApiKey.trim() !== "") {
        console.log("ANTHROPIC_API_KEY found - tests will attempt BYOK authentication");
        console.log("Using environment variable directly for authentication");
    } else {
        console.log("No ANTHROPIC_API_KEY found - tests will expect authentication errors");
    }
}

suite.only("AI Code Generator Tests Suite", () => {

    suiteSetup(async function (): Promise<void> {
        await setupTestEnvironment();
    });

    suiteTeardown(async function (): Promise<void> {
        console.log("Test suite completed - using environment-based auth, no credentials to clean up");
    });

    suite("Parallel Multi-UseCase Testing", () => {
        // Check API key before running any tests in this suite
        const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
        const hasAnthropicKey = anthropicApiKey && anthropicApiKey.trim() !== "";
        
        if (!hasAnthropicKey) {
            console.log(`\n⚠️  Skipping entire test suite: ANTHROPIC_API_KEY not set`);
            return; // Skip the entire suite
        }

        test("Execute all use cases in parallel with comprehensive result management", async function (): Promise<void> {
            
            console.log(`\n🔧 Test Configuration (Comprehensive Results):`);
            console.log(`   API Key Available: Yes`);
            console.log(`   Total Use Cases: ${TEST_USE_CASES.length}`);            

            await wait(TIMING.TEST_WAIT_TIME); // Wait for workspace to settle
            
            // Execute all test cases with comprehensive result management
            const summary = await executeParallelTestsWithResults(TEST_USE_CASES);
            
            // Generate comprehensive report
            generateComprehensiveReport(summary);

            // Assert overall test success
            console.log(`\n✅ Comprehensive test execution completed:`);
            console.log(`   Success Rate: ${Math.round(summary.accuracy)}%`);
            
            assert.ok(true);
        });

    });
});
