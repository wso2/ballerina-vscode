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
import { extension } from '../../BalExtensionContext';
import * as crypto from 'crypto';
import * as path from 'path';
import { AIChatMachineContext, AIChatMachineEventType, AIChatMachineSendableEvent, AIChatMachineStateValue, ChatMessage, Plan, Task, TaskStatus, UIChatHistoryMessage, Checkpoint } from '@wso2/ballerina-core/lib/state-machine-types';
import { workspace } from 'vscode';
import { GenerateAgentCodeRequest, CodeContext } from '@wso2/ballerina-core/lib/rpc-types/ai-panel/interfaces';
import { generateDesign } from '../../features/ai/service/design/design';
import { captureWorkspaceSnapshot, restoreWorkspaceSnapshot } from './checkpoint/checkpointUtils';
import { getCheckpointConfig } from './checkpoint/checkpointConfig';
import { notifyCheckpointCaptured } from '../../RPCLayer';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const generateSessionId = () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Generates a unique project identifier based on the workspace root path
 * @returns A UUID string for the current project
 */
export const generateProjectId = (): string => {
    const workspaceFolders = workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
        // Fallback for when no workspace is open
        return 'default-project';
    }

    // Use the first workspace folder path to generate a consistent UUID
    const workspacePath = workspaceFolders[0].uri.fsPath;

    // Create a hash of the workspace path for consistent project ID
    const hash = crypto.createHash('sha256');
    hash.update(workspacePath);
    const projectHash = hash.digest('hex').substring(0, 16);

    return `project-${projectHash}`;
};

/**
 * Normalizes codeContext to use relative paths from workspace root
 * @param codeContext The code context with potentially absolute file path
 * @returns CodeContext with relative file path, or undefined if input is undefined
 */
const normalizeCodeContext = (codeContext?: CodeContext): CodeContext | undefined => {
    if (!codeContext) {
        return undefined;
    }

    const workspaceFolders = workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return codeContext;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const absolutePath = path.isAbsolute(codeContext.filePath)
        ? codeContext.filePath
        : path.join(workspaceRoot, codeContext.filePath);

    // Convert to relative path from workspace root
    const relativePath = path.relative(workspaceRoot, absolutePath);

    if (codeContext.type === 'addition') {
        return {
            type: 'addition',
            position: codeContext.position,
            filePath: relativePath
        };
    } else {
        return {
            type: 'selection',
            startPosition: codeContext.startPosition,
            endPosition: codeContext.endPosition,
            filePath: relativePath
        };
    }
};

const addUserMessage = (
    history: ChatMessage[],
    content: string
): ChatMessage[] => {
    const lastMessage = history[history.length - 1];
    const baseHistory = lastMessage && !lastMessage.uiResponse && lastMessage.modelMessages.length === 0
        ? history.slice(0, -1)
        : history;

    return [
        ...baseHistory,
        {
            id: generateId(),
            content,
            uiResponse: '',
            modelMessages: [],
            timestamp: Date.now(),
        },
    ];
};

const updateChatMessage = (
    history: ChatMessage[],
    id: string,
    updates: {
        uiResponse?: string;
        modelMessages?: any[];
    }
): ChatMessage[] => {
    return history.map(msg => {
        if (msg.id === id) {
            return {
                ...msg,
                uiResponse: updates.uiResponse !== undefined ? updates.uiResponse : msg.uiResponse,
                modelMessages: updates.modelMessages !== undefined ? updates.modelMessages : msg.modelMessages,
            };
        }
        return msg;
    });
};

const cleanupOldCheckpoints = (checkpoints: Checkpoint[]): Checkpoint[] => {
    const config = getCheckpointConfig();
    if (checkpoints.length <= config.maxCount) {
        return checkpoints;
    }
    return checkpoints.slice(-config.maxCount);
};

