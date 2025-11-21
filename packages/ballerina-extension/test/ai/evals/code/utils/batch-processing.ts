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

import { TestUseCase, UsecaseResult } from '../types';
import { executeSingleTestCase } from './test-execution';
import { convertTestResultToUsecaseResult, createFailedUsecaseResult } from '../result-management/result-conversion';
import { FILES, PATHS, TIMING, VSCODE_COMMANDS } from './constants';
import path from 'path';
import { commands, Uri, workspace } from 'vscode';

/**
 * Processes a single batch of test cases in parallel
 */
export async function processSingleBatch(
    batch: readonly TestUseCase[],
    batchNumber: number,
    iteration?: number
): Promise<readonly UsecaseResult[]> {
    try {
        console.log(`\n📋 Processing batch ${batchNumber}${iteration !== undefined ? ` (iteration ${iteration})` : ''}: ${batch.map(uc => uc.id).join(', ')}`);

        // All test cases in the batch SHOULD share the same project path
        await setupTestEnvironmentForBatch(batch[0].projectPath);
        const batchPromises = batch.map(useCase =>
            executeSingleTestCase(useCase)
        );
    
        const batchResults = await Promise.allSettled(batchPromises);
        const usecaseResults: UsecaseResult[] = [];
    
        for (let j = 0; j < batchResults.length; j++) {
            const settledResult = batchResults[j];
            const useCase = batch[j];
    
            let usecaseResult: UsecaseResult;
    
            if (settledResult.status === 'fulfilled') {
                usecaseResult = convertTestResultToUsecaseResult(settledResult.value, iteration);
            } else {
                console.error(`❌ Test case ${useCase.id} failed:`, settledResult.reason);
                usecaseResult = createFailedUsecaseResult(useCase, settledResult.reason);
                // Add iteration to failed result
                if (iteration !== undefined) {
                    usecaseResult = { ...usecaseResult, iteration };
                }
            }
    
            usecaseResults.push(usecaseResult);
        }
    
        return usecaseResults;
    } catch (error) {
        console.error(`❌ Batch ${batchNumber} processing failed:`, (error as Error).message);
    }
}

/**
 * Handles inter-batch delays and monitoring
 */
export async function handleBatchDelay(
    currentIndex: number, 
    totalUseCases: number, 
    maxConcurrency: number
): Promise<void> {
    if (currentIndex + maxConcurrency < totalUseCases) {
        console.log(`⏳ Waiting ${TIMING.INTER_BATCH_DELAY}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, TIMING.INTER_BATCH_DELAY));
    }
}

/**
 * Utility function to wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function setupTestEnvironmentForBatch(projectPath: string): Promise<void> {
    // Wait for VSCode startup to complete
    await new Promise(resolve => setTimeout(resolve, TIMING.WORKSPACE_SETUP_DELAY));
    
    await commands.executeCommand(VSCODE_COMMANDS.CLOSE_ALL_EDITORS);
    
    // Add the Ballerina workspace to trigger workspaceContains activation event
    const currentFolderCount = workspace.workspaceFolders?.length || 0;
    workspace.updateWorkspaceFolders(0, currentFolderCount, {
        uri: Uri.file(projectPath),
    });
    
    // Give VSCode time to detect the workspace and trigger activation
    await new Promise(resolve => setTimeout(resolve, TIMING.WORKSPACE_SETTLE_DELAY));
}
