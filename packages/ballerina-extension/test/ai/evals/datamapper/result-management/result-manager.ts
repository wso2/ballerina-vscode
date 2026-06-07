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
import { DatamapperUsecaseResult, Summary, IterationSummary } from '../types';
import { persistUsecaseResult, persistSummary, persistIterationSummary } from './result-persistence';
import { PATHS } from '../utils/constants';

/**
 * Comprehensive Result Persistence System for Datamapper
 */
export class ResultManager {
    private readonly resultsDir: string;

    constructor(baseDir: string = PATHS.DEFAULT_RESULTS_DIR) {
        this.resultsDir = path.resolve(__dirname, baseDir);
    }

    /**
     * Initializes the results directory by removing existing and creating new
     */
    async initializeResultsDirectory(): Promise<void> {
        if (fs.existsSync(this.resultsDir)) {
            await fs.promises.rm(this.resultsDir, { recursive: true, force: true });
            console.log("Existing results directory removed");
        }

        await fs.promises.mkdir(this.resultsDir, { recursive: true });
        console.log("Results directory initialized");
    }

    /**
     * Persists a single use case result
     */
    async persistUsecaseResult(usecaseResult: DatamapperUsecaseResult, index: number, iteration?: number): Promise<void> {
        await persistUsecaseResult(usecaseResult, index, this.resultsDir, iteration);
    }

    /**
     * Persists the comprehensive summary
     */
    async persistSummary(summary: Summary): Promise<void> {
        await persistSummary(summary, this.resultsDir);
    }

    /**
     * Persists an iteration summary
     */
    async persistIterationSummary(iterationSummary: IterationSummary): Promise<void> {
        await persistIterationSummary(iterationSummary, this.resultsDir);
    }

    /**
     * Returns the results directory path
     */
    getResultsDirectory(): string {
        return this.resultsDir;
    }
}
