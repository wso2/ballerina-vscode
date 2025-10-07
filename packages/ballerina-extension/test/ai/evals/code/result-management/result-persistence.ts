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
import { UsecaseResult, Summary, SummaryCompact, UsecaseCompact } from '../types';
import { BALLERINA_TOML_TEMPLATE, FILES } from '../utils/constants';

/**
 * Persists a single use case result to the file system
 */
export async function persistUsecaseResult(
    usecaseResult: UsecaseResult, 
    index: number, 
    resultsDir: string
): Promise<void> {
    const resultDir = path.join(resultsDir, index.toString());
    await fs.promises.mkdir(resultDir, { recursive: true });

    const compactResult: UsecaseCompact = {
        usecase: usecaseResult.usecase,
        compiled: usecaseResult.compiled,
        duration: usecaseResult.duration,
        evaluationResult: usecaseResult.evaluationResult
    };

    await fs.promises.writeFile(
        path.join(resultDir, "result.json"),
        JSON.stringify(compactResult, null, 2)
    );

    await fs.promises.writeFile(
        path.join(resultDir, "diagnostics.json"),
        JSON.stringify(usecaseResult.diagnostics, null, 2)
    );

    if (usecaseResult.errorEvents && usecaseResult.errorEvents.length > 0) {
        await fs.promises.writeFile(
            path.join(resultDir, "errors.json"),
            JSON.stringify(usecaseResult.errorEvents, null, 2)
        );
    }

    const codeDir = path.join(resultDir, "code");
    await fs.promises.mkdir(codeDir, { recursive: true });

    const ballerinaToml = BALLERINA_TOML_TEMPLATE(index);
    await fs.promises.writeFile(path.join(codeDir, FILES.BALLERINA_TOML), ballerinaToml);

    for (const file of usecaseResult.files) {
        const filePath = path.join(codeDir, file.fileName);
        await fs.promises.writeFile(filePath, file.content);
    }

    console.log(`Result persisted for index ${index}: ${usecaseResult.usecase}${usecaseResult.errorEvents ? ` (${usecaseResult.errorEvents.length} error events)` : ''}`);
}

/**
 * Persists summary information to the file system
 */
export async function persistSummary(summary: Summary, resultsDir: string): Promise<void> {
    const compactSummary: SummaryCompact = {
        totalUsecases: summary.totalUsecases,
        totalCompiled: summary.totalCompiled,
        totalFailed: summary.totalFailed,
        accuracy: summary.accuracy,
        evaluationSummary: summary.evaluationSummary
    };

    await fs.promises.writeFile(
        path.join(resultsDir, "summary.json"),
        JSON.stringify(compactSummary, null, 2)
    );

    await fs.promises.writeFile(
        path.join(resultsDir, "summary_detailed.json"),
        JSON.stringify(summary, null, 2)
    );

    console.log("Summary files saved");
}
