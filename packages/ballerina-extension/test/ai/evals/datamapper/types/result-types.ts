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

import { BalTestResult } from "./test-types";

/**
 * Field-level accuracy tracking
 */
export interface FieldAccuracy {
    readonly fieldName: string;
    readonly testName: string;
    readonly passed: boolean;
    readonly expected?: string;
    readonly actual?: string;
}

/**
 * Datamapper use case result
 */
export interface DatamapperUsecaseResult {
    readonly testName: string;
    readonly balTestResult: BalTestResult;
    readonly passed: boolean;
    readonly duration?: number;
    readonly timestamp?: number;
    readonly failureReason?: string;
    readonly iteration?: number;
    readonly fieldResults?: readonly FieldAccuracy[];
}

/**
 * Per-test-case accuracy across iterations
 */
export interface TestCaseAccuracy {
    readonly testCaseIndex: number;
    readonly testName: string;
    readonly successCount: number;
    readonly totalAttempts: number;
    readonly accuracy: number;
}

/**
 * Iteration-specific summary
 */
export interface IterationSummary {
    readonly iteration: number;
    readonly totalTests: number;
    readonly totalPassed: number;
    readonly totalFailed: number;
    readonly accuracy: number;
    readonly totalDuration: number;
    readonly averageDuration: number;
    readonly timestamp: number;
    readonly results: readonly DatamapperUsecaseResult[];
}

/**
 * Comprehensive summary of all datamapper test results
 */
export interface Summary {
    readonly results: readonly DatamapperUsecaseResult[];
    readonly totalTests: number;
    readonly totalPassed: number;
    readonly totalFailed: number;
    readonly accuracy: number;
    readonly totalDuration: number;
    readonly averageDuration: number;
    readonly timestamp: number;
    readonly iterations?: number;
    readonly iterationResults?: readonly IterationSummary[];
    readonly perTestCaseAccuracy?: readonly TestCaseAccuracy[];
    readonly totalFields?: number;
    readonly totalFieldsPassed?: number;
    readonly fieldAccuracy?: number;
}

/**
 * Compact summary for persistence
 */
export interface SummaryCompact {
    readonly totalTests: number;
    readonly totalPassed: number;
    readonly totalFailed: number;
    readonly accuracy: number;
}
