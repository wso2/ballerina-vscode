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
import { getLibraryProviderTool } from './tools/library-provider';
import { LIBRARY_PROVIDER_TOOL, GenerationType } from '../utils/libs/libraries';
import { getHealthcareLibraryProviderTool, HEALTHCARE_LIBRARY_PROVIDER_TOOL } from './tools/healthcare-library';
import { createConnectorGeneratorTool, CONNECTOR_GENERATOR_TOOL } from './tools/connector-generator';

export interface ToolRegistryOptions {
    eventHandler: CopilotEventHandler;
    tempProjectPath: string;
    projectPath?: string;
    modifiedFiles: string[];
    projects: ProjectSource[];
    libraryDescriptions: string;
    generationType: GenerationType;
}

export function createToolRegistry(opts: ToolRegistryOptions) {
    const { eventHandler, tempProjectPath, projectPath, modifiedFiles, projects, libraryDescriptions, generationType } = opts;
    return {
        [TASK_WRITE_TOOL_NAME]: createTaskWriteTool(
            eventHandler,
            tempProjectPath,
            modifiedFiles
        ),
        [LIBRARY_PROVIDER_TOOL]: getLibraryProviderTool(
            libraryDescriptions,
            generationType,
            eventHandler
        ),
        [HEALTHCARE_LIBRARY_PROVIDER_TOOL]: getHealthcareLibraryProviderTool(
            libraryDescriptions,
            eventHandler
        ),
        [CONNECTOR_GENERATOR_TOOL]: createConnectorGeneratorTool(
            eventHandler,
            tempProjectPath,
            projects[0].projectName,
            modifiedFiles
        ),
        [FILE_WRITE_TOOL_NAME]: createWriteTool(
            createWriteExecute(eventHandler, tempProjectPath, projectPath, modifiedFiles)
        ),
        [FILE_SINGLE_EDIT_TOOL_NAME]: createEditTool(
            createEditExecute(eventHandler, tempProjectPath, projectPath, modifiedFiles)
        ),
        [FILE_BATCH_EDIT_TOOL_NAME]: createBatchEditTool(
            createMultiEditExecute(eventHandler, tempProjectPath, projectPath, modifiedFiles)
        ),
        [FILE_READ_TOOL_NAME]: createReadTool(
            createReadExecute(eventHandler, tempProjectPath)
        ),
        [DIAGNOSTICS_TOOL_NAME]: createDiagnosticsTool(tempProjectPath),
    };
}
