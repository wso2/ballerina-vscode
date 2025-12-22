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

import { TestEventResult, TestUseCase, TestCaseResult } from '../types';
import { evaluateCodeWithLLM, LLMEvaluationResult } from './evaluator-utils';
import { SourceFile } from '@wso2/ballerina-core';

/**
 * Validates test result based on error events and diagnostics
 */
export async function validateTestResult(result: TestEventResult, useCase: TestUseCase, initialSources: SourceFile[], finalSources: SourceFile[]): Promise<TestCaseResult> {
    const validationDetails = {
        noErrorCheck: true,
        noDiagnosticsCheck: true
    };

    let passed = true;
    let failureReason = "";

    if (result.errorOccurred) {
        validationDetails.noErrorCheck = false;
        passed = false;
        failureReason = `Error event received: ${result.errorOccurred}`;
    }

    if (result.diagnostics && result.diagnostics.length > 0) {
        validationDetails.noDiagnosticsCheck = false;
        passed = false;
        failureReason += `${failureReason ? '; ' : ''}Diagnostics received: ${result.diagnostics.length} diagnostic(s)`;
    }
    const evaluation: LLMEvaluationResult = await evaluateCodeWithLLM(useCase.usecase, initialSources, finalSources);

    return {
        useCase,
        result,
        passed,
        failureReason: failureReason || undefined,
        validationDetails,
        evaluationResult: evaluation,
        generatedSources: finalSources
    };
}
