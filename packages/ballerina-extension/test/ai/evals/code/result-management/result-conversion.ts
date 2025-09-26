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

import { TestCaseResult, TestUseCase, UsecaseResult, DiagnosticMessage, Summary } from '../types';
import { extractSourceFilesFromContent } from '../utils/content-parser';
import { FILES } from '../utils/constants';

/**
 * Converts TestCaseResult to UsecaseResult format
 */
export function convertTestResultToUsecaseResult(testResult: TestCaseResult): UsecaseResult {
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

    return {
        usecase: testResult.useCase.usecase,
        diagnostics: diagnostics,
        files: files,
        compiled: testResult.passed && diagnostics.length === 0,
        duration: testResult.result.duration,
        timestamp: testResult.result.startTime,
        errorEvents: errorEvents.length > 0 ? errorEvents : undefined
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
        timestamp: Date.now()
    };
}

/**
 * Generates comprehensive summary from use case results
 */
export function generateComprehensiveSummary(results: readonly UsecaseResult[]): Summary {
    const totalUsecases = results.length;
    const totalCompiled = results.filter(r => r.compiled).length;
    const totalFailed = totalUsecases - totalCompiled;
    const accuracy = totalUsecases > 0 ? (totalCompiled * 100) / totalUsecases : 0;
    
    const durations = results.filter(r => r.duration).map(r => r.duration!);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const averageDuration = durations.length > 0 ? totalDuration / durations.length : 0;
    
    return {
        results: results,
        totalUsecases,
        totalCompiled,
        totalFailed,
        accuracy: Math.round(accuracy * 100) / 100,
        totalDuration,
        averageDuration: Math.round(averageDuration),
        timestamp: Date.now()
    };
}
