// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import * as child_process from 'child_process';
import { quoteShellPath } from '../../../../utils';

const isWindows = process.platform === 'win32';

export interface RunningService {
    taskId: string;
    process: child_process.ChildProcess;
    logs: string[];
    logCursor: number;
    packagePath: string;
    startedAt: number;
    exited: boolean;
    exitCode: number;
    /**
     * Timer that auto-removes the entry after EXITED_SERVICE_TTL_MS once
     * the process has closed. Tracked here so it can be cleared when the
     * entry is removed earlier (e.g. via stopOne) — otherwise the timer
     * keeps the closure (and the logs buffer) alive for the full TTL.
     */
    exitTimer?: NodeJS.Timeout;
}

/**
 * Serializable view of a running service for cross-process boundaries (RPC).
 * Excludes the process handle and log buffer, which cannot cross to the webview.
 */
export interface RunningServiceInfo {
    taskId: string;
    packagePath: string;
    startedAt: number;
    exited: boolean;
    exitCode: number;
}

/** Auto-remove an exited service from the manager after this many ms. */
const EXITED_SERVICE_TTL_MS = 30_000;

/** Hard ceiling on dispose() so extension deactivation can't be blocked by a stuck child. */
const DISPOSE_TIMEOUT_MS = 2_000;

/**
 * Spawns a child process, capturing stdout/stderr into `logs`.
 * No VS Code terminal is created — output is consumed by the inline UI card.
 *
 * Because we run with `shell: true`, the shell would otherwise split the
 * command on whitespace — breaking executable paths that contain spaces
 * (e.g. `/Applications/WSO2 Integrator.app/.../bin/bal`). We pre-quote the
 * command path and pass a single command string so the shell sees the path
 * as one token.
 */
export function spawnProcess(
    command: string,
    args: string[],
    cwd: string,
    logs: string[]
): { process: child_process.ChildProcess } {
    const fullCommand = args.length > 0
        ? `${quoteShellPath(command)} ${args.join(' ')}`
        : quoteShellPath(command);

    const proc = child_process.spawn(fullCommand, {
        cwd,
        shell: true,
        detached: !isWindows,
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    const handleData = (data: Buffer) => {
        const text = data.toString();
        logs.push(removeAnsiEscapeCodes(text));
    };

    proc.stdout?.on('data', handleData);
    proc.stderr?.on('data', handleData);

    proc.on('error', (err) => {
        logs.push(`Failed to start process: ${err.message}`);
    });

    return { process: proc };
}

/**
 * Portable "is this PID still alive?" check.
 * Uses signal 0 which is a no-op that throws if the process doesn't exist —
 * supported on both Unix and Windows by Node's `process.kill`.
 */
function isProcessAlive(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        // ESRCH = dead. EPERM = alive-but-unsignalable (shouldn't happen for our own child).
        return code === 'EPERM';
    }
}

/**
 * Kills the entire process group (shell + child processes).
 *
 * Returns a promise that resolves once the kill command completes. Note:
 * completion of the kill command does NOT guarantee the process tree is
 * actually gone — callers should use `waitForExit` which verifies and
 * escalates if the root PID is still alive.
 *
 * stderr from `taskkill` / failures of `process.kill` are logged (not
 * silently swallowed) so orphan-process issues can be diagnosed from
 * extension host logs in the field.
 */
export function killProcessGroup(proc: child_process.ChildProcess, signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
    if (proc.pid == null) {
        return Promise.resolve();
    }
    const pid = proc.pid;

    if (isWindows) {
        return new Promise((resolve) => {
            // /T kills the process tree, /F forces termination.
            // Use async exec so the extension host isn't blocked by antivirus-slow taskkill.
            child_process.exec(`taskkill /T /F /PID ${pid}`, (err, _stdout, stderr) => {
                if (err) {
                    const msg = (stderr || err.message || '').trim();
                    // Exit code 128 / "not found" just means the process already died.
                    const alreadyGone = /not found|not running|could not be found|no tasks/i.test(msg);
                    if (!alreadyGone) {
                        console.warn(
                            `[RunningServicesManager] taskkill /T /F /PID ${pid} failed: ${msg || '(no stderr)'}`
                        );
                    }
                }
                resolve();
            });
        });
    }

    // Unix: kill the entire process group via negative PID.
    return new Promise((resolve) => {
        try {
            process.kill(-pid, signal);
        } catch (err) {
            const code = (err as NodeJS.ErrnoException).code;
            if (code !== 'ESRCH') {
                // Process group gone is fine; anything else is worth logging.
                console.warn(
                    `[RunningServicesManager] process.kill(-${pid}, ${signal}) failed: ${(err as Error).message}`
                );
            }
            // Fall back to killing just the direct child.
            try {
                proc.kill(signal);
            } catch (err2) {
                const code2 = (err2 as NodeJS.ErrnoException).code;
                if (code2 !== 'ESRCH') {
                    console.warn(
                        `[RunningServicesManager] proc.kill(${signal}) fallback failed: ${(err2 as Error).message}`
                    );
                }
            }
        }
        resolve();
    });
}

const STOP_TIMEOUT_MS = 5000;
/**
 * After `close` fires or the timeout elapses, we verify the PID is actually
 * gone. On Windows, `taskkill /T` can fail to walk the full tree (e.g. when
 * the shell exits before grandchildren are registered), leaving orphans.
 * This constant controls how long we wait for each post-kill verification
 * pass before giving up.
 */
const VERIFY_POLL_INTERVAL_MS = 100;
const VERIFY_MAX_WAIT_MS = 1_000;

/**
 * Waits for a process to exit, with escalation if the root PID is still
 * alive afterwards. Resolves when either (a) the PID is confirmed dead or
 * (b) we've exhausted our escalation attempts.
 */
export async function waitForExit(proc: child_process.ChildProcess, timeoutMs: number = STOP_TIMEOUT_MS): Promise<void> {
    if (proc.exitCode !== null) {
        return;
    }

    await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
            proc.removeListener('close', onClose);
            resolve();
        }, timeoutMs);

        function onClose() {
            clearTimeout(timeout);
            resolve();
        }

        proc.once('close', onClose);
    });

    await verifyPidGone(proc);
}

