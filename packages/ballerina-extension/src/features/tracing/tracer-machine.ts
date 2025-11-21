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

import { createMachine, assign, interpret } from 'xstate';
import type { Interpreter } from 'xstate';
import { TraceServer } from './trace-server';
import * as path from 'path';
import * as fs from 'fs';
import { createTraceServerTask } from './trace-server-task';
import * as vscode from 'vscode';
import { setTracingConfig, removeTracingConfig } from './utils';
import { OTLP_PORT } from './constants';



/**
 * State machine flow 
 * 
 * If the tracing is enabled in the project, the state machine will transition to the enabled state.
 * If the tracing is not enabled in the project, the state machine will transition to the disabled state.
 * 
 * User can manually enable/disable tracing via UI
 *  Then trace machine will update all the projects with relevent imports
 * 
 * When user runs the program when state machine is enabled 
 *  it will start the tracing server and it will be on for rest of the program execution.
 * 
 * If user disable tracing via UI
 *  it will stop the tracing server and it will be off for rest of the program execution.
 * 
 * We will only capture trace logs if the window is opened
 *  
 */

/**
 * Context for the tracing server state machine
 */
export interface TracerMachineContext {
    serverPort?: number;
    serverPid?: number;
    error?: string;
    startFailureReason?: string;
    workspaceDirs?: string[];
    isDisabling?: boolean;
    traceServer?: TraceServer;
    taskExecution?: vscode.TaskExecution;
    taskTerminationListener?: vscode.Disposable;
}

/**
 * Check if tracing is enabled in the current project
 */
function isTraceEnabledInProject(context: TracerMachineContext): Promise<{ isTraceEnabledInProject: boolean }> {
    return new Promise((resolve) => {
        // Check if a file called trace_enabled.bal exists in any workspace dir
        const traceEnabled = context.workspaceDirs?.some((workspaceDir) => {
            return fs.existsSync(path.join(workspaceDir, 'trace_enabled.bal'));
        }) ?? false;

        resolve({ isTraceEnabledInProject: traceEnabled });
    });
}

function enableTracingInProject(context: TracerMachineContext, event?: any): void {
    console.log('enableTracingInProject called with context:', {
        workspaceDirs: context.workspaceDirs,
        hasWorkspaceDirs: !!context.workspaceDirs,
        workspaceDirsLength: context.workspaceDirs?.length || 0
    });

    if (!context.workspaceDirs || context.workspaceDirs.length === 0) {
        console.error('enableTracingInProject: No workspace directories provided');
        return;
    }

    context.workspaceDirs.forEach((workspaceDir) => {
        try {
            const traceFilePath = path.join(workspaceDir, 'trace_enabled.bal');
            fs.writeFileSync(traceFilePath, 'import ballerinax/idetraceprovider as _;');

            setTracingConfig(workspaceDir);
        } catch (error) {
            console.error(`Failed to write trace_enabled.bal to ${workspaceDir}:`, error);
        }
    });
}

function disableTracingInProject(context: TracerMachineContext, event?: any): void {
    console.log('disableTracingInProject called with context:', {
        workspaceDirs: context.workspaceDirs,
        hasWorkspaceDirs: !!context.workspaceDirs,
        workspaceDirsLength: context.workspaceDirs?.length || 0
    });

    if (!context.workspaceDirs || context.workspaceDirs.length === 0) {
        console.error('disableTracingInProject: No workspace directories provided');
        return;
    }

    context.workspaceDirs.forEach((workspaceDir) => {
        try {
            const traceFilePath = path.join(workspaceDir, 'trace_enabled.bal');
            if (fs.existsSync(traceFilePath)) {
                fs.unlinkSync(traceFilePath);
            }
            removeTracingConfig(workspaceDir);
        } catch (error) {
            console.error(`Failed to disable tracing in ${workspaceDir}:`, error);
        }
    });
}

function startServer(context: TracerMachineContext, event?: any): Thenable<vscode.TaskExecution> {
    const task = createTraceServerTask();
    return vscode.tasks.executeTask(task);
}

function stopServer(context: TracerMachineContext, event?: any): Promise<void> {
    return TraceServer.stop();
}


/**
 * Creates a state machine for managing the tracing server lifecycle
 */
