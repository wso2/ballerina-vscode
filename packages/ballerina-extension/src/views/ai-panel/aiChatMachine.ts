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
import { workspace } from 'vscode';
import { extension } from '../../BalExtensionContext';
import { AIChatMachineContext, AIChatMachineEventType, AIChatMachineSendableEvent, AIChatMachineStateValue, TaskStatus, Checkpoint } from '@wso2/ballerina-core/lib/state-machine-types';
import { GenerateAgentCodeRequest, SourceFile } from '@wso2/ballerina-core/lib/rpc-types/ai-panel/interfaces';
import { generateAgent } from '../../features/ai/agent/index';
import { captureWorkspaceSnapshot, restoreWorkspaceSnapshot } from './checkpoint/checkpointUtils';
import { getCheckpointConfig } from './checkpoint/checkpointConfig';
import { notifyCheckpointCaptured } from '../../RPCLayer';
import { StateMachine } from '../../stateMachine';

// Extracted utilities
import { generateProjectId, generateSessionId } from './idGenerators';
import { addUserMessage, updateChatMessage, convertChatHistoryToModelMessages, convertChatHistoryToUIMessages } from './chatHistoryUtils';
import { saveChatState, loadChatState, clearChatState, clearChatStateAction, getAllProjectIds, clearAllChatStates, getChatStateMetadata } from './chatStatePersistence';
import { normalizeCodeContext } from './codeContextUtils';

const cleanupOldCheckpoints = (checkpoints: Checkpoint[]): Checkpoint[] => {
    const config = getCheckpointConfig();
    if (checkpoints.length <= config.maxCount) {
        return checkpoints;
    }
    return checkpoints.slice(-config.maxCount);
};

// Temp project management removed from state machine
// Each service (agent, datamapper) now manages its own temp directory

/**
 * Cleanup action - simplified since temp project management moved to services
 */
