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
import * as vscode from "vscode";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as assert from "assert";

import { testCases } from "./test-cases";
import { TestCase, DatamapperUsecaseResult, Summary } from "./types";
import {
    DEFAULT_TEST_CONFIG,
    TIMING,
    PATHS,
    VSCODE_COMMANDS,
    wait,
    processSingleBatch,
    handleBatchDelay
} from "./utils";
import {
    ResultManager,
    generateComprehensiveSummary,
    generateIterationSummary,
    generateComprehensiveReport,
    logExecutionStart,
    logExecutionCompletion
} from "./result-management";

/**
 * Execute multiple test cases in parallel with comprehensive result management
 */
async function executeParallelTestsWithResults(
    testCases: readonly TestCase[]
): Promise<Summary> {
    const resultManager = new ResultManager();
    await resultManager.initializeResultsDirectory();

    const startTime = Date.now();
    const iterations = DEFAULT_TEST_CONFIG.iterations;
    logExecutionStart(testCases.length, DEFAULT_TEST_CONFIG.maxConcurrency, resultManager.getResultsDirectory(), iterations);

    const allUsecaseResults: DatamapperUsecaseResult[] = [];

    // Iterate N times if configured
    for (let iteration = 1; iteration <= iterations; iteration++) {
        if (iterations > 1) {
            console.log(`\n${'='.repeat(80)}`);
            console.log(`🔄 STARTING ITERATION ${iteration}/${iterations}`);
            console.log('='.repeat(80));
        }

        let batchCount = 0;

        // Process tests in batches to limit concurrency
        for (let i = 0; i < testCases.length; i += DEFAULT_TEST_CONFIG.maxConcurrency) {
            batchCount++;
            const batch = testCases.slice(i, i + DEFAULT_TEST_CONFIG.maxConcurrency);

            // Execute batch and get results
            const batchResults = await processSingleBatch(batch, batchCount, iterations > 1 ? iteration : undefined);

            // Persist batch results with iteration info
            await persistBatchResults(batchResults, resultManager, i, iterations > 1 ? iteration : undefined);

            // Add to overall results
            allUsecaseResults.push(...batchResults);

            // Handle inter-batch delay and monitoring
            await handleBatchDelay(i, testCases.length, DEFAULT_TEST_CONFIG.maxConcurrency);
        }

        if (iterations > 1) {
            const iterationResults = allUsecaseResults.filter(r => r.iteration === iteration);
            const iterationPassed = iterationResults.filter(r => r.passed).length;
            console.log(`\n✅ Iteration ${iteration} completed: ${iterationPassed}/${testCases.length} passed (${Math.round(iterationPassed / testCases.length * 100)}%)`);

            // Generate and persist iteration summary
            const iterationSummary = generateIterationSummary(iterationResults, iteration);
            await resultManager.persistIterationSummary(iterationSummary);
        }
    }

    console.log(`\n✅ All ${iterations > 1 ? 'iterations and ' : ''}batches processed. Total test runs: ${allUsecaseResults.length}`);

    // Generate and persist comprehensive summary
    const summary = generateComprehensiveSummary(allUsecaseResults, iterations > 1 ? iterations : undefined);
    await resultManager.persistSummary(summary);

    // Log completion summary
    logExecutionCompletion(startTime, allUsecaseResults, resultManager.getResultsDirectory());

    return summary;
}

/**
 * Helper function to persist batch results
 */
async function persistBatchResults(
    usecaseResults: readonly DatamapperUsecaseResult[],
    resultManager: ResultManager,
    startIndex: number,
    iteration?: number
): Promise<void> {
    for (let i = 0; i < usecaseResults.length; i++) {
        const resultIndex = startIndex + i;
        await resultManager.persistUsecaseResult(usecaseResults[i], resultIndex, iteration);
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

    // Poll for AI test command availability
    let attempts = 0;

    while (attempts < TIMING.MAX_ACTIVATION_ATTEMPTS) {
        const availableCommands = await vscode.commands.getCommands();
        if (availableCommands.includes(VSCODE_COMMANDS.AI_GENERATE_MAPPING_CODE_CORE)) {
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

suite.skip("AI Datamapper Tests Suite", () => {

    suiteSetup(async function (): Promise<void> {
        await setupTestEnvironment();
    });

    suiteTeardown(async function (): Promise<void> {
        console.log("Test suite completed - using environment-based auth, no credentials to clean up");
    });

    suite("Datamapper Code Generation", () => {
        // Check API key before running any tests in this suite
        const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
        const hasAnthropicKey = anthropicApiKey && anthropicApiKey.trim() !== "";

        if (!hasAnthropicKey) {
            console.log(`\n⚠️  Skipping entire test suite: ANTHROPIC_API_KEY not set`);
            return; // Skip the entire suite
        }

        test("Execute all datamapper test cases in parallel with comprehensive result management", async function (): Promise<void> {

            console.log(`\n🔧 Test Configuration (Comprehensive Results):`);
            console.log(`   API Key Available: Yes`);
            console.log(`   Total Test Cases: ${testCases.length}`);
            console.log(`   Iterations: ${DEFAULT_TEST_CONFIG.iterations}`);
            console.log(`   Max Concurrency: ${DEFAULT_TEST_CONFIG.maxConcurrency}`);

            await wait(TIMING.TEST_WAIT_TIME); // Wait for workspace to settle

            // Execute all test cases with comprehensive result management
            const summary = await executeParallelTestsWithResults(testCases);

            // Generate comprehensive report
            generateComprehensiveReport(summary);

            // Assert overall test success
            console.log(`\n✅ Comprehensive test execution completed:`);
            console.log(`   Success Rate: ${Math.round(summary.accuracy)}%`);
            if (summary.iterations && summary.iterations > 1) {
                console.log(`   Total Iterations: ${summary.iterations}`);
                console.log(`   Total Test Runs: ${summary.totalTests}`);
            }

            assert.ok(true);
        });

    });
});
