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
import { Command, MetadataWithAttachments } from '@wso2/ballerina-core';
import { generateInlineMappingCodeCore } from '../../data-mapper/orchestrator';

/**
 * InlineMappingExecutor - Executes inline data mapping expression generation
 *
 * Features:
 * - Generates inline mapping expression (no function wrapper)
 * - Used for variable assignments
 * - AI-powered with repair
 * - Immediate cleanup (no review mode)
 */
export class InlineMappingExecutor extends AICommandExecutor<MetadataWithAttachments> {
    constructor(config: AICommandConfig<MetadataWithAttachments>) {
        super(config);
    }

    /**
     * Execute inline mapping generation
     *
     * Flow:
     * 1. Temp project created by base class
     * 2. Call existing generateInlineMappingCodeCore with event handler
     * 3. Return modified files
     * 4. Base class handles immediate cleanup
     */
    async execute(): Promise<AIExecutionResult> {
        const tempProjectPath = this.config.executionContext.tempProjectPath!;

        try {
            // Call existing core function with params from config
            const result = await generateInlineMappingCodeCore(
                this.config.params,
                this.config.eventHandler,
                this.config.generationId
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
