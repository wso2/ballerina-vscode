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
import { ModelMessage } from "ai";
import { AI_MIGRATION_DIR } from "./types";

/** Filename for the conversation history file inside AI_MIGRATION_DIR. */
export const AI_MIG_HISTORY_FILENAME = "history.json";

/** Returns the absolute path to the history file for the given project root. */
function historyFilePath(projectRoot: string): string {
    return path.join(projectRoot, AI_MIGRATION_DIR, AI_MIG_HISTORY_FILENAME);
}

/**
 * Shape of the persisted history file.
 */
export interface MigrationHistory {
    /** Full conversation messages from the Vercel AI SDK `response.messages`. */
    messages: ModelMessage[];
    /** ISO timestamp of when the history was written. */
    savedAt: string;
    /** Whether the agent completed successfully or was aborted. */
    completionStatus: "completed" | "aborted" | "error";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Persists the conversation history to disk.
 *
 * @param projectRoot  Absolute path to the migrated project root.
 * @param messages     The `ModelMessage[]` array from the AI SDK response.
 * @param status       How the agent run ended.
 */
export function saveAgentHistory(
    projectRoot: string,
    messages: ModelMessage[],
    status: MigrationHistory["completionStatus"],
): void {
    const filePath = historyFilePath(projectRoot);
    const dir = path.dirname(filePath);
    const data: MigrationHistory = {
        messages,
        savedAt: new Date().toISOString(),
        completionStatus: status,
    };
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
        console.log(`[MigrationHistory] Saved ${messages.length} messages (${status}) to ${filePath}`);
    } catch (err) {
        console.error("[MigrationHistory] Failed to save history:", err);
    }
}

/**
 * Loads the persisted conversation history from disk.
 *
 * @param projectRoot  Absolute path to the migrated project root.
 * @returns  The history object, or `null` if no history file exists.
 */
export function loadAgentHistory(projectRoot: string): MigrationHistory | null {
    const filePath = historyFilePath(projectRoot);
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const raw = fs.readFileSync(filePath, "utf8");
        return JSON.parse(raw) as MigrationHistory;
    } catch (err) {
        console.error("[MigrationHistory] Failed to load history:", err);
        return null;
    }
}

/**
 * Removes the persisted history file (e.g. after enhancement is fully complete
 * and the user no longer needs to resume).
 *
 * @param projectRoot  Absolute path to the migrated project root.
 */
export function clearAgentHistory(projectRoot: string): void {
    const filePath = historyFilePath(projectRoot);
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[MigrationHistory] Cleared history at ${filePath}`);
        }
    } catch (err) {
        console.error("[MigrationHistory] Failed to clear history:", err);
    }
}
