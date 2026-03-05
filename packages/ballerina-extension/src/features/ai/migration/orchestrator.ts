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

import { MigrationEnhancementMode } from "@wso2/ballerina-core";
import { window } from "vscode";
import { extension } from "../../../BalExtensionContext";
import { openAIPanelWithPrompt } from "../../../views/ai-panel/aiMachine";
import { getAutoFixPrompt, getGuidedReviewPrompt } from "./prompts";
import {
    PENDING_ENHANCEMENT_TTL_MS,
    PENDING_MIGRATION_ENHANCEMENT_KEY,
    PendingMigrationEnhancement,
} from "./types";

// ===========================================================================
// Schedule – called before vscode.openFolder so data survives the reload
// ===========================================================================

/**
 * Persists the chosen enhancement mode to VS Code global state so the
 * pipeline can be resumed in the freshly opened project window.
 *
 * Call this right before `commands.executeCommand('vscode.openFolder', …)`.
 *
 * @param mode          The mode selected by the user in the wizard.
 * @param projectRoot   Absolute path to the new Ballerina project root.
 */
export function scheduleMigrationEnhancement(
    mode: MigrationEnhancementMode,
    projectRoot: string
): void {
    if (mode === "none") {
        // Nothing to schedule – clear any stale entry
        extension.context.globalState.update(PENDING_MIGRATION_ENHANCEMENT_KEY, undefined);
        return;
    }

    const entry: PendingMigrationEnhancement = {
        mode,
        projectRoot,
        timestamp: Date.now(),
    };

    extension.context.globalState.update(PENDING_MIGRATION_ENHANCEMENT_KEY, entry);
    console.log(`[MigrationEnhancement] Scheduled '${mode}' enhancement for project: ${projectRoot}`);
}

// ===========================================================================
// Check & Run – called once the extension reaches the extensionReady state
// ===========================================================================

/**
 * Checks whether a migration enhancement was scheduled in a previous window
 * (set by `scheduleMigrationEnhancement` before the folder reload).
 *
 * If found and still fresh, launches the appropriate pipeline:
 * - **auto-fix**:    Submits the multi-stage agent prompt without user intervention.
 * - **guided-review**: Opens the AI panel in plan mode so the user reviews
 *                      each step before it is applied.
 *
 * Safe to call on every activation – a no-op when there is no pending entry.
 */
export async function checkAndRunPendingEnhancement(): Promise<void> {
    const stored = extension.context.globalState.get<PendingMigrationEnhancement>(
        PENDING_MIGRATION_ENHANCEMENT_KEY
    );

    if (!stored) {
        return;
    }

    // Consume the entry immediately to avoid re-running on later activations
    await extension.context.globalState.update(PENDING_MIGRATION_ENHANCEMENT_KEY, undefined);

    // Discard stale entries (e.g. the user opened an unrelated workspace later)
    const age = Date.now() - stored.timestamp;
    if (age > PENDING_ENHANCEMENT_TTL_MS) {
        console.log(`[MigrationEnhancement] Discarding stale entry (age: ${Math.round(age / 1000)}s)`);
        return;
    }

    console.log(
        `[MigrationEnhancement] Resuming '${stored.mode}' pipeline for: ${stored.projectRoot}`
    );

    switch (stored.mode) {
        case "auto-fix":
            await runAutoFixPipeline();
            break;
        case "guided-review":
            runGuidedReviewPipeline();
            break;
        default:
            break;
    }
}

// ===========================================================================
// Pipeline implementations
// ===========================================================================

/**
 * **Auto-fix pipeline**
 *
 * Opens the AI panel and immediately submits the comprehensive multi-stage
 * migration prompt.  The agent runs without requiring user confirmation
 * at each step (plan mode is disabled).
 */
async function runAutoFixPipeline(): Promise<void> {
    try {
        openAIPanelWithPrompt({
            type: "text",
            text: getAutoFixPrompt(),
            planMode: false,
        });

        console.log("[MigrationEnhancement] Auto-fix pipeline started.");
    } catch (error) {
        console.error("[MigrationEnhancement] Failed to start auto-fix pipeline:", error);
        window.showErrorMessage(
            `Migration AI enhancement failed to start: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * **Guided-review pipeline**
 *
 * Opens the AI panel in plan mode with the guided-review prompt
 * pre-populated.  The agent will propose a plan for each step and the
 * user approves or modifies it before changes are applied.
 */
function runGuidedReviewPipeline(): void {
    try {
        openAIPanelWithPrompt({
            type: "text",
            text: getGuidedReviewPrompt(),
            planMode: true,
        });

        console.log("[MigrationEnhancement] Guided-review pipeline opened.");
    } catch (error) {
        console.error("[MigrationEnhancement] Failed to open guided-review pipeline:", error);
        window.showErrorMessage(
            `Migration AI enhancement failed to open: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}
