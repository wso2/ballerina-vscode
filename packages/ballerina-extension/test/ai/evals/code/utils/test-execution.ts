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

import { commands } from "vscode";
import { GenerateCodeRequest } from "@wso2/ballerina-core";
import { TestUseCase, TestCaseResult } from '../types';
import { createTestEventHandler } from './test-event-handler';
import { validateTestResult } from './test-validation';
import { VSCODE_COMMANDS } from './constants';
import { getProjectFromResponse, getProjectSource } from "./evaluator-utils";
import { SourceFiles } from "@wso2/ballerina-core";

/**
 * Executes a single test case and returns the result
 */
export async function executeSingleTestCase(useCase: TestUseCase): Promise<TestCaseResult> {
    console.log(`\n🚀 Starting test case: ${useCase.id} - ${useCase.description}`);
    
    const { handler: testEventHandler, getResult } = createTestEventHandler(useCase);

    const params: GenerateCodeRequest = {
        usecase: useCase.usecase,
        chatHistory: [],
        operationType: useCase.operationType,
        fileAttachmentContents: useCase.fileAttachments ? [...useCase.fileAttachments] : [],
    };

    const initialSources: SourceFiles[] = (await getProjectSource(useCase.projectPath)).sourceFiles;

    try {
        await commands.executeCommand(VSCODE_COMMANDS.AI_GENERATE_CODE_CORE, params, testEventHandler);

        const result = getResult();
        const finalSources: SourceFiles[] = getProjectFromResponse(result.fullContent)
        return await validateTestResult(result, useCase, initialSources, finalSources);

    } catch (error) {
        const result = getResult();
        console.error(`❌ Test case ${useCase.id} failed with error:`, error);
        return {
            useCase,
            result,
            passed: false,
            failureReason: `Execution error: ${(error as Error).message}`
        };
    }
}
