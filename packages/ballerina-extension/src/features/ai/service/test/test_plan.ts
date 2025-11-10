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

import { ModelMessage, streamText } from "ai";
import { getAnthropicClient, ANTHROPIC_SONNET_4 } from "../connection";
import { getErrorMessage } from "../utils";
import { TestGenerationTarget, TestPlanGenerationRequest, Command } from "@wso2/ballerina-core";
import { generateTest, getDiagnostics } from "../../testGenerator";
import { CopilotEventHandler, createWebviewEventHandler } from "../event";
import { AIPanelAbortController } from "../../../../../src/rpc-managers/ai-panel/utils";
import { StateMachine } from "../../../../stateMachine";

export interface TestPlanResponse {
    testPlan: string;
}

/**
 * Buffer management for test plan streaming with <scenario> tag detection
 */
class TestPlanBuffer {
    private buffer: string = "";
    private readonly fullScenarioRegex = /<scenario>([\s\S]*?)<\/scenario>/;
    private readonly scenarioOpenTagRegex = /<scenario>/;
    private readonly partialScenarioRegex = /<(s(c(e(n(a(r(i(o(>)?)?)?)?)?)?)?)?)?/;

    /**
     * Processes new text and returns chunks that should be emitted
     * @param text New text to add to buffer
     * @returns Object with shouldEmit flag and text to emit
     */
    processText(text: string): { shouldEmit: boolean; textToEmit: string } {
        if (text === "") {
            return { shouldEmit: false, textToEmit: "" };
        }

        this.buffer += text;

        const fullScenarioMatch = this.fullScenarioRegex.exec(this.buffer);
        const partialScenarioMatch = this.partialScenarioRegex.exec(this.buffer);
        const actualFullScenarioMatch = this.scenarioOpenTagRegex.exec(this.buffer);

        // If no partial match, emit entire buffer
        if (!partialScenarioMatch) {
            const textToEmit = this.buffer;
            this.buffer = "";
            return { shouldEmit: true, textToEmit };
        }

        // If partial match is at the end of buffer, wait for more content
        if (partialScenarioMatch.index + partialScenarioMatch[0].length === this.buffer.length) {
            return { shouldEmit: false, textToEmit: "" };
        }

        // If we have a complete <scenario> opening tag but no full scenario
        if (actualFullScenarioMatch && !fullScenarioMatch) {
            // Continue waiting for the complete scenario
            return { shouldEmit: false, textToEmit: "" };
        }

        // If we have a complete scenario tag (full <scenario>...</scenario>)
        if (fullScenarioMatch) {
            const endIndex = fullScenarioMatch.index + fullScenarioMatch[0].length;
            const textToEmit = this.buffer.substring(0, endIndex);
            this.buffer = this.buffer.substring(endIndex);
            return { shouldEmit: true, textToEmit };
        }

        // Partial match not at end, emit everything before the partial match
        const textToEmit = this.buffer;
        this.buffer = "";
        return { shouldEmit: true, textToEmit };
    }

    /**
     * Flushes remaining buffer content
     */
    flush(): string {
        const remaining = this.buffer;
        this.buffer = "";
        return remaining;
    }
}

