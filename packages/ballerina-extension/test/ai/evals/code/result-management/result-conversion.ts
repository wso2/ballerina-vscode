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

import { TestCaseResult, TestUseCase, UsecaseResult, DiagnosticMessage, Summary, ToolEvent, ToolCallEvent, ToolResultEvent, EvalsToolResultEvent, IterationSummary, TestCaseAccuracy, AggregatedUsageMetrics } from '../types';
import { extractSourceFilesFromContent } from '../utils/content-parser';
import { FILES } from '../utils/constants';

/**
 * Converts TestCaseResult to UsecaseResult format
 */
export function convertTestResultToUsecaseResult(testResult: TestCaseResult, iteration?: number): UsecaseResult {
    // Use generatedSources if available (actual .bal files from filesystem),
    // otherwise fall back to parsing fullContent (backward compatibility)
    const files = testResult.generatedSources
        ? testResult.generatedSources.map(sf => ({
            fileName: sf.filePath,  // Convert filePath to fileName for result types
            content: sf.content
          }))
        : extractSourceFilesFromContent(testResult.result.fullContent);

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
                    type: "tool_result",
                    toolName: event.toolName,
                    toolOutput: event.toolOutput,
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
        iteration,
        usage: testResult.result.usageMetrics?.usage
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

    // Calculate average rating from evaluation results
    const totalRating = results.reduce((sum, r) => sum + (r.evaluationResult?.rating ?? 0), 0);
    const averageRating = totalUsecases > 0 ? totalRating / totalUsecases : 0;

    let iterationResults: IterationSummary[] | undefined;
    let perTestCaseAccuracy: TestCaseAccuracy[] | undefined;

    // Calculate iteration-specific summaries if iterations are present
    if (totalIterations && totalIterations > 1) {
        iterationResults = calculateIterationSummaries(results, totalIterations);
        perTestCaseAccuracy = calculatePerTestCaseAccuracy(results, totalIterations);
    }


    const aggregatedUsage = calculateAggregatedUsage(results);
    const overallCacheValidation = calculateOverallCacheValidation(results, aggregatedUsage);

    return {
        results: results,
        totalUsecases,
        totalCompiled,
        totalFailed,
        accuracy: Math.round(accuracy * 100) / 100,
        totalDuration,
        averageDuration: Math.round(averageDuration),
        timestamp: Date.now(),
        evaluationSummary: averageRating,
        iterations: totalIterations,
        iterationResults,
        perTestCaseAccuracy,
        aggregatedUsage,
        overallCacheValidation
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

    // Calculate average rating from evaluation results
    const totalRating = iterationResults.reduce((sum, r) => sum + (r.evaluationResult?.rating ?? 0), 0);
    const averageRating = totalUsecases > 0 ? totalRating / totalUsecases : 0;

    return {
        iteration: iterationNumber,
        totalUsecases,
        totalCompiled,
        totalFailed,
        accuracy: Math.round(accuracy * 100) / 100,
        totalDuration,
        averageDuration: Math.round(averageDuration),
        timestamp: Date.now(),
        results: iterationResults,
        evaluationResult: {
            is_correct: totalCompiled === totalUsecases,
            reasoning: `${totalCompiled}/${totalUsecases} tests compiled successfully`,
            rating: averageRating
        }
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

        // Calculate average rating from evaluation results
        const totalRating = iterationResults.reduce((sum, r) => sum + (r.evaluationResult?.rating ?? 0), 0);
        const averageRating = totalUsecases > 0 ? totalRating / totalUsecases : 0;

        summaries.push({
            iteration: i,
            totalUsecases,
            totalCompiled,
            totalFailed,
            accuracy: Math.round(accuracy * 100) / 100,
            totalDuration,
            averageDuration: Math.round(averageDuration),
            timestamp: Date.now(),
            results: iterationResults,
            evaluationResult: {
                is_correct: totalCompiled === totalUsecases,
                reasoning: `${totalCompiled}/${totalUsecases} tests compiled successfully`,
                rating: averageRating
            }
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


/**
 * Calculates aggregated usage metrics from all results
 */
function calculateAggregatedUsage(results: readonly UsecaseResult[]): AggregatedUsageMetrics | undefined {
    const resultsWithUsage = results.filter(r => r.usage);

    if (resultsWithUsage.length === 0) {
        return undefined;
    }

    const totalUseCases = resultsWithUsage.length;

    // Track initial generation cache stats
    let initialHits = 0;
    let initialCreations = 0;

    // Track repair stats by iteration
    const repairStats: { [iteration: number]: { count: number; hits: number; creation: number } } = {};
    const repairCounts: { [iteration: number]: Set<string> } = {}; // Track which use cases reached each repair

    for (const result of resultsWithUsage) {
        if (result.usage) {
            // Count initial generation cache usage
            if (result.usage.initial.cacheReadInputTokens > 0) {
                initialHits++;
            }
            if (result.usage.initial.cacheCreationInputTokens > 0) {
                initialCreations++;
            }

            // Count repair cache usage by iteration
            result.usage.repairs.forEach((repair) => {
                const iteration = repair.iteration;
                const useCaseKey = result.usecase; // Use usecase as unique identifier

                if (!repairStats[iteration]) {
                    repairStats[iteration] = { count: 0, hits: 0, creation: 0 };
                }
                if (!repairCounts[iteration]) {
                    repairCounts[iteration] = new Set();
                }

                // Track which use cases reached this repair iteration
                repairCounts[iteration].add(useCaseKey);

                if (repair.cacheReadInputTokens > 0) {
                    repairStats[iteration].hits++;
                }
                if (repair.cacheCreationInputTokens > 0) {
                    repairStats[iteration].creation++;
                }
            });
        }
    }

    // Update count based on unique use cases that reached each repair iteration
    Object.keys(repairStats).forEach(iteration => {
        const iterationNum = parseInt(iteration);
        repairStats[iterationNum].count = repairCounts[iterationNum]?.size || 0;
    });

    // Build the repairs object with dynamic repair keys
    const repairs: { [repairIteration: string]: { count: number; hits: number; creation: number } } = {};
    Object.keys(repairStats).forEach(iteration => {
        const repairKey = `repair${iteration}`;
        repairs[repairKey] = repairStats[parseInt(iteration)];
    });

    return {
        totalUseCases,
        initialGeneration: {
            hits: initialHits,
            creation: initialCreations
        },
        repairs
    };
}

/**
 * Calculate comprehensive cache validation across all use cases
 */
function calculateOverallCacheValidation(results: readonly UsecaseResult[], aggregatedUsage?: AggregatedUsageMetrics) {
    if (!aggregatedUsage) {
        return undefined;
    }

    // 1. Initial generation validation: No more than 1 use case should create fresh cache
    const InitialGenCacheCreation = aggregatedUsage.initialGeneration.creation;
    const initialGenerationValidation: "pass" | "fail" = InitialGenCacheCreation > 1 ? "fail" : "pass";

    // 2. First repair validation: All use cases should have cache reads (can have writes)
    const firstRepairStats = aggregatedUsage.repairs.repair1;
    let firstRepairValidation: "pass" | "fail" | "not_applicable" = "not_applicable";
    if (firstRepairStats) {
        firstRepairValidation = firstRepairStats.hits === firstRepairStats.count ? "pass" : "fail";
    }
    // 3. Subsequent repairs validation: Should not have any cache writes
    let subsequentRepairsValidation: "pass" | "fail" | "not_applicable" = "not_applicable";
    const subsequentRepairKeys = Object.keys(aggregatedUsage.repairs)
        .filter(key => key !== 'repair1')
        .sort((a, b) => {
            const aNum = parseInt(a.replace('repair', ''));
            const bNum = parseInt(b.replace('repair', ''));
            return aNum - bNum;
        });

    if (subsequentRepairKeys.length > 0) {
        const hasSubsequentWrites = subsequentRepairKeys.some(key =>
            aggregatedUsage.repairs[key].creation > 0
        );
        subsequentRepairsValidation = hasSubsequentWrites ? "fail" : "pass";
    }

    // Build repair iteration counts
    const repairIterationCounts: { [repairIteration: string]: number } = {};
    Object.entries(aggregatedUsage.repairs).forEach(([repairKey, repairData]) => {
        repairIterationCounts[repairKey] = repairData.count;
    });

    // Collect validation issues
    const validationIssues: string[] = [];
    if (initialGenerationValidation === "fail") {
        validationIssues.push(`Multiple use cases (${InitialGenCacheCreation}) creating fresh cache in initial generation - indicates poor cache pre-warming`);
    }
    if (firstRepairValidation === "fail") {
        validationIssues.push(`First repair iteration has cache reads less than use cases that reached it (${firstRepairStats?.hits}/${firstRepairStats?.count}) - all should have reads`);
    }
    if (subsequentRepairsValidation === "fail") {
        const writeCounts = subsequentRepairKeys.map(key =>
            `${key}: ${aggregatedUsage.repairs[key].creation}`
        ).filter(count => !count.endsWith(': 0'));
        validationIssues.push(`Subsequent repairs have cache writes - ${writeCounts.join(', ')}`);
    }

    // Overall status
    const overallStatus: "pass" | "fail" = (initialGenerationValidation === "fail" ||
                                           firstRepairValidation === "fail" ||
                                           subsequentRepairsValidation === "fail") ? "fail" : "pass";

    return {
        initialCacheEfficiency: initialGenerationValidation,
        firstRepairAllReads: firstRepairValidation,
        subsequentRepairsNoWrites: subsequentRepairsValidation,
        overallStatus,
        InitialGenCacheCreation,
        repairIterationCounts,
        validationIssues
    };
}
