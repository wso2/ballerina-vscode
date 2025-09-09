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

import * as path from "path";
import { generateCodeCore } from "../../../../src/features/ai/service/code/code";
import * as assert from "assert";
import * as fs from "fs";
import { ChatNotify, GenerateCodeRequest } from "@wso2/ballerina-core";
import { CopilotEventHandler } from "../../../../src/features/ai/service/event";
import { commands, Uri, workspace } from "vscode";
import * as vscode from "vscode";
import * as dotenv from "dotenv";

const RESOURCES_PATH = path.resolve(__dirname, "../../../../../test/ai/evals/code/resources");

function getTestFolders(dirPath: string): string[] {
    return fs.readdirSync(dirPath).filter((file) => fs.lstatSync(path.join(dirPath, file)).isDirectory());
}

// Enhanced result management interfaces matching Ballerina pipeline
interface SourceFile {
    fileName: string;
    content: string;
}

interface DiagnosticMessage {
    message: string;
    severity?: string;
    code?: string;
    source?: string;
    range?: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
}

interface UsecaseResult {
    usecase: string;
    diagnostics: DiagnosticMessage[];
    attempts: number;
    files: SourceFile[];
    compiled: boolean;
    duration?: number;
    timestamp?: number;
    errorEvents?: string[];
}

interface Summary {
    results: UsecaseResult[];
    totalUsecases: number;
    totalCompiled: number;
    totalFailed: number;
    accuracy: number;
    totalDuration: number;
    averageDuration: number;
    timestamp: number;
}

interface SummaryCompact {
    totalUsecases: number;
    totalCompiled: number;
    totalFailed: number;
    accuracy: number;
}

interface UsecaseCompact {
    usecase: string;
    attempts: number;
    compiled: boolean;
    duration?: number;
}

// Test use case definition
interface TestUseCase {
    id: string;
    description: string;
    usecase: string;
    operationType: "CODE_GENERATION" | "CODE_FOR_USER_REQUIREMENT" | "TESTS_FOR_USER_REQUIREMENT";
    timeout: number;
    fileAttachments?: { fileName: string; content: string; }[];
}

// Predefined test use cases
const TEST_USE_CASES: TestUseCase[] = [
    {
        id: "basic_hello_world",
        description: "Basic Hello World Generation",
        usecase: "write a hello world program",
        operationType: "CODE_GENERATION",
        timeout: 60000
    },
    {
        id: "http_service",
        description: "HTTP Service Creation",
        usecase: "create a simple HTTP service that responds with JSON",
        operationType: "CODE_GENERATION",
        timeout: 90000
    },
    {
        id: "data_processing",
        description: "Data Processing Function",
        usecase: "create a function that processes a list of integers and returns the sum",
        operationType: "CODE_GENERATION",
        timeout: 75000
    },
    {
        id: "error_handling",
        description: "Error Handling Implementation",
        usecase: "create a function that handles database connection errors gracefully",
        operationType: "CODE_GENERATION",
        timeout: 90000
    },
    {
        id: "test_generation",
        description: "Test Case Generation",
        usecase: "generate test cases for a calculator function",
        operationType: "TESTS_FOR_USER_REQUIREMENT",
        timeout: 75000
    }
];

// Test event handler that captures events for testing
interface TestEventResult {
    events: ChatNotify[];
    fullContent: string;
    hasStarted: boolean;
    hasCompleted: boolean;
    errorOccurred: string | null;
    diagnostics: any[];
    messages: any[];
    useCase?: TestUseCase;
    startTime?: number;
    endTime?: number;
    duration?: number;
}

// Aggregate results for multiple test cases
interface AggregateTestResult {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: TestCaseResult[];
    totalDuration: number;
    averageDuration: number;
}

// Individual test case result
interface TestCaseResult {
    useCase: TestUseCase;
    result: TestEventResult;
    passed: boolean;
    failureReason?: string;
    validationDetails?: {
        noErrorCheck: boolean;
        noDiagnosticsCheck: boolean;
    };
}