const captureCheckpointAction = (context: AIChatMachineContext) => {
    const lastMessage = context.chatHistory[context.chatHistory.length - 1];
    if (!lastMessage) {
        return;
    }

    captureWorkspaceSnapshot(lastMessage.id).then(checkpoint => {
        if (checkpoint) {
            lastMessage.checkpointId = checkpoint.id;
            const updatedCheckpoints = cleanupOldCheckpoints([...(context.checkpoints || []), checkpoint]);
            context.checkpoints = updatedCheckpoints;
            saveChatState(context);

            // Notify frontend that checkpoint is captured
            notifyCheckpointCaptured({
                messageId: lastMessage.id,
                checkpointId: checkpoint.id
            });
        }
    }).catch(error => {
        console.error('[Checkpoint] Failed to capture checkpoint:', error);
    });
};

const restoreCheckpointAction = (context: AIChatMachineContext, event: any) => {
    const checkpointId = event.payload.checkpointId;
    const checkpoint = context.checkpoints?.find(c => c.id === checkpointId);

    if (!checkpoint) {
        console.error(`[Checkpoint] Checkpoint ${checkpointId} not found`);
        return;
    }

    const messageIndex = context.chatHistory.findIndex(m => m.id === checkpoint.messageId);
    const restoredHistory = messageIndex >= 0 ? context.chatHistory.slice(0, messageIndex) : context.chatHistory;

    const checkpointIndex = context.checkpoints?.findIndex(c => c.id === checkpointId) || 0;
    const restoredCheckpoints = checkpointIndex >= 0 ? (context.checkpoints?.slice(0, checkpointIndex) || []) : (context.checkpoints || []);

    context.chatHistory = restoredHistory;
    context.checkpoints = restoredCheckpoints;
    context.currentPlan = undefined;
    context.currentTaskIndex = -1;

    saveChatState(context);

    restoreWorkspaceSnapshot(checkpoint).then(() => {

    }).catch(error => {
        console.error('[Checkpoint] Failed to restore workspace snapshot:', error);
    });
};

