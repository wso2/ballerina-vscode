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

/* eslint-disable @typescript-eslint/naming-convention */
import { createMachine, assign, interpret } from 'xstate';
import { AIMachineStateValue, AIPanelPrompt, AIMachineEventType, AIMachineContext, AIUserToken, AIMachineSendableEvent, LoginMethod, SHARED_COMMANDS } from '@wso2/ballerina-core';
import { AiPanelWebview } from './webview';
import { extension } from '../../BalExtensionContext';
import { getAccessToken, getLoginMethod } from '../../utils/ai/auth';
import { checkToken, initiateInbuiltAuth, logout, validateApiKey, validateAwsCredentials } from './utils';
import * as vscode from 'vscode';
import { notifyAiPromptUpdated } from '../../RPCLayer';

export const USER_CHECK_BACKEND_URL = '/user/usage';

export const openAIWebview = (defaultprompt?: AIPanelPrompt) => {
    extension.aiChatDefaultPrompt = defaultprompt;
    if (!AiPanelWebview.currentPanel) {
        AiPanelWebview.currentPanel = new AiPanelWebview();
    } else {
        AiPanelWebview.currentPanel!.getWebview()?.reveal();
        // Notify the webview to refetch the prompt since it's already open
        if (defaultprompt) {
            notifyAiPromptUpdated();
        }
    }
};

export const closeAIWebview = () => {
    if (AiPanelWebview.currentPanel) {
        AiPanelWebview.currentPanel.dispose();
        AiPanelWebview.currentPanel = undefined;
    }
};

/**
 * Typesafe wrapper function to open the AI Panel with an optional prompt.
 *
 * This function provides type safety when opening the AI Panel by ensuring that
 * only valid AIPanelPrompt objects are passed as parameters.
 *
 * @param prompt - Optional prompt configuration for the AI Panel. Can be:
 *   - `{ type: 'command-template', ... }` - Opens with a specific command template
 *   - `{ type: 'text', text: string, planMode: boolean }` - Opens with raw text input
 *   - `undefined` - Opens without any default prompt
 *
 * @example
 * // Open with a command template
 * openAIPanelWithPrompt({
 *   type: 'command-template',
 *   command: Command.Tests,
 *   templateId: TemplateId.TestsForService,
 * });
 *
 * @example
 * // Open with text input (design mode is the default)
 * openAIPanelWithPrompt({
 *   type: 'text',
 *   text: 'Generate a REST API',
 *   planMode: true
 * });
 *
 * @example
 * // Open empty panel
 * openAIPanelWithPrompt();
 */
export function openAIPanelWithPrompt(prompt?: AIPanelPrompt): void {
    vscode.commands.executeCommand(SHARED_COMMANDS.OPEN_AI_PANEL, prompt);
}

