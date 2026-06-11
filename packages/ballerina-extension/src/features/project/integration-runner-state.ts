/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import * as path from "path";
import { commands, debug, DebugSession, TaskExecution, tasks, Terminal, Uri, window } from "vscode";
import { extension } from "../../BalExtensionContext";
import { startDebugging } from "../editor-support/activator";
import { TracerMachine } from "../tracing";
import { PALETTE_COMMANDS } from "./cmds/cmd-runner";

const BALLERINA_DEBUG_TYPE = "ballerina";
const NOTEBOOK_DEBUG_SESSION_NAME = "Ballerina Notebook Debug";
const TASK_TERMINATION_TIMEOUT_MS = 10000;

export const RUN_CONFLICT_PROMPT =
    "There is already a running integration. Do you want to stop it and start this integration?";
export const FORCE_START_PROMPT =
    "The previous run has not stopped yet (terminate was already sent). Force start anyway?";

function isIntegrationRunDebugSession(session: DebugSession): boolean {
    if (session.type !== BALLERINA_DEBUG_TYPE) {
        return false;
    }
    // Notebook cell debugging is not an integration run.
    if (session.name === NOTEBOOK_DEBUG_SESSION_NAME) {
        return false;
    }
    return !(session.configuration as { debugTests?: boolean })?.debugTests;
}

let runTerminal: Terminal | undefined;
let runDebugSession: DebugSession | undefined;
let runTask: TaskExecution | undefined;
let lastRunPath: string | undefined;

export function markTerminalRunStarted(terminal: Terminal, projectPath: string): void {
    runTerminal = terminal;
    lastRunPath = projectPath;
}

/**
 * Registers the `bal run` task execution backing a BI run session, so that the
 * single-instance guard can await full process termination (port release)
 * before starting the next run.
 */
export function markTaskRunStarted(task: TaskExecution, projectPath: string): void {
    runTask = task;
    lastRunPath = projectPath;
}

function isTaskAlive(): boolean {
    return !!runTask && tasks.taskExecutions.some((execution) => execution === runTask);
}

export function isIntegrationRunning(): boolean {
    const terminalAlive = !!runTerminal && runTerminal.exitStatus === undefined;
    const debugAlive = !!runDebugSession;
    return terminalAlive || debugAlive || isTaskAlive();
}

export function isIntegrationRunningAt(targetPath: string): boolean {
    if (!isIntegrationRunning() || !lastRunPath) {
        return false;
    }
    const runningPath = path.resolve(lastRunPath);
    const selectedPath = path.resolve(targetPath);
    const relative = path.relative(selectedPath, runningPath);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/** Stops the tracked run debug session and waits for it to actually terminate. */
async function stopRunDebugSession(): Promise<void> {
    const session = runDebugSession;
    if (!session) {
        return;
    }
    // Wait for actual terminate; stopDebugging only sends the request.
    await new Promise<void>((resolve) => {
        const sub = debug.onDidTerminateDebugSession((ended) => {
            if (ended === session) {
                sub.dispose();
                resolve();
            }
        });
        debug.stopDebugging(session);
    });
    runDebugSession = undefined;
}

/**
 * Waits until the tracked `bal run` task process has fully exited.
 * Returns false when the process is still alive after the timeout.
 */
async function waitForRunTaskEnd(timeoutMs: number = TASK_TERMINATION_TIMEOUT_MS): Promise<boolean> {
    const task = runTask;
    if (!task || !tasks.taskExecutions.some((execution) => execution === task)) {
        return true;
    }
    return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
            listener.dispose();
            resolve(false);
        }, timeoutMs);
        const listener = tasks.onDidEndTaskProcess((event) => {
            if (event.execution === task) {
                clearTimeout(timeout);
                listener.dispose();
                resolve(true);
            }
        });
        // The task may have ended between the initial check and listener registration.
        if (!tasks.taskExecutions.some((execution) => execution === task)) {
            clearTimeout(timeout);
            listener.dispose();
            resolve(true);
        }
    });
}

/**
 * Single-instance guard (product-integrator#1012): only one integration may run
 * at a time. If an integration is running, asks the user whether to stop it.
 *
 * Returns true when the caller may proceed with the new run (nothing was
 * running, or the previous run was stopped and its process fully terminated,
 * or the user chose to force-start). Returns false when the new launch must be
 * cancelled, leaving the current run untouched.
 */
export async function confirmAndStopActiveRun(): Promise<boolean> {
    if (!isIntegrationRunning()) {
        return true;
    }
    const choice = await window.showInformationMessage(RUN_CONFLICT_PROMPT, "Yes", "No");
    if (choice !== "Yes") {
        return false;
    }
    // The run may have ended on its own while the prompt was open.
    if (!isIntegrationRunning()) {
        return true;
    }
    if (runDebugSession) {
        // Stopping the session triggers the adapter's disconnect, which
        // terminates the underlying `bal run` task as well.
        await stopRunDebugSession();
    } else if (isTaskAlive()) {
        // Task outlived its debug session; terminate it directly.
        runTask!.terminate();
    }
    if (runTerminal) {
        runTerminal.dispose();
        runTerminal = undefined;
    }
    // Await full process termination so the new run does not hit port conflicts.
    const ended = await waitForRunTaskEnd();
    if (!ended) {
        const forceChoice = await window.showWarningMessage(FORCE_START_PROMPT, "Force Start", "Cancel new launch");
        return forceChoice === "Force Start";
    }
    return true;
}

export async function restartIntegration(targetPath: string): Promise<void> {
    if (runDebugSession) {
        const session = runDebugSession;
        // Preserve original mode so debug restarts keep breakpoints.
        const wasNoDebug = session.configuration.noDebug ?? true;
        await stopRunDebugSession();
        // Avoid port conflicts: the `bal run` task can outlive the session briefly.
        await waitForRunTaskEnd();
        TracerMachine.startServer();
        // Direct re-launch skips the BI run flow's Try-It suggestion.
        await startDebugging(Uri.file(targetPath), false, false, wasNoDebug);
        return;
    }
    if (runTerminal) {
        runTerminal.dispose();
        runTerminal = undefined;
    }
    TracerMachine.startServer();
    // Wrap as Uri so the RUN handler avoids Uri.parse, which mishandles Windows paths.
    await commands.executeCommand(PALETTE_COMMANDS.RUN, Uri.file(targetPath));
}

export function activateIntegrationRunnerState(): void {
    extension.context.subscriptions.push(
        window.onDidCloseTerminal((terminal) => {
            if (terminal === runTerminal) {
                runTerminal = undefined;
            }
        }),
        debug.onDidStartDebugSession((session) => {
            if (isIntegrationRunDebugSession(session)) {
                runDebugSession = session;
                const script = (session.configuration as { script?: string })?.script;
                if (script) {
                    lastRunPath = script;
                }
            }
        }),
        debug.onDidTerminateDebugSession((session) => {
            if (session === runDebugSession) {
                runDebugSession = undefined;
            }
        }),
        tasks.onDidEndTaskProcess((event) => {
            if (event.execution === runTask) {
                runTask = undefined;
            }
        })
    );
}
