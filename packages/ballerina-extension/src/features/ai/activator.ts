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
import { ProcessMappingParametersRequest } from '@wso2/ballerina-core';
import { CopilotEventHandler } from './utils/events';
import { addConfigFile, getConfigFilePath } from './utils';
import {
    CONFIGURE_DEFAULT_MODEL_COMMAND,
    DEFAULT_PROVIDER_ADDED,
    LOGIN_REQUIRED_WARNING_FOR_DEFAULT_MODEL,
    SIGN_IN_BI_COPILOT
} from './constants';
import {
    TOKEN_NOT_AVAILABLE_ERROR_MESSAGE,
    NO_AUTH_CREDENTIALS_FOUND,
    TOKEN_REFRESH_ONLY_SUPPORTED_FOR_BI_INTEL
} from '../..//utils/ai/auth';
import { AIStateMachine } from '../../views/ai-panel/aiMachine';
import { AIMachineEventType, GenerateAgentCodeRequest, ExecutionContext } from '@wso2/ballerina-core';
import { generateMappingCodeCore } from './data-mapper';
import { resolveProjectPath } from '../../utils/project-utils';
import { MESSAGES } from '../project';
import { AICommandConfig } from './executors/base/AICommandExecutor';
import { AgentExecutor } from './agent/AgentExecutor';

/**
 * Parameters for test-mode code generation
 */
export interface GenerateAgentForTestParams extends GenerateAgentCodeRequest {
    /** Path to the isolated test project (created by eval from template) */
    projectPath: string;
}

/**
 * Result returned from test-mode code generation
 */
export interface GenerateAgentForTestResult {
    /** Path to the temp project where code was generated (created by getTempProject) */
    tempProjectPath: string;
    /** Path to the isolated test project (source) */
    isolatedProjectPath: string;
}

export let langClient: ExtendedLangClient;

/** Tracks the active post-login auth subscription so it can be cleaned up before creating a new one. */
let lastAuthSubscription: { unsubscribe: () => void } | null = null;

/** How long (ms) to wait for the user to complete login before auto-cancelling the subscription. */
const AUTH_SUBSCRIPTION_TIMEOUT_MS = 5 * 60 * 1000;

export function activateAIFeatures(ballerinaExternalInstance: BallerinaExtension) {

    langClient = <ExtendedLangClient>ballerinaExternalInstance.langClient;
    activateCopilotLoginCommand();
    resetBIAuth();

    // Register commands in test environment to test the AI features
    if (process.env.AI_TEST_ENV) {
        commands.registerCommand('ballerina.test.ai.generateAgentForTest', async (params: GenerateAgentForTestParams, testEventHandler: CopilotEventHandler): Promise<GenerateAgentForTestResult> => {

            try {
                // Create isolated ExecutionContext for this test
                const ctx: ExecutionContext = {
                    projectPath: params.projectPath,
                    workspacePath: params.projectPath
                };

                // Create config using new AICommandConfig pattern
                const config: AICommandConfig<GenerateAgentCodeRequest> = {
                    executionContext: ctx,
                    eventHandler: testEventHandler,
                    generationId: `test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                    abortController: new AbortController(),
                    params,
                    // No chat storage in test mode
                    chatStorage: undefined,
                    // Immediate cleanup (AI_TEST_ENV prevents actual deletion)
                    lifecycle: {
                        cleanupStrategy: 'immediate'
                    }
                };

                // Execute using new run() method
                const executor = new AgentExecutor(config);
                const result = await executor.run();

                return {
                    tempProjectPath: result.tempProjectPath,
                    isolatedProjectPath: params.projectPath
                };
            } catch (error) {
                console.error(`[Test Mode] Generation failed for project ${params.projectPath}:`, error);
                throw error;
            }
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
        } = require('./utils/libs/libraries');
        const {
            selectRequiredFunctions,
            getMaximizedSelectedLibs,
            toMaximizedLibrariesFromLibJson
        } = require('./utils/libs/function-registry');

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

    commands.registerCommand(CONFIGURE_DEFAULT_MODEL_COMMAND, async () => {
        const targetPath = await resolveProjectPath("Select an integration to configure default model");
        if (!targetPath) {
            window.showErrorMessage(MESSAGES.NO_PROJECT_FOUND);
            return;
        }

        const configPath = await getConfigFilePath(ballerinaExternalInstance, targetPath);
        if (configPath !== null) {
            try {
                const result = await addConfigFile(configPath);
                if (result) {
                    window.showInformationMessage(DEFAULT_PROVIDER_ADDED);
                }
            } catch (error) {
                if ((error as Error).message === TOKEN_NOT_AVAILABLE_ERROR_MESSAGE || (error as Error).message === TOKEN_REFRESH_ONLY_SUPPORTED_FOR_BI_INTEL || (error as Error).message === NO_AUTH_CREDENTIALS_FOUND) {
                    window.showWarningMessage(LOGIN_REQUIRED_WARNING_FOR_DEFAULT_MODEL, SIGN_IN_BI_COPILOT).then(selection => {
                        if (selection === SIGN_IN_BI_COPILOT) {
                            // Dispose any previous subscription before creating a new one
                            if (lastAuthSubscription) {
                                lastAuthSubscription.unsubscribe();
                                lastAuthSubscription = null;
                            }

                            let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

                            // Subscribe to state changes to auto-retry after successful login
                            const subscription = AIStateMachine.service().subscribe((state) => {
                                if (state.value === 'Authenticated') {
                                    // Clear timeout and module-scoped reference, then unsubscribe
                                    if (timeoutHandle !== null) {
                                        clearTimeout(timeoutHandle);
                                        timeoutHandle = null;
                                    }
                                    lastAuthSubscription = null;
                                    subscription.unsubscribe();
                                    // Retry the configuration automatically
                                    addConfigFile(configPath).then(result => {
                                        if (result) {
                                            window.showInformationMessage(DEFAULT_PROVIDER_ADDED);
                                        }
                                    }).catch(retryError => {
                                        window.showErrorMessage(`Failed to configure default model: ${(retryError as Error).message}`);
                                    });
                                }
                            });

                            lastAuthSubscription = subscription;

                            // Guard against the user never completing login
                            timeoutHandle = setTimeout(() => {
                                if (lastAuthSubscription === subscription) {
                                    lastAuthSubscription = null;
                                }
                                subscription.unsubscribe();
                            }, AUTH_SUBSCRIPTION_TIMEOUT_MS);

                            // If stuck in Authenticating from a previous cancelled login, reset it to allow a new login attempt
                            const currentState = AIStateMachine.state();
                            if (typeof currentState === 'object' && 'Authenticating' in currentState) {
                                AIStateMachine.service().send(AIMachineEventType.CANCEL_LOGIN);
                            }

                            // Trigger the login flow
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