const chatMachine = createMachine<AIChatMachineContext, AIChatMachineSendableEvent>({
    /** @xstate-layout N4IgpgJg5mDOIC5QCMCGAbdYBOBLAdqgLSq5EDGAFqgC4B0AwtmLQVAArqr4DEEA9vjB0CAN34BrYeWa0wnbgG0ADAF1EoAA79YuGrkEaQAD0QBmACxm6ZgJzKAbACZbTpwEYnZ97YA0IAE9EAHZg9zoADk8HZQBWW2DHC1iLAF9U-zRMHAJiUgpqeiYWfXwOLl4cbH5sOk0uGgAzGoBbOhkS+QqVdSQQbV19Qz7TBEtrO0cXN09vP0DECIdYuidl4KcLdwdgiPtY9MyMLDxCEjIqWjoAVU0IVjKFXgEhEXxxKToAVzu5J56jAM9AZ8EZRuMbPZnK4PF4fP4gghYhELHQoWYHLZYsEHO5YrEzIcQFkTrlzgUrrd7qVytweFUanUGs1sG0ftSuko1ICdMDhqBwVZIVMYbN4QsEDsIjZ4hYIqFgpZlMo0hlicccmd8pd6ABRYxgchfGkAFVQsAkfEEwjEkmEYANRpoYDNFoBfSBQ1BI3MQsm0JmcPmiKidAstgjtnD9lcZkcRJJmryF0KdH1huNbFdloZtXqtBZbQdGed2fdWl5XrBvomUOmsLmCMQ7mCqKx3nc3giUQcUWCCY1p2TFPoADECGAaF98FnzZaXjb3na6I0J1OhGXuR7KyDq2M-XXRUGm2NcZF4pYsRE1sjVUdskPyTq6OOhOvZxb6dhqnnma0V2u04unO5b9Du-ImDWwoBg24qIms0oWFM3hmBEKSdoSRL4PwEBwEYiaPtqhQ8oMu4+ggRBmNYiSxEkeLuHsSGxCeRArJGEZOPKtF2O4cQDg+ZJEVcACSEBYCRfLegKzadqsDHBLE7jbE42JKSe4ZOHQnacS416Yg4yQHGqBGCSmVzFA8tJSWBpEQaM7ioi44ZmLeURxFiJ44ppyqxF4yhLDETitvxpJamZ9BPAASmAoi4GAADuElVuR6E2FYOIRGYwRQnBiDxIhDjOIqqH2N2d7qgJYUjjcvw0k8SVkdJSK2GiUwWBYQVbBsYQnvEwR0A4ZhOT52L4u4IVJk+qbpk6H4SA1dmIMkdAEvszgMVGjhmCeaErfl14ooNPhWBNhHhXQACC8WkDS1ywDgF3kMlFa2dZoypeMGVZTlwbNteYbZb2sp2IN+KnaZ1WvpO05zQtb1LU4J6ceE2kKVlWy8di4NVc+ACKXxwF6bB3TgcN7iiNhDcoazZT4g2OCeqEOANQ1LCDth7INmH3qFw7Pgw-AtPUk6QGT5EU1RTjUzsth03GDg7fYdDKDxHVxoqnZGTzk1CXq341GLTUfelvbfY4uUIIk-XIjEVEdTe8bpKkQA */
    id: "ballerina-ai-chat",
    initial: "Idle",
    predictableActionArguments: true,
    context: {
        chatHistory: [],
        currentPlan: undefined,
        currentTaskIndex: -1,
        currentQuestion: undefined,
        errorMessage: undefined,
        sessionId: undefined,
        projectId: undefined,
        currentApproval: undefined,
        autoApproveEnabled: false,
        previousState: undefined,
        currentSpec: undefined,
        isPlanMode: true,
        checkpoints: [],
    } as AIChatMachineContext,
    on: {
        [AIChatMachineEventType.SUBMIT_PROMPT]: {
            target: "Initiating",
            actions: [
                assign({
                    chatHistory: (ctx, event) => addUserMessage(ctx.chatHistory, event.payload.prompt),
                    errorMessage: (_ctx) => undefined,
                    isPlanMode: (_ctx, event) => event.payload.isPlanMode,
                    codeContext: (_ctx, event) => normalizeCodeContext(event.payload.codeContext),
                }),
                "captureCheckpoint",
            ],
        },
        [AIChatMachineEventType.UPDATE_CHAT_MESSAGE]: {
            actions: assign({
                chatHistory: (ctx, event) => {
                    const { id, modelMessages, uiResponse } = event.payload;
                    return updateChatMessage(ctx.chatHistory, id, { uiResponse, modelMessages });
                },
            }),
        },
        [AIChatMachineEventType.ENABLE_AUTO_APPROVE]: {
            actions: assign({
                autoApproveEnabled: (_ctx) => true,
            }),
        },
        [AIChatMachineEventType.DISABLE_AUTO_APPROVE]: {
            actions: assign({
                autoApproveEnabled: (_ctx) => false,
            }),
        },
        [AIChatMachineEventType.RESET]: {
            target: "Idle",
            actions: [
                "clearChatState",
                assign({
                    chatHistory: (_ctx) => [],
                    currentPlan: (_ctx) => undefined,
                    currentTaskIndex: (_ctx) => -1,
                    currentQuestion: (_ctx) => undefined,
                    errorMessage: (_ctx) => undefined,
                    sessionId: (_ctx) => undefined,
                    checkpoints: (_ctx) => [],
                }),
            ],
        },
        [AIChatMachineEventType.RESTORE_STATE]: {
            target: "Idle",
            actions: assign({
                chatHistory: (_ctx, event) => event.payload.state.chatHistory,
                currentPlan: (_ctx, event) => event.payload.state.currentPlan,
                currentTaskIndex: (_ctx, event) => event.payload.state.currentTaskIndex,
                currentQuestion: (_ctx, event) => event.payload.state.currentQuestion,
                errorMessage: (_ctx) => undefined,
                sessionId: (_ctx, event) => event.payload.state.sessionId,
            }),
        },
        [AIChatMachineEventType.RESTORE_CHECKPOINT]: {
            target: "Idle",
            actions: ["restoreCheckpoint"],
        },
        [AIChatMachineEventType.ERROR]: {
            target: "Error",
            actions: assign({
                errorMessage: (_ctx, event) => event.payload.message,
            }),
        },
        [AIChatMachineEventType.CONNECTOR_GENERATION_REQUESTED]: {
            target: "WaitingForConnectorSpec",
            actions: assign({
                previousState: (ctx, event, meta) => {
                    if (event.payload.fromState) {
                        return event.payload.fromState;
                    }
                    const currentState = meta?.state?.value as AIChatMachineStateValue;
                    if (currentState) {
                        return currentState;
                    }
                    return ctx.previousState || "GeneratingPlan";
                },
                currentSpec: (_ctx, event) => ({
                    requestId: event.payload.requestId,
                }),
            }),
        },
        [AIChatMachineEventType.FINISH_EXECUTION]: [
            {
                cond: (ctx) => {
                    if (!ctx.currentPlan) {
                        return false;
                    }
                    const pendingTasks = ctx.currentPlan.tasks.filter((task) => task.status === TaskStatus.PENDING);
                    return pendingTasks.length > 0;
                },
                target: "PartiallyCompleted",
            },
            {
                target: "Completed",
            },
        ],
    },
    states: {
        Idle: {
            entry: assign({
                sessionId: (_ctx) => generateSessionId(),
                projectId: (_ctx) => generateProjectId(),
            }),
        },
        //TODO : Optional state we can remove if not needed. its just to show that generation is starting.
        Initiating: {
            entry: "saveChatState",
            invoke: {
                id: "startGeneration",
                src: "startGeneration",
            },
            on: {
                [AIChatMachineEventType.PLANNING_STARTED]: {
                    target: "GeneratingPlan",
                },
            },
        },
        GeneratingPlan: {
            entry: "saveChatState",
            on: {
                [AIChatMachineEventType.PLAN_GENERATED]: {
                    target: "PlanReview",
                    actions: assign({
                        currentPlan: (_ctx, event) => event.payload.plan,
                    }),
                },
            },
        },
        PlanReview: {
            entry: "saveChatState",
            on: {
                [AIChatMachineEventType.APPROVE_PLAN]: {
                    target: "ApprovedPlan",
                    actions: assign({
                        currentTaskIndex: (_ctx) => -1,
                    }),
                },
                [AIChatMachineEventType.REJECT_PLAN]: {
                    target: "GeneratingPlan",
                    actions: assign({
                        currentApproval: (_ctx, event) => ({
                            comment: event.payload.comment,
                        }),
                    }),
                },
            },
        },
        ApprovedPlan: {
            entry: "saveChatState",
            on: {
                [AIChatMachineEventType.START_TASK_EXECUTION]: {
                    target: "ExecutingTask",
                    actions: assign({
                        currentTaskIndex: (ctx) => ctx.currentTaskIndex + 1,
                    }),
                },
                [AIChatMachineEventType.PLANNING_STARTED]: {
                    target: "GeneratingPlan",
                },
            },
        },
        ExecutingTask: {
            entry: [
                "saveChatState",
                assign({
                    currentPlan: (ctx) => {
                        if (!ctx.currentPlan) {
                            return ctx.currentPlan;
                        }
                        return {
                            ...ctx.currentPlan,
                            tasks: ctx.currentPlan.tasks.map((task, index) =>
                                index === ctx.currentTaskIndex ? { ...task, status: TaskStatus.IN_PROGRESS } : task
                            ),
                            updatedAt: Date.now(),
                        };
                    },
                }),
            ],
            on: {
                [AIChatMachineEventType.TASK_COMPLETED]: {
                    target: "TaskReview",
                    actions: assign({
                        currentPlan: (ctx) => {
                            if (!ctx.currentPlan) {
                                return ctx.currentPlan;
                            }
                            return {
                                ...ctx.currentPlan,
                                tasks: ctx.currentPlan.tasks.map((task, index) =>
                                    index === ctx.currentTaskIndex ? { ...task, status: TaskStatus.REVIEW } : task
                                ),
                                updatedAt: Date.now(),
                            };
                        },
                    }),
                },
            },
        },
        TaskReview: {
            entry: "saveChatState",
            on: {
                [AIChatMachineEventType.APPROVE_TASK]: {
                    target: "ApprovedTask",
                    actions: assign({
                        currentTaskIndex: (ctx, event) => {
                            // If lastApprovedTaskIndex is provided, use it to set the current index
                            // This handles the case where multiple tasks were completed and approved
                            if (event.payload?.lastApprovedTaskIndex !== undefined) {
                                return event.payload.lastApprovedTaskIndex;
                            }
                            return ctx.currentTaskIndex;
                        },
                        currentPlan: (ctx, event) => {
                            if (!ctx.currentPlan) {
                                return ctx.currentPlan;
                            }

                            const lastApprovedIndex =
                                event.payload?.lastApprovedTaskIndex !== undefined
                                    ? event.payload.lastApprovedTaskIndex
                                    : ctx.currentTaskIndex;

                            return {
                                ...ctx.currentPlan,
                                tasks: ctx.currentPlan.tasks.map((task, index) => {
                                    if (task.status === TaskStatus.REVIEW && index <= lastApprovedIndex) {
                                        return { ...task, status: TaskStatus.COMPLETED };
                                    }
                                    return task;
                                }),
                                updatedAt: Date.now(),
                            };
                        },
                    }),
                },
                [AIChatMachineEventType.REJECT_TASK]: {
                    target: "RejectedTask",
                    actions: assign({
                        currentApproval: (_ctx, event) => ({
                            comment: event.payload.comment,
                        }),
                        currentTaskIndex: (ctx) => ctx.currentTaskIndex - 1,
                        currentPlan: (ctx) => {
                            if (!ctx.currentPlan) {
                                return ctx.currentPlan;
                            }
                            return {
                                ...ctx.currentPlan,
                                tasks: ctx.currentPlan.tasks.map((task, index) =>
                                    index === ctx.currentTaskIndex ? { ...task, status: TaskStatus.COMPLETED } : task
                                ),
                                updatedAt: Date.now(),
                            };
                        },
                    }),
                },
            },
        },
        ApprovedTask: {
            entry: "saveChatState",
            on: {
                [AIChatMachineEventType.START_TASK_EXECUTION]: [
                    {
                        cond: (ctx) =>
                            ctx.currentPlan !== undefined && ctx.currentTaskIndex < ctx.currentPlan.tasks.length - 1,
                        target: "ExecutingTask",
                        actions: assign({
                            currentTaskIndex: (ctx) => ctx.currentTaskIndex + 1,
                        }),
                    },
                    {
                        target: "Completed",
                    },
                ],
            },
        },
        RejectedTask: {
            entry: "saveChatState",
            on: {
                [AIChatMachineEventType.START_TASK_EXECUTION]: {
                    target: "ExecutingTask",
                    actions: assign({
                        currentTaskIndex: (ctx) => ctx.currentTaskIndex + 1,
                    }),
                },
                [AIChatMachineEventType.PLAN_GENERATED]: {
                    target: "PlanReview",
                    actions: assign({
                        currentPlan: (_ctx, event) => event.payload.plan,
                    }),
                },
            },
        },
        Completed: {
            entry: "saveChatState",
        },
        PartiallyCompleted: {
            entry: "saveChatState",
            on: {
                [AIChatMachineEventType.START_TASK_EXECUTION]: {
                    target: "ExecutingTask",
                    actions: assign({
                        currentTaskIndex: (ctx) => ctx.currentTaskIndex + 1,
                    }),
                },
            },
        },
        WaitingForConnectorSpec: {
            entry: "saveChatState",
            on: {
                [AIChatMachineEventType.PROVIDE_CONNECTOR_SPEC]: [
                    {
                        target: "GeneratingPlan",
                        cond: (ctx) => {
                            console.log("[State Machine] PROVIDE_CONNECTOR_SPEC: previousState =", ctx.previousState);
                            return ctx.previousState === "GeneratingPlan";
                        },
                        actions: assign({
                            currentSpec: (ctx, event) => ({
                                ...ctx.currentSpec,
                                requestId: event.payload.requestId,
                                spec: event.payload.spec,
                                provided: true,
                            }),
                        }),
                    },
                    {
                        target: "Initiating",
                        cond: (ctx) => ctx.previousState === "Initiating",
                        actions: assign({
                            currentSpec: (ctx, event) => ({
                                ...ctx.currentSpec,
                                requestId: event.payload.requestId,
                                spec: event.payload.spec,
                                provided: true,
                            }),
                        }),
                    },
                    {
                        target: "ExecutingTask",
                        actions: assign({
                            currentSpec: (ctx, event) => ({
                                ...ctx.currentSpec,
                                requestId: event.payload.requestId,
                                spec: event.payload.spec,
                                provided: true,
                            }),
                        }),
                    },
                ],
                [AIChatMachineEventType.SKIP_CONNECTOR_GENERATION]: [
                    {
                        target: "GeneratingPlan",
                        cond: (ctx) => {
                            console.log(
                                "[State Machine] SKIP_CONNECTOR_GENERATION: previousState =",
                                ctx.previousState
                            );
                            return ctx.previousState === "GeneratingPlan";
                        },
                        actions: assign({
                            currentSpec: (ctx, event) => ({
                                ...ctx.currentSpec,
                                requestId: event.payload.requestId,
                                skipped: true,
                                comment: event.payload.comment,
                            }),
                        }),
                    },
                    {
                        target: "Initiating",
                        cond: (ctx) => ctx.previousState === "Initiating",
                        actions: assign({
                            currentSpec: (ctx, event) => ({
                                ...ctx.currentSpec,
                                requestId: event.payload.requestId,
                                skipped: true,
                                comment: event.payload.comment,
                            }),
                        }),
                    },
                    {
                        target: "ExecutingTask",
                        actions: assign({
                            currentSpec: (ctx, event) => ({
                                ...ctx.currentSpec,
                                requestId: event.payload.requestId,
                                skipped: true,
                                comment: event.payload.comment,
                            }),
                        }),
                    },
                ],
            },
        },
        Error: {
            on: {
                [AIChatMachineEventType.RETRY]: [
                    {
                        cond: (ctx) => ctx.currentPlan !== undefined,
                        target: "PlanReview",
                        actions: assign({
                            errorMessage: (_ctx) => undefined,
                        }),
                    },
                    {
                        target: "Idle",
                        actions: assign({
                            errorMessage: (_ctx) => undefined,
                        }),
                    },
                ],
                [AIChatMachineEventType.RESET]: {
                    target: "Idle",
                },
            },
        },
    },
});

