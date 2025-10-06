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

import { TestCaseResult, TestUseCase, UsecaseResult, DiagnosticMessage, Summary, ToolEvent, ToolCallEvent, ToolResultEvent, EvalsToolResultEvent, IterationSummary, TestCaseAccuracy } from '../types';
import { extractSourceFilesFromContent } from '../utils/content-parser';
import { FILES } from '../utils/constants';

/**
 * Converts TestCaseResult to UsecaseResult format
 */
export function convertTestResultToUsecaseResult(testResult: TestCaseResult, iteration?: number): UsecaseResult {
    const files = extractSourceFilesFromContent(testResult.result.fullContent);

    const diagnostics: DiagnosticMessage[] = testResult.result.diagnostics.map(diag => ({
        message: typeof diag === 'string' ? diag : (diag as { message?: string }).message || diag.toString(),
        severity: (diag as { severity?: string }).severity || 'error',
        code: (diag as { code?: string }).code,
        source: (diag as { source?: string }).source
    }));

    const errorEvents = testResult.result.events
        .filter(event => event.type === 'error')
        .map(event => event.content);

    // Extract tool events - following the same pattern as production event handler
    const toolEvents: ToolEvent[] = testResult.result.events
        .filter(event => event.type === 'tool_call' || event.type === 'tool_result' || event.type === 'evals_tool_result')
        .map(event => {
            if (event.type === 'tool_call') {
                return {
                    type: 'tool_call',
                    toolName: event.toolName
                } as ToolCallEvent;
            } else if (event.type === 'tool_result') {
                return {
                    type: 'tool_result',
                    toolName: event.toolName,
                    libraryNames: event.libraryNames || []
                } as ToolResultEvent;
            } else {
                // evals_tool_result
                return {
                    type: 'evals_tool_result',
                    toolName: event.toolName,
                    output: event.output
                } as EvalsToolResultEvent;
            }
        });

    return {
        usecase: testResult.useCase.usecase,
        diagnostics: diagnostics,
        files: files,
        compiled: testResult.passed && diagnostics.length === 0,
        duration: testResult.result.duration,
        timestamp: testResult.result.startTime,
        evaluationResult: testResult.evaluationResult,
        errorEvents: errorEvents.length > 0 ? errorEvents : undefined,
        toolEvents: toolEvents.length > 0 ? toolEvents : undefined,
        iteration
    };
}

/**
 * Creates a failed UseCase result from error information
 */
export function createFailedUsecaseResult(useCase: TestUseCase, reason: unknown): UsecaseResult {
    const errorMessage = (reason as { message?: string })?.message || 'Unknown error';
    
    return {
        usecase: useCase.usecase,
        diagnostics: [{ message: errorMessage }],
        files: [{ fileName: FILES.ERROR_TXT, content: errorMessage }],
        compiled: false,
        duration: undefined,
        timestamp: Date.now(),
        evaluationResult: { is_correct: false, reasoning: 'Error occurred', rating: 0 }
    };
}

/**
 * Generates comprehensive summary from use case results
 */
export function generateComprehensiveSummary(results: readonly UsecaseResult[], totalIterations?: number): Summary {
    const totalUsecases = results.length;
    const totalCompiled = results.filter(r => r.compiled).length;
    const totalFailed = totalUsecases - totalCompiled;
    const accuracy = totalUsecases > 0 ? (totalCompiled * 100) / totalUsecases : 0;

    const durations = results.filter(r => r.duration).map(r => r.duration!);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const averageDuration = durations.length > 0 ? totalDuration / durations.length : 0;
    const evaluationSummary = results.reduce((sum, r) => sum + (r.evaluationResult == undefined ? 0 : (r.evaluationResult.rating == undefined ? 0 : r.evaluationResult.rating)), 0);

    let iterationResults: IterationSummary[] | undefined;
    let perTestCaseAccuracy: TestCaseAccuracy[] | undefined;

    // Calculate iteration-specific summaries if iterations are present
    if (totalIterations && totalIterations > 1) {
        iterationResults = calculateIterationSummaries(results, totalIterations);
        perTestCaseAccuracy = calculatePerTestCaseAccuracy(results, totalIterations);
    }

    return {
        results: results,
        totalUsecases,
        totalCompiled,
        totalFailed,
        accuracy: Math.round(accuracy * 100) / 100,
        totalDuration,
        averageDuration: Math.round(averageDuration),
        timestamp: Date.now(),
        evaluationSummary: (evaluationSummary / totalUsecases),
        iterations: totalIterations,
        iterationResults,
        perTestCaseAccuracy
    };
}

/**
 * Generates summary for a single iteration
 */
export function generateIterationSummary(iterationResults: readonly UsecaseResult[], iterationNumber: number): IterationSummary {
    const totalUsecases = iterationResults.length;
    const totalCompiled = iterationResults.filter(r => r.compiled).length;
    const totalFailed = totalUsecases - totalCompiled;
    const accuracy = totalUsecases > 0 ? (totalCompiled * 100) / totalUsecases : 0;

    const durations = iterationResults.filter(r => r.duration).map(r => r.duration!);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const averageDuration = durations.length > 0 ? totalDuration / durations.length : 0;

    return {
        iteration: iterationNumber,
        totalUsecases,
        totalCompiled,
        totalFailed,
        accuracy: Math.round(accuracy * 100) / 100,
        totalDuration,
        averageDuration: Math.round(averageDuration),
        timestamp: Date.now(),
        results: iterationResults
    };
}

/**
 * Calculates summary for each iteration
 */
function calculateIterationSummaries(results: readonly UsecaseResult[], totalIterations: number): IterationSummary[] {
    const summaries: IterationSummary[] = [];

    for (let i = 1; i <= totalIterations; i++) {
        const iterationResults = results.filter(r => r.iteration === i);
        const totalUsecases = iterationResults.length;
        const totalCompiled = iterationResults.filter(r => r.compiled).length;
        const totalFailed = totalUsecases - totalCompiled;
        const accuracy = totalUsecases > 0 ? (totalCompiled * 100) / totalUsecases : 0;

        const durations = iterationResults.filter(r => r.duration).map(r => r.duration!);
        const totalDuration = durations.reduce((sum, d) => sum + d, 0);
        const averageDuration = durations.length > 0 ? totalDuration / durations.length : 0;

        summaries.push({
            iteration: i,
            totalUsecases,
            totalCompiled,
            totalFailed,
            accuracy: Math.round(accuracy * 100) / 100,
            totalDuration,
            averageDuration: Math.round(averageDuration),
            timestamp: Date.now(),
            results: iterationResults
        });
    }

    return summaries;
}

/**
 * Calculates per-test-case accuracy across all iterations
 */
function calculatePerTestCaseAccuracy(results: readonly UsecaseResult[], totalIterations: number): TestCaseAccuracy[] {
    // Group results by test case index (assuming results are ordered)
    const testCaseCount = results.length / totalIterations;
    const accuracyMap: Map<number, TestCaseAccuracy> = new Map();

    for (let testIndex = 0; testIndex < testCaseCount; testIndex++) {
        const testResults = results.filter((_, idx) => idx % testCaseCount === testIndex);
        const successCount = testResults.filter(r => r.compiled).length;
        const accuracy = (successCount * 100) / totalIterations;

        accuracyMap.set(testIndex, {
            testCaseIndex: testIndex,
            usecase: testResults[0]?.usecase || '',
            successCount,
            totalAttempts: totalIterations,
            accuracy: Math.round(accuracy * 100) / 100
        });
    }

    return Array.from(accuracyMap.values());
}