const cleanupAction = (context: AIChatMachineContext): void => {
    // Clear any command execution state
    context.commandType = undefined;
    context.modifiedFiles = undefined;
    context.commandParams = undefined;
    saveChatState(context);
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
    /** @xstate-layout N4IgpgJg5mDOIC5QCMCGAbdYBOBLAdqgLSq5EDGAFqgC4B0AogB5jkCuNBUAIragLaoADkJwBiCAHt8YOgQBukgNaywLdjTC8aA4aOwBtAAwBdRKCGTYuTtPMgmiACwBmABx0jXrwE4jfgEYAdgCAJgA2ABoQAE9EAFYjDwCjcLcncL8jYPiAX1zotEwcAmJSCmp6ZlYOLm1dEXEcbElsOiF0WgAzVv46NRrNesFGw1N7S2tbfHtHBFcPb19-bJCI6LiEcIi6cNS3UODgo1cA-IKQfEkIOHsirDxCEjIqWgmrG1w7JAdEIijYn9wvlChgHqVnhVaHQAJIQLDvKZfGY-OYBPZ0eKhFyuIKZeIBAI4pwbRBhNzxOhOHw0txuFwBLERYEXe4lJ7lV70ADiYBk2FoXAACp0URYPtNZs5QqStuEAp5vEEnAEnEEfKE3CzQcVHmUXpU6CLUPgAEpgeS4MAAd0Rn2+oDRDN2LnCQVCiRxbndPhJgIQbgV1JpPjcRiCWviPhcoRBIDZeshXLoAEERC15JBjWKQJN7TmnQrwq73Z6nN7Qr7ZQFvYqvEdi3iDi44wmIZzDdUNFwACqoWBKO2S1Fk53Ft0eoxen1+zaE+IuOghnxu8JOUJBTduVtg9n6qFVdS1fA8PgjfRD5FS+ZOOhBeIRnFeLcxlyyz2YpVOFV+HzxJw7rq7YGtCfYDualo2peDq-AgRJFiWk7TpWs6IJWoSfl4rqhOW3ruoB4IciB9BpkIGaQGBg4-Hmw6OqOCETmWFZVv6vqLksAR-iu7jBARe5Joa5oAFasJoECUdBBb0S6jFTuWM6yi4oZ1kY8QLi4Slat+fGJh20IAMKSPwHRgGJknXm6Cp-gyEQRFGOSytSi7xPSThJPZlYMjpwEHkaqDYJwYIxIZxlYGZ1ESleI5wWOiFMQp-opOWVIhuWal4pk3lEb5ADqpCcCeABirSGfgMjkDQrQAMqiOQ5nRYSQR0MEK4aiq5ZeASsr0k1iRLASYTukEWX7smDDYC02D1XRWwhEuC5hNs4T2fesrbJSSRPm6MYRmu5y5EAA */
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
        isPlanMode: false,
        checkpoints: [],
        operationType: undefined,
        fileAttachments: [],
    } as AIChatMachineContext,
    on: {
        [AIChatMachineEventType.SUBMIT_AGENT_PROMPT]: {
            target: "GeneratingPlan",
            actions: [
                assign({
                    generationType: () => 'agent' as const,
                    chatHistory: (ctx, event) => addUserMessage(ctx.chatHistory, event.payload.prompt),
                    errorMessage: (_ctx) => undefined,
                    isPlanMode: (_ctx, event) => {
                        const isPlanModeEnabled = workspace.getConfiguration('ballerina.ai').get<boolean>('planMode', false);
                        if (event.payload.isPlanMode && !isPlanModeEnabled) {
                            console.log('[AIChatMachine] Plan mode requested but ballerina.ai.planMode configuration is disabled. Setting isPlanMode to false.');
                            return false;
                        }
                        return event.payload.isPlanMode;
                    },
                    codeContext: (_ctx, event) => normalizeCodeContext(event.payload.codeContext),
                    operationType: (_ctx, event) => event.payload.operationType,
                    fileAttachments: (_ctx, event) => event.payload.fileAttachments ?? [],
                }),
                "captureCheckpoint",
            ],
        },
        [AIChatMachineEventType.SUBMIT_DATAMAPPER_REQUEST]: {
            target: "ExecutingDatamapper",
            actions: [
                assign({
                    generationType: () => 'datamapper' as const,
                    chatHistory: (ctx, event) => addUserMessage(
                        ctx.chatHistory,
                        event.payload.userMessage || `Generate ${event.payload.datamapperType} mapping`
                    ),
                    errorMessage: (_ctx) => undefined,
                    commandType: () => 'datamapper',
                    commandParams: (_ctx, event) => ({
                        datamapperType: event.payload.datamapperType,
                        params: event.payload.params
                    }),
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
                    isPlanMode: (_ctx) => false,
                    operationType : undefined,
                    fileAttachments: (_ctx) => [],
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
                projectId: (_ctx, event) => event.payload.state.projectId,
                checkpoints: (_ctx, event) => event.payload.state.checkpoints || [],
                isPlanMode: (_ctx, event) => event.payload.state.isPlanMode || false,
                autoApproveEnabled: (_ctx, event) => event.payload.state.autoApproveEnabled || false,
                operationType: (_ctx, event) => event.payload.state.operationType || undefined,
                fileAttachments: (_ctx, event) => event.payload.state.fileAttachments || [],
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
        GeneratingPlan: {
            entry: [
                "captureCheckpoint",
                "saveChatState"
            ],
            invoke: {
                id: "startAgentGeneration",
                src: "startAgentGenerationService",
            },
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
        ExecutingDatamapper: {
            entry: [
                "captureCheckpoint",
                "saveChatState"
            ],
            invoke: {
                id: "executeDatamapper",
                src: "executeDatamapper",
                onDone: {
                    target: "Completed",
                    actions: assign({
                        modifiedFiles: (_ctx, event) => event.data.modifiedFiles,
                    }),
                },
                onError: {
                    target: "Error",
                    actions: assign({
                        errorMessage: (_ctx, event) => event.data?.message || 'Datamapper execution failed',
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
            entry: [
                "cleanupAction",  // NEW: Just cleanup (integration done by services)
                "saveChatState"
            ],
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
            entry: ["cleanupAction"],  // NEW: Cleanup temp on error
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

/**
 * Service to start agent generation
 * Each service now manages its own temp directory lifecycle
 */
const startAgentGenerationService = async (context: AIChatMachineContext): Promise<void> => {
    const lastMessage = context.chatHistory[context.chatHistory.length - 1];
    const usecase = lastMessage?.content;
    const previousHistory = context.chatHistory.slice(0, -1);
    const messageId = lastMessage?.id;

    const requestBody: GenerateAgentCodeRequest = {
        usecase: usecase,
        chatHistory: convertChatHistoryToModelMessages(previousHistory),
        operationType: context.operationType,
        fileAttachmentContents: context.fileAttachments,
        messageId: messageId,
        isPlanMode: context.isPlanMode ?? false,
        codeContext: context.codeContext,
    };

    generateAgent(requestBody).catch(error => {
        console.error('[startAgentGenerationService] Error:', error);
        chatStateService.send({
            type: AIChatMachineEventType.ERROR,
            payload: { message: error.message || 'Failed to generate plan' }
        });
    });
};

/**
 * Service to execute datamapper operations
 * Manages its own temp directory lifecycle
 */
const executeDatamapperService = async (context: AIChatMachineContext): Promise<{ modifiedFiles: string[] }> => {
    if (!context.commandParams) {
        throw new Error('No command parameters in context');
    }

    const { datamapperType, params } = context.commandParams;

    // Get messageId from last message in chat history
    const lastMessage = context.chatHistory[context.chatHistory.length - 1];
    const messageId = lastMessage?.id;

    if (!messageId) {
        throw new Error('No messageId found in chat history');
    }

    // Import datamapper functions dynamically
    const {
        generateMappingCode,
        generateInlineMappingCode,
        generateContextTypes
    } = await import('../../features/ai/data-mapper/index');

    let result: { modifiedFiles: string[], sourceFiles: SourceFile[] } | undefined;

    // Execute the appropriate datamapper function
    // Each function manages its own temp directory internally
    // Pass messageId so they can emit save_chat events
    switch (datamapperType) {
        case 'function':
            await generateMappingCode(params, messageId);
            result = { modifiedFiles: [], sourceFiles: [] }; // No return from these functions
            break;
        case 'inline':
            await generateInlineMappingCode(params, messageId);
            result = { modifiedFiles: [], sourceFiles: [] };
            break;
        case 'contextTypes':
            await generateContextTypes(params, messageId);
            result = { modifiedFiles: [], sourceFiles: [] };
            break;
        default:
            throw new Error(`Unknown datamapper type: ${datamapperType}`);
    }

    // Note: Chat history update is now handled by save_chat event from datamapper functions
    return { modifiedFiles: result.modifiedFiles };
};

// Create and export the state machine service
const chatStateService = interpret(
    chatMachine.withConfig({
        services: {
            startAgentGenerationService: startAgentGenerationService,
            executeDatamapper: executeDatamapperService,
        },
        actions: {
            saveChatState: (context) => saveChatState(context),
            clearChatState: (context) => clearChatStateAction(context),
            captureCheckpoint: (context) => captureCheckpointAction(context),
            restoreCheckpoint: (context, event) => restoreCheckpointAction(context, event),
            cleanupAction: (context) => cleanupAction(context),
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

        // Attempt to restore state from session storage for current project
        const projectId = generateProjectId();
        loadChatState(projectId).then((savedState) => {
            if (savedState && savedState.sessionId && savedState.projectId === projectId) {
                console.log(`Restoring chat state for project: ${projectId} (from current session)`);
                chatStateService.send({
                    type: AIChatMachineEventType.RESTORE_STATE,
                    payload: { state: savedState },
                });
            } else {
                console.log(`No session state found for project: ${projectId}, starting with fresh session`);
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
        // No need to save state on dispose - session-only storage will be cleared automatically
        // when the extension deactivates (window closes)
        console.log('[AIChatStateMachine] Disposing - session state will be cleared');
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