function createTracerMachine(workspaceDirs?: string[]) {
    return createMachine<TracerMachineContext>(
        {
            /** @xstate-layout N4IgpgJg5mDOIC5QBcBOBDAxmVBZLAFgJYB2YAxAIIAi1A+gOoDyASgNIDKACpQMICiHANoAGALqJQABwD2sIsiIySkkAA9EARgBM2gMwA6TQBYRANgCsAdgAcFm2e0mANCACeWkVYMBOC3s1NHxsREWMLYzM9AF9o1zQsHHxMYjJyFn5cJgA1fkZWTh4BYXFVWXlFZVUNBB0vAz1g4z0RPWMrYzszVw9a7Vj4jGw8QlIwA1IFcghlcdIANxkAa3GE4eTUuZIFBAWZTHRKklExE7K5BSUVJHVEC00bIwe-MzNNKzM7HsROiwMOqx6SzaGwfXRAgYgNZJUZkCbbZDTWbwxYrAzQkYpMbwnZ7A5HE5CTQSG7lS5VG41d7GAxOczWETaaz+XTfBBmYw+AzWHyaBkWMJ8qyQjEbbGTRE4VAyVAGKQAG0OADMZQBbdFDGFYuES3YkRb4q6E0qki5HapaHyGUG6bQ+XT+EQCvRskIiXyRNpeKyhEQ+MwizWYzYGMAkdAAI3lkHI1AAkhxKAAhAAy-DOpoqVwtCCsugMZh9Zh8rXMVl5xjZmg5ZiMIk0jT8rRemkDiWD2LDkejEHS-AAYhkOAAJDPSM3ZymIWzeHxWyyhPS2dqV9yIRruvkmJdBV5LtvrWHjLtRyAGWA4eY4DjIGRSKQxjgAFUoLCfdA4-BYuRYY5AZPNKdcwsbQCyZUsHEZECbCrRlNAMYxdBsFc-TncIDy1EMTx7c9L2vZB0FQRQSCgJEdX1ZZViDMU4Wws8L1QK9UBvQjiKgPUDUOI1xD-ADJ1AKk-VAwFjFE6xAm0esXTXWpWm8d4QR9RDATMJ0MI7Wjw1PCBcMY-DWNIUipRlOVFWQFVUHVUUj1DLScIYpiWKIwyOP2LjlGNElxyzCkBM8e1-jaMSrAkqTXRCgt-QCRpNHrGd1Jo487PovDUH7dAiB7J8ZCcxEMifFgAE1eInXzblqKJDHLT5nV5VoHDZEt5LzBwrFsBslxsBKbLonSHJwdLMsgbLcr7AriuJc4fOuPyKr0Kr-TsZtYr0BqZK6AsWs5f1PidHxuu1JLuxSvTmIIojHyfJguA-L8fxK6ac0k7RawsecojeyxAhgmT7W8RCQTeCwgbUuIoWonrkr61KbzvKRDLIrZUSo9tEts47odO2H7xcvF3OOHiTW88kZvK57XvevRPvuB42UBf6kPaOSWneA6sKh3THNvHGSPIYzZQVZU1Q1VHIYxzn8Lh3GKMNDzCa8-9StJmpntnJdlOUgVbFdNoEOLDpC0ZODWzB6zDoMCAiFgDHyH4AA5ZM0wekmc2sKs2tAmw7X0HRAjeTo2exS3re0vtB0EUcicVx6gIbeCQrCN4Pdeawft6BsSwMGwSy9v1OmQ4xYjBkgZAgOBVDNzYppdoCAFpNDZFpQK+4xqxBCxgb+wPyIUavANm9o2Vb0CFJsea5zebQPm7o7tL7-jyv8bx-B0K1fSCPk2Q7917RBPwfDa4J+lNiHzd6iWzrhyB57Kmp7D+Fe7RaUIN4sRqve5cxdwCUwQv2k-RZnw5v1M6BkSI32Voge0jxCwbytNWSwwRGrBAQkhJ0QQC5WAsDPdG2kL6DSyjlc6yAIE5m3H8dqLQsHZycFPV0xZfBITHlTSSXscHnxAbla+mYa6zQeI4MCApORMlWiFNOiBQTwVHn4NoNhYp2nYcAmG3N4bgJ4f3MmQIuQcidP4FkIkdZ-G-sCcI5YAg4ODhjUhQFn4GFaHUVuC5VrIXdkELO2d5FWnuH4Iu0QgA */
            id: 'tracerMachine',
            initial: 'init',
            context: {
                serverPort: OTLP_PORT,
                serverPid: undefined,
                error: undefined,
                startFailureReason: undefined,
                workspaceDirs: workspaceDirs || [],
                isDisabling: false,
                taskExecution: undefined,
                taskTerminationListener: undefined
            },
            on: {
                ADD_WORKSPACES: {
                    actions: assign({
                        workspaceDirs: (context, event) => [...context.workspaceDirs, (event as any).workspaceDir],
                    }),
                },
                REMOVE_WORKSPACES: {
                    actions: assign({
                        workspaceDirs: (context, event) => context.workspaceDirs.filter((dir) => dir !== (event as any).workspaceDir),
                    }),
                },
            },
            states: {
                /**
                 * Initial state when the tracer machine is first created
                 */
                init: {
                    entry: () => {
                        console.log('Tracer state: init');
                    },

                    invoke: {
                        src: 'initializeTracer',
                        onDone: [
                            {
                                target: 'enabled',
                                cond: (context, event) => {
                                    const traceEnabled = (event as any).data?.isTraceEnabledInProject;
                                    return traceEnabled === true;
                                }
                            },
                            {
                                target: 'disabled'
                            }
                        ],
                        onError: {
                            target: 'disabled',
                            actions: assign({
                                startFailureReason: (context, event) => (event as any).data?.error || context.error,
                                error: (context, event) => (event as any).data?.error || context.error,
                            }),
                        },
                    }
                },

                /**
                 * Tracer is enabled and ready to start the server
                 * Contains nested states for server lifecycle management
                 */
                enabled: {
                    initial: 'serverStopped',
                    entry: [
                        () => {
                            console.log('Tracer state: enabled');
                        },
                        assign({
                            error: undefined,
                        }),
                        () => {
                            // TODO: Implement enable logic (register handlers, etc.)
                        },
                    ],
                    on: {
                        DISABLE: [
                            {
                                target: 'enabled.serverStopping',
                                cond: () => {
                                    // If server is running, stop it first before disabling
                                    return TraceServer.isRunning();
                                },
                                actions: [
                                    assign({
                                        isDisabling: true,
                                    }),
                                ],
                            },
                            {
                                target: 'disabled',
                                actions: [
                                    disableTracingInProject,
                                ],
                            },
                        ],

                        REFRESH: {
                            target: 'init',
                            actions: assign({
                                error: undefined,
                                startFailureReason: undefined,
                                serverPort: undefined,
                                serverPid: undefined,
                                isDisabling: false,
                            }),
                        }
                    },
                    states: {
                        /**
                         * Server is stopped (initial state when enabled)
                         */
                        serverStopped: {
                            entry: () => {
                                console.log('Tracer state: enabled.serverStopped');
                            },

                            on: {
                                START_SERVER: {
                                    target: "serverStarting"
                                }
                            }
                        },

                        serverStarting: {
                            invoke: {
                                src: startServer,
                                onDone: {
                                    target: "serverStarted",
                                    actions: assign({
                                        error: undefined,
                                        taskExecution: (context, event) => (event as any).data,
                                    }),
                                },
                                onError: {
                                    target: "serverFailedToStart",
                                    actions: assign({
                                        error: (context, event) => {
                                            const err = (event as any).data;
                                            return err instanceof Error ? err.message : String(err);
                                        }
                                    })
                                }
                            }
                        },
                        /**
                         * Server start failed
                         */
                        serverFailedToStart: {
                            entry: () => {
                                console.log('Tracer state: enabled.serverFailedToStart');
                            },

                            on: {
                                RETRY: [{
                                    target: "serverStarted",
                                    cond: "New guard"
                                }, "serverStarted"]
                            }
                        },

                        /**
                         * Server is started and running
                         */
                        serverStarted: {
                            entry: [
                                () => {
                                    console.log('Tracer state: enabled.serverStarted');
                                },
                                assign({
                                    error: undefined,
                                }),
                            ],
                            invoke: {
                                id: 'taskTerminationListener',
                                src: (context, event) => (callback, onReceive) => {
                                    // Capture taskExecution reference at setup time
                                    const taskExecution = context.taskExecution;
                                    
                                    // Set up task termination listener
                                    const disposable = vscode.tasks.onDidEndTask((taskEvent) => {
                                        // Check if the ended task matches our task execution
                                        if (taskExecution && taskEvent.execution === taskExecution) {
                                            console.log('Trace server task terminated');
                                            callback({ type: 'TASK_TERMINATED' });
                                        }
                                    });
                                    
                                    // Return cleanup function
                                    return () => {
                                        disposable.dispose();
                                    };
                                },
                            },
                            on: {
                                STOP_SERVER: {
                                    target: "serverStopping"
                                },
                                TASK_TERMINATED: {
                                    target: "serverStopped",
                                    actions: [
                                        assign({
                                            taskExecution: undefined,
                                        }),
                                    ],
                                }
                            }
                        },

                        serverStopping: {
                            invoke: {
                                src: stopServer,
                                onDone: [
                                    {
                                        target: "#tracerMachine.disabled",
                                        cond: (context) => context.isDisabling === true,
                                        actions: [
                                            disableTracingInProject,
                                            assign({
                                                isDisabling: false,
                                            }),
                                        ],
                                    },
                                    {
                                        target: "serverStopped",
                                    },
                                ],
                                onError: {
                                    target: "serverStarted",
                                    actions: [
                                        assign({
                                            error: (context, event) => {
                                                const err = (event as any).data;
                                                return err instanceof Error ? err.message : String(err);
                                            },
                                            isDisabling: false,
                                        }),
                                    ],
                                }
                            },
                            on: {
                                DISABLE: {
                                    actions: [
                                        assign({
                                            isDisabling: true,
                                        }),
                                    ],
                                },
                            },
                        }
                    },
                },

                /**
                 * Tracer is disabled (server cannot be started)
                 */
                disabled: {
                    entry: [
                        () => {
                            console.log('Tracer state: disabled');
                        },
                        assign({
                            isDisabling: false,
                        }),
                    ],
                    on: {
                        ENABLE: {
                            target: 'enabled',
                            actions: enableTracingInProject,
                        },
                        REFRESH: {
                            target: 'init',
                            actions: assign({
                                error: undefined,
                                startFailureReason: undefined,
                                serverPort: undefined,
                                serverPid: undefined,
                                isDisabling: false,
                            }),
                        }
                    },
                }
            },
        },
        {
            services: {
                // Initialize the tracer
                initializeTracer: isTraceEnabledInProject
            },
        });
}

