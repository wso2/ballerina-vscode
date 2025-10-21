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
import { AIChatMachineContext, AIChatMachineEventType, AIChatMachineSendableEvent, AIChatMachineStateValue, ChatMessage, Plan, Task, TaskStatus } from '@wso2/ballerina-core/lib/state-machine-types';
import { workspace } from 'vscode';
import { GenerateCodeRequest } from '@wso2/ballerina-core/lib/rpc-types/ai-panel/interfaces';
import { generateDesign } from '../../features/ai/service/design/design';

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

const addChatMessage = (
    history: ChatMessage[],
    role: 'user' | 'assistant' | 'system',
    content: string
): ChatMessage[] => {
    return [
        ...history,
        {
            id: generateId(),
            role,
            content,
            timestamp: Date.now(),
        },
    ];
};

const chatMachine = createMachine<AIChatMachineContext, AIChatMachineSendableEvent>({
    /** @xstate-layout N4IgpgJg5mDOIC5QCMCGAbdYBOBLAdqgLSq5EDGAFqgC4B0AwtmLQVAArqr4DEEA9vjB0CAN34BrYeWa0wnbgG0ADAF1EoAA79YuGrkEaQAD0QBmACxm6ZgJzKAbACZbTpwEYnZ97YA0IAE9EAHZg9zoADk8HZQBWW2DHC1iLAF9U-zRMHAJiUgpqeiYWfXwOLl4cbH5sOk0uGgAzGoBbOhkS+QqVdSQQbV19Qz7TBEtrO0cXN09vP0DECIdYuidl4KcLdwdgiPtY9MyMLDxCEjIqWjoAVU0IVjKFXgEhEXxxKToAVzu5J56jAM9AZ8EZRuMbPZnK4PF4fP4gghYhELHQoWYHLZYsEHO5YrEzIcQFkTrlzgUrrd7qVytweFUanUGs1sG0ftSuko1ICdMDhqBwVZIVMYbN4QsEDsIjZ4hYIqFgpZlMo0hlicccmd8pd6ABRYxgchfGkAFVQsAkfEEwjEkmEYANRpoYDNFoBfSBQ1BI3MQsm0JmcPmiKidAstgjtnD9lcZkcRJJmryF0KdH1huNbFdloZtXqtBZbQdGed2fdWl5XrBvomUOmsLmCMQ7mCqKx3nc3giUQcUWCCY1p2TFPoADECGAaF98FnzZaXjb3na6I0J1OhGXuR7KyDq2M-XXRUGm2NcZF4pYsRE1sjVUdskPyTq6OOhOvZxb6dhqnnma0V2u04unO5b9Du-ImDWwoBg24qIms0oWFM3hmBEKSdoSRL4PwEBwEYiaPtqhQ8oMu4+ggRAOCeRArJGdH0RGmH3qSWoplcACSEBYCRfLegKzadqs7jyrE7jbE42JiSe4ZOHQnZONetjXpiDjJAcaoEWSRFXMUDy0nxYGkRBoy9qs2IRHEBIOM4wS2GYJ67KiBK2C2qmxMomwEgOD5aWx9BPAASmAoi4GAADuPFVuR6E2FYOIRGYtmOHBiDxIh1lOIqqH2N2d7qj5rEjjcvw0k8kVkfxSK2GiUwWBYmVbBsYQnvEwR0A4ZguEhlnBPi7jeSxw7PumTofhI5XGYgyR0M5cTOMJUaOPZEpoTNaXXiiHU+FYA1Jk+qYAIJhaQNLXLAOAHeQUUVkZBmjDF4zxYlUIpQgwmyRYtm9rKdgdfiu2EX5L6ATOZTZhNd1TU4J4KeE8m9YlWzuHE-YaYOvlFQAil8cBemwZ04BDe4ojYnUeTsLm2B1jgnqhDjtZ1Sy-UpVNmEx+WDftOn8C09STpARPkSTbNOOTtk+NTVErfYdDKHY7j1XGiqdupzF7dperfjUguVQ9cW9s9yXBiEyhtciMRs-VN7xukqRAA */
    id: 'ballerina-ai-chat',
    initial: 'Idle',
    predictableActionArguments: true,
    context: {
        initialPrompt: undefined,
        chatHistory: [],
        currentPlan: undefined,
        currentTaskIndex: -1,
        currentQuestion: undefined,
        errorMessage: undefined,
        sessionId: undefined,
        projectId: undefined,
    },
    on: {
        [AIChatMachineEventType.RESET]: {
            target: 'Idle',
            actions: [
                'clearChatState',
                assign({
                    initialPrompt: (_ctx) => undefined,
                    chatHistory: (_ctx) => [],
                    currentPlan: (_ctx) => undefined,
                    currentTaskIndex: (_ctx) => -1,
                    currentQuestion: (_ctx) => undefined,
                    errorMessage: (_ctx) => undefined,
                    sessionId: (_ctx) => undefined,
                    // Keep projectId to maintain project context
                }),
            ],
        },
        [AIChatMachineEventType.RESTORE_STATE]: {
            target: 'PlanReview',
            actions: assign({
                initialPrompt: (_ctx, event) => event.payload.state.initialPrompt,
                chatHistory: (_ctx, event) => event.payload.state.chatHistory,
                currentPlan: (_ctx, event) => event.payload.state.currentPlan,
                currentTaskIndex: (_ctx, event) => event.payload.state.currentTaskIndex,
                currentQuestion: (_ctx, event) => event.payload.state.currentQuestion,
                errorMessage: (_ctx) => undefined,
                sessionId: (_ctx, event) => event.payload.state.sessionId,
            }),
        },
        [AIChatMachineEventType.ERROR]: {
            target: 'Error',
            actions: assign({
                errorMessage: (_ctx, event) => event.payload.message,
            }),
        },
    },
    states: {
        Idle: {
            entry: assign({
                sessionId: (_ctx) => generateSessionId(),
                projectId: (_ctx) => generateProjectId(),
            }),
            on: {
                [AIChatMachineEventType.SUBMIT_PROMPT]: {
                    target: 'CreatingPlan',
                    actions: assign({
                        initialPrompt: (_ctx, event) => event.payload.prompt,
                        chatHistory: (ctx, event) =>
                            addChatMessage(ctx.chatHistory, 'user', event.payload.prompt),
                        errorMessage: (_ctx) => undefined,
                    }),
                },
            },
        },
        CreatingPlan: {
            invoke: {
                id: 'createPlan',
                src: 'createPlan',
                onDone: {
                    target: 'PlanReview',
                    actions: assign({
                        currentPlan: (_ctx, event) => event.data.plan,
                        chatHistory: (ctx, event) =>
                            addChatMessage(
                                ctx.chatHistory,
                                'assistant',
                                `Plan created with ${event.data.plan.tasks.length} tasks`
                            ),
                    }),
                },
                onError: {
                    target: 'Error',
                    actions: assign({
                        errorMessage: (_ctx, event) => event.data?.message || 'Failed to create plan',
                    }),
                },
            },
        },
        PlanReview: {
            entry: 'saveChatState',
            on: {
                [AIChatMachineEventType.EDIT_TASK]: {
                    actions: assign({
                        currentPlan: (ctx, event) => {
                            if (!ctx.currentPlan) {
                                return ctx.currentPlan;
                            }
                            return {
                                ...ctx.currentPlan,
                                tasks: ctx.currentPlan.tasks.map((task) =>
                                    task.id === event.payload.taskId
                                        ? { ...task, description: event.payload.description }
                                        : task
                                ),
                                updatedAt: Date.now(),
                            };
                        },
                        chatHistory: (ctx, event) =>
                            addChatMessage(
                                ctx.chatHistory,
                                'user',
                                `Updated task: ${event.payload.description}`
                            ),
                    }),
                },
                [AIChatMachineEventType.UPDATE_PLAN_WITH_PROMPT]: {
                    target: 'UpdatingPlan',
                    actions: assign({
                        chatHistory: (ctx, event) =>
                            addChatMessage(ctx.chatHistory, 'user', event.payload.prompt),
                    }),
                },
                [AIChatMachineEventType.FINALIZE_PLAN]: {
                    target: 'ExecutingTask',
                    actions: assign({
                        currentTaskIndex: (_ctx) => 0,
                        chatHistory: (ctx) =>
                            addChatMessage(ctx.chatHistory, 'system', 'Plan finalized. Starting execution...'),
                    }),
                },
            },
        },
        UpdatingPlan: {
            invoke: {
                id: 'updatePlan',
                src: 'updatePlan',
                onDone: {
                    target: 'PlanReview',
                    actions: assign({
                        currentPlan: (_ctx, event) => event.data.plan,
                        chatHistory: (ctx, event) =>
                            addChatMessage(
                                ctx.chatHistory,
                                'assistant',
                                `Plan updated with ${event.data.plan.tasks.length} tasks`
                            ),
                    }),
                },
                onError: {
                    target: 'Error',
                    actions: assign({
                        errorMessage: (_ctx, event) => event.data?.message || 'Failed to update plan',
                    }),
                },
            },
        },
        ExecutingTask: {
            entry: 'saveChatState',
            invoke: {
                id: 'executeTask',
                src: 'executeTask',
                onDone: {
                    target: 'AwaitingUserAction',
                    actions: assign({
                        currentPlan: (ctx, event) => {
                            if (!ctx.currentPlan) {
                                return ctx.currentPlan;
                            }
                            return {
                                ...ctx.currentPlan,
                                tasks: ctx.currentPlan.tasks.map((task, index) =>
                                    index === ctx.currentTaskIndex
                                        ? { ...task, status: TaskStatus.COMPLETED, result: event.data.result }
                                        : task
                                ),
                                updatedAt: Date.now(),
                            };
                        },
                        chatHistory: (ctx, event) =>
                            addChatMessage(
                                ctx.chatHistory,
                                'assistant',
                                `Task ${ctx.currentTaskIndex + 1} completed: ${event.data.result}`
                            ),
                    }),
                },
                //TODO: Why on error? Recheck TASKSTATUS
                onError: {
                    target: 'AwaitingUserAction',
                    actions: assign({
                        currentPlan: (ctx, event) => {
                            if (!ctx.currentPlan) {
                                return ctx.currentPlan;
                            }
                            return {
                                ...ctx.currentPlan,
                                tasks: ctx.currentPlan.tasks.map((task, index) =>
                                    index === ctx.currentTaskIndex
                                        ? {
                                            ...task,
                                            status: TaskStatus.COMPLETED,
                                            error: event.data?.message || 'Task execution failed',
                                        }
                                        : task
                                ),
                                updatedAt: Date.now(),
                            };
                        },
                        chatHistory: (ctx, event) =>
                            addChatMessage(
                                ctx.chatHistory,
                                'assistant',
                                `Task ${ctx.currentTaskIndex + 1} failed: ${event.data?.message || 'Unknown error'}`
                            ),
                    }),
                },
            },
            on: {
                [AIChatMachineEventType.ASK_QUESTION]: {
                    target: 'QuestioningUser',
                    actions: assign({
                        currentQuestion: (_ctx, event) => event.payload.question,
                        chatHistory: (ctx, event) =>
                            addChatMessage(ctx.chatHistory, 'assistant', event.payload.question.question),
                    }),
                },
            },
        },
        AwaitingUserAction: {
            entry: 'saveChatState',
            on: {
                [AIChatMachineEventType.CONTINUE_TO_NEXT]: [
                    {
                        cond: (ctx) =>
                            ctx.currentPlan !== undefined &&
                            ctx.currentTaskIndex < ctx.currentPlan.tasks.length - 1,
                        target: 'ExecutingTask',
                        actions: assign({
                            currentTaskIndex: (ctx) => ctx.currentTaskIndex + 1,
                            chatHistory: (ctx) =>
                                addChatMessage(
                                    ctx.chatHistory,
                                    'user',
                                    `Continue to task ${ctx.currentTaskIndex + 2}`
                                ),
                        }),
                    },
                    {
                        target: 'Completed',
                        actions: assign({
                            chatHistory: (ctx) =>
                                addChatMessage(ctx.chatHistory, 'system', 'All tasks completed successfully!'),
                        }),
                    },
                ],
                [AIChatMachineEventType.FINETUNE_TASK]: {
                    target: 'FinetuningTask',
                    actions: assign({
                        chatHistory: (ctx, event) =>
                            addChatMessage(ctx.chatHistory, 'user', `Finetune request: ${event.payload.instructions}`),
                    }),
                },
            },
        },
        FinetuningTask: {
            invoke: {
                id: 'finetuneTask',
                src: 'finetuneTask',
                onDone: {
                    target: 'AwaitingUserAction',
                    actions: assign({
                        currentPlan: (ctx, event) => {
                            if (!ctx.currentPlan) {
                                return ctx.currentPlan;
                            }
                            return {
                                ...ctx.currentPlan,
                                tasks: ctx.currentPlan.tasks.map((task, index) =>
                                    index === ctx.currentTaskIndex
                                        ? { ...task, result: event.data.result, status: TaskStatus.COMPLETED }
                                        : task
                                ),
                                updatedAt: Date.now(),
                            };
                        },
                        chatHistory: (ctx, event) =>
                            addChatMessage(
                                ctx.chatHistory,
                                'assistant',
                                `Task ${ctx.currentTaskIndex + 1} refined: ${event.data.result}`
                            ),
                    }),
                },
                onError: {
                    target: 'AwaitingUserAction',
                    actions: assign({
                        errorMessage: (_ctx, event) => event.data?.message || 'Failed to finetune task',
                        chatHistory: (ctx, event) =>
                            addChatMessage(
                                ctx.chatHistory,
                                'assistant',
                                `Finetuning failed: ${event.data?.message || 'Unknown error'}`
                            ),
                    }),
                },
            },
        },
        QuestioningUser: {
            entry: 'saveChatState',
            on: {
                [AIChatMachineEventType.ANSWER_QUESTION]: {
                    target: 'ExecutingTask',
                    actions: assign({
                        currentQuestion: (_ctx) => undefined,
                        chatHistory: (ctx, event) =>
                            addChatMessage(ctx.chatHistory, 'user', event.payload.answer),
                    }),
                },
            },
        },
        Completed: {
            entry: 'saveChatState',
            on: {
                [AIChatMachineEventType.SUBMIT_PROMPT]: {
                    target: 'CreatingPlan',
                    actions: assign({
                        initialPrompt: (_ctx, event) => event.payload.prompt,
                        chatHistory: (ctx, event) =>
                            addChatMessage(ctx.chatHistory, 'user', event.payload.prompt),
                        currentPlan: (_ctx) => undefined,
                        currentTaskIndex: (_ctx) => -1,
                        errorMessage: (_ctx) => undefined,
                    }),
                },
            },
        },
        Error: {
            on: {
                [AIChatMachineEventType.RETRY]: [
                    {
                        cond: (ctx) => ctx.currentPlan !== undefined,
                        target: 'PlanReview',
                        actions: assign({
                            errorMessage: (_ctx) => undefined,
                        }),
                    },
                    {
                        target: 'Idle',
                        actions: assign({
                            errorMessage: (_ctx) => undefined,
                        }),
                    },
                ],
                [AIChatMachineEventType.RESET]: {
                    target: 'Idle',
                },
            },
        },
    },
});

