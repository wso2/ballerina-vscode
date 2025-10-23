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

/**
 * Test case definition for datamapper
 */
export interface TestCase {
    readonly name: string;
    readonly resourcePath: string;
    readonly expectedFunctionName: string;
}

/**
 * Test event result
 */
export interface TestEventResult {
    started: boolean;
    completed: boolean;
    error?: string;
    fileArray?: any[];
    content?: string;
}

/**
 * Individual test assertion result
 */
export interface TestAssertionResult {
    readonly testName: string;
    readonly fieldName: string;
    readonly passed: boolean;
    readonly expected?: string;
    readonly actual?: string;
}

/**
 * Ballerina test result
 */
export interface BalTestResult {
    readonly passed: number;
    readonly failed: number;
    readonly skipped: number;
    readonly total: number;
    readonly output: string;
    readonly success: boolean;
    readonly assertions?: readonly TestAssertionResult[];
}

/**
 * Datamapper test result
 */
export interface DatamapperTestResult {
    readonly testCase: TestCase;
    readonly generationResult: TestEventResult;
    readonly balTestResult?: BalTestResult;
    readonly passed: boolean;
    readonly failureReason?: string;
}
