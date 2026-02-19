// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

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

/**
 * Tool registry factory extracted from AgentExecutor.
 */
import { ProjectSource } from '@wso2/ballerina-core';
import { CopilotEventHandler } from '../utils/events';
import { createTaskWriteTool, TASK_WRITE_TOOL_NAME } from './tools/task-writer';
import { createDiagnosticsTool, DIAGNOSTICS_TOOL_NAME } from './tools/diagnostics';
import {
    createBatchEditTool,
    createEditExecute,
    createEditTool,
    createMultiEditExecute,
    createReadExecute,
    createReadTool,
    createWriteExecute,
    createWriteTool,
    FILE_BATCH_EDIT_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_SINGLE_EDIT_TOOL_NAME,
    FILE_WRITE_TOOL_NAME
} from './tools/text-editor';
import { getLibraryGetTool, LIBRARY_GET_TOOL } from './tools/library-get';
import { GenerationType } from '../utils/libs/libraries';
import { getHealthcareLibraryProviderTool, HEALTHCARE_LIBRARY_PROVIDER_TOOL } from './tools/healthcare-library';
import { createConnectorGeneratorTool, CONNECTOR_GENERATOR_TOOL } from './tools/connector-generator';
import { LIBRARY_SEARCH_TOOL, getLibrarySearchTool } from './tools/library-search';
import { createConfigCollectorTool, CONFIG_COLLECTOR_TOOL } from './tools/config-collector';
import { createTestRunnerTool, TEST_RUNNER_TOOL_NAME } from './tools/test-runner';

export interface ToolRegistryOptions {
    eventHandler: CopilotEventHandler;
    tempProjectPath: string;
    modifiedFiles: string[];
    projects: ProjectSource[];
    generationType: GenerationType;
    workspaceId: string;
    generationId: string;
    threadId?: string;
}

export function createToolRegistry(opts: ToolRegistryOptions) {
    const { eventHandler, tempProjectPath, modifiedFiles, projects, generationType, workspaceId, generationId, threadId } = opts;
    return {
        [TASK_WRITE_TOOL_NAME]: createTaskWriteTool(
            eventHandler,
            tempProjectPath,
            modifiedFiles,
            workspaceId,
            generationId,
            threadId || 'default'
        ),
        [LIBRARY_GET_TOOL]: getLibraryGetTool(
            generationType,
            eventHandler
        ),
        [LIBRARY_SEARCH_TOOL]: getLibrarySearchTool(
            eventHandler
        ),
        [HEALTHCARE_LIBRARY_PROVIDER_TOOL]: getHealthcareLibraryProviderTool(
            eventHandler
        ),
        [CONNECTOR_GENERATOR_TOOL]: createConnectorGeneratorTool(
            eventHandler,
            tempProjectPath,
            projects[0].projectName,
            modifiedFiles
        ),
        [CONFIG_COLLECTOR_TOOL]: createConfigCollectorTool(
            eventHandler,
            {
                tempPath: tempProjectPath,
                workspacePath: workspaceId
            },
            modifiedFiles
        ),
        [FILE_WRITE_TOOL_NAME]: createWriteTool(
            createWriteExecute(eventHandler, tempProjectPath, modifiedFiles)
        ),
        [FILE_SINGLE_EDIT_TOOL_NAME]: createEditTool(
            createEditExecute(eventHandler, tempProjectPath, modifiedFiles)
        ),
        [FILE_BATCH_EDIT_TOOL_NAME]: createBatchEditTool(
            createMultiEditExecute(eventHandler, tempProjectPath, modifiedFiles)
        ),
        [FILE_READ_TOOL_NAME]: createReadTool(
            createReadExecute(eventHandler, tempProjectPath)
        ),
        [DIAGNOSTICS_TOOL_NAME]: createDiagnosticsTool(tempProjectPath, eventHandler),
        [TEST_RUNNER_TOOL_NAME]: createTestRunnerTool(tempProjectPath, eventHandler),
    };
}