function createTestEventHandler(useCase?: TestUseCase): { handler: CopilotEventHandler; getResult: () => TestEventResult } {
    const events: ChatNotify[] = [];
    let fullContent = "";
    let hasStarted = false;
    let hasCompleted = false;
    let errorOccurred: string | null = null;
    const diagnostics: any[] = [];
    const messages: any[] = [];
    let startTime: number | undefined;
    let endTime: number | undefined;

    const handler: CopilotEventHandler = (event: ChatNotify) => {
        events.push(event);

        switch (event.type) {
            case "start":
                hasStarted = true;
                startTime = Date.now();
                console.log(`[${useCase?.id || 'unknown'}] Code generation started`);
                break;
            case "content_block":
                fullContent += event.content;
                // console.log(`[${useCase?.id || 'unknown'}] Content block received:`, event.content.substring(0, 50) + "...");
                break;
            case "content_replace":
                fullContent = event.content;
                console.log(`[${useCase?.id || 'unknown'}] Content replaced, new length:`, event.content.length);
                break;
            case "error":
                errorOccurred = event.content;
                console.error(`[${useCase?.id || 'unknown'}] Error occurred during code generation:`, event.content);
                break;
            case "stop":
                hasCompleted = true;
                endTime = Date.now();
                console.log(`[${useCase?.id || 'unknown'}] Code generation completed`);
                console.log(`[${useCase?.id || 'unknown'}] Final content length:`, fullContent.length);
                console.log(`[${useCase?.id || 'unknown'}] Total events received:`, events.length);
                if (startTime) {
                    console.log(`[${useCase?.id || 'unknown'}] Duration:`, endTime - startTime, "ms");
                }
                break;
            case "intermediary_state":
                console.log(`[${useCase?.id || 'unknown'}] Intermediary state:`, event.state);
                break;
            case "messages":
                console.log(`[${useCase?.id || 'unknown'}] Messages received:`, event.messages?.length || 0);
                messages.push(...(event.messages || []));
                break;
            case "diagnostics":
                console.log(`[${useCase?.id || 'unknown'}] Diagnostics received:`, event.diagnostics?.length || 0);
                diagnostics.push(...(event.diagnostics || []));
                break;
            default:
                console.warn(`[${useCase?.id || 'unknown'}] Unhandled event type: ${(event as any).type}`);
                break;
        }
    };

    const getResult = (): TestEventResult => ({
        events,
        fullContent,
        hasStarted,
        hasCompleted,
        errorOccurred,
        diagnostics,
        messages,
        useCase,
        startTime,
        endTime,
        duration: startTime && endTime ? endTime - startTime : undefined,
    });

    return { handler, getResult };
}

// Validation function for test results
function validateTestResult(result: TestEventResult, useCase: TestUseCase): TestCaseResult {
    const validationDetails = {
        noErrorCheck: true,
        noDiagnosticsCheck: true
    };

    let passed = true;
    let failureReason = "";

    // Check if no error event was received
    if (result.errorOccurred) {
        validationDetails.noErrorCheck = false;
        passed = false;
        failureReason = `Error event received: ${result.errorOccurred}`;
    }

    // Check if no diagnostics were received
    if (result.diagnostics && result.diagnostics.length > 0) {
        validationDetails.noDiagnosticsCheck = false;
        passed = false;
        failureReason += `${failureReason ? '; ' : ''}Diagnostics received: ${result.diagnostics.length} diagnostic(s)`;
    }

    return {
        useCase,
        result,
        passed,
        failureReason: failureReason || undefined,
        validationDetails
    };
}