const aiMachine = createMachine<AIMachineContext, AIMachineSendableEvent>({
    id: 'ballerina-ai',
    initial: 'Initialize',
    predictableActionArguments: true,
    context: {
        loginMethod: undefined,
        userToken: undefined,
        errorMessage: undefined,
    },
    on: {
        DISPOSE: {
            target: 'Initialize',
            actions: assign({
                loginMethod: (_ctx) => undefined,
                userToken: (_ctx) => undefined,
                errorMessage: (_ctx) => undefined,
            })
        }
    },
    states: {
        Initialize: {
            invoke: {
                id: 'checkToken',
                src: 'checkToken',
                onDone: [
                    {
                        cond: (_ctx, event) => !!event.data,
                        target: 'Authenticated',
                        actions: assign({
                            loginMethod: (_ctx, event) => event.data.loginMethod,
                            userToken: (_ctx, event) => ({ token: event.data.token }),
                            errorMessage: (_ctx) => undefined,
                        })
                    },
                    {
                        target: 'Unauthenticated',
                        actions: assign({
                            loginMethod: (_ctx) => undefined,
                            userToken: (_ctx) => undefined,
                            errorMessage: (_ctx) => undefined,
                        })
                    }
                ],
                onError: [
                    {
                        cond: (_ctx, event) => event.data?.message === 'TOKEN_EXPIRED',
                        target: 'Unauthenticated',
                        actions: [
                            'silentLogout',
                            assign({
                                loginMethod: (_ctx) => undefined,
                                userToken: (_ctx) => undefined,
                                errorMessage: (_ctx) => undefined,
                            })
                        ]
                    },
                    {
                        target: 'Disabled',
                        actions: assign({
                            loginMethod: (_ctx) => undefined,
                            userToken: (_ctx) => undefined,
                            errorMessage: (_ctx, event) => event.data?.message || 'Unknown error'
                        })
                    }
                ]
            }
        },
        Unauthenticated: {
            on: {
                [AIMachineEventType.LOGIN]: {
                    target: 'Authenticating',
                    actions: assign({
                        loginMethod: (_ctx) => LoginMethod.BI_INTEL
                    })
                },
                [AIMachineEventType.AUTH_WITH_API_KEY]: {
                    target: 'Authenticating',
                    actions: assign({
                        loginMethod: (_ctx) => LoginMethod.ANTHROPIC_KEY
                    })
                },
                [AIMachineEventType.AUTH_WITH_AWS_BEDROCK]: {
                    target: 'Authenticating',
                    actions: assign({
                        loginMethod: (_ctx) => LoginMethod.AWS_BEDROCK
                    })
                }
            }
        },
        Authenticating: {
            initial: 'determineFlow',
            states: {
                determineFlow: {
                    always: [
                        {
                            cond: (context) => context.loginMethod === LoginMethod.BI_INTEL,
                            target: 'ssoFlow'
                        },
                        {
                            cond: (context) => context.loginMethod === LoginMethod.ANTHROPIC_KEY,
                            target: 'apiKeyFlow'
                        },
                        {
                            cond: (context) => context.loginMethod === LoginMethod.AWS_BEDROCK,
                            target: 'awsBedrockFlow'
                        },
                        {
                            target: 'ssoFlow' // default
                        }
                    ]
                },
                ssoFlow: {
                    invoke: {
                        id: 'openLogin',
                        src: 'openLogin',
                        onError: {
                            target: '#ballerina-ai.Unauthenticated',
                            actions: assign({
                                loginMethod: (_ctx) => undefined,
                                errorMessage: (_ctx, event) => event.data?.message || 'SSO authentication failed'
                            })
                        }
                    },
                    on: {
                        [AIMachineEventType.COMPLETE_AUTH]: {
                            target: '#ballerina-ai.Authenticated',
                            actions: assign({
                                errorMessage: (_ctx) => undefined,
                            })
                        },
                        [AIMachineEventType.CANCEL_LOGIN]: {
                            target: '#ballerina-ai.Unauthenticated',
                            actions: assign({
                                loginMethod: (_ctx) => undefined,
                                errorMessage: (_ctx) => undefined,
                            })
                        }
                    }
                },
                apiKeyFlow: {
                    on: {
                        [AIMachineEventType.SUBMIT_API_KEY]: {
                            target: 'validatingApiKey',
                            actions: assign({
                                errorMessage: (_ctx) => undefined
                            })
                        },
                        [AIMachineEventType.CANCEL_LOGIN]: {
                            target: '#ballerina-ai.Unauthenticated',
                            actions: assign({
                                loginMethod: (_ctx) => undefined,
                                errorMessage: (_ctx) => undefined,
                            })
                        }
                    }
                },
                validatingApiKey: {
                    invoke: {
                        id: 'validateApiKey',
                        src: 'validateApiKey',
                        onDone: {
                            target: '#ballerina-ai.Authenticated',
                            actions: assign({
                                errorMessage: (_ctx) => undefined,
                            })
                        },
                        onError: {
                            target: 'apiKeyFlow',
                            actions: assign({
                                errorMessage: (_ctx, event) => event.data?.message || 'API key validation failed'
                            })
                        }
                    }
                },
                awsBedrockFlow: {
                    on: {
                        [AIMachineEventType.SUBMIT_AWS_CREDENTIALS]: {
                            target: 'validatingAwsCredentials',
                            actions: assign({
                                errorMessage: (_ctx) => undefined
                            })
                        },
                        [AIMachineEventType.CANCEL_LOGIN]: {
                            target: '#ballerina-ai.Unauthenticated',
                            actions: assign({
                                loginMethod: (_ctx) => undefined,
                                errorMessage: (_ctx) => undefined,
                            })
                        }
                    }
                },
                validatingAwsCredentials: {
                    invoke: {
                        id: 'validateAwsCredentials',
                        src: 'validateAwsCredentials',
                        onDone: {
                            target: '#ballerina-ai.Authenticated',
                            actions: assign({
                                errorMessage: (_ctx) => undefined,
                            })
                        },
                        onError: {
                            target: 'awsBedrockFlow',
                            actions: assign({
                                errorMessage: (_ctx, event) => event.data?.message || 'AWS credentials validation failed'
                            })
                        }
                    }
                }
            }
        },
        Authenticated: {
            invoke: {
                id: 'getTokenAfterAuth',
                src: 'getTokenAfterAuth',
                onDone: {
                    actions: assign({
                        userToken: (_ctx, event) => ({ token: event.data.token }),
                        loginMethod: (_ctx, event) => event.data.loginMethod,
                        errorMessage: (_ctx) => undefined,
                    })
                },
                onError: {
                    target: 'Unauthenticated',
                    actions: assign({
                        userToken: (_ctx) => undefined,
                        loginMethod: (_ctx) => undefined,
                        errorMessage: (_ctx, event) => event.data?.message || 'Failed to retrieve authentication credentials',
                    })
                }
            },
            on: {
                [AIMachineEventType.LOGOUT]: {
                    target: 'Unauthenticated',
                    actions: [
                        'logout',
                        assign({
                            loginMethod: (_) => undefined,
                            userToken: (_) => undefined,
                            errorMessage: (_) => undefined,
                        })
                    ]
                },
                [AIMachineEventType.SILENT_LOGOUT]: {
                    target: 'Unauthenticated',
                    actions: [
                        'silentLogout',
                        assign({
                            loginMethod: (_) => undefined,
                            userToken: (_) => undefined,
                            errorMessage: (_) => undefined,
                        })
                    ]
                }
            }
        },
        Disabled: {
            on: {
                RETRY: {
                    target: 'Initialize',
                    actions: assign({
                        userToken: (_ctx) => undefined,
                        loginMethod: (_ctx) => undefined,
                        errorMessage: (_ctx) => undefined,
                    })
                }
            }
        },
    }
});

