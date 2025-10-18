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

import * as fs from "fs";
import * as path from "path";
import { evaluateCodeWithLLM, LLMEvaluationResult } from "../../code/utils/evaluator-utils";
import { SourceFiles } from "@wso2/ballerina-core";
import { TestCase } from "../types";

/**
 * Perform LLM evaluation for a datamapper test case
 */
export async function performLLMEvaluation(testCase: TestCase): Promise<LLMEvaluationResult> {
    console.log(`\n🤖 Performing LLM evaluation for ${testCase.name}`);

    // Load schema from file
    const schemaContent = await fs.promises.readFile(testCase.schemaPath, "utf-8");
    const schema = JSON.parse(schemaContent);

    // Get main.bal path
    const mainBalPath = path.join(testCase.resourcePath, "main.bal");

    // Read initial main.bal content (before generation, minimal initial state)
    const initialSource: SourceFiles[] = [{
        filePath: mainBalPath,
        content: `function ${testCase.expectedFunctionName}(...) returns ... => {\n\n};`
    }];

    // Get final source (generated code)
    const finalContent = await fs.promises.readFile(mainBalPath, "utf-8");
    const finalSource: SourceFiles[] = [{
        filePath: mainBalPath,
        content: finalContent
    }];

    // Extract input and output types from schema
    const inputs = schema.mappingsModel.inputs.map((inp: any) => inp.typeName).join(", ");
    const output = schema.mappingsModel.output.typeName;

    // Construct user query from test case
    const userQuery = `Generate a Ballerina function named '${testCase.expectedFunctionName}' that transforms ${inputs} to ${output} based on the following schema: ${JSON.stringify(schema.mappingsModel, null, 2)}`;

    return await evaluateCodeWithLLM(userQuery, initialSource, finalSource);
}
