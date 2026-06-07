// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).

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

import * as fs from "fs";
import * as path from "path";
import { AI_MIGRATION_DIR } from "./types";

const LOG_FILE_NAME = "debug.log";
const MAX_SUMMARY_LENGTH = 200;

/**
 * Lightweight append-only logger that writes migration enhancement run
 * milestones and tool call summaries to `.ballerina-ai-migration/debug.log`.
 *
 * Multiple runs accumulate in the same file — each run begins with a
 * separator header so individual runs can be identified.
 *
 * All writes are synchronous and immediately flushed for crash-safety.
 * Write failures are silently swallowed so the logger never disrupts the
 * main enhancement flow.
 */
export class MigrationDebugLogger {
    private readonly logFilePath: string;

    constructor(projectRoot: string, modelId: string) {
        const logDir = path.join(projectRoot, AI_MIGRATION_DIR);
        if (!fs.existsSync(logDir)) {
            try {
                fs.mkdirSync(logDir, { recursive: true });
            } catch {
                // If we can't create the dir, writes below will silently fail.
            }
        }
        this.logFilePath = path.join(logDir, LOG_FILE_NAME);
        this._write(`\n=== Enhancement Run ${new Date().toISOString()} (model: ${modelId}) ===`);
    }

    /** Record a high-level milestone (stage start/end, run completion, abort). */
    logMilestone(message: string): void {
        this._write(`[${this._ts()}] [MILESTONE] ${message}`);
    }

    /**
     * Record a tool call result.
     * @param toolName     Name of the tool as registered with the agent.
     * @param durationMs   Wall-clock time from tool-call to tool-result.
     * @param resultSummary Short human-readable summary of the result (max 200 chars).
     */
    logToolCall(toolName: string, durationMs: number, resultSummary: string): void {
        const safe = resultSummary ?? "<no result>";
        const summary = safe.length > MAX_SUMMARY_LENGTH
            ? safe.substring(0, MAX_SUMMARY_LENGTH) + "…"
            : safe;
        this._write(`[${this._ts()}] [TOOL] ${toolName} — ${durationMs}ms — ${summary}`);
    }

    /** Record an error with optional stack trace. */
    logError(context: string, error: unknown): void {
        const msg = error instanceof Error
            ? `${error.message}${error.stack ? `\n${error.stack}` : ""}`
            : String(error);
        this._write(`[${this._ts()}] [ERROR] ${context}: ${msg}`);
    }

    /** Record a timeout event (e.g. LS diagnostics timeout). */
    logTimeout(context: string, timeoutMs: number): void {
        this._write(`[${this._ts()}] [TIMEOUT] ${context} — timed out after ${timeoutMs}ms`);
    }

    private _ts(): string {
        return new Date().toISOString();
    }

    private _write(line: string): void {
        try {
            fs.appendFileSync(this.logFilePath, line + "\n", "utf8");
        } catch {
            // Non-critical — swallow write errors silently.
        }
    }
}