// Service instance (created on initialization)
let tracerService: ReturnType<typeof interpret> | undefined;

/**
 * Ensures the tracer service is initialized and returns it
 * @throws {Error} If the tracer service is not initialized
 */
function ensureInitialized(): ReturnType<typeof interpret> {
    if (!tracerService) {
        throw new Error('TracerMachine not initialized. Call initialize() first.');
    }
    return tracerService;
}

/**
 * Singleton object providing access to the tracer state machine
 */
export const TracerMachine = {
    /**
     * Create and start the tracer machine with workspace directories
     */
    initialize: (workspaceDirs?: string[]) => {
        const machine = createTracerMachine(workspaceDirs);
        tracerService = interpret(machine) as ReturnType<typeof interpret>;
        tracerService.start();
    },

    addWorkspace: (workspaceDir: string) => {
        ensureInitialized().send({ type: 'ADD_WORKSPACES' }, { workspaceDir });
    },

    removeWorkspace: (workspaceDir: string) => {
        ensureInitialized().send({ type: 'REMOVE_WORKSPACES' }, { workspaceDir });
    },


    isEnabled: () => {
        const value = ensureInitialized().getSnapshot().value;
        if (typeof value === 'string') {
            return value === 'enabled';
        }
        if (typeof value === 'object' && value !== null) {
            return value.hasOwnProperty('enabled');
        }
        return false;
    },

    isServerStarted: () => {
        const snapshot = ensureInitialized().getSnapshot();
        const value = snapshot.value;
        if (typeof value === 'string') {
            return value === 'enabled.serverStarted';
        }
        if (typeof value === 'object' && value !== null) {
            const obj = value as Record<string, string>;
            return obj.enabled === 'serverStarted';
        }
        return false;
    },

    /**
     * Get the current state value (for testing)
     */
    getState: () => {
        return ensureInitialized().getSnapshot().value;
    },

    startServer: () => {
        ensureInitialized().send({ type: 'START_SERVER' });
    },

    stopServer: () => {
        ensureInitialized().send({ type: 'STOP_SERVER' });
    },

    enable: () => {
        ensureInitialized().send({ type: 'ENABLE' });
    },

    disable: () => {
        ensureInitialized().send({ type: 'DISABLE' });
    },

    refresh: (workspaceDirs?: string[]) => {
        const snapshot = ensureInitialized().getSnapshot();
        const context = snapshot.context as TracerMachineContext;
        const currentWorkspaceDirs = context.workspaceDirs || [];
        const updatedWorkspaceDirs = workspaceDirs || currentWorkspaceDirs;
        const machine = createTracerMachine(updatedWorkspaceDirs);
        tracerService = interpret(machine) as ReturnType<typeof interpret>;
        tracerService.start();
    },

    onUpdate: (callback: (state: any) => void) => {
        ensureInitialized().subscribe((state) => {
            callback(state.value);
        });
    },

    getTraceServer: () => {
        return TraceServer;
    },
};

