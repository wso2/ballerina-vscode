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

const RESOURCES_PATH = path.resolve(__dirname, "../../../../../test/ai/evals/code/resources");

function getTestFolders(dirPath: string): string[] {
    return fs.readdirSync(dirPath).filter((file) => fs.lstatSync(path.join(dirPath, file)).isDirectory());
}

// Test event handler that captures events for testing
interface TestEventResult {
    events: ChatNotify[];
    fullContent: string;
    hasStarted: boolean;
    hasCompleted: boolean;
    errorOccurred: string | null;
    diagnostics: any[];
    messages: any[];
}

function createTestEventHandler(): { handler: CopilotEventHandler; getResult: () => TestEventResult } {
    const events: ChatNotify[] = [];
    let fullContent = "";
    let hasStarted = false;
    let hasCompleted = false;
    let errorOccurred: string | null = null;
    const diagnostics: any[] = [];
    const messages: any[] = [];

    const handler: CopilotEventHandler = (event: ChatNotify) => {
        events.push(event);

        switch (event.type) {
            case "start":
                hasStarted = true;
                console.log("Code generation started");
                break;
            case "content_block":
                fullContent += event.content;
                console.log("Content block received:", event.content.substring(0, 100) + "...");
                break;
            case "content_replace":
                fullContent = event.content;
                console.log("Content replaced, new length:", event.content.length);
                break;
            case "error":
                errorOccurred = event.content;
                console.error("Error occurred during code generation:", event.content);
                break;
            case "stop":
                hasCompleted = true;
                console.log("Code generation completed");
                console.log("Final content length:", fullContent.length);
                console.log("Total events received:", events.length);
                break;
            case "intermediary_state":
                console.log("Intermediary state:", event.state);
                break;
            case "messages":
                console.log("Messages received:", event.messages?.length || 0);
                messages.push(...(event.messages || []));
                break;
            case "diagnostics":
                console.log("Diagnostics received:", event.diagnostics?.length || 0);
                diagnostics.push(...(event.diagnostics || []));
                break;
            default:
                console.warn(`Unhandled event type: ${(event as any).type}`);
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
    });

    return { handler, getResult };
}

suite.skip("AI Code Generator Tests Suite", () => {

    // Close all the open workspace folders before running the test
    suiteSetup(async function () {
        await commands.executeCommand("workbench.action.closeAllEditors");
    });

    test("basic workspace test", async function () {
        const PROJECT_ROOT = "/Users/anjanash/Desktop/Office/OpenSource/vscode-extensions/workspaces/ballerina/ballerina-extension/test/data/aiTest";

        const success = workspace.updateWorkspaceFolders(0, 0, {
            uri: Uri.file(PROJECT_ROOT),
        });

        await wait(2000);

        console.log("Workspace folders after update:", workspace.workspaceFolders?.length || 0);
        const { handler: testEventHandler, getResult } = createTestEventHandler();

        await wait(15000);
        const params: GenerateCodeRequest = {
            usecase: "write a hello world",
            chatHistory: [],
            operationType: "CODE_GENERATION",
            fileAttachmentContents: [],
        };

        try {
            await commands.executeCommand('ballerina.test.ai.generateCodeCore', params, testEventHandler);

            const result = getResult();

            // Basic assertions
            assert.strictEqual(result.hasStarted, true, "Code generation should have started");
            assert.strictEqual(result.errorOccurred, null, "No errors should have occurred");
            assert.ok(result.events.length > 0, "Should have received events");

            console.log(`Test completed for folder: ${PROJECT_ROOT}`);
            console.log(`Generated content length: ${result.fullContent.length}`);
            console.log(`Total events: ${result.events.length}`);

            //TODO: Take the response. Add to files, then compile the project.  Get diagnostics
            // 
        } catch (error) {
            console.error(`Test failed for folder ${PROJECT_ROOT}:`, error);
            throw error;
        }

        console.log("Test completed successfully");
    });
});

// suite("AI Code Generator Tests Suite", () => {
//     // let langClient: ExtendedLangClient;

//     // suiteSetup(async (done): Promise<any> => {
//     //     langClient = new ExtendedLangClient(
//     //         'ballerina-vscode',
//     //         'Ballerina LS Client',
//     //         getServerOptions(ballerinaExtInstance),
//     //         { documentSelector: [{ scheme: 'file', language: 'ballerina' }] },
//     //         undefined,
//     //         false
//     //     );
//     //     await langClient.start();
//     //     await langClient.registerExtendedAPICapabilities();
//     //     done();
//     // });

//     function runTests(basePath: string) {
//         const testFolders = getTestFolders(basePath);

//         testFolders.forEach((folder) => {
//             const folderPath = path.join(basePath, folder);

//             suite(`Group: ${folder}`, () => {
//                 const subFolders = getTestFolders(folderPath);

//                 test("should generate code successfully", async () => {
//                     const { handler: testEventHandler, getResult } = createTestEventHandler();
//                     const PROJECT_ROOT = "/Users/wso2/repos/ballerina-copilot/evals/project_samples/fresh_bi_package";

//                         // Add workspace folder programmatically
//                     const success = workspace.updateWorkspaceFolders(
//                         workspace.workspaceFolders ? workspace.workspaceFolders.length : 0,
//                         0,
//                         { uri: Uri.file(PROJECT_ROOT) }
//                     );

//                     if (!success) {
//                         throw new Error("Failed to add workspace folder");
//                     }

//                     // Wait for workspace to be updated
//                     await wait(2000);

//                     const uri = Uri.file(path.join(PROJECT_ROOT, "main.bal").toString());
//                     await commands.executeCommand("vscode.open", uri);
//                     await workspace.openTextDocument(uri);

//                     await wait(15000);
//                     const params: GenerateCodeRequest = {
//                         usecase: "write a hello world",
//                         chatHistory: [],
//                         operationType: "CODE_GENERATION",
//                         fileAttachmentContents: [],
//                     };

//                     try {
//                         await generateCodeCore(params, testEventHandler);

//                         const result = getResult();

//                         // Basic assertions
//                         assert.strictEqual(result.hasStarted, true, "Code generation should have started");
//                         assert.strictEqual(result.errorOccurred, null, "No errors should have occurred");
//                         assert.ok(result.events.length > 0, "Should have received events");

//                         console.log(`Test completed for folder: ${folder}`);
//                         console.log(`Generated content length: ${result.fullContent.length}`);
//                         console.log(`Total events: ${result.events.length}`);
//                     } catch (error) {
//                         console.error(`Test failed for folder ${folder}:`, error);
//                         throw error;
//                     }
//                 });
//             });
//         });
//     }
//     runTests(RESOURCES_PATH);
// });

function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