// Service implementations
const convertChatHistoryToModelMessages = (chatHistory: ChatMessage[]): any[] => {
    const messages: any[] = [];

    for (const msg of chatHistory) {
        if (msg.modelMessages && msg.modelMessages.length > 0) {
            messages.push(...msg.modelMessages);
        }
    }

    return messages;
};

const convertChatHistoryToUIMessages = (chatHistory: ChatMessage[]): UIChatHistoryMessage[] => {
    const messages: UIChatHistoryMessage[] = [];
    const lastMessage = chatHistory[chatHistory.length - 1];
    const historyToConvert = lastMessage && !lastMessage.uiResponse ? chatHistory.slice(0, -1) : chatHistory;

    for (const msg of historyToConvert) {

        messages.push({
            role: 'user',
            content: msg.content,
            checkpointId: msg.checkpointId,
            messageId: msg.id
        });

        if (msg.uiResponse) {
            messages.push({
                role: 'assistant',
                content: msg.uiResponse
            });
        }
    }

    return messages;
};

const startGenerationService = async (context: AIChatMachineContext): Promise<void> => {
    const lastMessage = context.chatHistory[context.chatHistory.length - 1];
    const usecase = lastMessage?.content;
    const previousHistory = context.chatHistory.slice(0, -1);
    const messageId = lastMessage?.id;

    const requestBody: GenerateAgentCodeRequest = {
        usecase: usecase,
        chatHistory: convertChatHistoryToModelMessages(previousHistory),
        operationType: "CODE_GENERATION",
        fileAttachmentContents: [],
        messageId: messageId,
        isPlanMode: context.isPlanMode ?? true,
        codeContext: context.codeContext,
    };

    generateDesign(requestBody).catch(error => {
        console.error('[startGenerationService] Error:', error);
        chatStateService.send({
            type: AIChatMachineEventType.ERROR,
            payload: { message: error.message || 'Failed to generate plan' }
        });
    });
};


