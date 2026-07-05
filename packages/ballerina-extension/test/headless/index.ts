// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

/**
 * Headless single-shot code-generation entry point for external benchmarks
 * (e.g. Ballerina-Bench). This is an `@vscode/test-electron` extension-tests
 * module: it runs INSIDE the real extension host, so it drives the EXACT same
 * generation path (`AgentExecutor.run()` via the `generateAgentForTest`
 * command) with the REAL bundled Language Server that the product and the
 * `test/ai/evals/code` suite use. Nothing about prompts, model, tools, or the
 * temp-project → workspace integration is changed here — this file only
 * *invokes* the existing command and streams events to stdout.
 *
 * Inputs (via environment, set by test/runHeadlessGen.ts):
 *   COPILOT_INSTRUCTION_PATH  absolute path to the instruction/brief file
 *   COPILOT_WORKSPACE_PATH    absolute path to the Ballerina project to edit
 *                             (defaults to the first workspace folder)
 *
 * Output: generated code is written back into COPILOT_WORKSPACE_PATH by the
 * command's `integrateCodeToWorkspace` step (unconditional in
 * AgentExecutor.handleStreamFinish when temp !== workspace). Progress is
 * printed to stdout as `[copilot-event] <json>` lines, which the benchmark
 * captures as its terminal_io trajectory.
 */

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import type { ChatNotify } from "@wso2/ballerina-core";
import type {
    GenerateAgentForTestParams,
    GenerateAgentForTestResult
} from "../../src/features/ai/activator";

const AI_GENERATE_AGENT_FOR_TEST = "ballerina.test.ai.generateAgentForTest";
// Match the eval harness activation budget (30 attempts * 2s = 60s).
const ACTIVATION_RETRY_INTERVAL_MS = 2000;
const MAX_ACTIVATION_ATTEMPTS = 30;

function emit(kind: string, payload: Record<string, unknown>): void {
    try {
        // Single line so the benchmark's terminal_io capture keeps it intact.
        process.stdout.write(`[copilot-event] ${JSON.stringify({ kind, ...payload })}\n`);
    } catch {
        /* never let logging break generation */
    }
}

/**
 * Copies the generated project from the temp dir back into the workspace.
 *
 * The generation engine edits a temp copy of the project (os.tmpdir()/bal-proj-*)
 * and normally integrates changes back via `vscode.workspace.applyEdit`, which is
 * unreliable in a headless host. The eval suite instead reads results straight from
 * `tempProjectPath`; we mirror that by copying the temp tree over the workspace so
 * the benchmark grades the actual generated output. This is pure post-generation
 * file placement — it does not affect what the model generated. `.git` and `target`
 * are skipped so the harness's own git state and build outputs aren't clobbered.
 */
function copyGeneratedToWorkspace(tempPath: string, workspacePath: string): number {
    let count = 0;
    const skip = new Set([".git", "target"]);
    const walk = (relDir: string): void => {
        const absSrcDir = path.join(tempPath, relDir);
        for (const entry of fs.readdirSync(absSrcDir, { withFileTypes: true })) {
            if (relDir === "" && skip.has(entry.name)) {
                continue;
            }
            const rel = relDir ? path.join(relDir, entry.name) : entry.name;
            const src = path.join(tempPath, rel);
            const dest = path.join(workspacePath, rel);
            if (entry.isDirectory()) {
                fs.mkdirSync(dest, { recursive: true });
                walk(rel);
            } else if (entry.isFile()) {
                fs.mkdirSync(path.dirname(dest), { recursive: true });
                fs.copyFileSync(src, dest);
                count++;
            }
        }
    };
    walk("");
    return count;
}

/** Waits until the extension has activated and the test command is registered. */
async function waitForActivation(): Promise<void> {
    for (let attempt = 0; attempt < MAX_ACTIVATION_ATTEMPTS; attempt++) {
        const commands = await vscode.commands.getCommands();
        if (commands.includes(AI_GENERATE_AGENT_FOR_TEST)) {
            return;
        }
        await new Promise((r) => setTimeout(r, ACTIVATION_RETRY_INTERVAL_MS));
    }
    throw new Error(
        `Command '${AI_GENERATE_AGENT_FOR_TEST}' never registered — extension failed to activate ` +
        `(is AI_TEST_ENV=true set, and is COPILOT_WORKSPACE_PATH a Ballerina project?)`
    );
}

