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
}

/**
 * Spawns a child process, capturing stdout/stderr into `logs`.
 * No VS Code terminal is created — output is consumed by the inline UI card.
 */
export function spawnProcess(
    command: string,
    args: string[],
    cwd: string,
    logs: string[]
): { process: child_process.ChildProcess } {
    const proc = child_process.spawn(command, args, {
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
 * Kills the entire process group (shell + child processes).
 * Falls back to killing just the process if the group kill fails.
 */
export function killProcessGroup(proc: child_process.ChildProcess, signal: NodeJS.Signals = 'SIGTERM'): void {
    if (proc.pid == null) {
        return;
    }

    if (isWindows) {
        // On Windows, use taskkill with /T to kill the entire process tree
        try {
            child_process.execSync(`taskkill /T /F /PID ${proc.pid}`, { stdio: 'ignore' });
        } catch {
            // Process may already be gone
            try { proc.kill(signal); } catch { /* already dead */ }
        }
    } else {
        // On Unix, kill the process group via negative PID
        try {
            process.kill(-proc.pid, signal);
        } catch {
            // Process group may already be gone; try killing just the process
            try { proc.kill(signal); } catch { /* already dead */ }
        }
    }
}

const STOP_TIMEOUT_MS = 5000;

export function waitForExit(proc: child_process.ChildProcess, timeoutMs: number = STOP_TIMEOUT_MS): Promise<void> {
    return new Promise((resolve) => {
        if (proc.exitCode !== null) {
            resolve();
            return;
        }

        const timeout = setTimeout(() => {
            proc.removeListener('close', onClose);
            if (proc.exitCode === null) {
                killProcessGroup(proc, 'SIGKILL');
            }
            resolve();
        }, timeoutMs);

        function onClose() {
            clearTimeout(timeout);
            resolve();
        }

        proc.once('close', onClose);
    });
}

export class RunningServicesManager {
    private services = new Map<string, RunningService>();

    get(taskId: string): RunningService | undefined {
        return this.services.get(taskId);
    }

    register(service: RunningService): void {
        this.services.set(service.taskId, service);
    }

    remove(taskId: string): boolean {
        return this.services.delete(taskId);
    }

    stopAll(): void {
        for (const service of this.services.values()) {
            if (!service.process.killed) {
                killProcessGroup(service.process, 'SIGTERM');
            }
            // Best-effort SIGKILL fallback — fire-and-forget for teardown
            waitForExit(service.process);
        }
        this.services.clear();
    }

    dispose(): void {
        this.stopAll();
    }
}

function removeAnsiEscapeCodes(text: string): string {
    return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

export const runningServicesManager = new RunningServicesManager();