// Core test plan generation function that emits events
export async function generateTestPlanCore(
    params: TestPlanGenerationRequest,
    eventHandler: CopilotEventHandler
): Promise<void> {
    const { targetType, targetSource, target } = params;
    let systemPrompt: string;
    let userPrompt: string;

    if (targetType === TestGenerationTarget.Service) {
        systemPrompt = getServiceSystemPrompt();
        userPrompt = getServiceUserPrompt(targetSource);
    } else {
        systemPrompt = getFunctionSystemPrompt();
        userPrompt = getFunctionUserPrompt(targetSource);
    }

    const allMessages: ModelMessage[] = [
        {
            role: "system",
            content: systemPrompt,
        },
        {
            role: "user",
            content: userPrompt,
        },
    ];
    const { fullStream } = streamText({
        model: await getAnthropicClient(ANTHROPIC_SONNET_4),
        maxOutputTokens: 8192,
        temperature: 0,
        messages: allMessages,
        abortSignal: AIPanelAbortController.getInstance().signal,
    });

    eventHandler({ type: "start" });
    const buffer = new TestPlanBuffer();
    let assistantResponse: string = "";

    for await (const part of fullStream) {
        switch (part.type) {
            case "text-delta": {
                const textPart = part.text;
                assistantResponse += textPart;

                // Process through buffer for scenario tag detection
                const result = buffer.processText(textPart);

                if (result.shouldEmit && result.textToEmit) {
                    eventHandler({ type: "content_block", content: result.textToEmit });
                }
                break;
            }
            case "error": {
                const error = part.error;
                console.error("Error during test plan generation:", error);
                eventHandler({ type: "error", content: getErrorMessage(error) });
                break;
            }
            case "finish": {
                // Flush any remaining buffer content
                const remainingText = buffer.flush();
                if (remainingText) {
                    eventHandler({ type: "content_block", content: remainingText });
                }
                if (targetType === "service") {
                    eventHandler({
                        type: "content_block",
                        content: `\n\n**Initiating test generation for the ${target} service, following the _outlined test plan_. Please wait...**`,
                    });
                    eventHandler({
                        type: "content_block",
                        content: `\n\n<progress>Generating tests for the ${target} service. This may take a moment.</progress>`,
                    });
                    const projectPath = StateMachine.context().projectPath;
                    const testResp = await generateTest(projectPath, {
                        targetType: TestGenerationTarget.Service,
                        targetIdentifier: target,
                        testPlan: assistantResponse,
                    });
                    eventHandler({
                        type: "content_block",
                        content: `\n<progress>Analyzing generated tests for potential issues.</progress>`,
                    });
                    const diagnostics = await getDiagnostics(projectPath, testResp);
                    let testCode = testResp.testSource;
                    const testConfig = testResp.testConfig;
                    if (diagnostics.diagnostics.length > 0) {
                        eventHandler({
                            type: "content_block",
                            content: `\n<progress>Refining tests based on feedback to ensure accuracy and reliability.</progress>`,
                        });
                        const fixedCode = await generateTest(projectPath, {
                            targetType: TestGenerationTarget.Service,
                            targetIdentifier: target,
                            testPlan: assistantResponse,
                            diagnostics: diagnostics,
                            existingTests: testResp.testSource,
                        });
                        testCode = fixedCode.testSource;
                    }

                    eventHandler({
                        type: "content_block",
                        content: `\n\nTest generation completed. Displaying the generated tests for the ${target} service below:`,
                    });
                    eventHandler({
                        type: "content_block",
                        content: `\n\n<code filename="tests/test.bal" type="test">\n\`\`\`ballerina\n${testCode}\n\`\`\`\n</code>`,
                    });
                    if (testConfig) {
                        eventHandler({
                            type: "content_block",
                            content: `\n\n<code filename="tests/Config.toml" type="test">\n\`\`\`ballerina\n${testConfig}\n\`\`\`\n</code>`,
                        });
                    }
                    eventHandler({ type: "stop", command: Command.Tests });
                } else {
                    eventHandler({
                        type: "content_block",
                        content: `\n\n<button type="generate_test_group">Generate Tests</button>`,
                    });
                    eventHandler({
                        type: "intermediary_state",
                        state: {
                            resourceFunction: target,
                            testPlan: assistantResponse,
                        },
                    });
                }
                break;
            }
        }
    }
}

// Main public function that uses the default event handler
export async function generateTestPlan(params: TestPlanGenerationRequest): Promise<void> {
    const eventHandler = createWebviewEventHandler(Command.Tests);
    try {
        await generateTestPlanCore(params, eventHandler);
    } catch (error) {
        console.error("Error during test plan generation:", error);
        eventHandler({ type: "error", content: getErrorMessage(error) });
    }
}

function getServiceSystemPrompt(): string {
    return `You are an expert test engineer specializing in creating test plans for Ballerina services. You have extensive experience in identifying critical test scenarios while maintaining efficiency by focusing on essential test cases. Your expertise lies in analyzing service code and determining the minimum set of test cases needed to ensure core functionality.`;
}