/**
 * Verifies the root PID is actually gone. If not, escalates with a second
 * kill pass and briefly polls. Logs loudly if the PID is still alive
 * after escalation — that's the orphan-process smell.
 */
async function verifyPidGone(proc: child_process.ChildProcess): Promise<void> {
    if (proc.pid == null) {
        return;
    }
    const pid = proc.pid;
    if (!isProcessAlive(pid)) {
        return;
    }

    console.warn(
        `[RunningServicesManager] PID ${pid} still alive after close/timeout; escalating kill`
    );
    await killProcessGroup(proc, 'SIGKILL');

    // Poll briefly for the PID to disappear after the escalation.
    const deadline = Date.now() + VERIFY_MAX_WAIT_MS;
    while (Date.now() < deadline) {
        if (!isProcessAlive(pid)) {
            return;
        }
        await new Promise((r) => setTimeout(r, VERIFY_POLL_INTERVAL_MS));
    }

    if (isProcessAlive(pid)) {
        console.error(
            `[RunningServicesManager] PID ${pid} is still alive after escalation — ` +
            `child process (or descendants) may be orphaned. This can happen on ` +
            `Windows when taskkill /T cannot walk the process tree.`
        );
    }
}

export class RunningServicesManager {
    private services = new Map<string, RunningService>();

    /**
     * Optional callback invoked whenever the service list changes
     * (registered, removed, or process exited). Used to push updates
     * to the webview UI.
     */
    onChange?: (services: RunningServiceInfo[]) => void;

    get(taskId: string): RunningService | undefined {
        return this.services.get(taskId);
    }

    /** Returns a serializable snapshot of all tracked services. */
    getAll(): RunningServiceInfo[] {
        return Array.from(this.services.values()).map((s) => ({
            taskId: s.taskId,
            packagePath: s.packagePath,
            startedAt: s.startedAt,
            exited: s.exited,
            exitCode: s.exitCode,
        }));
    }

    register(service: RunningService): void {
        this.services.set(service.taskId, service);

        service.process.once('close', (code) => {
            service.exited = true;
            service.exitCode = code ?? -1;
            this.notifyChange();
            // Hold the exited entry briefly so the UI can show the final state
            // before it disappears from the list.
            service.exitTimer = setTimeout(() => {
                if (this.services.get(service.taskId) === service) {
                    this.services.delete(service.taskId);
                    this.notifyChange();
                }
            }, EXITED_SERVICE_TTL_MS);
        });

        this.notifyChange();
    }

    remove(taskId: string): boolean {
        const service = this.services.get(taskId);
        if (!service) {
            return false;
        }
        this.dropService(service);
        this.notifyChange();
        return true;
    }

    async stopOne(taskId: string): Promise<boolean> {
        const service = this.services.get(taskId);
        if (!service) {
            return false;
        }
        if (!service.exited && !service.process.killed) {
            await killProcessGroup(service.process, 'SIGTERM');
            await waitForExit(service.process);
        }
        // The 'close' listener may have already removed the entry and fired
        // notifyChange. Only fire again if we're the ones doing the removal.
        if (this.dropService(service)) {
            this.notifyChange();
        }
        return true;
    }

    /**
     * Awaitable teardown of all services. Capped at DISPOSE_TIMEOUT_MS so
     * extension deactivation never blocks indefinitely on a stuck process.
     */
    async dispose(): Promise<void> {
        const services = Array.from(this.services.values());
        for (const service of services) {
            this.dropService(service);
        }
        this.notifyChange();

        const killAll = Promise.all(
            services.map(async (service) => {
                if (service.process.killed) {
                    return;
                }
                await killProcessGroup(service.process, 'SIGTERM');
                await waitForExit(service.process);
            })
        );

        // Race against a timeout so a stuck child can't hold up VS Code shutdown.
        await Promise.race([
            killAll,
            new Promise<void>((resolve) => setTimeout(resolve, DISPOSE_TIMEOUT_MS)),
        ]);
    }

    /**
     * Removes a service entry and clears its TTL timer if one is pending.
     * Without clearing, the timer's closure pins the logs buffer for the
     * full TTL even after the entry is gone. Returns whether the entry
     * was actually present in the map.
     */
    private dropService(service: RunningService): boolean {
        if (service.exitTimer) {
            clearTimeout(service.exitTimer);
            service.exitTimer = undefined;
        }
        return this.services.delete(service.taskId);
    }

    private notifyChange(): void {
        try {
            this.onChange?.(this.getAll());
        } catch (err) {
            console.error('[RunningServicesManager] onChange handler threw:', err);
        }
    }
}

function removeAnsiEscapeCodes(text: string): string {
    return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

export const runningServicesManager = new RunningServicesManager();
