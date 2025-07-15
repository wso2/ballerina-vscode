import { TestGenerationTarget, TestGeneratorIntermediaryState } from "@wso2/ballerina-core";
import { getErrorMessage } from "../utils";
import { generateTest, getDiagnostics } from "../../testGenerator";
import { BACKEND_URL } from "../../utils";
import { getBallerinaProjectRoot } from "../../../../rpc-managers/ai-panel/rpc-manager";
import { URI } from "vscode-uri";
import * as fs from "fs";
import { CopilotEventHandler, createWebviewEventHandler } from "../event";

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

    const projectRoot = await getBallerinaProjectRoot();
    const response = await generateTest(projectRoot, {
        backendUri: BACKEND_URL,
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

    const diagnostics = await getDiagnostics(projectRoot, {
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

        const fixedCode = await generateTest(projectRoot, {
            backendUri: BACKEND_URL,
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

    eventHandler({ type: "stop" });
}

// Main public function that uses the default event handler
export async function generateFunctionTests(params: TestGeneratorIntermediaryState): Promise<void> {
    const eventHandler = createWebviewEventHandler();
    try {
        await generateFunctionTestsCore(params, eventHandler);
    } catch (error) {
        console.error("Error during function test generation:", error);
        eventHandler({ type: "error", content: getErrorMessage(error) });
    }
}
