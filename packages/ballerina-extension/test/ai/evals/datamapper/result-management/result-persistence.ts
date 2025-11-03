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

import * as fs from "fs";
import * as path from "path";
import { DatamapperUsecaseResult, Summary, SummaryCompact, IterationSummary } from '../types';

/**
 * Persists a single datamapper use case result to the file system
 */
export async function persistUsecaseResult(
    usecaseResult: DatamapperUsecaseResult,
    index: number,
    resultsDir: string,
    iteration?: number
): Promise<void> {
    // Create directory structure: results/iteration_X/Y/ or results/Y/ if no iterations
    let resultDir: string;
    if (iteration !== undefined) {
        const iterationDir = path.join(resultsDir, `iteration_${iteration}`);
        await fs.promises.mkdir(iterationDir, { recursive: true });
        resultDir = path.join(iterationDir, index.toString());
    } else {
        resultDir = path.join(resultsDir, index.toString());
    }
    await fs.promises.mkdir(resultDir, { recursive: true });

    // Write result summary
    await fs.promises.writeFile(
        path.join(resultDir, "result.json"),
        JSON.stringify({
            testName: usecaseResult.testName,
            passed: usecaseResult.passed,
            duration: usecaseResult.duration,
            iteration: usecaseResult.iteration,
            failureReason: usecaseResult.failureReason,
            fieldResults: usecaseResult.fieldResults
        }, null, 2)
    );

    // Write bal test results
    await fs.promises.writeFile(
        path.join(resultDir, "bal-test-result.json"),
        JSON.stringify(usecaseResult.balTestResult, null, 2)
    );

    // Write field-level results separately for easy analysis
    if (usecaseResult.fieldResults && usecaseResult.fieldResults.length > 0) {
        await fs.promises.writeFile(
            path.join(resultDir, "field-results.json"),
            JSON.stringify(usecaseResult.fieldResults, null, 2)
        );
    }

    console.log(`Result persisted for index ${index}${iteration !== undefined ? ` (iteration ${iteration})` : ''}: ${usecaseResult.testName}`);
}

/**
 * Persists the comprehensive summary
 */
export async function persistSummary(summary: Summary, resultsDir: string): Promise<void> {
    const compactSummary: SummaryCompact = {
        totalTests: summary.totalTests,
        totalPassed: summary.totalPassed,
        totalFailed: summary.totalFailed,
        accuracy: summary.accuracy
    };

    await fs.promises.writeFile(
        path.join(resultsDir, "summary.json"),
        JSON.stringify(compactSummary, null, 2)
    );

    // Write detailed summary with per-test-case accuracy if available
    if (summary.perTestCaseAccuracy) {
        await fs.promises.writeFile(
            path.join(resultsDir, "per-test-case-accuracy.json"),
            JSON.stringify(summary.perTestCaseAccuracy, null, 2)
        );
    }

    // Write field-level accuracy summary
    if (summary.totalFields !== undefined && summary.totalFieldsPassed !== undefined) {
        await fs.promises.writeFile(
            path.join(resultsDir, "field-level-accuracy.json"),
            JSON.stringify({
                totalFields: summary.totalFields,
                totalFieldsPassed: summary.totalFieldsPassed,
                totalFieldsFailed: summary.totalFields - summary.totalFieldsPassed,
                fieldAccuracy: summary.fieldAccuracy
            }, null, 2)
        );
    }

    console.log("Summary persisted to results directory");
}

/**
 * Persists an iteration summary
 */
export async function persistIterationSummary(iterationSummary: IterationSummary, resultsDir: string): Promise<void> {
    const iterationDir = path.join(resultsDir, `iteration_${iterationSummary.iteration}`);
    await fs.promises.mkdir(iterationDir, { recursive: true });

    await fs.promises.writeFile(
        path.join(iterationDir, "iteration-summary.json"),
        JSON.stringify({
            iteration: iterationSummary.iteration,
            totalTests: iterationSummary.totalTests,
            totalPassed: iterationSummary.totalPassed,
            totalFailed: iterationSummary.totalFailed,
            accuracy: iterationSummary.accuracy,
            totalDuration: iterationSummary.totalDuration,
            averageDuration: iterationSummary.averageDuration,
            timestamp: iterationSummary.timestamp
        }, null, 2)
    );

    console.log(`Iteration ${iterationSummary.iteration} summary persisted`);
}
