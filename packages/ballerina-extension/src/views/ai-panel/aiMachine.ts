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
import * as vscode from 'vscode';
import { AIMachineStateValue, AIPanelPrompt, AIMachineEventValue, AIMachineEventType, AIMachineContext, AIUserToken } from '@wso2/ballerina-core';
import { AiPanelWebview } from './webview';
import { getAuthUrl, getLogoutUrl } from './auth';
import { extension } from '../../BalExtensionContext';
import { ACCESS_TOKEN_SECRET_KEY, getAccessToken, REFRESH_TOKEN_SECRET_KEY } from '../../utils/ai/auth';

export const USER_CHECK_BACKEND_URL = '/user/usage';

export const openAIWebview = (defaultprompt?: AIPanelPrompt) => {
    extension.aiChatDefaultPrompt = defaultprompt;
    if (!AiPanelWebview.currentPanel) {
        AiPanelWebview.currentPanel = new AiPanelWebview();
    } else {
        AiPanelWebview.currentPanel!.getWebview()?.reveal();
    }
};

export const closeAIWebview = () => {
    if (AiPanelWebview.currentPanel) {
        AiPanelWebview.currentPanel.dispose();
        AiPanelWebview.currentPanel = undefined;
    }
};

const aiMachine = createMachine<AIMachineContext, AIMachineEventValue>({
    id: 'ballerina-ai',
    initial: 'Initialize',
    predictableActionArguments: true,
    context: {
        userToken: undefined,
        errorMessage: undefined,
    },
    on: {
        DISPOSE: {
            target: 'Initialize',
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
                            userToken: (_ctx, event) => event.data as AIUserToken,
                        })
                    },
                    {
                        target: 'Unauthenticated',
                    }
                ],
                onError: [
                    {
                        cond: (_ctx, event) => event.data?.message === 'TOKEN_EXPIRED',
                        target: 'Unauthenticated',
                        actions: [
                            'silentLogout'
                        ]
                    },
                    {
                        target: 'Disabled',
                        actions: assign({
                            errorMessage: (_ctx, event) => event.data?.message || 'Unknown error'
                        })
                    }
                ]
            }
        },
        Unauthenticated: {
            on: {
                LOGIN: 'Authenticating'
            }
        },
        Authenticating: {
            invoke: {
                id: 'openLogin',
                src: 'openLogin',
                onError: {
                    target: 'Unauthenticated'
                }
            },
            on: {
                [AIMachineEventType.LOGIN_SUCCESS]: {
                    target: 'Authenticated',
                },
                [AIMachineEventType.CANCEL_LOGIN]: {
                    target: 'Unauthenticated'
                }
            }
        },
        Authenticated: {
            on: {
                [AIMachineEventType.LOGOUT]: {
                    target: 'Unauthenticated',
                    actions: [
                        'logout',
                        assign({
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
                    target: 'Initialize'
                }
            }
        },
    }
});

const checkToken = async (context, event): Promise<AIUserToken | undefined> => {
    return new Promise(async (resolve, reject) => {
        try {
            const accessToken = await getAccessToken();
            if (!accessToken) {
                resolve(undefined);
                return;
            }
            resolve({ accessToken, usageTokens: undefined });
        } catch (error) {
            reject(error);
        }
    });
};

const logout = async (isUserLogout: boolean = true) => {
    if (isUserLogout) {
        const logoutURL = await getLogoutUrl();
        vscode.env.openExternal(vscode.Uri.parse(logoutURL));
    }
    await extension.context.secrets.delete(ACCESS_TOKEN_SECRET_KEY);
    await extension.context.secrets.delete(REFRESH_TOKEN_SECRET_KEY);
};

const openLogin = async (context, event) => {
    return new Promise(async (resolve, reject) => {
        try {
            const status = await initiateInbuiltAuth();
            if (!status) {
                aiStateService.send(AIMachineEventType.CANCEL_LOGIN);
            }
        } catch (error) {
            reject(error);
        }
    });
};

async function initiateInbuiltAuth() {
    const callbackUri = await vscode.env.asExternalUri(
        vscode.Uri.parse(`${vscode.env.uriScheme}://wso2.ballerina/signin`)
    );
    const oauthURL = await getAuthUrl(callbackUri.toString());
    return vscode.env.openExternal(vscode.Uri.parse(oauthURL));
}

const aiStateService = interpret(aiMachine.withConfig({
    services: {
        checkToken: checkToken,
        openLogin: openLogin,
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

export const AIStateMachine = {
    initialize: () => aiStateService.start(),
    service: () => { return aiStateService; },
    context: () => { return aiStateService.getSnapshot().context; },
    state: () => { return aiStateService.getSnapshot().value as AIMachineStateValue; },
    sendEvent: (eventType: AIMachineEventType) => { aiStateService.send({ type: eventType }); }
};
