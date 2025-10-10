// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

import { LLMEvaluationResult } from "../utils/evaluator-utils";

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

/**
 * Source file representation
 */
export interface SourceFile {
    readonly fileName: string;
    readonly content: string;
}

/**
 * Diagnostic message with optional metadata
 */
export interface DiagnosticMessage {
    readonly message: string;
    readonly severity?: string;
    readonly code?: string;
    readonly source?: string;
    readonly range?: {
        readonly start: { line: number; character: number };
        readonly end: { line: number; character: number };
    };
}

/**
 * Tool call event - matches ChatNotify ToolCall from state-machine-types
 */
export interface ToolCallEvent {
    readonly type: "tool_call";
    readonly toolName: string;
}

/**
 * Tool result event - matches ChatNotify ToolResult from state-machine-types
 * Contains the library names returned by the LibraryProviderTool
 */
export interface ToolResultEvent {
    readonly type: "tool_result";
    readonly toolName: string;
    readonly toolOutput: any;
}

/**
 * Evals tool result event - matches ChatNotify EvalsToolResult from state-machine-types
 * Contains the full JSON output from the LibraryProviderTool for debugging
 */
export interface EvalsToolResultEvent {
    readonly type: "evals_tool_result";
    readonly toolName: string;
    readonly output: any;
}

/**
 * Union type for all tool events captured during test execution
 */
export type ToolEvent = ToolCallEvent | ToolResultEvent | EvalsToolResultEvent;

/**
 * Use case execution result
 */
export interface UsecaseResult {
    readonly usecase: string;
    readonly diagnostics: readonly DiagnosticMessage[];
    readonly files: readonly SourceFile[];
    readonly compiled: boolean;
    readonly duration?: number;
    readonly timestamp?: number;
    readonly errorEvents?: readonly string[];
    readonly toolEvents?: readonly ToolEvent[];
    readonly iteration?: number;
    readonly evaluationResult: LLMEvaluationResult;
    readonly usage?: {
        readonly initial: {
            readonly inputTokens: number;
            readonly cacheCreationInputTokens: number;
            readonly cacheReadInputTokens: number;
            readonly outputTokens: number;
        };
        readonly repairs: readonly {
            readonly inputTokens: number;
            readonly cacheCreationInputTokens: number;
            readonly cacheReadInputTokens: number;
            readonly outputTokens: number;
            readonly iteration: number;
        }[];
        readonly overallCachePerformanceValidation?: {
            readonly initialGenerationCheck: "pass" | "warning";
            readonly firstRepairCheck: "pass" | "fail" | "not_applicable";
            readonly subsequentRepairsCheck: "pass" | "warning" | "not_applicable";
            readonly issues: readonly string[];
        };
    };
}


/**
 * Aggregated usage metrics across all test cases
 */
export interface AggregatedUsageMetrics {
    readonly totalUseCases: number;
    readonly initialGeneration: { hits: number; creation: number };
    readonly repairs: {
        readonly [repairIteration: string]: {
            count: number;
            hits: number;
            creation: number;
        };
    };
}

/**
 * Overall cache validation results with performance analysis
 */
export interface OverallCacheValidation {
    readonly initialCacheEfficiency: "pass" | "fail";
    readonly firstRepairAllReads: "pass" | "fail" | "not_applicable";
    readonly subsequentRepairsNoWrites: "pass" | "fail" | "not_applicable";
    readonly overallStatus: "pass" | "fail";
    readonly InitialGenCacheCreation: number;
    readonly repairIterationCounts: {
        readonly [repairIteration: string]: number;
    };
    readonly validationIssues: readonly string[];
}


/**
 * Per-test-case accuracy across iterations
 */
export interface TestCaseAccuracy {
    readonly testCaseIndex: number;
    readonly usecase: string;
    readonly successCount: number;
    readonly totalAttempts: number;
    readonly accuracy: number;
}

/**
 * Iteration-specific summary
 */
export interface IterationSummary {
    readonly iteration: number;
    readonly totalUsecases: number;
    readonly totalCompiled: number;
    readonly totalFailed: number;
    readonly accuracy: number;
    readonly totalDuration: number;
    readonly averageDuration: number;
    readonly timestamp: number;
    readonly results: readonly UsecaseResult[];
    readonly evaluationResult: LLMEvaluationResult;
}

/**
 * Comprehensive summary of all test results
 */
export interface Summary {
    readonly results: readonly UsecaseResult[];
    readonly totalUsecases: number;
    readonly totalCompiled: number;
    readonly totalFailed: number;
    readonly accuracy: number;
    readonly totalDuration: number;
    readonly averageDuration: number;
    readonly timestamp: number;
    readonly iterations?: number;
    readonly iterationResults?: readonly IterationSummary[];
    readonly perTestCaseAccuracy?: readonly TestCaseAccuracy[];
    readonly evaluationSummary: number
    readonly aggregatedUsage?: AggregatedUsageMetrics;
    readonly overallCacheValidation?: OverallCacheValidation;
}

/**
 * Compact summary for persistence
 */
export interface SummaryCompact {
    readonly totalUsecases: number;
    readonly totalCompiled: number;
    readonly totalFailed: number;
    readonly accuracy: number;
    readonly evaluationSummary: number
    readonly aggregatedUsage?: AggregatedUsageMetrics;
    readonly overallCacheValidation?: OverallCacheValidation;
}

/**
 * Compact use case result for persistence
 */
export interface UsecaseCompact {
    readonly usecase: string;
    readonly compiled: boolean;
    readonly duration?: number;
    readonly iteration?: number;
    readonly toolEvents?: readonly ToolEvent[];
    readonly evaluationResult: LLMEvaluationResult;
    readonly usage?: {
        readonly totalTokens: number;
        readonly cacheHits: number;
        readonly cacheCreations: number;
        readonly repairCount: number;
        readonly cacheValidationStatus: "pass" | "warning" | "fail" | "unknown";
    };
}
