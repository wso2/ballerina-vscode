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

import { AICommandExecutor, AIExecutionConfig, AIExecutionResult } from '../base/AICommandExecutor';
import { Command, ProcessContextTypeCreationRequest } from '@wso2/ballerina-core';
import { generateContextTypesCore } from '../../data-mapper/orchestrator';

/**
 * ContextTypesExecutor - Executes context type generation from attachments
 *
 * Features:
 * - Generates Ballerina types from JSON/XML/CSV attachments
 * - Used for creating type definitions
 * - AI-powered type inference
 */
export class ContextTypesExecutor extends AICommandExecutor {
    private params: ProcessContextTypeCreationRequest;

    constructor(config: AIExecutionConfig, params: ProcessContextTypeCreationRequest) {
        super(config);
        this.params = params;
    }

    /**
     * Execute context type generation
     *
     * Flow:
     * 1. Create temp project (inherited from base)
     * 2. Call existing generateContextTypesCore with event handler
     * 3. Return modified files
     */
    async execute(): Promise<AIExecutionResult> {
        const tempProjectPath = this.config.executionContext.tempProjectPath!;

        try {
            // Call existing core function
            const result = await generateContextTypesCore(
                this.params,
                this.config.eventHandler,
                this.config.messageId
            );

            return {
                tempProjectPath,
                modifiedFiles: result.modifiedFiles,
                sourceFiles: result.sourceFiles,
            };
        } catch (error) {
            this.handleError(error);
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
