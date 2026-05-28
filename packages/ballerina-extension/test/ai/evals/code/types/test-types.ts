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

import { ChatNotify, CodeContext, FileAttatchment, OperationType, SourceFile } from "@wso2/ballerina-core";
import { LLMEvaluationResult } from "../utils/evaluator-utils";

/**
 * Test use case definition
 */
export interface TestUseCase {
    readonly id: string;
    readonly description: string;
    readonly usecase: string;
    readonly projectPath: string;
    readonly operationType: OperationType;
    readonly fileAttachments?: readonly FileAttatchment[];
    readonly isPlanMode?: boolean;
    readonly codeContext?: CodeContext;
}

/**
 * Normalized token usage record (using camelCase for consistency)
 */
export interface TokenUsageRecord {
    readonly inputTokens: number;
    readonly cacheCreationInputTokens: number;
    readonly cacheReadInputTokens: number;
    readonly outputTokens: number;
}

/**
 * Enhanced repair tracking with iteration context
 */
export interface RepairUsageRecord extends TokenUsageRecord {
    readonly iteration: number;
}

/**
 * Complete usage tracking for a test case with cache analysis
 */
export interface UsageTracking {
    readonly initial: TokenUsageRecord;
    readonly repairs: readonly RepairUsageRecord[];
    readonly overallCachePerformanceValidation: {
        readonly initialGenerationCheck: "pass" | "warning";
        readonly firstRepairCheck: "pass" | "fail" | "not_applicable";
        readonly subsequentRepairsCheck: "pass" | "warning" | "not_applicable";
        readonly issues: readonly string[];
    };
}

/**
 * Usage metrics for AI operations
 */
export interface UsageMetrics {
    readonly usage?: UsageTracking;
}

/**
 * Cache operation counts for a specific phase
 */
export interface CacheOperationCounts {
    readonly hits: number;
    readonly creation: number;
}

/**
 * Aggregated cache usage summary across multiple use cases
 */
export interface AggregatedCacheUsageSummary {
    readonly totalUseCases: number;
    readonly initialGeneration: CacheOperationCounts;
    readonly repairs: {
        readonly [repairIteration: string]: CacheOperationCounts;
    };
}

/**
 * Test event result containing all information captured during test execution
 */
export interface TestEventResult {
    readonly events: readonly ChatNotify[];
    readonly fullContent: string;
    readonly hasStarted: boolean;
    readonly hasCompleted: boolean;
    readonly errorOccurred: string | null;
    readonly diagnostics: readonly unknown[];
    readonly messages: readonly unknown[];
    readonly useCase?: TestUseCase;
    readonly startTime?: number;
    readonly endTime?: number;
    readonly duration?: number;
    readonly usageMetrics?: UsageMetrics;
}

/**
 * Individual test case result with validation details
 */
export interface TestCaseResult {
    readonly useCase: TestUseCase;
    readonly result: TestEventResult;
    readonly passed: boolean;
    readonly failureReason?: string;
    readonly validationDetails?: {
        readonly noErrorCheck: boolean;
        readonly noDiagnosticsCheck: boolean;
    };
    readonly evaluationResult?: LLMEvaluationResult;
    readonly generatedSources?: readonly SourceFile[];
}
