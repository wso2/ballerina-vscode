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

import { TestCase, DatamapperUsecaseResult } from "../types";
import { executeDatamapperTest, updateMainBalFile, runBalTest } from "./test-execution";
import { performLLMEvaluation } from "./test-evaluation";
import { DEFAULT_TEST_CONFIG, TIMING, wait } from "./constants";

/**
 * Process a single test case and return the result
 */
export async function processSingleTestCase(
    testCase: TestCase,
    iteration?: number
): Promise<DatamapperUsecaseResult> {
    const startTime = Date.now();

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 Processing: ${testCase.name}${iteration ? ` (Iteration ${iteration})` : ''}`);
    console.log('='.repeat(80));

    const generationResult = await executeDatamapperTest(testCase);

    if (generationResult.error) {
        return {
            testName: testCase.name,
            balTestResult: { passed: 0, failed: 0, skipped: 0, total: 0, output: "", success: false },
            llmEvaluation: { is_correct: false, rating: 0, reasoning: "Generation failed" },
            passed: false,
            failureReason: `Generation failed: ${generationResult.error}`,
            duration: Date.now() - startTime,
            timestamp: Date.now(),
            iteration
        };
    }

    if (!generationResult.fileArray || generationResult.fileArray.length === 0) {
        return {
            testName: testCase.name,
            balTestResult: { passed: 0, failed: 0, skipped: 0, total: 0, output: "", success: false },
            llmEvaluation: { is_correct: false, rating: 0, reasoning: "No files generated" },
            passed: false,
            failureReason: "No files generated",
            duration: Date.now() - startTime,
            timestamp: Date.now(),
            iteration
        };
    }

    // Update the main.bal file with generated code
    const mainFile = generationResult.fileArray.find((f: any) => f.filePath.endsWith("main.bal"));
    if (!mainFile) {
        return {
            testName: testCase.name,
            balTestResult: { passed: 0, failed: 0, skipped: 0, total: 0, output: "", success: false },
            llmEvaluation: { is_correct: false, rating: 0, reasoning: "No main.bal file in generated output" },
            passed: false,
            failureReason: "No main.bal file in generated output",
            duration: Date.now() - startTime,
            timestamp: Date.now(),
            iteration
        };
    }

    await updateMainBalFile(testCase, mainFile.content);

    // Run bal test to validate generated code
    const balTestResult = await runBalTest(testCase);

    // Perform LLM evaluation
    const llmEvaluation = await performLLMEvaluation(testCase);

    // Test passes if bal test succeeds AND LLM evaluation is positive
    const passed = balTestResult.success && llmEvaluation.is_correct;

    let failureReason: string | undefined;
    if (!passed) {
        const reasons = [];
        if (!balTestResult.success) {
            reasons.push(`Bal test failed: ${balTestResult.failed} test(s) failed`);
        }
        if (!llmEvaluation.is_correct) {
            reasons.push(`LLM evaluation failed: ${llmEvaluation.reasoning}`);
        }
        failureReason = reasons.join("; ");
    }

    console.log(`\n${passed ? '✅' : '❌'} Test ${passed ? 'PASSED' : 'FAILED'} for ${testCase.name}`);
    if (failureReason) {
        console.log(`   Reason: ${failureReason}`);
    }

    return {
        testName: testCase.name,
        balTestResult,
        llmEvaluation,
        passed,
        failureReason,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        iteration
    };
}

/**
 * Process a batch of test cases
 */
export async function processSingleBatch(
    testCases: readonly TestCase[],
    batchCount: number,
    iteration?: number
): Promise<DatamapperUsecaseResult[]> {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔄 Processing Batch ${batchCount}${iteration ? ` (Iteration ${iteration})` : ''} - ${testCases.length} test case(s)`);
    console.log('='.repeat(80));

    const results = await Promise.all(
        testCases.map(testCase => processSingleTestCase(testCase, iteration))
    );

    const passed = results.filter(r => r.passed).length;
    console.log(`\n✅ Batch ${batchCount} completed: ${passed}/${testCases.length} passed`);

    return results;
}

/**
 * Handle inter-batch delay
 */
export async function handleBatchDelay(
    currentIndex: number,
    totalTests: number,
    batchSize: number
): Promise<void> {
    if (currentIndex + batchSize < totalTests) {
        console.log(`\n⏳ Waiting ${TIMING.INTER_BATCH_DELAY}ms before next batch...\n`);
        await wait(TIMING.INTER_BATCH_DELAY);
    }
}
