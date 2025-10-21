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

import { TestGenerationTarget, TestGeneratorIntermediaryState, Command } from "@wso2/ballerina-core";
import { getErrorMessage } from "../utils";
import { generateTest, getDiagnostics } from "../../testGenerator";
import { URI } from "vscode-uri";
import * as fs from "fs";
import { CopilotEventHandler, createWebviewEventHandler } from "../event";
import { StateMachine } from "../../../../stateMachine";

// Core function test generation that emits events
export async function generateFunctionTestsCore(
    params: TestGeneratorIntermediaryState,
    eventHandler: CopilotEventHandler
): Promise<void> {
    const testPath = "tests/test.bal";
    const functionIdentifier = params.resourceFunction;

    eventHandler({
        type: "content_block",
        content: `\n\n**Initiating test generation for the function ${functionIdentifier}, following the _outlined test plan_. Please wait...**`,
    });
    eventHandler({
        type: "content_block",
        content: `\n\n<progress>Generating tests for the function ${functionIdentifier}. This may take a moment.</progress>`,
    });

    const projectPath = StateMachine.context().projectPath;
    const response = await generateTest(projectPath, {
        targetType: TestGenerationTarget.Function,
        targetIdentifier: functionIdentifier,
        testPlan: params.testPlan,
    });

    eventHandler({
        type: "content_block",
        content: `\n<progress>Analyzing generated tests for potential issues.</progress>`,
    });

    let existingSource = "";
    try {
        // existingSource = await rpcClient.getAiPanelRpcClient().getFromFile({ filePath: testPath });
        const projectFsPath = URI.parse(testPath).fsPath;
        existingSource = await fs.promises.readFile(projectFsPath, "utf-8");
    } catch {
        // File doesn't exist
    }
    const generatedFullSource = existingSource
        ? existingSource + "\n\n// >>>>>>>>>>>>>>TEST CASES NEED TO BE FIXED <<<<<<<<<<<<<<<\n\n" + response.testSource
        : response.testSource;

    const diagnostics = await getDiagnostics(projectPath, {
        testSource: generatedFullSource,
    });

    console.log(diagnostics);

    let testCode = response.testSource;
    const testConfig = response.testConfig;

    if (diagnostics.diagnostics.length > 0) {
        eventHandler({
            type: "content_block",
            content: `\n<progress>Refining tests based on feedback to ensure accuracy and reliability.</progress>`,
        });

        const fixedCode = await generateTest(projectPath, {
            targetType: TestGenerationTarget.Function,
            targetIdentifier: functionIdentifier,
            testPlan: params.testPlan,
            diagnostics: diagnostics,
            existingTests: generatedFullSource,
        });
        testCode = fixedCode.testSource;
    }

    eventHandler({
        type: "content_block",
        content: `\n\nTest generation completed. Displaying the generated tests for the function ${functionIdentifier} below:`,
    });
    eventHandler({
        type: "content_block",
        content: `\n\n<code filename="${testPath}" type="test">\n\`\`\`ballerina\n${testCode}\n\`\`\`\n</code>`,
    });
    if (testConfig) {
        eventHandler({
            type: "content_block",
            content: `\n\n<code filename="tests/Config.toml" type="test">\n\`\`\`ballerina\n${testConfig}\n\`\`\`\n</code>`,
        });
    }

    eventHandler({ type: "stop", command: Command.Tests });
}

// Main public function that uses the default event handler
export async function generateFunctionTests(params: TestGeneratorIntermediaryState): Promise<void> {
    const eventHandler = createWebviewEventHandler(Command.Tests);
    try {
        await generateFunctionTestsCore(params, eventHandler);
    } catch (error) {
        console.error("Error during function test generation:", error);
        eventHandler({ type: "error", content: getErrorMessage(error) });
    }
}
