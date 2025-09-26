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

import { Summary, UsecaseResult } from '../types';

/**
 * Generates comprehensive report from test summary
 */
export function generateComprehensiveReport(summary: Summary): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE TEST EXECUTION REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Use Cases: ${summary.totalUsecases}`);
    console.log(`   Compiled Successfully: ${summary.totalCompiled} (${Math.round(summary.accuracy)}%)`);
    console.log(`   Failed: ${summary.totalFailed} (${Math.round((summary.totalFailed / summary.totalUsecases) * 100)}%)`);
    console.log(`   Overall Accuracy: ${summary.accuracy}%`);

    logSuccessfulCompilations(summary.results);

    if (summary.totalFailed > 0) {
        logFailedCompilations(summary.results);
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
        if (result.files.length > 0) {
            console.log(`      Files: ${result.files.map(f => f.fileName).join(', ')}`);
        }
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
    });
}

/**
 * Logs execution start information
 */
export function logExecutionStart(totalCases: number, maxConcurrency: number, resultsDir: string): void {
    console.log(`\n🔥 Starting parallel execution of ${totalCases} test cases:`);
    console.log(`   Max Concurrency: ${maxConcurrency}`);
    console.log(`   Results Directory: ${resultsDir}`);
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