/** Serializes each ChatNotify to stdout; tracks completion/error for the exit summary. */
function createStdoutEventHandler(): {
    handler: (event: ChatNotify) => void;
    getState: () => { completed: boolean; error: string | null };
} {
    let completed = false;
    let error: string | null = null;

    const handler = (event: ChatNotify): void => {
        const e = event as unknown as Record<string, any>;
        switch (event.type) {
            case "start":
                emit("start", {});
                break;
            case "content_block":
                // Text deltas are high-volume; emit length only to keep the log readable.
                emit("content_block", { length: (e.content ?? "").length });
                break;
            case "content_replace":
                emit("content_replace", {});
                break;
            case "tool_call":
                emit("tool_call", { toolName: e.toolName });
                break;
            case "tool_result":
                emit("tool_result", { toolName: e.toolName });
                break;
            case "diagnostics":
                emit("diagnostics", { count: Array.isArray(e.diagnostics) ? e.diagnostics.length : 0 });
                break;
            case "intermediary_state":
                emit("intermediary_state", { state: e.state });
                break;
            case "usage_metrics":
                emit("usage_metrics", { usage: e.usage, isRepair: !!e.isRepair });
                break;
            case "error":
                error = String(e.content ?? "unknown error");
                emit("error", { message: error });
                break;
            case "abort":
                error = error ?? "aborted";
                emit("abort", {});
                break;
            case "stop":
                completed = true;
                emit("stop", {});
                break;
            default:
                emit("event", { type: (event as any).type });
                break;
        }
    };

    return { handler, getState: () => ({ completed, error }) };
}

/**
 * Extension-tests entry. Uses the callback signature (matching test/index.ts)
 * which the installed @vscode/test-electron runner invokes.
 */
export function run(_testsRoot?: string, clb?: (err: any, failures?: number) => void): void {
    const done = (err: any, failures = 0) => {
        if (clb) {
            clb(err, failures);
        } else if (err) {
            // Promise-style fallback: surface as a non-zero exit.
            console.error(err);
            process.exitCode = 1;
        }
    };

    (async () => {
        try {
            const instructionPath = process.env.COPILOT_INSTRUCTION_PATH;
            if (!instructionPath) {
                throw new Error("COPILOT_INSTRUCTION_PATH is not set");
            }
            if (!fs.existsSync(instructionPath)) {
                throw new Error(`Instruction file not found: ${instructionPath}`);
            }

            let workspacePath = process.env.COPILOT_WORKSPACE_PATH;
            if (!workspacePath) {
                const folders = vscode.workspace.workspaceFolders;
                if (folders && folders.length > 0) {
                    workspacePath = folders[0].uri.fsPath;
                }
            }
            if (!workspacePath || !fs.existsSync(workspacePath)) {
                throw new Error(`Workspace path not found: ${workspacePath}`);
            }

            const instructionText = fs.readFileSync(instructionPath, "utf-8");
            emit("headless_start", { instructionPath, workspacePath, bytes: instructionText.length });

            await waitForActivation();
            emit("activated", {});

            const { handler, getState } = createStdoutEventHandler();

            // Identical shape to test/ai/evals/code (the validated path). We do NOT
            // set a `model` override — the command uses the shipped default model,
            // preserving generation behavior. isPlanMode:false = Edit mode (Plan mode
            // would require interactive plan approval, which cannot complete headless).
            const params: GenerateAgentForTestParams = {
                usecase: instructionText,
                operationType: undefined,
                fileAttachmentContents: [],
                isPlanMode: false,
                codeContext: undefined,
                projectPath: workspacePath
            };

            const result = await vscode.commands.executeCommand<GenerateAgentForTestResult>(
                AI_GENERATE_AGENT_FOR_TEST,
                params,
                handler
            );

            const state = getState();
            if (state.error) {
                throw new Error(`Generation reported an error: ${state.error}`);
            }
            if (!result || !result.tempProjectPath) {
                throw new Error(`Generation returned no result: ${JSON.stringify(result)}`);
            }

            // Persist the generated project into the workspace for the benchmark to grade.
            let filesCopied = 0;
            if (fs.existsSync(result.tempProjectPath)) {
                filesCopied = copyGeneratedToWorkspace(result.tempProjectPath, workspacePath);
            }

            emit("headless_done", {
                completed: state.completed,
                tempProjectPath: result.tempProjectPath,
                workspacePath,
                filesCopied
            });
            done(undefined, 0);
        } catch (err) {
            emit("headless_error", { message: (err as Error).message });
            done(err);
        }
    })();
}
