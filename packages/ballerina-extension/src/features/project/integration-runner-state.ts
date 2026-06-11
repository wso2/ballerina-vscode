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
const SESSION_TERMINATION_TIMEOUT_MS = 10000;

export const RUN_CONFLICT_PROMPT =
    "This integration is already running. Do you want to stop it and start it again?";
export const FORCE_START_PROMPT =
    "The previous run has not stopped yet (terminate was already sent). Force start anyway?";

function isIntegrationRunDebugSession(session: DebugSession): boolean {
    if (session.type !== BALLERINA_DEBUG_TYPE) {
        return false;
    }
    // Notebook cell debugging is not an integration run. Checked via the
    // notebookDebug flag because the session name is overwritten with the
    // script's basename during config resolution; the name check is kept as
    // a fallback for sessions that skip resolution.
    const configuration = session.configuration as { debugTests?: boolean; notebookDebug?: boolean };
    if (configuration?.notebookDebug || session.name === NOTEBOOK_DEBUG_SESSION_NAME) {
        return false;
    }
    return !configuration?.debugTests;
}

/**
 * A single running integration. Multiple integrations may run concurrently
 * (product-integrator#1012); each is tracked per project path. A run is
 * carried by a debug session (BI run / fast run / debug), the `bal run` task
 * behind a BI run session, a plain run terminal, or a combination of these.
 */
interface ActiveRun {
    projectPath: string;
    session?: DebugSession;
    task?: TaskExecution;
    terminal?: Terminal;
}

// Keyed by path.resolve(projectPath).
const activeRuns = new Map<string, ActiveRun>();

function runKey(projectPath: string): string {
    return path.resolve(projectPath);
}

function getOrCreateRun(projectPath: string): ActiveRun {
    const key = runKey(projectPath);
    let run = activeRuns.get(key);
    if (!run) {
        run = { projectPath: key };
        activeRuns.set(key, run);
    }
    return run;
}

function isTaskExecutionAlive(task: TaskExecution | undefined): boolean {
    return !!task && tasks.taskExecutions.some((execution) => execution === task);
}

function isRunAlive(run: ActiveRun): boolean {
    const terminalAlive = !!run.terminal && run.terminal.exitStatus === undefined;
    return !!run.session || terminalAlive || isTaskExecutionAlive(run.task);
}

function gcRun(run: ActiveRun): void {
    if (!isRunAlive(run)) {
        activeRuns.delete(run.projectPath);
    }
}

/** All live runs located at, or inside, the given path. */
function findRunsAt(targetPath: string): ActiveRun[] {
    const selectedPath = path.resolve(targetPath);
    const matches: ActiveRun[] = [];
    for (const run of activeRuns.values()) {
        const relative = path.relative(selectedPath, run.projectPath);
        const contained = relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
        if (contained && isRunAlive(run)) {
            matches.push(run);
        }
    }
    return matches;
}

export function markTerminalRunStarted(terminal: Terminal, projectPath: string): void {
    getOrCreateRun(projectPath).terminal = terminal;
}

/**
 * Registers the `bal run` task execution backing a BI run session so that
 * restarts can await full process termination (port release) before the next
 * run of the same integration starts.
 */
export function markTaskRunStarted(task: TaskExecution, projectPath: string): void {
    getOrCreateRun(projectPath).task = task;
}

export function isIntegrationRunning(): boolean {
    for (const run of activeRuns.values()) {
        if (isRunAlive(run)) {
            return true;
        }
    }
    return false;
}

export function isIntegrationRunningAt(targetPath: string): boolean {
    return findRunsAt(targetPath).length > 0;
}

/** Stops a run's debug session and waits for it to actually terminate. */
async function stopRunDebugSession(run: ActiveRun): Promise<void> {
    const session = run.session;
    if (!session) {
        return;
    }
    // Wait for actual terminate; stopDebugging only sends the request. Guarded
    // by a timeout so a stuck adapter cannot hang the restart flow forever —
    // a lingering process is still handled by the task-level wait that follows
    // (waitForRunTaskEnd + force-start prompt).
    await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
            sub.dispose();
            resolve();
        }, SESSION_TERMINATION_TIMEOUT_MS);
        const sub = debug.onDidTerminateDebugSession((ended) => {
            if (ended === session) {
                clearTimeout(timeout);
                sub.dispose();
                resolve();
            }
        });
        debug.stopDebugging(session);
    });
    if (run.session === session) {
        run.session = undefined;
    }
}

