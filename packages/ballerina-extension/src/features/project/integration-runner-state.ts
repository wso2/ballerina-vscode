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
import { commands, debug, DebugSession, Terminal, Uri, window } from "vscode";
import { extension } from "../../BalExtensionContext";
import { startDebugging } from "../editor-support/activator";
import { TracerMachine } from "../tracing";
import { PALETTE_COMMANDS } from "./cmds/cmd-runner";

const BALLERINA_DEBUG_TYPE = "ballerina";

function isIntegrationRunDebugSession(session: DebugSession): boolean {
    if (session.type !== BALLERINA_DEBUG_TYPE) {
        return false;
    }
    return !(session.configuration as { debugTests?: boolean })?.debugTests;
}

let runTerminal: Terminal | undefined;
let runDebugSession: DebugSession | undefined;
let lastRunPath: string | undefined;

export function markTerminalRunStarted(terminal: Terminal, projectPath: string): void {
    runTerminal = terminal;
    lastRunPath = projectPath;
}

export function isIntegrationRunning(): boolean {
    const terminalAlive = !!runTerminal && runTerminal.exitStatus === undefined;
    const debugAlive = !!runDebugSession;
    return terminalAlive || debugAlive;
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

export async function restartIntegration(targetPath: string): Promise<void> {
    if (runDebugSession) {
        const session = runDebugSession;
        // Preserve original mode so debug restarts keep breakpoints.
        const wasNoDebug = session.configuration.noDebug ?? true;
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
        })
    );
}
