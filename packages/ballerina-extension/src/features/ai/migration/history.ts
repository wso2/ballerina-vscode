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

/**
 * Disk-based conversation history persistence for migration AI enhancement.
 *
 * The wizard migration flow does NOT use `chatStateStorage` (it passes
 * `chatStorage: undefined`), so we persist the full `ModelMessage[]` array
 * to a JSON file inside the project root.  This allows exact resumption of
 * the conversation when the user opens the project later and triggers the
 * "Continue AI Enhancement" action from AI Chat.
 */

import * as fs from "fs";
import * as path from "path";
import { ModelMessage } from "ai";

/** File written next to `.ai-migrate-enhance.toml` inside the project root. */
export const AI_MIG_HISTORY_FILENAME = ".ai-mig-history.json";

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
    const filePath = path.join(projectRoot, AI_MIG_HISTORY_FILENAME);
    const data: MigrationHistory = {
        messages,
        savedAt: new Date().toISOString(),
        completionStatus: status,
    };
    try {
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
    const filePath = path.join(projectRoot, AI_MIG_HISTORY_FILENAME);
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
    const filePath = path.join(projectRoot, AI_MIG_HISTORY_FILENAME);
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[MigrationHistory] Cleared history at ${filePath}`);
        }
    } catch (err) {
        console.error("[MigrationHistory] Failed to clear history:", err);
    }
}