/**
 * Waits until the run's `bal run` task process has fully exited.
 * Returns false when the process is still alive after the timeout.
 */
async function waitForRunTaskEnd(run: ActiveRun, timeoutMs: number = TASK_TERMINATION_TIMEOUT_MS): Promise<boolean> {
    const task = run.task;
    if (!isTaskExecutionAlive(task)) {
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
        if (!isTaskExecutionAlive(task)) {
            clearTimeout(timeout);
            listener.dispose();
            resolve(true);
        }
    });
}

/** Stops a run completely, awaiting process termination. False on timeout. */
async function stopRun(run: ActiveRun): Promise<boolean> {
    if (run.session) {
        // Stopping the session triggers the adapter's disconnect, which
        // terminates the underlying `bal run` task as well.
        await stopRunDebugSession(run);
    } else if (isTaskExecutionAlive(run.task)) {
        // Task outlived its debug session; terminate it directly.
        run.task!.terminate();
    }
    if (run.terminal) {
        run.terminal.dispose();
        run.terminal = undefined;
    }
    // Await full process termination so a subsequent run of the same
    // integration does not hit port conflicts.
    const ended = await waitForRunTaskEnd(run);
    gcRun(run);
    return ended;
}

/**
 * Per-integration restart guard (product-integrator#1012): integrations run
 * concurrently, but a single integration has at most one running instance.
 * If the integration at targetPath is already running, asks the user whether
 * to stop it and start it again.
 *
 * Returns true when the caller may proceed with the new run (nothing was
 * running at that path, or the previous instance was stopped and its process
 * fully terminated, or the user chose to force-start). Returns false when the
 * new launch must be cancelled, leaving the current run untouched.
 */
export async function confirmAndStopActiveRun(targetPath: string): Promise<boolean> {
    if (!targetPath || findRunsAt(targetPath).length === 0) {
        return true;
    }
    const choice = await window.showInformationMessage(RUN_CONFLICT_PROMPT, "Yes", "No");
    if (choice !== "Yes") {
        return false;
    }
    // Re-query: the run may have ended on its own while the prompt was open.
    for (const run of findRunsAt(targetPath)) {
        const ended = await stopRun(run);
        if (!ended) {
            const forceChoice = await window.showWarningMessage(FORCE_START_PROMPT, "Force Start", "Cancel new launch");
            if (forceChoice !== "Force Start") {
                return false;
            }
        }
    }
    return true;
}

export async function restartIntegration(targetPath: string): Promise<void> {
    const runs = findRunsAt(targetPath);
    const sessionRun = runs.find((run) => !!run.session);
    if (sessionRun) {
        const session = sessionRun.session!;
        // Preserve original mode so debug restarts keep breakpoints.
        const wasNoDebug = session.configuration.noDebug ?? true;
        await stopRun(sessionRun);
        TracerMachine.startServer();
        // Direct re-launch skips the BI run flow's Try-It suggestion.
        await startDebugging(Uri.file(targetPath), false, false, wasNoDebug);
        return;
    }
    for (const run of runs) {
        if (run.terminal) {
            run.terminal.dispose();
            run.terminal = undefined;
        }
        gcRun(run);
    }
    TracerMachine.startServer();
    // Wrap as Uri so the RUN handler avoids Uri.parse, which mishandles Windows paths.
    await commands.executeCommand(PALETTE_COMMANDS.RUN, Uri.file(targetPath));
}

export function activateIntegrationRunnerState(): void {
    extension.context.subscriptions.push(
        window.onDidCloseTerminal((terminal) => {
            for (const run of activeRuns.values()) {
                if (run.terminal === terminal) {
                    run.terminal = undefined;
                    gcRun(run);
                }
            }
        }),
        debug.onDidStartDebugSession((session) => {
            if (isIntegrationRunDebugSession(session)) {
                const script = (session.configuration as { script?: string })?.script;
                if (script) {
                    getOrCreateRun(script).session = session;
                }
            }
        }),
        debug.onDidTerminateDebugSession((session) => {
            for (const run of activeRuns.values()) {
                if (run.session === session) {
                    run.session = undefined;
                    gcRun(run);
                }
            }
        }),
        tasks.onDidEndTaskProcess((event) => {
            for (const run of activeRuns.values()) {
                if (run.task === event.execution) {
                    run.task = undefined;
                    gcRun(run);
                }
            }
        })
    );
}