// State persistence functions
const CHAT_STATE_STORAGE_KEY_PREFIX = 'ballerina.ai.chat.state';

/**
 * Gets the storage key for the current project
 * @param projectId The project identifier
 * @returns The storage key for this project
 */
const getStorageKey = (projectId: string): string => {
    return `${CHAT_STATE_STORAGE_KEY_PREFIX}.${projectId}`;
};

/**
 * Saves the chat state for the current project
 * @param context The chat machine context
 */
const saveChatState = (context: AIChatMachineContext) => {
    try {
        if (!context.projectId) {
            console.warn("No project ID available, skipping state save");
            return;
        }

        const stateToSave = {
            chatHistory: context.chatHistory,
            currentPlan: context.currentPlan,
            currentTaskIndex: context.currentTaskIndex,
            sessionId: context.sessionId,
            projectId: context.projectId,
            checkpoints: context.checkpoints || [],
            savedAt: Date.now(),
        };

        const storageKey = getStorageKey(context.projectId);
        extension.context?.globalState.update(storageKey, stateToSave);

        // Also save a list of all project IDs for management purposes
        const allProjectIds =
            extension.context?.globalState.get<string[]>(`${CHAT_STATE_STORAGE_KEY_PREFIX}.projects`) || [];
        if (!allProjectIds.includes(context.projectId)) {
            allProjectIds.push(context.projectId);
            extension.context?.globalState.update(`${CHAT_STATE_STORAGE_KEY_PREFIX}.projects`, allProjectIds);
        }
    } catch (error) {
        console.error("Failed to save chat state:", error);
    }
};

