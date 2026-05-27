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

import { commands, window, workspace as vscodeWorkspace } from 'vscode';
import { BallerinaExtension, ExtendedLangClient } from '../../core';
import { activateCopilotLoginCommand, resetBIAuth } from './completions';
import { ProcessMappingParametersRequest } from '@wso2/ballerina-core';
import { CopilotEventHandler } from './utils/events';
import { addConfigFile, getConfigFilePath } from './utils';
import {
    CONFIGURE_DEFAULT_MODEL_COMMAND,
    DEFAULT_EMBEDDING_PROVIDER_ADDED,
    DEFAULT_PROVIDER_ADDED,
    LOGIN_REQUIRED_WARNING_FOR_DEFAULT_EMBEDDING,
    LOGIN_REQUIRED_WARNING_FOR_DEFAULT_MODEL,
    SIGN_IN_BI_COPILOT
} from './constants';
import {
    TOKEN_NOT_AVAILABLE_ERROR_MESSAGE,
    NO_AUTH_CREDENTIALS_FOUND,
    TOKEN_REFRESH_ONLY_SUPPORTED_FOR_BI_INTEL
} from '../..//utils/ai/auth';
import { AIStateMachine } from '../../views/ai-panel/aiMachine';
import { AIMachineEventType, DefaultProviderKind, GenerateAgentCodeRequest, ExecutionContext } from '@wso2/ballerina-core';
import { generateMappingCodeCore } from './data-mapper';
import { resolveProjectPath } from '../../utils/project-utils';
import { MESSAGES } from '../project';
import { AICommandConfig } from './executors/base/AICommandExecutor';
import { AgentExecutor } from './agent/AgentExecutor';
import { initMcpClientManager, disposeMcpClientManager, watchMcpConfig, getMcpClientManager, type EnabledOverrideStore } from './agent/mcp';
import { registerAgentsMdWatcher } from './agent/agentsMd';
import { resolveProjectRootPath } from './agent';
import { extension } from '../../BalExtensionContext';
import { notifyMcpServersChanged, notifyMcpLoadErrorsChanged, notifyMcpGroupStatesChanged } from '../../RPCLayer';
import { sendConfigChangeNotification } from './utils/ai-utils';

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
    activateMcp();
    extension.context?.subscriptions.push(registerAgentsMdWatcher());

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

    commands.registerCommand(CONFIGURE_DEFAULT_MODEL_COMMAND, async (kind: DefaultProviderKind = "model") => {
        const isEmbedding = kind === "embedding";
        const promptTitle = isEmbedding
            ? "Select an integration to configure default embedding provider"
            : "Select an integration to configure default model provider";
        const loginWarning = isEmbedding ? LOGIN_REQUIRED_WARNING_FOR_DEFAULT_EMBEDDING : LOGIN_REQUIRED_WARNING_FOR_DEFAULT_MODEL;
        const successMessage = isEmbedding ? DEFAULT_EMBEDDING_PROVIDER_ADDED : DEFAULT_PROVIDER_ADDED;
        const retryFailureLabel = isEmbedding ? "default embedding" : "default model";

        const targetPath = await resolveProjectPath(promptTitle);
        if (!targetPath) {
            window.showErrorMessage(MESSAGES.NO_PROJECT_FOUND);
            return;
        }

        const configPath = await getConfigFilePath(ballerinaExternalInstance, targetPath);
        if (configPath !== null) {
            try {
                const result = await addConfigFile(configPath, kind);
                if (result) {
                    window.showInformationMessage(successMessage);
                }
            } catch (error) {
                if ((error as Error).message === TOKEN_NOT_AVAILABLE_ERROR_MESSAGE || (error as Error).message === TOKEN_REFRESH_ONLY_SUPPORTED_FOR_BI_INTEL || (error as Error).message === NO_AUTH_CREDENTIALS_FOUND) {
                    window.showWarningMessage(loginWarning, SIGN_IN_BI_COPILOT).then(selection => {
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
                                    addConfigFile(configPath, kind).then(result => {
                                        if (result) {
                                            window.showInformationMessage(successMessage);
                                        }
                                    }).catch(retryError => {
                                        window.showErrorMessage(`Failed to configure ${retryFailureLabel}: ${(retryError as Error).message}`);
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

const MCP_ENABLED_OVERRIDE_KEY = 'ballerina.copilot.mcp.enabledOverrides';
const MCP_ENABLE_SETTING = 'copilot.enableMcpTools';
const MCP_PREVIEW_SETTING = 'copilot.mcp.preview';

let mcpWatchDisposer: (() => void) | null = null;
let mcpTrustDisposable: { dispose(): void } | null = null;

function isMcpPreviewEnabled(): boolean {
    return vscodeWorkspace.getConfiguration('ballerina').get<boolean>(MCP_PREVIEW_SETTING, false);
}

function isMcpEnabled(): boolean {
    return vscodeWorkspace.getConfiguration('ballerina').get<boolean>(MCP_ENABLE_SETTING, false);
}

// MCP runs only when the feature is in preview (master gate) and the user enabled it.
function shouldRunMcp(): boolean {
    return isMcpPreviewEnabled() && isMcpEnabled();
}

function setupMcp(): void {
    if (getMcpClientManager()) {
        // Already set up; nothing to do.
        return;
    }
    // Override store keys are `${scope}:${name}` (e.g. `workspace:foo`).
    const overrides: EnabledOverrideStore = {
        get(scopedKey) {
            const map = extension.context?.globalState.get<Record<string, boolean>>(MCP_ENABLED_OVERRIDE_KEY) ?? {};
            return Object.prototype.hasOwnProperty.call(map, scopedKey) ? map[scopedKey] : undefined;
        },
        async set(scopedKey, enabled) {
            const map = { ...(extension.context?.globalState.get<Record<string, boolean>>(MCP_ENABLED_OVERRIDE_KEY) ?? {}) };
            map[scopedKey] = enabled;
            await extension.context?.globalState.update(MCP_ENABLED_OVERRIDE_KEY, map);
        },
        async delete(scopedKey) {
            const current = extension.context?.globalState.get<Record<string, boolean>>(MCP_ENABLED_OVERRIDE_KEY) ?? {};
            if (!Object.prototype.hasOwnProperty.call(current, scopedKey)) { return; }
            const map = { ...current };
            delete map[scopedKey];
            await extension.context?.globalState.update(MCP_ENABLED_OVERRIDE_KEY, map);
        },
        keys() {
            return Object.keys(extension.context?.globalState.get<Record<string, boolean>>(MCP_ENABLED_OVERRIDE_KEY) ?? {});
        },
    };
    const workspacePath = resolveProjectRootPath() || undefined;
    const workspaceTrusted = vscodeWorkspace.isTrusted;
    const manager = initMcpClientManager(overrides, workspacePath, workspaceTrusted);
    const pushUpdate = () => {
        try {
            notifyMcpServersChanged(manager.listServers());
            notifyMcpLoadErrorsChanged(manager.getLoadErrors());
            notifyMcpGroupStatesChanged(manager.getGroupStates());
        } catch (err) {
            console.warn('[mcp] Failed to push servers-changed notification:', err);
        }
    };
    // Initial connect — fire and forget; failures are recorded per-server, not thrown.
    manager.refresh()
        .then(() => manager.pruneOrphanOverrides())
        .then(pushUpdate)
        .catch(err => console.warn('[mcp] Initial refresh failed:', err));
    // Project-tree .mcp.json is watched too; the watcher fires whether or not
    // workspace trust has been granted, but loadMcpConfig will skip the file
    // until trust + workspace path are both set.
    mcpWatchDisposer = watchMcpConfig(workspacePath, () => {
        manager.refresh().then(pushUpdate).catch(err => console.warn('[mcp] Watch-triggered refresh failed:', err));
    });
    // React to workspace trust being granted mid-session — workspace-scope
    // servers come online without a window reload.
    mcpTrustDisposable = vscodeWorkspace.onDidGrantWorkspaceTrust(() => {
        manager.setWorkspaceTrusted(true).then(pushUpdate).catch(err => console.warn('[mcp] Trust-grant refresh failed:', err));
    });
}

async function teardownMcp(): Promise<void> {
    if (mcpWatchDisposer) {
        try { mcpWatchDisposer(); } catch { /* ignore */ }
        mcpWatchDisposer = null;
    }
    if (mcpTrustDisposable) {
        try { mcpTrustDisposable.dispose(); } catch { /* ignore */ }
        mcpTrustDisposable = null;
    }
    await disposeMcpClientManager();
    try {
        notifyMcpServersChanged([]);
        notifyMcpLoadErrorsChanged({});
        notifyMcpGroupStatesChanged({ user: true, workspace: true });
    } catch (err) {
        console.warn('[mcp] Failed to push empty servers list on teardown:', err);
    }
}

function activateMcp(): void {
    if (shouldRunMcp()) {
        setupMcp();
    }
    const disposable = vscodeWorkspace.onDidChangeConfiguration((e) => {
        const previewChanged = e.affectsConfiguration(`ballerina.${MCP_PREVIEW_SETTING}`);
        const enableChanged = e.affectsConfiguration(`ballerina.${MCP_ENABLE_SETTING}`);
        if (!previewChanged && !enableChanged) {
            return;
        }
        if (shouldRunMcp()) {
            setupMcp();
        } else {
            teardownMcp().catch(err => console.warn('[mcp] teardown failed:', err));
        }
        if (previewChanged) {
            sendConfigChangeNotification('mcpPreview', isMcpPreviewEnabled());
        }
        if (enableChanged) {
            sendConfigChangeNotification('mcpToolsEnabled', isMcpEnabled());
        }
    });
    extension.context?.subscriptions.push(disposable);
}
