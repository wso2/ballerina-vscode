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

import { commands, window } from 'vscode';
import { BallerinaExtension, ExtendedLangClient } from '../../core';
import { activateCopilotLoginCommand, resetBIAuth } from './completions';
import { GenerateCodeRequest, ProcessMappingParametersRequest } from '@wso2/ballerina-core';
import { CopilotEventHandler } from './service/event';
import { addConfigFile, getConfigFilePath } from './utils';
import { StateMachine } from "../../stateMachine";
import { CONFIGURE_DEFAULT_MODEL_COMMAND, DEFAULT_PROVIDER_ADDED, LOGIN_REQUIRED_WARNING_FOR_DEFAULT_MODEL, SIGN_IN_BI_COPILOT } from './constants';
import { REFRESH_TOKEN_NOT_AVAILABLE_ERROR_MESSAGE, TOKEN_REFRESH_ONLY_SUPPORTED_FOR_BI_INTEL } from '../..//utils/ai/auth';
import { AIStateMachine } from '../../views/ai-panel/aiMachine';
import { AIMachineEventType } from '@wso2/ballerina-core';
import { generateMappingCodeCore } from './service/datamapper/datamapper';
import { generateDesignForTest, GenerateDesignForTestParams } from './service/design/design-for-test';

export let langClient: ExtendedLangClient;

export function activateAIFeatures(ballerinaExternalInstance: BallerinaExtension) {

    langClient = <ExtendedLangClient>ballerinaExternalInstance.langClient;
    activateCopilotLoginCommand();
    resetBIAuth();

    // Register commands in test environment to test the AI features
    if (process.env.AI_TEST_ENV) {
        commands.registerCommand('ballerina.test.ai.generateDesignForTest', async (params: GenerateDesignForTestParams, testEventHandler: CopilotEventHandler) => {
            return await generateDesignForTest(params, testEventHandler);
        });

        commands.registerCommand('ballerina.test.ai.generatemappingCodecore', async (params: ProcessMappingParametersRequest, testEventHandler: CopilotEventHandler) => {
            await generateMappingCodeCore(params, testEventHandler);
        });

        // Library integration test commands
        const {
            getAllLibraries,
            getSelectedLibraries,
            getRelevantLibrariesAndFunctions,
            GenerationType
        } = require('./service/libs/libs');
        const {
            selectRequiredFunctions,
            getMaximizedSelectedLibs,
            toMaximizedLibrariesFromLibJson
        } = require('./service/libs/funcs');

        commands.registerCommand('ballerina.test.ai.getAllLibraries', async (generationType: typeof GenerationType) => {
            return await getAllLibraries(generationType);
        });

        commands.registerCommand('ballerina.test.ai.getSelectedLibraries', async (prompt: string, generationType: typeof GenerationType) => {
            return await getSelectedLibraries(prompt, generationType);
        });

        commands.registerCommand('ballerina.test.ai.getRelevantLibrariesAndFunctions', async (params: any, generationType: typeof GenerationType) => {
            return await getRelevantLibrariesAndFunctions(params, generationType);
        });

        commands.registerCommand('ballerina.test.ai.selectRequiredFunctions', async (prompt: string, selectedLibNames: string[], generationType: typeof GenerationType) => {
            return await selectRequiredFunctions(prompt, selectedLibNames, generationType);
        });

        commands.registerCommand('ballerina.test.ai.getMaximizedSelectedLibs', async (libNames: string[], generationType: typeof GenerationType) => {
            return await getMaximizedSelectedLibs(libNames, generationType);
        });

        commands.registerCommand('ballerina.test.ai.toMaximizedLibrariesFromLibJson', async (functionResponses: any[], originalLibraries: any[]) => {
            return await toMaximizedLibrariesFromLibJson(functionResponses, originalLibraries);
        });
    }

    const projectPath = StateMachine.context().projectPath;

    commands.registerCommand(CONFIGURE_DEFAULT_MODEL_COMMAND, async () => {
        const configPath = await getConfigFilePath(ballerinaExternalInstance, projectPath);
        if (configPath !== null) {
            try {
                const result = await addConfigFile(configPath);
                if (result) {
                    window.showInformationMessage(DEFAULT_PROVIDER_ADDED);
                }
            } catch (error) {
                if ((error as Error).message === REFRESH_TOKEN_NOT_AVAILABLE_ERROR_MESSAGE || (error as Error).message === TOKEN_REFRESH_ONLY_SUPPORTED_FOR_BI_INTEL) {
                    window.showWarningMessage(LOGIN_REQUIRED_WARNING_FOR_DEFAULT_MODEL, SIGN_IN_BI_COPILOT).then(selection => {
                        if (selection === SIGN_IN_BI_COPILOT) {
                            AIStateMachine.service().send(AIMachineEventType.LOGIN);
                        }
                    });
                } else {
                    window.showErrorMessage((error as Error).message);
                }
            }
        }
    });
}
