/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { AICommandExecutor, AICommandConfig, AIExecutionResult } from '../base/AICommandExecutor';
import { Command, ProcessMappingParametersRequest } from '@wso2/ballerina-core';
import { generateMappingCodeCore } from '../../data-mapper/orchestrator';

/**
 * FunctionMappingExecutor - Executes function-level data mapping generation
 *
 * Features:
 * - Generates Ballerina function for data transformation
 * - Uses DM Model for input/output analysis
 * - AI-powered mapping generation with repair
 * - Immediate cleanup (no review mode)
 */
export class FunctionMappingExecutor extends AICommandExecutor<ProcessMappingParametersRequest> {
    constructor(config: AICommandConfig<ProcessMappingParametersRequest>) {
        super(config);
    }

    /**
     * Execute function mapping generation
     *
     * Flow:
     * 1. Temp project created by base class
     * 2. Call existing generateMappingCodeCore with event handler
     * 3. Return modified files
     * 4. Base class handles immediate cleanup
     */
    async execute(): Promise<AIExecutionResult> {
        const tempProjectPath = this.config.executionContext.tempProjectPath!;

        try {
            // Capture checkpoint BEFORE execution
            this.addGeneration(
                `Automap the function : ${this.config.params.parameters?.functionName}`,
                {
                    operationType: 'function_mapping',
                    generationType: 'datamapper',
                    commandType: Command.DataMap,
                }
            );

            // Call existing core function with params from config and temp path
            const result = await generateMappingCodeCore(
                this.config.params,
                this.config.eventHandler,
                this.config.generationId,
                tempProjectPath  // Pass temp project path from base class
            );

            return {
                tempProjectPath,
                modifiedFiles: result.modifiedFiles,
                sourceFiles: result.sourceFiles,
            };
        } catch (error) {
            // Error handling done by base class in run()
            return {
                tempProjectPath,
                modifiedFiles: [],
                error: error as Error,
            };
        }
    }

    protected getCommandType(): Command {
        return Command.DataMap;
    }
}