/**
 * Clears the chat state for a specific project
 * @param context The chat machine context
 */
const clearChatStateAction = (context: AIChatMachineContext) => {
    try {
        if (!context.projectId) {
            console.warn('No project ID available, skipping state clear');
            return;
        }

        const storageKey = getStorageKey(context.projectId);
        extension.context?.globalState.update(storageKey, undefined);
        console.log(`Cleared chat state for project: ${context.projectId}`);
    } catch (error) {
        console.error('Failed to clear chat state:', error);
    }
};

/**
 * Loads the chat state for the current project
 * @param projectId Optional project ID. If not provided, uses current workspace
 * @returns The saved chat state or undefined
 */
export const loadChatState = async (projectId?: string): Promise<AIChatMachineContext | undefined> => {
    try {
        const targetProjectId = projectId || generateProjectId();
        const storageKey = getStorageKey(targetProjectId);
        const savedState = extension.context?.globalState.get<AIChatMachineContext & { savedAt?: number }>(storageKey);

        if (savedState) {
            console.log(`Loaded chat state for project: ${targetProjectId}, saved at: ${savedState.savedAt ? new Date(savedState.savedAt).toISOString() : 'unknown'}`);
        }

        return savedState;
    } catch (error) {
        console.error('Failed to load chat state:', error);
        return undefined;
    }
};