const openLogin = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const status = await initiateInbuiltAuth();
            if (!status) {
                aiStateService.send(AIMachineEventType.CANCEL_LOGIN);
            }
            resolve(status);
        } catch (error) {
            reject(error);
        }
    });
};

const validateApiKeyService = async (_context: AIMachineContext, event: any) => {
    const apiKey = event.payload?.apiKey;
    if (!apiKey) {
        throw new Error('API key is required');
    }
    return await validateApiKey(apiKey, LoginMethod.ANTHROPIC_KEY);
};

const validateAwsCredentialsService = async (_context: AIMachineContext, event: any) => {
    const { accessKeyId, secretAccessKey, region, sessionToken } = event.payload || {};
    if (!accessKeyId || !secretAccessKey || !region) {
        throw new Error('AWS access key ID, secret access key, and region are required');
    }
    return await validateAwsCredentials({
        accessKeyId,
        secretAccessKey,
        region,
        sessionToken
    });
};

const getTokenAfterAuth = async () => {
    const result = await getAccessToken();
    const loginMethod = await getLoginMethod();
    if (!result || !loginMethod) {
        throw new Error('No authentication credentials found');
    }
    return { token: result, loginMethod: loginMethod };
};

const aiStateService = interpret(aiMachine.withConfig({
    services: {
        checkToken: checkToken,
        openLogin: openLogin,
        validateApiKey: validateApiKeyService,
        validateAwsCredentials: validateAwsCredentialsService,
        getTokenAfterAuth: getTokenAfterAuth,
    },
    actions: {
        logout: () => {
            logout();
        },
        silentLogout: () => {
            logout(false);
        },
    }
}));

const isExtendedEvent = <K extends AIMachineEventType>(
    arg: K | AIMachineSendableEvent
): arg is Extract<AIMachineSendableEvent, { type: K }> => {
    return typeof arg !== "string";
};

export const AIStateMachine = {
    initialize: () => aiStateService.start(),
    service: () => { return aiStateService; },
    context: () => { return aiStateService.getSnapshot().context; },
    state: () => { return aiStateService.getSnapshot().value as AIMachineStateValue; },
    sendEvent: <K extends AIMachineEventType>(
        event: K | Extract<AIMachineSendableEvent, { type: K }>
    ) => {
        if (isExtendedEvent(event)) {
            aiStateService.send(event as AIMachineSendableEvent);
        } else {
            aiStateService.send({ type: event } as AIMachineSendableEvent);
        }
    }
};