function getFunctionSystemPrompt(): string {
    return `You are a specialized test analyzer focused on generating precise test scenarios by examining code implementations, identifying explicit happy paths, documented error conditions, and handled edge cases while strictly limiting scenarios to what's actually supported in the source code, ensuring each test case maps directly to implemented functionality without speculating beyond the code's scope.`;
}

function getServiceUserPrompt(source: string): string {
    return `Task: Analyze the provided Ballerina service code and create a detailed test plan following the specified format.

Context:
   - You are analyzing a Ballerina service implementation requiring comprehensive test coverage
   - The output must follow a specific structured format
   - Focus on practical, implementable test scenarios

Input Code:
[BEGIN_SOURCE]
\`\`\`ballerina
${source}
\`\`\`
[END_SOURCE]

[BEGIN_OUTPUT_FORMAT]
**Test plan for [service_name] service**

**Overview**
[Brief description of what the test plan covers]

[For each resource function, numbered sequentially:]
[N]. Resource Function: [HTTP_METHOD] [PATH]

_Scenario [N.1] (Happy Path)_
- Action: [What the test does]
- Expected: [Expected outcome]
- Validation: [What to verify]

[If applicable:]
_Scenario [N.2] (Error Path)_
- Action: [Error scenario details]
- Expected: [Expected error response]
- Validation: [Error validation points]

**Test Dependencies**
[List major dependencies with bullet points]

**Test Execution Notes**
[List key execution requirements with bullet points]
[END_OUTPUT_FORMAT]

Requirements:
1. Analyze the service code with focus on:
   - Resource functions and their logic
   - Error handling mechanisms
   - Input validation
   - Business logic implementation
   - External dependencies

Test Scenario Generation Rules:
1. Generate scenarios in sequential order
2. For each resource function:
   - Minimum: 1 test scenario
   - Maximum: 2 test scenarios
3. Coverage Requirements:
   - Happy Path: Include successful execution flows
   - Error Path: Only include error scenarios that are explicitly handled in the code(if there are any errors other than ballerina error is returned.)

Constraints:
- Focus on practical, implementable scenarios
- Avoid edge cases not handled in the code
- Ensure scenarios align with the actual implementation

Please analyze the code and generate the test plan following these specifications.
`;
}

function getFunctionUserPrompt(source: string): string {
    return `Task: Analyze the provided Ballerina function code and create a detailed test plan following the specified format.

Context:
  - You are analyzing a Ballerina function implementation requiring comprehensive test coverage
  - The output must follow the given output format strictly where only scenarios are taged and DO NOT number scenarios
  - Focus on practical, implementable test scenarios

Input Code:
[BEGIN_SOURCE]
\`\`\`ballerina
${source}
\`\`\`
[END_SOURCE]

[BEGIN_OUTPUT_FORMAT]
**Test plan for <resource_mehtod(lower case)> <resource path> resource**

**Overview**
[Brief description of what the test plan covers]

[For each scenario:]
<scenario>
  <title>Clear, descriptive scenario title</title>
  <description>
    Detailed scenario description including:
    - Purpose of the test
    - Input parameters and their values
    - Expected outcome
    - Any specific conditions or prerequisites
  </description>
</scenario>

[After all scenarios:]
<button type="add_scenario">+</button>

**Test Execution Notes**
[List key execution requirements with bullet points]
[END_OUTPUT_FORMAT]

Requirements:
1. Analyze the function code with focus on:
  - Input parameters and their types
  - Return types and values
  - Error handling mechanisms
  - Business logic implementation
  - External dependencies
  - Edge cases handled in the code

Test Scenario Generation Rules:
1. Generate scenarios in sequential order
2. Maximum of 5 test scenarios
3. Coverage Requirements:
  - Happy Path: Include successful execution flows
  - Error Path: Only include error scenarios that are explicitly handled in the code
  - Edge Cases: Include boundary conditions that are handled in the implementation

Constraints:
- Focus on practical, implementable scenarios
- Avoid edge cases not handled in the code
- Ensure scenarios align with the actual implementation
- Prioritize quality over quantity
- Focus on scenarios that provide maximum coverage of critical functionality

Note: Please analyze the code and generate the test plan following these specifications.
`;
}
