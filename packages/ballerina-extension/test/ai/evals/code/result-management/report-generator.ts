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

import { Summary, UsecaseResult, IterationSummary, TestCaseAccuracy } from '../types';

/**
 * Generates comprehensive report from test summary
 */
export function generateComprehensiveReport(summary: Summary): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE TEST EXECUTION REPORT');
    console.log('='.repeat(80));

    console.log(`\n📈 OVERALL SUMMARY:`);
    console.log(`   Total Use Cases: ${summary.totalUsecases}`);
    console.log(`   Compiled Successfully: ${summary.totalCompiled} (${Math.round(summary.accuracy)}%)`);
    console.log(`   Failed: ${summary.totalFailed} (${Math.round((summary.totalFailed / summary.totalUsecases) * 100)}%)`);
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

    // Add cache usage metrics section
    if (summary.aggregatedUsage) {
        console.log(`\n🗃️ CACHE USAGE ANALYSIS: `);
        console.log(`   Total Use Cases: ${summary.aggregatedUsage.totalUseCases}`);

        // Initial generation stats
        const initial = summary.aggregatedUsage.initialGeneration;
        console.log(`   Initial: hits ${initial.hits}/${summary.aggregatedUsage.totalUseCases}, creation ${initial.creation}/${summary.aggregatedUsage.totalUseCases}`);

        // Repair iteration stats
        const repairKeys = Object.keys(summary.aggregatedUsage.repairs).sort((a, b) => {
            const aNum = parseInt(a.replace('repair', ''));
            const bNum = parseInt(b.replace('repair', ''));
            return aNum - bNum;
        });

        repairKeys.forEach(repairKey => {
            const repairStats = summary.aggregatedUsage.repairs[repairKey];
            const repairNum = repairKey.replace('repair', '');

            // Use the count field to get the actual number of use cases that reached this repair iteration
            const totalWithThisRepair = repairStats.count;
            if (totalWithThisRepair > 0) {
                console.log(`   Repair ${repairNum}: hits ${repairStats.hits}/${totalWithThisRepair}, creation ${repairStats.creation}/${totalWithThisRepair}`);
            }
        });
    }

    // Add enhanced overall cache validation
    if (summary.overallCacheValidation) {
        console.log(`\n🎯 OVERALL CACHE PERFORMANCE VALIDATION:`);
        const validation = summary.overallCacheValidation;

        const overallIcon = validation.overallStatus === 'pass' ? '✅' : '❌';
        console.log(`   ${overallIcon} Overall Status: ${validation.overallStatus.toUpperCase()}`);

        const initialIcon = validation.initialCacheEfficiency === 'pass' ? '✅' : '❌';
        console.log(`   ${initialIcon} Initial Cache Efficiency: ${validation.initialCacheEfficiency} (${validation.InitialGenCacheCreation} fresh creations)`);

        if (validation.firstRepairAllReads !== 'not_applicable') {
            const firstRepairIcon = validation.firstRepairAllReads === 'pass' ? '✅' : '❌';
            console.log(`   ${firstRepairIcon} First Repair All Reads: ${validation.firstRepairAllReads}`);
        }

        if (validation.subsequentRepairsNoWrites !== 'not_applicable') {
            const subsequentIcon = validation.subsequentRepairsNoWrites === 'pass' ? '✅' : '❌';
            console.log(`   ${subsequentIcon} Subsequent Repairs No Writes: ${validation.subsequentRepairsNoWrites}`);
        }

        if (validation.validationIssues.length > 0) {
            console.log(`\n   🚨 Validation Issues:`);
            validation.validationIssues.forEach((issue, index) => {
                console.log(`      ${index + 1}. ${issue}`);
            });
        }
    }

    logSuccessfulCompilations(summary.results);

    if (summary.totalFailed > 0) {
        logFailedCompilations(summary.results);
    }
}

/**
 * Logs cache validation for an individual use case result
 */
function logIndividualCacheValidation(result: UsecaseResult): void {
    const validation = result.usage?.overallCachePerformanceValidation;
    if (!validation) {
        return; // No validation data available
    }

    console.log(`      Cache Validation:`);

    // Initial generation check
    const initialIcon = validation.initialGenerationCheck === 'pass' ? '✅' : '⚠️';
    console.log(`        Initial Generation: ${initialIcon} ${validation.initialGenerationCheck}`);

    // First repair check (if applicable)
    if (validation.firstRepairCheck !== 'not_applicable') {
        const firstRepairIcon = validation.firstRepairCheck === 'pass' ? '✅' : (validation.firstRepairCheck === 'fail' ? '❌' : '⚠️');
        console.log(`        First Repair: ${firstRepairIcon} ${validation.firstRepairCheck}`);
    }

    // Subsequent repairs check (if applicable)
    if (validation.subsequentRepairsCheck !== 'not_applicable') {
        const subsequentIcon = validation.subsequentRepairsCheck === 'pass' ? '✅' : '⚠️';
        console.log(`        Subsequent Repairs: ${subsequentIcon} ${validation.subsequentRepairsCheck}`);
    }

    // Show issues if any
    if (validation.issues && validation.issues.length > 0) {
        console.log(`        Issues:`);
        validation.issues.forEach((issue, index) => {
            console.log(`          ${index + 1}. ${issue}`);
        });
    }
}

/**
 * Logs successful compilations section
 */