/**
 * Clears the chat state for a specific project or current project
 * @param projectId Optional project ID. If not provided, uses current workspace
 */
export const clearChatState = async (projectId?: string): Promise<void> => {
    try {
        const targetProjectId = projectId || generateProjectId();
        const storageKey = getStorageKey(targetProjectId);
        await extension.context?.globalState.update(storageKey, undefined);
        console.log(`Cleared chat state for project: ${targetProjectId}`);
    } catch (error) {
        console.error('Failed to clear chat state:', error);
    }
};

/**
 * Gets all project IDs that have saved chat states
 * @returns Array of project IDs
 */
export const getAllProjectIds = async (): Promise<string[]> => {
    try {
        return extension.context?.globalState.get<string[]>(`${CHAT_STATE_STORAGE_KEY_PREFIX}.projects`) || [];
    } catch (error) {
        console.error('Failed to get project IDs:', error);
        return [];
    }
};

/**
 * Clears all chat states for all projects
 */
export const clearAllChatStates = async (): Promise<void> => {
    try {
        const projectIds = await getAllProjectIds();

        for (const projectId of projectIds) {
            await clearChatState(projectId);
        }

        // Clear the projects list
        await extension.context?.globalState.update(`${CHAT_STATE_STORAGE_KEY_PREFIX}.projects`, []);
        console.log('Cleared all chat states');
    } catch (error) {
        console.error('Failed to clear all chat states:', error);
    }
};

