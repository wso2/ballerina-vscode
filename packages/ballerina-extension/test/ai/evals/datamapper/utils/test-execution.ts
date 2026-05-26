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

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { ProcessMappingParametersRequest } from "@wso2/ballerina-core";
import { TestCase, TestEventResult, BalTestResult } from "../types";
import { VSCODE_COMMANDS, TIMING, FILES } from "./constants";
import { createTestEventHandler } from "./test-event-handler";

const execAsync = promisify(exec);

/**
 * Setup workspace for test execution
 */
async function setupWorkspace(projectPath: string): Promise<void> {
    console.log(`📂 Setting up workspace: ${projectPath}`);

    // Close all editors first
    await vscode.commands.executeCommand(VSCODE_COMMANDS.CLOSE_ALL_EDITORS);

    // Add the Ballerina workspace to trigger workspaceContains activation event
    const currentFolderCount = vscode.workspace.workspaceFolders?.length || 0;
    vscode.workspace.updateWorkspaceFolders(0, currentFolderCount, {
        uri: vscode.Uri.file(projectPath),
    });

    // Wait for workspace to be added
    await new Promise(resolve => setTimeout(resolve, TIMING.WORKSPACE_SETUP_DELAY));

    // Force extension activation by opening the types file first (to load type definitions)
    try {
        const typesBalFile = vscode.Uri.file(path.join(projectPath, FILES.TYPES_BAL));
        console.log(`📄 Opening types file: ${typesBalFile.fsPath}`);
        await vscode.commands.executeCommand(VSCODE_COMMANDS.OPEN, typesBalFile);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Then open main.bal file
        const mainBalFile = vscode.Uri.file(path.join(projectPath, FILES.MAIN_BAL));
        console.log(`📄 Opening main file: ${mainBalFile.fsPath}`);
        await vscode.commands.executeCommand(VSCODE_COMMANDS.OPEN, mainBalFile);
        await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
        console.error("Error opening files:", error);
    }

    // Give extra time for language server to index all files
    console.log(`⏳ Waiting for language server to index files...`);
    await new Promise(resolve => setTimeout(resolve, TIMING.WORKSPACE_SETTLE_DELAY));
}

/**
 * Execute datamapper test for a single test case
 */
export async function executeDatamapperTest(testCase: TestCase): Promise<TestEventResult> {
    console.log(`\n🚀 Starting datamapper test: ${testCase.name}`);

    const { handler, getResult } = createTestEventHandler();

    // Setup workspace properly
    await setupWorkspace(testCase.resourcePath);

    // Wait for workspace to stabilize and language server to index
    await new Promise(resolve => setTimeout(resolve, TIMING.WORKSPACE_SETTLE_DELAY));

    const params: ProcessMappingParametersRequest = {
        parameters: {
            inputRecord: [],
            outputRecord: "",
            functionName: testCase.expectedFunctionName,
        }
    };

    try {
        await vscode.commands.executeCommand(
            VSCODE_COMMANDS.AI_GENERATE_MAPPING_CODE_CORE,
            params,
            handler
        );

        const result = getResult();
        return result;
    } catch (error) {
        console.error(`❌ Test case ${testCase.name} failed with error:`, error);
        const result = getResult();
        return result;
    }
}

/**
 * Update main.bal file with generated code
 */
export async function updateMainBalFile(testCase: TestCase, generatedCode: string): Promise<void> {
    const mainBalPath = `${testCase.resourcePath}/main.bal`;
    await fs.promises.writeFile(mainBalPath, generatedCode, "utf-8");
    console.log(`✅ Updated ${mainBalPath} with generated mapping code`);
}

/**
 * Parse individual test assertions from bal test output
 */
function parseTestAssertions(output: string): any[] {
    const assertions: any[] = [];

    const assertionPattern = /\[fail\]\s+(\w+):\s+Assertion Failed!\s+expected:\s+'([^']*)'\s+actual\s+:\s+'([^']*)'/g;
    let match;

    while ((match = assertionPattern.exec(output)) !== null) {
        const testName = match[1];
        const expected = match[2];
        const actual = match[3];

        assertions.push({
            testName,
            fieldName: testName, // Use test name as field identifier
            passed: false,
            expected,
            actual
        });
    }

    // For passing tests, extract from test summary
    // Pattern: test name in output followed by passing status
    const passedTestsPattern = /(\d+)\s+passing/i;
    const passMatch = output.match(passedTestsPattern);

    if (passMatch) {
        // Try to extract passing test names
        const testNamePattern = /@test:Config\s*\{\}\s*function\s+(\w+)/g;
        const testContent = output.match(/Running\s+Tests/i);

        if (testContent) {
            // Find test function names in the surrounding context
            const testFuncMatches = [...output.matchAll(/\[pass\]\s+(\w+)/g)];
            testFuncMatches.forEach(m => {
                assertions.push({
                    testName: m[1],
                    fieldName: m[1],
                    passed: true
                });
            });
        }
    }

    return assertions;
}

/**
 * Run Ballerina test for a test case
 */
export async function runBalTest(testCase: TestCase): Promise<BalTestResult> {
    console.log(`\n🧪 Running bal test in ${testCase.resourcePath}`);

    try {
        const { stdout, stderr } = await execAsync("bal test", {
            cwd: testCase.resourcePath,
            timeout: TIMING.BAL_TEST_TIMEOUT
        });

        const output = stdout + stderr;
        console.log("Bal test output:", output);

        // Parse bal test output to extract metrics
        const passingMatch = output.match(/(\d+)\s+passing/i);
        const failingMatch = output.match(/(\d+)\s+failing/i);
        const skippedMatch = output.match(/(\d+)\s+skipped/i);

        const passed = passingMatch ? parseInt(passingMatch[1], 10) : 0;
        const failed = failingMatch ? parseInt(failingMatch[1], 10) : 0;
        const skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;
        const total = passed + failed + skipped;

        // Parse individual assertions
        const assertions = parseTestAssertions(output);

        return {
            passed,
            failed,
            skipped,
            total,
            output,
            success: failed === 0 && passed > 0,
            assertions
        };
    } catch (error: any) {
        const output = error.stdout + error.stderr;
        console.error("Bal test failed:", output);

        // Try to parse metrics even from error output
        const passingMatch = output.match(/(\d+)\s+passing/i);
        const failingMatch = output.match(/(\d+)\s+failing/i);
        const skippedMatch = output.match(/(\d+)\s+skipped/i);

        const passed = passingMatch ? parseInt(passingMatch[1], 10) : 0;
        const failed = failingMatch ? parseInt(failingMatch[1], 10) : 0;
        const skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;
        const total = passed + failed + skipped;

        // Parse individual assertions
        const assertions = parseTestAssertions(output);

        return {
            passed,
            failed,
            skipped,
            total,
            output,
            success: false,
            assertions
        };
    }
}