function logSuccessfulCompilations(results: readonly UsecaseResult[]): void {
    console.log('\n🏆 SUCCESSFUL COMPILATIONS:');
    const successful = results.filter(r => r.compiled);
    successful.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.usecase}`);
        console.log(`      Duration: ${result.duration || 'N/A'}ms`);
        console.log(`      Files Generated: ${result.files.length}`);
        console.log(`      Diagnostics: ${result.diagnostics.length} (${result.diagnostics.length === 0 ? '✅ Clean' : '⚠️ Has Issues'})`);
        if (result.evaluationResult) {
            console.log(`      LLM Rating: ${result.evaluationResult.rating.toFixed(1)}/10 (${result.evaluationResult.is_correct ? '✅' : '❌'})`);
        }
        if (result.files.length > 0) {
            console.log(`      Files: ${result.files.map(f => f.fileName).join(', ')}`);
        }
        logIndividualCacheValidation(result);
    });
}

/**
 * Logs failed compilations section
 */
function logFailedCompilations(results: readonly UsecaseResult[]): void {
    console.log('\n❌ FAILED COMPILATIONS:');
    const failed = results.filter(r => !r.compiled);
    failed.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.usecase}`);
        console.log(`      Duration: ${result.duration || 'N/A'}ms`);
        console.log(`      Diagnostic Issues: ${result.diagnostics.length}`);
        console.log(`      Error Events: ${result.errorEvents ? result.errorEvents.length : 0}`);
        if (result.evaluationResult) {
            console.log(`      LLM Rating: ${result.evaluationResult.rating.toFixed(1)}/10`);
            console.log(`      LLM Reasoning: ${result.evaluationResult.reasoning.substring(0, 100)}${result.evaluationResult.reasoning.length > 100 ? '...' : ''}`);
        }

        if (result.errorEvents && result.errorEvents.length > 0) {
            console.log(`      Key Errors:`);
            result.errorEvents.slice(0, 2).forEach((error, errorIndex) => {
                console.log(`        ${errorIndex + 1}. ${error.substring(0, 100)}${error.length > 100 ? '...' : ''}`);
            });
            if (result.errorEvents.length > 2) {
                console.log(`        ... and ${result.errorEvents.length - 2} more errors`);
            }
        }

        if (result.diagnostics.length > 0) {
            console.log(`      Key Diagnostics:`);
            result.diagnostics.slice(0, 3).forEach((diag, diagIndex) => {
                console.log(`        ${diagIndex + 1}. ${diag.message.substring(0, 100)}${diag.message.length > 100 ? '...' : ''}`);
            });
            if (result.diagnostics.length > 3) {
                console.log(`        ... and ${result.diagnostics.length - 3} more`);
            }
        }

        logIndividualCacheValidation(result);
    });
}


/**
 * Logs iteration-specific summaries
 */
function logIterationSummaries(iterationResults: readonly IterationSummary[]): void {
    console.log('\n📊 PER-ITERATION ACCURACY:');
    iterationResults.forEach(iter => {
        console.log(`   Iteration ${iter.iteration}: ${iter.totalCompiled}/${iter.totalUsecases} passed (${iter.accuracy}%) - Avg Rating: ${iter.evaluationResult.rating.toFixed(2)}/10`);
    });
}

/**
 * Logs per-test-case accuracy across iterations
 */
function logPerTestCaseAccuracy(testCaseAccuracy: readonly TestCaseAccuracy[]): void {
    console.log('\n🎯 PER-TEST-CASE ACCURACY (across all iterations):');

    // Group by accuracy ranges for better readability
    const highAccuracy = testCaseAccuracy.filter(tc => tc.accuracy >= 80);
    const mediumAccuracy = testCaseAccuracy.filter(tc => tc.accuracy >= 50 && tc.accuracy < 80);
    const lowAccuracy = testCaseAccuracy.filter(tc => tc.accuracy < 50);

    if (highAccuracy.length > 0) {
        console.log('\n   ✅ High Success Rate (≥80%):');
        highAccuracy.forEach(tc => {
            console.log(`      Test ${tc.testCaseIndex}: ${tc.successCount}/${tc.totalAttempts} (${tc.accuracy}%) - ${tc.usecase.substring(0, 60)}...`);
        });
    }

    if (mediumAccuracy.length > 0) {
        console.log('\n   ⚠️  Medium Success Rate (50-79%):');
        mediumAccuracy.forEach(tc => {
            console.log(`      Test ${tc.testCaseIndex}: ${tc.successCount}/${tc.totalAttempts} (${tc.accuracy}%) - ${tc.usecase.substring(0, 60)}...`);
        });
    }

    if (lowAccuracy.length > 0) {
        console.log('\n   ❌ Low Success Rate (<50%):');
        lowAccuracy.forEach(tc => {
            console.log(`      Test ${tc.testCaseIndex}: ${tc.successCount}/${tc.totalAttempts} (${tc.accuracy}%) - ${tc.usecase.substring(0, 60)}...`);
        });
    }
}

/**
 * Logs execution start information
 */
export function logExecutionStart(totalCases: number, maxConcurrency: number, resultsDir: string, iterations?: number): void {
    console.log(`\n🔥 Starting parallel execution of ${totalCases} test cases${iterations && iterations > 1 ? ` (${iterations} iterations)` : ''}:`);
    console.log(`   Max Concurrency: ${maxConcurrency}`);
    console.log(`   Results Directory: ${resultsDir}`);
    if (iterations && iterations > 1) {
        console.log(`   Total Test Runs: ${totalCases * iterations}`);
    }
}

/**
 * Logs execution completion information
 */
export function logExecutionCompletion(startTime: number, usecaseResults: readonly UsecaseResult[], resultsDir: string): void {
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    const passedTests = usecaseResults.filter(r => r.compiled).length;

    console.log(`\n🏁 Parallel execution completed:`);
    console.log(`   Total Time: ${totalDuration}ms (${Math.round(totalDuration / 1000)}s)`);
    console.log(`   Success Rate: ${Math.round(passedTests / usecaseResults.length * 100)}%`);
    console.log(`   Results saved to: ${resultsDir}`);
}
