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
import { UsecaseResult, Summary, SummaryCompact, UsecaseCompact, IterationSummary } from '../types';
import { BALLERINA_TOML_TEMPLATE, FILES } from '../utils/constants';

/**
 * Persists a single use case result to the file system
 */
export async function persistUsecaseResult(
    usecaseResult: UsecaseResult,
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

    const compactResult: UsecaseCompact = {
        usecase: usecaseResult.usecase,
        compiled: usecaseResult.compiled,
        duration: usecaseResult.duration,
        iteration: usecaseResult.iteration,
        toolEvents: usecaseResult.toolEvents,
        evaluationResult: usecaseResult.evaluationResult,
        usage: usecaseResult.usage ? {
            totalTokens: usecaseResult.usage.initial.inputTokens + usecaseResult.usage.initial.outputTokens +
                        usecaseResult.usage.repairs.reduce((sum, repair) => sum + repair.inputTokens + repair.outputTokens, 0),
            cacheHits: usecaseResult.usage.initial.cacheReadInputTokens +
                      usecaseResult.usage.repairs.reduce((sum, repair) => sum + repair.cacheReadInputTokens, 0),
            cacheCreations: usecaseResult.usage.initial.cacheCreationInputTokens +
                           usecaseResult.usage.repairs.reduce((sum, repair) => sum + repair.cacheCreationInputTokens, 0),
            repairCount: usecaseResult.usage.repairs.length,
            cacheValidationStatus: usecaseResult.usage.overallCachePerformanceValidation?.initialGenerationCheck || 'unknown'
        } : undefined
    };

    await fs.promises.writeFile(
        path.join(resultDir, "result.json"),
        JSON.stringify(compactResult, null, 2)
    );

    await fs.promises.writeFile(
        path.join(resultDir, "diagnostics.json"),
        JSON.stringify(usecaseResult.diagnostics, null, 2)
    );

    if (usecaseResult.errorEvents && usecaseResult.errorEvents.length > 0) {
        await fs.promises.writeFile(
            path.join(resultDir, "errors.json"),
            JSON.stringify(usecaseResult.errorEvents, null, 2)
        );
    }

    // Persist tool events if present
    if (usecaseResult.toolEvents && usecaseResult.toolEvents.length > 0) {
        await fs.promises.writeFile(
            path.join(resultDir, "tool-events.json"),
            JSON.stringify(usecaseResult.toolEvents, null, 2)
        );
    }

    const codeDir = path.join(resultDir, "code");
    await fs.promises.mkdir(codeDir, { recursive: true });

    const ballerinaToml = BALLERINA_TOML_TEMPLATE(index);
    await fs.promises.writeFile(path.join(codeDir, FILES.BALLERINA_TOML), ballerinaToml);

    for (const file of usecaseResult.files) {
        const filePath = path.join(codeDir, file.fileName);
        await fs.promises.writeFile(filePath, file.content);
    }

    console.log(`Result persisted for index ${index}${iteration !== undefined ? ` (iteration ${iteration})` : ''}: ${usecaseResult.usecase}${usecaseResult.errorEvents ? ` (${usecaseResult.errorEvents.length} error events)` : ''}${usecaseResult.toolEvents ? ` (${usecaseResult.toolEvents.length} tool events)` : ''}`);
}

/**
 * Persists summary information to the file system
 */
export async function persistSummary(summary: Summary, resultsDir: string): Promise<void> {
    const compactSummary: SummaryCompact = {
        totalUsecases: summary.totalUsecases,
        totalCompiled: summary.totalCompiled,
        totalFailed: summary.totalFailed,
        accuracy: summary.accuracy,
        evaluationSummary: summary.evaluationSummary,
        aggregatedUsage: summary.aggregatedUsage,
        overallCacheValidation: summary.overallCacheValidation
    };

    await fs.promises.writeFile(
        path.join(resultsDir, "summary.json"),
        JSON.stringify(compactSummary, null, 2)
    );

    await fs.promises.writeFile(
        path.join(resultsDir, "summary_detailed.json"),
        JSON.stringify(summary, null, 2)
    );

    console.log("Summary files saved");
}

/**
 * Persists iteration summary information to the file system
 */
export async function persistIterationSummary(iterationSummary: IterationSummary, resultsDir: string): Promise<void> {
    const iterationDir = path.join(resultsDir, `iteration_${iterationSummary.iteration}`);
    await fs.promises.mkdir(iterationDir, { recursive: true });

    // Create compact summary (without full results)
    const compactSummary: SummaryCompact = {
        totalUsecases: iterationSummary.totalUsecases,
        totalCompiled: iterationSummary.totalCompiled,
        totalFailed: iterationSummary.totalFailed,
        accuracy: iterationSummary.accuracy,
        evaluationSummary: iterationSummary.evaluationResult.rating
    };

    // Save compact summary
    await fs.promises.writeFile(
        path.join(iterationDir, "summary.json"),
        JSON.stringify(compactSummary, null, 2)
    );

    // Save detailed summary with all results
    await fs.promises.writeFile(
        path.join(iterationDir, "summary_detailed.json"),
        JSON.stringify(iterationSummary, null, 2)
    );

    console.log(`Iteration ${iterationSummary.iteration} summary saved: ${iterationSummary.totalCompiled}/${iterationSummary.totalUsecases} passed (${iterationSummary.accuracy}%)`);
}
