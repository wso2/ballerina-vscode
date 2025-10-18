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
import { exec } from "child_process";
import { promisify } from "util";
import { ProcessMappingParametersRequest } from "@wso2/ballerina-core";
import { TestCase, TestEventResult, BalTestResult } from "../types";
import { VSCODE_COMMANDS, TIMING } from "./constants";
import { createTestEventHandler } from "./test-event-handler";

const execAsync = promisify(exec);

/**
 * Execute datamapper test for a single test case
 */
export async function executeDatamapperTest(testCase: TestCase): Promise<TestEventResult> {
    console.log(`\n🚀 Starting datamapper test: ${testCase.name}`);

    const { handler, getResult } = createTestEventHandler();

    // Load schema from file
    const schemaContent = await fs.promises.readFile(testCase.schemaPath, "utf-8");
    const schema = JSON.parse(schemaContent);

    // Extract input record names from schema
    const inputRecords = schema.mappingsModel.inputs
        .filter((input: any) => input.kind === "record")
        .map((input: any) => input.typeName);

    const outputRecord = schema.mappingsModel.output.typeName;

    const params: ProcessMappingParametersRequest = {
        parameters: {
            inputRecord: inputRecords,
            outputRecord: outputRecord,
            functionName: testCase.expectedFunctionName,
        },
        metadata: schema,
        attachments: [],
    };

    try {
        await vscode.commands.executeCommand(
            VSCODE_COMMANDS.AI_GENERATE_MAPPING_CODE_CORE,
            params,
            handler
        );

        return getResult();
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

        return {
            passed,
            failed,
            skipped,
            total,
            output,
            success: failed === 0 && passed > 0
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

        return {
            passed,
            failed,
            skipped,
            total,
            output,
            success: false
        };
    }
}
