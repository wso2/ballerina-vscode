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

import { Summary, DatamapperUsecaseResult, IterationSummary, TestCaseAccuracy } from '../types';

/**
 * Generates comprehensive report from test summary
 */
export function generateComprehensiveReport(summary: Summary): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 DATAMAPPER TEST EXECUTION REPORT');
    console.log('='.repeat(80));

    console.log(`\n📈 OVERALL SUMMARY:`);
    console.log(`   Total Test Cases: ${summary.totalTests}`);
    console.log(`   Passed: ${summary.totalPassed} (${Math.round(summary.accuracy)}%)`);
    console.log(`   Failed: ${summary.totalFailed} (${Math.round((summary.totalFailed / summary.totalTests) * 100)}%)`);
    console.log(`   Overall Accuracy: ${summary.accuracy}%`);
    console.log(`   Average LLM Evaluation Rating: ${summary.evaluationSummary.toFixed(2)}/10`);

    // Display iteration-specific summaries if multiple iterations
    if (summary.iterations && summary.iterations > 1 && summary.iterationResults) {
        logIterationSummaries(summary.iterationResults);
    }

    // Display per-test-case accuracy if multiple iterations
    if (summary.iterations && summary.iterations > 1 && summary.perTestCaseAccuracy) {
        logPerTestCaseAccuracy(summary.perTestCaseAccuracy);
    }

    console.log('='.repeat(80));
}

/**
 * Logs iteration summaries
 */
function logIterationSummaries(iterationResults: readonly IterationSummary[]): void {
    console.log(`\n🔄 ITERATION SUMMARIES:`);
    iterationResults.forEach((iteration) => {
        console.log(`\n   Iteration ${iteration.iteration}:`);
        console.log(`      Total Tests: ${iteration.totalTests}`);
        console.log(`      Passed: ${iteration.totalPassed} (${Math.round(iteration.accuracy)}%)`);
        console.log(`      Failed: ${iteration.totalFailed}`);
        console.log(`      Average Duration: ${iteration.averageDuration.toFixed(2)}ms`);
    });
}

/**
 * Logs per-test-case accuracy
 */
function logPerTestCaseAccuracy(perTestCaseAccuracy: readonly TestCaseAccuracy[]): void {
    console.log(`\n📊 PER-TEST-CASE ACCURACY:`);
    perTestCaseAccuracy.forEach((testCase) => {
        console.log(`   ${testCase.testName}:`);
        console.log(`      Success: ${testCase.successCount}/${testCase.totalAttempts} (${Math.round(testCase.accuracy)}%)`);
    });
}

/**
 * Generates comprehensive summary from results
 */
export function generateComprehensiveSummary(
    results: readonly DatamapperUsecaseResult[],
    iterations?: number
): Summary {
    const totalPassed = results.filter(r => r.passed).length;
    const totalFailed = results.length - totalPassed;
    const accuracy = (totalPassed / results.length) * 100;
    const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
    const averageDuration = totalDuration / results.length;
    const evaluationSummary = results.reduce((sum, r) => sum + r.llmEvaluation.rating, 0) / results.length;

    // Build summary with or without iteration data
    if (iterations && iterations > 1) {
        return {
            results,
            totalTests: results.length,
            totalPassed,
            totalFailed,
            accuracy,
            totalDuration,
            averageDuration,
            timestamp: Date.now(),
            evaluationSummary,
            iterations,
            iterationResults: generateIterationResults(results, iterations),
            perTestCaseAccuracy: generatePerTestCaseAccuracy(results)
        };
    }

    return {
        results,
        totalTests: results.length,
        totalPassed,
        totalFailed,
        accuracy,
        totalDuration,
        averageDuration,
        timestamp: Date.now(),
        evaluationSummary
    };
}

/**
 * Generates iteration-specific results
 */
function generateIterationResults(
    results: readonly DatamapperUsecaseResult[],
    iterations: number
): IterationSummary[] {
    const iterationSummaries: IterationSummary[] = [];

    for (let i = 1; i <= iterations; i++) {
        const iterationResults = results.filter(r => r.iteration === i);
        const totalPassed = iterationResults.filter(r => r.passed).length;
        const totalFailed = iterationResults.length - totalPassed;
        const accuracy = (totalPassed / iterationResults.length) * 100;
        const totalDuration = iterationResults.reduce((sum, r) => sum + (r.duration || 0), 0);
        const averageDuration = totalDuration / iterationResults.length;

        iterationSummaries.push({
            iteration: i,
            totalTests: iterationResults.length,
            totalPassed,
            totalFailed,
            accuracy,
            totalDuration,
            averageDuration,
            timestamp: Date.now(),
            results: iterationResults
        });
    }

    return iterationSummaries;
}

/**
 * Generates per-test-case accuracy across iterations
 */
function generatePerTestCaseAccuracy(
    results: readonly DatamapperUsecaseResult[]
): TestCaseAccuracy[] {
    const testCaseMap = new Map<string, { successCount: number; totalAttempts: number }>();

    results.forEach((result) => {
        const existing = testCaseMap.get(result.testName) || { successCount: 0, totalAttempts: 0 };
        existing.totalAttempts++;
        if (result.passed) {
            existing.successCount++;
        }
        testCaseMap.set(result.testName, existing);
    });

    const perTestCaseAccuracy: TestCaseAccuracy[] = [];
    let index = 0;

    testCaseMap.forEach((stats, testName) => {
        perTestCaseAccuracy.push({
            testCaseIndex: index++,
            testName,
            successCount: stats.successCount,
            totalAttempts: stats.totalAttempts,
            accuracy: (stats.successCount / stats.totalAttempts) * 100
        });
    });

    return perTestCaseAccuracy;
}

/**
 * Generates iteration summary
 */
export function generateIterationSummary(
    results: readonly DatamapperUsecaseResult[],
    iteration: number
): IterationSummary {
    const totalPassed = results.filter(r => r.passed).length;
    const totalFailed = results.length - totalPassed;
    const accuracy = (totalPassed / results.length) * 100;
    const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
    const averageDuration = totalDuration / results.length;

    return {
        iteration,
        totalTests: results.length,
        totalPassed,
        totalFailed,
        accuracy,
        totalDuration,
        averageDuration,
        timestamp: Date.now(),
        results
    };
}

/**
 * Logs execution start
 */
export function logExecutionStart(
    totalTests: number,
    maxConcurrency: number,
    resultsDir: string,
    iterations: number
): void {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 DATAMAPPER TEST EXECUTION STARTED');
    console.log('='.repeat(80));
    console.log(`   Total Test Cases: ${totalTests}`);
    console.log(`   Iterations: ${iterations}`);
    console.log(`   Max Concurrency: ${maxConcurrency}`);
    console.log(`   Results Directory: ${resultsDir}`);
    console.log('='.repeat(80));
}

/**
 * Logs execution completion
 */
export function logExecutionCompletion(
    startTime: number,
    results: readonly DatamapperUsecaseResult[],
    resultsDir: string
): void {
    const duration = Date.now() - startTime;
    const totalPassed = results.filter(r => r.passed).length;
    const totalFailed = results.length - totalPassed;

    console.log('\n' + '='.repeat(80));
    console.log('✅ DATAMAPPER TEST EXECUTION COMPLETED');
    console.log('='.repeat(80));
    console.log(`   Total Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`   Passed: ${totalPassed}/${results.length}`);
    console.log(`   Failed: ${totalFailed}/${results.length}`);
    console.log(`   Accuracy: ${Math.round((totalPassed / results.length) * 100)}%`);
    console.log(`   Results saved to: ${resultsDir}`);
    console.log('='.repeat(80));
}