// Service implementations
const createPlanService = async (context: AIChatMachineContext, event: any): Promise<{ plan: Plan }> => {
    const requestBody: GenerateCodeRequest = {
        usecase: event.payload.prompt,
        chatHistory: event.payload.chatHistory,
        operationType: "CODE_GENERATION",
        fileAttachmentContents: [],
    };
    const tasks: Task[] = await generateDesign(requestBody);

    const plan: Plan = {
        id: generateId(),
        tasks,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    return { plan };
};

const updatePlanService = async (context: AIChatMachineContext, event: any): Promise<{ plan: Plan }> => {
    // TODO: Implement actual plan update logic using AI
    // This is a placeholder implementation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (!context.currentPlan) {
        throw new Error('No plan to update');
    }

    const updatedPlan: Plan = {
        ...context.currentPlan,
        updatedAt: Date.now(),
    };

    return { plan: updatedPlan };
};

const executeTaskService = async (context: AIChatMachineContext, event: any): Promise<{ result: string }> => {
    // TODO: Implement actual task execution logic
    // This is a placeholder implementation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (!context.currentPlan || context.currentTaskIndex < 0) {
        throw new Error('No task to execute');
    }

    const task = context.currentPlan.tasks[context.currentTaskIndex];
    return { result: `Completed: ${task.description}` };
};