/**
 * Gets metadata about saved chat states
 * @returns Array of project metadata
 */
export const getChatStateMetadata = async (): Promise<Array<{
    projectId: string;
    workspacePath?: string;
    savedAt?: number;
    sessionId?: string;
    taskCount?: number;
}>> => {
    try {
        const projectIds = await getAllProjectIds();
        const metadata = [];

        for (const projectId of projectIds) {
            const state = await loadChatState(projectId);
            if (state) {
                const savedState = state as AIChatMachineContext & { savedAt?: number };
                metadata.push({
                    projectId,
                    savedAt: savedState.savedAt,
                    sessionId: savedState.sessionId,
                    taskCount: savedState.currentPlan?.tasks.length || 0,
                });
            }
        }

        return metadata;
    } catch (error) {
        console.error('Failed to get chat state metadata:', error);
        return [];
    }
};

// Create and export the state machine service
const chatStateService = interpret(
    chatMachine.withConfig({
        services: {
            startGeneration: startGenerationService
        },
        actions: {
            saveChatState: (context) => saveChatState(context),
            clearChatState: (context) => clearChatStateAction(context),
            captureCheckpoint: (context) => captureCheckpointAction(context),
            restoreCheckpoint: (context, event) => restoreCheckpointAction(context, event),
        },
    })
);

const isExtendedEvent = <K extends AIChatMachineEventType>(
    arg: K | AIChatMachineSendableEvent
): arg is Extract<AIChatMachineSendableEvent, { type: K }> => {
    return typeof arg !== 'string';
};


export const AIChatStateMachine = {
    initialize: () => {
        chatStateService.start();

        // Attempt to restore state on initialization for current project
        const projectId = generateProjectId();
        loadChatState(projectId).then((savedState) => {
            if (savedState && savedState.sessionId && savedState.projectId === projectId) {
                console.log(`Restoring chat state for project: ${projectId}`);
                chatStateService.send({
                    type: AIChatMachineEventType.RESTORE_STATE,
                    payload: { state: savedState },
                });
            } else {
                console.log(`No saved state found for project: ${projectId}, starting fresh`);
            }
        }).catch((error) => {
            console.error('Failed to restore chat state:', error);
        });
    },
    service: () => chatStateService,
    context: () => chatStateService.getSnapshot().context,
    state: () => chatStateService.getSnapshot().value as AIChatMachineStateValue,
    sendEvent: <K extends AIChatMachineEventType>(
        event: K | Extract<AIChatMachineSendableEvent, { type: K }>
    ) => {
        if (isExtendedEvent(event)) {
            chatStateService.send(event as AIChatMachineSendableEvent);
        } else {
            chatStateService.send({ type: event } as AIChatMachineSendableEvent);
        }
    },
    dispose: () => {
        // Save state before disposing
        const context = chatStateService.getSnapshot().context;
        saveChatState(context);
        chatStateService.stop();
    },
    /**
     * Gets the current project ID
     */
    getProjectId: () => {
        return chatStateService.getSnapshot().context.projectId || generateProjectId();
    },
    /**
     * Manually saves the current state
     */
    saveState: () => {
        const context = chatStateService.getSnapshot().context;
        saveChatState(context);
    },
    /**
     * Clears the current project's chat history
     */
    clearHistory: async () => {
        const projectId = chatStateService.getSnapshot().context.projectId;
        if (projectId) {
            await clearChatState(projectId);
        }
        // Send reset event to clear in-memory state
        chatStateService.send({ type: AIChatMachineEventType.RESET });
    },
    /**
     * Gets chat history in UI message format for display
     */
    getUIChatHistory: () => {
        const context = chatStateService.getSnapshot().context;
        return convertChatHistoryToUIMessages(context.chatHistory);
    },
};