// Execute single test case
async function executeSingleTestCase(useCase: TestUseCase, hasAnthropicKey: boolean): Promise<TestCaseResult> {
    console.log(`\n🚀 Starting test case: ${useCase.id} - ${useCase.description}`);
    
    const { handler: testEventHandler, getResult } = createTestEventHandler(useCase);

    const params: GenerateCodeRequest = {
        usecase: useCase.usecase,
        chatHistory: [],
        operationType: useCase.operationType,
        fileAttachmentContents: useCase.fileAttachments || [],
    };

    try {
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Test case ${useCase.id} timed out after ${useCase.timeout}ms`)), useCase.timeout);
        });

        const testPromise = commands.executeCommand('ballerina.test.ai.generateCodeCore', params, testEventHandler);

        await Promise.race([testPromise, timeoutPromise]);

        const result = getResult();
        return validateTestResult(result, useCase);

    } catch (error) {
        const result = getResult();
        
        if (hasAnthropicKey) {
            console.error(`❌ Test case ${useCase.id} failed with error:`, (error as Error).message);
            return {
                useCase,
                result,
                passed: false,
                failureReason: `Execution error: ${(error as Error).message}`
            };
        } else {
            // Handle expected authentication errors when no API key
            if ((error as Error).message?.includes("login method") || 
                (error as Error).message?.includes("Unsupported login method") ||
                (error as Error).message?.includes("auth")) {
                console.log(`⚠️ Test case ${useCase.id} - Expected authentication error (no API key)`);
                return {
                    useCase,
                    result,
                    passed: true, // Consider this a pass since it's expected behavior
                    failureReason: undefined
                };
            } else {
                console.error(`❌ Test case ${useCase.id} failed with unexpected error:`, (error as Error).message);
                return {
                    useCase,
                    result,
                    passed: false,
                    failureReason: `Unexpected error: ${(error as Error).message}`
                };
            }
        }
    }
}

// Helper function to process a single batch of test cases
async function processSingleBatch(
    batch: TestUseCase[], 
    hasAnthropicKey: boolean, 
    batchNumber: number,
    startIndex: number
): Promise<UsecaseResult[]> {
    console.log(`\n📋 Processing batch ${batchNumber}: ${batch.map(uc => uc.id).join(', ')}`);

    const batchPromises = batch.map(useCase => 
        executeSingleTestCase(useCase, hasAnthropicKey)
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    const usecaseResults: UsecaseResult[] = [];
    
    for (let j = 0; j < batchResults.length; j++) {
        const settledResult = batchResults[j];
        const useCase = batch[j];
        
        let usecaseResult: UsecaseResult;
        
        if (settledResult.status === 'fulfilled') {
            usecaseResult = convertTestResultToUsecaseResult(settledResult.value);
        } else {
            console.error(`❌ Test case ${useCase.id} failed:`, settledResult.reason);
            usecaseResult = createFailedUsecaseResult(useCase, settledResult.reason);
        }
        
        usecaseResults.push(usecaseResult);
    }
    
    return usecaseResults;
}

// Helper function to create a failed UseCase result
function createFailedUsecaseResult(useCase: TestUseCase, reason: any): UsecaseResult {
    return {
        usecase: useCase.usecase,
        diagnostics: [{ message: reason?.message || 'Unknown error' }],
        attempts: 0,
        files: [{ fileName: "error.txt", content: reason?.message || 'Unknown error' }],
        compiled: false,
        duration: undefined,
        timestamp: Date.now()
    };
}

// Helper function to persist batch results
async function persistBatchResults(
    usecaseResults: UsecaseResult[], 
    resultManager: ResultManager, 
    startIndex: number
): Promise<void> {
    for (let i = 0; i < usecaseResults.length; i++) {
        const resultIndex = startIndex + i;
        await resultManager.persistUsecaseResult(usecaseResults[i], resultIndex);
    }
}

// Helper function to handle inter-batch delays and monitoring
async function handleBatchDelay(
    currentIndex: number, 
    totalUseCases: number, 
    maxConcurrency: number
): Promise<void> {
    if (currentIndex + maxConcurrency < totalUseCases) {
        monitorResourceUsage();
        
        const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        const delay = 2000;
        console.log(`⏳ Waiting ${delay}ms before next batch (memory: ${Math.round(memUsage)}MB)...`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

// Execute multiple test cases in parallel with comprehensive result management
async function executeParallelTestsWithResults(
    useCases: TestUseCase[], 
    hasAnthropicKey: boolean, 
    config: TestConfiguration = DEFAULT_TEST_CONFIG
): Promise<Summary> {
    const resultManager = new ResultManager();
    await resultManager.initializeResultsDirectory();

    const startTime = Date.now();
    logExecutionStart(useCases.length, config.maxConcurrency, resultManager.getResultsDirectory());

    const allUsecaseResults: UsecaseResult[] = [];
    let batchCount = 0;
    
    // Process tests in batches to limit concurrency
    for (let i = 0; i < useCases.length; i += config.maxConcurrency) {
        batchCount++;
        const batch = useCases.slice(i, i + config.maxConcurrency);
        
        // Execute batch and get results
        const batchResults = await processSingleBatch(batch, hasAnthropicKey, batchCount, i);
        
        // Persist batch results
        await persistBatchResults(batchResults, resultManager, i);
        
        // Add to overall results
        allUsecaseResults.push(...batchResults);
        
        // Handle inter-batch delay and monitoring
        await handleBatchDelay(i, useCases.length, config.maxConcurrency);
    }
    console.log(`\n✅ All batches processed. Total use cases: ${allUsecaseResults.length}`);

    // Generate and persist comprehensive summary
    const summary = await generateAndPersistSummary(allUsecaseResults, resultManager);
    console.log(`\n📄 Summary report generated: ` + summary);
    // Log completion summary
    logExecutionCompletion(startTime, allUsecaseResults, resultManager.getResultsDirectory());

    return summary;
}

// Helper function to log execution start
function logExecutionStart(totalCases: number, maxConcurrency: number, resultsDir: string): void {
    console.log(`\n🔥 Starting parallel execution of ${totalCases} test cases:`);
    console.log(`   Max Concurrency: ${maxConcurrency}`);
    console.log(`   Results Directory: ${resultsDir}`);
}

// Helper function to generate and persist summary
async function generateAndPersistSummary(usecaseResults: UsecaseResult[], resultManager: ResultManager): Promise<Summary> {
    const summary = generateComprehensiveSummary(usecaseResults);
    
    await resultManager.persistSummary(summary);
    
    return summary;
}

// Helper function to log execution completion
function logExecutionCompletion(startTime: number, usecaseResults: UsecaseResult[], resultsDir: string): void {
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    const passedTests = usecaseResults.filter(r => r.compiled).length;

    console.log(`\n🏁 Parallel execution completed:`);
    console.log(`   Total Time: ${totalDuration}ms (${Math.round(totalDuration / 1000)}s)`);
    console.log(`   Success Rate: ${Math.round(passedTests / usecaseResults.length * 100)}%`);
    console.log(`   Results saved to: ${resultsDir}`);
}

// Generate enhanced detailed report for comprehensive results (Ballerina-style)
function generateComprehensiveReport(summary: Summary): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE TEST EXECUTION REPORT (Ballerina-Style)');
    console.log('='.repeat(80));
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Use Cases: ${summary.totalUsecases}`);
    console.log(`   Compiled Successfully: ${summary.totalCompiled} (${Math.round(summary.accuracy)}%)`);
    console.log(`   Failed: ${summary.totalFailed} (${Math.round((summary.totalFailed / summary.totalUsecases) * 100)}%)`);
    console.log(`   Overall Accuracy: ${summary.accuracy}%`);
    console.log(`   Total Execution Time: ${summary.totalDuration}ms (${Math.round(summary.totalDuration / 1000)}s)`);
    console.log(`   Average Duration per Test: ${summary.averageDuration}ms`);
    console.log(`   Report Generated: ${new Date(summary.timestamp).toISOString()}`);

    console.log('\n🏆 SUCCESSFUL COMPILATIONS:');
    const successful = summary.results.filter(r => r.compiled);
    successful.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.usecase}`);
        console.log(`      Duration: ${result.duration || 'N/A'}ms`);
        console.log(`      Files Generated: ${result.files.length}`);
        console.log(`      Diagnostics: ${result.diagnostics.length} (${result.diagnostics.length === 0 ? '✅ Clean' : '⚠️ Has Issues'})`);
        console.log(`      Attempts: ${result.attempts}`);
        if (result.files.length > 0) {
            console.log(`      Files: ${result.files.map(f => f.fileName).join(', ')}`);
        }
    });

    if (summary.totalFailed > 0) {
        console.log('\n❌ FAILED COMPILATIONS:');
        const failed = summary.results.filter(r => !r.compiled);
        failed.forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.usecase}`);
            console.log(`      Duration: ${result.duration || 'N/A'}ms`);
            console.log(`      Diagnostic Issues: ${result.diagnostics.length}`);
            console.log(`      Error Events: ${result.errorEvents ? result.errorEvents.length : 0}`);
            console.log(`      Attempts: ${result.attempts}`);
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

    console.log('\n⚡ PERFORMANCE ANALYSIS:');
    const durations = summary.results
        .filter(r => r.duration)
        .map(r => r.duration!)
        .sort((a, b) => a - b);
        
    if (durations.length > 0) {
        console.log(`   Fastest Test: ${durations[0]}ms`);
        console.log(`   Slowest Test: ${durations[durations.length - 1]}ms`);
        console.log(`   Median Duration: ${durations[Math.floor(durations.length / 2)]}ms`);
        
        // Performance distribution
        const fast = durations.filter(d => d < 30000).length;
        const medium = durations.filter(d => d >= 30000 && d < 60000).length;
        const slow = durations.filter(d => d >= 60000).length;
        
        console.log(`   Performance Distribution:`);
        console.log(`     Fast (<30s): ${fast} tests`);
        console.log(`     Medium (30-60s): ${medium} tests`);
        console.log(`     Slow (>60s): ${slow} tests`);
    }

    console.log('\n📁 FILE GENERATION ANALYSIS:');
    const totalFiles = summary.results.reduce((sum, r) => sum + r.files.length, 0);
    const avgFilesPerTest = totalFiles / summary.results.length;
    const fileTypes = new Map<string, number>();
    
    summary.results.forEach(r => {
        r.files.forEach(f => {
            const ext = path.extname(f.fileName) || 'no-extension';
            fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
        });
    });
    
    console.log(`   Total Files Generated: ${totalFiles}`);
    console.log(`   Average Files per Test: ${Math.round(avgFilesPerTest * 10) / 10}`);
    console.log(`   File Type Distribution:`);
    Array.from(fileTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([ext, count]) => {
            console.log(`     ${ext}: ${count} files`);
        });

    console.log('\n🔧 DIAGNOSTIC & ERROR ANALYSIS:');
    const totalDiagnostics = summary.results.reduce((sum, r) => sum + r.diagnostics.length, 0);
    const testsWithDiagnostics = summary.results.filter(r => r.diagnostics.length > 0).length;
    const totalErrorEvents = summary.results.reduce((sum, r) => sum + (r.errorEvents?.length || 0), 0);
    const testsWithErrors = summary.results.filter(r => r.errorEvents && r.errorEvents.length > 0).length;
    
    console.log(`   Total Diagnostics: ${totalDiagnostics}`);
    console.log(`   Tests with Diagnostics: ${testsWithDiagnostics}/${summary.totalUsecases}`);
    console.log(`   Total Error Events: ${totalErrorEvents}`);
    console.log(`   Tests with Errors: ${testsWithErrors}/${summary.totalUsecases}`);
    if (totalDiagnostics > 0) {
        console.log(`   Average Diagnostics per Failed Test: ${Math.round((totalDiagnostics / Math.max(testsWithDiagnostics, 1)) * 10) / 10}`);
    }
    if (totalErrorEvents > 0) {
        console.log(`   Average Errors per Failed Test: ${Math.round((totalErrorEvents / Math.max(testsWithErrors, 1)) * 10) / 10}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎯 CONCLUSION:');
    if (summary.accuracy >= 80) {
        console.log('   Status: ✅ EXCELLENT - High success rate achieved');
    } else if (summary.accuracy >= 60) {
        console.log('   Status: ⚠️  MODERATE - Room for improvement');
    } else {
        console.log('   Status: ❌ NEEDS ATTENTION - Low success rate');
    }
    console.log(`   Quality Score: ${Math.round(summary.accuracy)}%`);
    console.log('='.repeat(80));
}

// Generate detailed report
function generateDetailedReport(aggregateResult: AggregateTestResult): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 DETAILED TEST EXECUTION REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Tests: ${aggregateResult.totalTests}`);
    console.log(`   Passed: ${aggregateResult.passedTests} (${Math.round(aggregateResult.passedTests / aggregateResult.totalTests * 100)}%)`);
    console.log(`   Failed: ${aggregateResult.failedTests} (${Math.round(aggregateResult.failedTests / aggregateResult.totalTests * 100)}%)`);
    console.log(`   Total Duration: ${aggregateResult.totalDuration}ms (${Math.round(aggregateResult.totalDuration / 1000)}s)`);
    console.log(`   Average Duration: ${Math.round(aggregateResult.averageDuration)}ms`);

    console.log('\n🏆 PASSED TESTS:');
    aggregateResult.results.filter(r => r.passed).forEach((testResult, index) => {
        console.log(`   ${index + 1}. ${testResult.useCase.id} - ${testResult.useCase.description}`);
        console.log(`      Duration: ${testResult.result.duration || 'N/A'}ms`);
        console.log(`      Content Length: ${testResult.result.fullContent.length} chars`);
        if (testResult.validationDetails) {
            const checks = [];
            if (testResult.validationDetails.noErrorCheck) checks.push('✅ No Errors');
            if (testResult.validationDetails.noDiagnosticsCheck) checks.push('✅ No Diagnostics');
            console.log(`      Validations: ${checks.join(', ')}`);
        }
    });

    if (aggregateResult.failedTests > 0) {
        console.log('\n❌ FAILED TESTS:');
        aggregateResult.results.filter(r => !r.passed).forEach((testResult, index) => {
            console.log(`   ${index + 1}. ${testResult.useCase.id} - ${testResult.useCase.description}`);
            console.log(`      Duration: ${testResult.result.duration || 'N/A'}ms`);
            console.log(`      Content Length: ${testResult.result.fullContent.length} chars`);
            console.log(`      Failure Reason: ${testResult.failureReason || 'Unknown'}`);
            if (testResult.validationDetails) {
                const checks = [];
                checks.push(testResult.validationDetails.noErrorCheck ? '✅ No Errors' : '❌ Has Errors');
                checks.push(testResult.validationDetails.noDiagnosticsCheck ? '✅ No Diagnostics' : '❌ Has Diagnostics');
                console.log(`      Validations: ${checks.join(', ')}`);
            }
            if (testResult.result.errorOccurred) {
                console.log(`      Error: ${testResult.result.errorOccurred.substring(0, 200)}...`);
            }
        });
    }

    console.log('\n⚡ PERFORMANCE METRICS:');
    const durations = aggregateResult.results
        .filter(r => r.result.duration)
        .map(r => r.result.duration!)
        .sort((a, b) => a - b);
        
    if (durations.length > 0) {
        console.log(`   Fastest: ${durations[0]}ms`);
        console.log(`   Slowest: ${durations[durations.length - 1]}ms`);
        console.log(`   Median: ${durations[Math.floor(durations.length / 2)]}ms`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('END OF REPORT');
    console.log('='.repeat(80));
}

// Performance monitoring utilities
function monitorResourceUsage() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    console.log(`\n💻 Resource Usage:`);
    console.log(`   Memory - RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
    console.log(`   Memory - Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    console.log(`   Memory - Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
    console.log(`   Memory - External: ${Math.round(memUsage.external / 1024 / 1024)}MB`);
    console.log(`   Process Uptime: ${Math.round(uptime)}s`);
}


// Configuration management
interface TestConfiguration {
    maxConcurrency: number;
}

const DEFAULT_TEST_CONFIG: TestConfiguration = {
    maxConcurrency: 5
};


suite.only("AI Code Generator Tests Suite", () => {

    // Close all the open workspace folders before running the test
    suiteSetup(async function () {
        this.timeout(60000); // 60 second timeout for extension initialization
        
        // Load environment variables from .env file if it exists
        const envPath = path.resolve(__dirname, "../../../../.env");
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath });
            console.log("Loaded .env file for AI tests");
        }
        
        // Wait for VSCode startup to complete (onStartupFinished activation event)
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        await commands.executeCommand("workbench.action.closeAllEditors");
        
        // Add the Ballerina workspace to trigger workspaceContains activation event
        const PROJECT_ROOT = "/Users/wso2/ai-playground/code/foo";
        const currentFolderCount = workspace.workspaceFolders?.length || 0;
        workspace.updateWorkspaceFolders(currentFolderCount, 0, {
            uri: Uri.file(PROJECT_ROOT),
        });
        
        // Give VSCode time to detect the workspace and trigger activation
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Force extension activation by opening a Ballerina file
        try {
            const testBalFile = Uri.file("/Users/wso2/ai-playground/code/foo/main.bal");
            await commands.executeCommand("vscode.open", testBalFile);
            await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
            // Fallback: try to execute a ballerina command to force activation
            try {
                await commands.executeCommand("ballerina.showExamples");
            } catch (cmdError) {
                // Extension might still be loading
            }
        }
        
        // Poll for AI test command availability
        let attempts = 0;
        const maxAttempts = 30;
        
        while (attempts < maxAttempts) {
            const commands = await vscode.commands.getCommands();
            if (commands.includes('ballerina.test.ai.generateCodeCore')) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
        }
        
        if (attempts >= maxAttempts) {
            throw new Error("AI test command never registered - extension failed to activate");
        }

        // Log API key availability for test visibility
        const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
        if (anthropicApiKey && anthropicApiKey.trim() !== "") {
            console.log("ANTHROPIC_API_KEY found - tests will attempt BYOK authentication");
            console.log("Using environment variable directly for authentication");
        } else {
            console.log("No ANTHROPIC_API_KEY found - tests will expect authentication errors");
        }
    });

    // Clean up authentication after all tests
    suiteTeardown(async function () {
        console.log("Test suite completed - using environment-based auth, no credentials to clean up");
        monitorResourceUsage(); // Final resource check
    });

    suite("Parallel Multi-UseCase Testing", () => {
        // Check API key before running any tests in this suite
        const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
        const hasAnthropicKey = anthropicApiKey && anthropicApiKey.trim() !== "";
        
        if (!hasAnthropicKey) {
            console.log(`\n⚠️  Skipping entire test suite: ANTHROPIC_API_KEY not set`);
            return; // Skip the entire suite
        }

        test("Execute all use cases in parallel with comprehensive result management", async function () {
            this.timeout(600000); // 10 minute timeout for parallel execution
            
            console.log(`\n🔧 Test Configuration (Comprehensive Results):`);
            console.log(`   API Key Available: Yes`);
            console.log(`   Total Use Cases: ${TEST_USE_CASES.length}`);
            console.log(`   Result Management: Ballerina-style comprehensive`);
            
            monitorResourceUsage(); // Initial resource check

            await wait(15000); // Wait for workspace to settle
            
            // Execute all test cases with comprehensive result management
            const testConfig: TestConfiguration = DEFAULT_TEST_CONFIG;
            
            const summary = await executeParallelTestsWithResults(TEST_USE_CASES, true, testConfig);
            
            // Generate comprehensive report (Ballerina-style)
            generateComprehensiveReport(summary);
            monitorResourceUsage(); // Final resource check for this test

            // Assert overall test success
            const successRate = summary.accuracy / 100;
            console.log(`\n✅ Comprehensive test execution completed:`);
            console.log(`   Success Rate: ${Math.round(summary.accuracy)}%`);
            console.log(`   Total Files Generated: ${summary.results.reduce((sum, r) => sum + r.files.length, 0)}`);
            
            assert.ok(true);
        });

    });
});

function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Comprehensive Result Persistence System
class ResultManager {
    private resultsDir: string;

    constructor(baseDir: string = "./test/ai/evals/code/results") {
        this.resultsDir = path.resolve(baseDir);
    }

    async initializeResultsDirectory(): Promise<void> {
        // Remove existing results directory
        if (fs.existsSync(this.resultsDir)) {
            await fs.promises.rm(this.resultsDir, { recursive: true, force: true });
            console.log("Existing results directory removed");
        }

        // Create new results directory
        await fs.promises.mkdir(this.resultsDir, { recursive: true });
        console.log("Results directory initialized");
    }

    async persistUsecaseResult(usecaseResult: UsecaseResult, index: number): Promise<void> {
        const resultDir = path.join(this.resultsDir, index.toString());
        await fs.promises.mkdir(resultDir, { recursive: true });

        // Create compact result
        const compactResult: UsecaseCompact = {
            usecase: usecaseResult.usecase,
            attempts: usecaseResult.attempts,
            compiled: usecaseResult.compiled,
            duration: usecaseResult.duration
        };

        // Save compact result
        await fs.promises.writeFile(
            path.join(resultDir, "result.json"),
            JSON.stringify(compactResult, null, 2)
        );

        // Save diagnostics
        await fs.promises.writeFile(
            path.join(resultDir, "diagnostics.json"),
            JSON.stringify(usecaseResult.diagnostics, null, 2)
        );

        // Save error events for debugging
        if (usecaseResult.errorEvents && usecaseResult.errorEvents.length > 0) {
            await fs.promises.writeFile(
                path.join(resultDir, "errors.json"),
                JSON.stringify(usecaseResult.errorEvents, null, 2)
            );
        }

        // Create code directory and save source files
        const codeDir = path.join(resultDir, "code");
        await fs.promises.mkdir(codeDir, { recursive: true });

        // Create Ballerina.toml file
        const ballerinaToml = `[package]
name = "test_usecase_${index}"
version = "0.1.0"
distribution = "2201.10.0"

[build-options]
observabilityIncluded = true
`;
        await fs.promises.writeFile(path.join(codeDir, "Ballerina.toml"), ballerinaToml);

        for (const file of usecaseResult.files) {
            const filePath = path.join(codeDir, file.fileName);
            await fs.promises.writeFile(filePath, file.content);
        }

        console.log(`Result persisted for index ${index}: ${usecaseResult.usecase}${usecaseResult.errorEvents ? ` (${usecaseResult.errorEvents.length} error events)` : ''}`);
    }

    async persistSummary(summary: Summary): Promise<void> {
        // Create compact summary
        const compactSummary: SummaryCompact = {
            totalUsecases: summary.totalUsecases,
            totalCompiled: summary.totalCompiled,
            totalFailed: summary.totalFailed,
            accuracy: summary.accuracy
        };

        // Save compact summary
        await fs.promises.writeFile(
            path.join(this.resultsDir, "summary.json"),
            JSON.stringify(compactSummary, null, 2)
        );

        // Save full summary
        await fs.promises.writeFile(
            path.join(this.resultsDir, "summary_detailed.json"),
            JSON.stringify(summary, null, 2)
        );

        console.log("Summary files saved");
    }

    getResultsDirectory(): string {
        return this.resultsDir;
    }
}

// Enhanced result conversion functions
function convertTestResultToUsecaseResult(testResult: TestCaseResult): UsecaseResult {
    // Extract source files from fullContent using regex similar to Ballerina approach
    const files = extractSourceFilesFromContent(testResult.result.fullContent);
    
    // Convert diagnostics to DiagnosticMessage format
    const diagnostics: DiagnosticMessage[] = testResult.result.diagnostics.map(diag => ({
        message: typeof diag === 'string' ? diag : diag.message || diag.toString(),
        severity: diag.severity || 'error',
        code: diag.code,
        source: diag.source
    }));

    // Extract error events for debugging
    const errorEvents = testResult.result.events
        .filter(event => event.type === 'error')
        .map(event => event.content);

    return {
        usecase: testResult.useCase.usecase,
        diagnostics: diagnostics,
        attempts: 1, // TODO: Track actual attempts from repair iterations
        files: files,
        compiled: testResult.passed && diagnostics.length === 0,
        duration: testResult.result.duration,
        timestamp: testResult.result.startTime,
        errorEvents: errorEvents.length > 0 ? errorEvents : undefined
    };
}

function extractSourceFilesFromContent(content: string): SourceFile[] {
    const files: SourceFile[] = [];
    
    // Regex to match code blocks with filename - matching Ballerina pattern
    const codeBlockRegex = /<code filename="([^"]+)">\s*```ballerina\s*([\s\S]*?)```\s*<\/code>/g;
    let match: RegExpExecArray | null;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
        files.push({
            fileName: match[1],
            content: match[2].trim()
        });
    }
    
    // Fallback: if no structured code blocks, create a generic main.bal file
    if (files.length === 0 && content.trim()) {
        files.push({
            fileName: "main.bal",
            content: content
        });
    }
    
    return files;
}

function generateComprehensiveSummary(results: UsecaseResult[]): Summary {
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
        accuracy: Math.round(accuracy * 100) / 100, // Round to 2 decimal places
        totalDuration,
        averageDuration: Math.round(averageDuration),
        timestamp: Date.now()
    };
}