const finetuneTaskService = async (context: AIChatMachineContext, event: any): Promise<{ result: string }> => {
    // TODO: Implement actual task finetuning logic
    // This is a placeholder implementation
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (!context.currentPlan || context.currentTaskIndex < 0) {
        throw new Error('No task to finetune');
    }

    const task = context.currentPlan.tasks[context.currentTaskIndex];
    return { result: `Refined: ${task.description} with instructions: ${event.payload.instructions}` };
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
            console.warn('No project ID available, skipping state save');
            return;
        }

        const stateToSave = {
            initialPrompt: context.initialPrompt,
            chatHistory: context.chatHistory,
            currentPlan: context.currentPlan,
            currentTaskIndex: context.currentTaskIndex,
            sessionId: context.sessionId,
            projectId: context.projectId,
            savedAt: Date.now(),
        };

        const storageKey = getStorageKey(context.projectId);
        extension.context?.globalState.update(storageKey, stateToSave);

        // Also save a list of all project IDs for management purposes
        const allProjectIds = extension.context?.globalState.get<string[]>(`${CHAT_STATE_STORAGE_KEY_PREFIX}.projects`) || [];
        if (!allProjectIds.includes(context.projectId)) {
            allProjectIds.push(context.projectId);
            extension.context?.globalState.update(`${CHAT_STATE_STORAGE_KEY_PREFIX}.projects`, allProjectIds);
        }
    } catch (error) {
        console.error('Failed to save chat state:', error);
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
            createPlan: createPlanService,
            updatePlan: updatePlanService,
            executeTask: executeTaskService,
            finetuneTask: finetuneTaskService,
        },
        actions: {
            saveChatState: (context) => saveChatState(context),
            clearChatState: (context) => clearChatStateAction(context),
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
};
