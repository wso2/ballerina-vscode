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
import { Command, MigrationEnhancementMode } from "@wso2/ballerina-core";
import { window, workspace } from "vscode";
import { extension } from "../../../BalExtensionContext";
import { StateMachine } from "../../../stateMachine";
import { openMigrationPanel } from "../../../views/migration-panel/activate";
import { AgentExecutor } from "../agent/AgentExecutor";
import { AICommandConfig } from "../executors/base/AICommandExecutor";
import { createMigrationEventHandler } from "../utils/events";
import { getAutoFixPrompt, getGuidedReviewPrompt } from "./prompts";
import {
    AI_ENHANCE_TOML_FILENAME,
    ActiveMigrationSessionLocal,
    EnhanceTomlData,
    MIGRATION_PROJECT_ROOT_KEY,
    PENDING_ENHANCEMENT_TTL_MS,
    PENDING_MIGRATION_ENHANCEMENT_KEY,
    PendingMigrationEnhancement,
} from "./types";

// ===========================================================================
// Active Session – in-memory state for the current window session
// ===========================================================================

/** Module-level session state – reset on each extension host lifecycle. */
let _activeSession: ActiveMigrationSessionLocal = { isActive: false, mode: "none", isEnhanced: true };

// ===========================================================================
// Toml helpers – `.ai-migrate-enhance.toml`
// ===========================================================================

/**
 * Reads and parses the `.ai-migrate-enhance.toml` from the given directory.
 * Returns `null` if the file does not exist or cannot be parsed.
 */
export function readEnhanceToml(projectRoot: string): EnhanceTomlData | null {
    try {
        const filePath = path.join(projectRoot, AI_ENHANCE_TOML_FILENAME);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const content = fs.readFileSync(filePath, "utf8");
        const modeMatch = content.match(/mode\s*=\s*"([^"]+)"/);
        const enhancedMatch = content.match(/isEnhanced\s*=\s*(true|false)/);
        return {
            mode: (modeMatch?.[1] ?? "none") as MigrationEnhancementMode,
            isEnhanced: enhancedMatch?.[1] === "true",
        };
    } catch {
        return null;
    }
}

/**
 * Writes the `.ai-migrate-enhance.toml` to the given directory.
 */
export function writeEnhanceToml(projectRoot: string, mode: MigrationEnhancementMode, isEnhanced: boolean): void {
    const filePath = path.join(projectRoot, AI_ENHANCE_TOML_FILENAME);
    const content = `[enhancement]\nmode = "${mode}"\nisEnhanced = ${isEnhanced}\n`;
    fs.writeFileSync(filePath, content);
}

// ===========================================================================
// Session state access
// ===========================================================================

/**
 * Returns the current migration enhancement session state.
 * Prefers the in-memory active session; falls back to reading the toml from the
 * current workspace/project folder when no pipeline is actively running.
 */
export function getActiveMigrationSessionState(): ActiveMigrationSessionLocal {
    console.log("[MigrationEnhancement] getActiveMigrationSessionState called, _activeSession:", JSON.stringify(_activeSession));

    // If a pipeline is currently running in this window, return it immediately.
    if (_activeSession.isActive) {
        return { ..._activeSession };
    }

    // Determine the project root from the open workspace/project.
    // _resolveCurrentProjectRoot returns the path that actually contains the toml.
    const projectRoot = _resolveCurrentProjectRoot();
    console.log("[MigrationEnhancement] resolved projectRoot:", projectRoot);
    if (!projectRoot) {
        return { ..._activeSession };
    }

    const data = readEnhanceToml(projectRoot);
    console.log("[MigrationEnhancement] readEnhanceToml result:", JSON.stringify(data));
    // If the toml is found, it is the source of truth.
    if (data) {
        return {
            isActive: false,
            mode: data.mode,
            isEnhanced: data.isEnhanced,
        };
    }

    // Toml not found – fall back to whatever _activeSession reports.
    // checkAndRunPendingEnhancement may have set it to { isEnhanced: false }
    // for mode="none".  If it's still the cold default (isEnhanced: true)
    // the banner will remain hidden – that is correct for non-migration projects.
    return { ..._activeSession };
}

/**
 * Marks the enhancement as complete by updating `isEnhanced = true` in the
 * toml file and clearing the in-memory active session.
 */
export function markEnhancementComplete(): void {
    const projectRoot = _resolveCurrentProjectRoot();
    if (projectRoot) {
        const data = readEnhanceToml(projectRoot);
        if (data) {
            writeEnhanceToml(projectRoot, data.mode, true);
        }
    }
    _activeSession = { isActive: false, mode: _activeSession.mode, isEnhanced: true };
    console.log("[MigrationEnhancement] Enhancement marked as complete.");
}

/**
 * Allows the user to start (or re-trigger) the enhancement pipeline from the
 * "skip" (none) state, or to switch modes.
 * - Updates the toml with the new mode and `isEnhanced = false`.
 * - Starts the appropriate pipeline.
 */
export async function startMigrationEnhancement(mode: Exclude<MigrationEnhancementMode, "none">): Promise<void> {
    const projectRoot = _resolveCurrentProjectRoot();
    if (projectRoot) {
        writeEnhanceToml(projectRoot, mode, false);
    }

    if (mode === "auto-fix") {
        await runAutoFixPipeline();
    } else {
        runGuidedReviewPipeline();
    }
}

// ===========================================================================
// Schedule – called before vscode.openFolder so data survives the reload
// ===========================================================================

/**
 * Persists the chosen enhancement mode (including "none") to VS Code global
 * state so that `checkAndRunPendingEnhancement` can find the toml file in the
 * freshly opened project window.
 *
 * Call this right before `commands.executeCommand('vscode.openFolder', …)`.
 */
export function scheduleMigrationEnhancement(
    mode: MigrationEnhancementMode,
    projectRoot: string
): void {
    const entry: PendingMigrationEnhancement = {
        mode,
        projectRoot,
        timestamp: Date.now(),
    };
    extension.context.globalState.update(PENDING_MIGRATION_ENHANCEMENT_KEY, entry);
    // Also persist the project root without expiry so getActiveMigrationSessionState
    // can always resolve the toml even if the webview beats checkAndRunPendingEnhancement.
    extension.context.globalState.update(MIGRATION_PROJECT_ROOT_KEY, projectRoot);
    console.log(`[MigrationEnhancement] Scheduled '${mode}' enhancement for project: ${projectRoot}`);
}

// ===========================================================================
// Check & Run – called once the extension reaches the extensionReady state
// ===========================================================================

/**
 * Checks whether a migration enhancement was scheduled in a previous window.
 * Reads the `.ai-migrate-enhance.toml` from the stored project root and decides
 * what action to take:
 * - `mode = "auto-fix"` / `"guided-review"` + `isEnhanced = false` → run pipeline
 * - `mode = "none"` → no pipeline, but session is set so the banner shows
 * - `isEnhanced = true` → nothing to do
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

    // Read the toml from disk – it is the single source of truth
    const data = readEnhanceToml(stored.projectRoot);
    if (!data) {
        console.warn(`[MigrationEnhancement] No toml found at: ${stored.projectRoot}`);
        return;
    }

    if (data.isEnhanced) {
        console.log("[MigrationEnhancement] Enhancement already completed – nothing to do.");
        return;
    }

    console.log(`[MigrationEnhancement] Resuming '${data.mode}' pipeline for: ${stored.projectRoot}`);

    switch (data.mode) {
        case "auto-fix":
            await runAutoFixPipeline();
            break;
        case "guided-review":
            runGuidedReviewPipeline();
            break;
        case "none":
            // User skipped – expose the session so the banner shows with a "Start" button.
            _activeSession = { isActive: false, mode: "none", isEnhanced: false };
            console.log("[MigrationEnhancement] Skip mode – banner will be shown for manual trigger.");
            break;
    }
}

// ===========================================================================
// Pipeline implementations
// ===========================================================================

async function runAutoFixPipeline(): Promise<void> {
    try {
        _activeSession = { isActive: true, mode: "auto-fix", isEnhanced: false };
        // Open the standalone migration panel — the pipeline prompt will be
        // sent via the migration event handler once the panel is ready.
        openMigrationPanel();
        console.log("[MigrationEnhancement] Auto-fix pipeline started – migration panel opened.");
    } catch (error) {
        console.error("[MigrationEnhancement] Failed to start auto-fix pipeline:", error);
        window.showErrorMessage(
            `Migration AI enhancement failed to start: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

function runGuidedReviewPipeline(): void {
    try {
        _activeSession = { isActive: true, mode: "guided-review", isEnhanced: false };
        // Open the standalone migration panel for guided review.
        openMigrationPanel();
        console.log("[MigrationEnhancement] Guided-review pipeline opened – migration panel opened.");
    } catch (error) {
        console.error("[MigrationEnhancement] Failed to open guided-review pipeline:", error);
        window.showErrorMessage(
            `Migration AI enhancement failed to open: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

// ===========================================================================
// Agent execution – called when the migration panel signals readiness
// ===========================================================================

/** Module-level abort controller for the currently running migration agent. */
let _migrationAbortController: AbortController | undefined;

/** Module-level selected model ID (set by the UI's model selector). */
let _selectedModelId: string = "wso2"; // default to WSO2 BI Copilot

/**
 * Update the selected model ID from the webview.
 */
export function setMigrationModelId(modelId: string): void {
    _selectedModelId = modelId;
    console.log(`[MigrationEnhancement] Model set to: ${modelId}`);
}

/**
 * Fired by `migrationPanelReady` RPC – creates an `AICommandConfig` with the
 * migration event handler and runs `AgentExecutor` to stream results to the
 * standalone Migration Panel.
 */
export async function runMigrationAgent(): Promise<void> {
    const mode = _activeSession.mode;
    if (mode === "none") {
        console.log("[MigrationEnhancement] runMigrationAgent called with mode=none – skipping.");
        return;
    }

    // Determine the project root (workspace folder)
    const projectRoot = _resolveCurrentProjectRoot()
        ?? workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!projectRoot) {
        window.showErrorMessage("Migration enhancement: unable to determine project root.");
        return;
    }

    const prompt = mode === "auto-fix" ? getAutoFixPrompt() : getGuidedReviewPrompt();

    _migrationAbortController = new AbortController();

    const config: AICommandConfig = {
        executionContext: {
            projectPath: projectRoot,
            workspacePath: projectRoot,
        },
        eventHandler: createMigrationEventHandler(Command.Agent),
        generationId: `migration-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        abortController: _migrationAbortController,
        params: {
            usecase: prompt,
            fileAttachmentContents: [],
            isPlanMode: mode === "guided-review",
        },
        // No chat storage – migration runs are single-shot
        chatStorage: undefined,
        lifecycle: {
            cleanupStrategy: "immediate",
        },
    };

    console.log(`[MigrationEnhancement] Starting migration agent – mode: ${mode}, model: ${_selectedModelId}`);

    try {
        await new AgentExecutor(config).run();
        // Agent finished successfully – mark enhancement as complete
        markEnhancementComplete();
        console.log("[MigrationEnhancement] Migration agent completed successfully.");
    } catch (error) {
        if (_migrationAbortController.signal.aborted) {
            console.log("[MigrationEnhancement] Migration agent was aborted by user.");
        } else {
            console.error("[MigrationEnhancement] Migration agent error:", error);
        }
    } finally {
        _migrationAbortController = undefined;
    }
}

/**
 * Abort the currently running migration agent (if any).
 */
export function abortMigrationAgent(): void {
    if (_migrationAbortController) {
        _migrationAbortController.abort();
        console.log("[MigrationEnhancement] Abort signal sent to migration agent.");
    }
}

// ===========================================================================
// Internal helpers
// ===========================================================================

function _resolveCurrentProjectRoot(): string | undefined {
    // Build a list of candidate paths to check for the toml file.
    const candidates: string[] = [];

    const folders = workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        candidates.push(folders[0].uri.fsPath);
    }

    // Also check the project root stored persistently at migration time.
    const stored = extension.context.globalState.get<string>(MIGRATION_PROJECT_ROOT_KEY);
    console.log("[MigrationEnhancement] stored MIGRATION_PROJECT_ROOT_KEY:", stored);
    if (stored && !candidates.includes(stored)) {
        candidates.push(stored);
    }

    // Also check the active Ballerina project path from the state machine —
    // this is the most reliable source when the panel is opened manually
    // without going through the migration wizard first.
    try {
        const smCtx = StateMachine.context();
        const smProjectPath = smCtx?.projectPath;
        const smWorkspacePath = smCtx?.workspacePath;
        if (smProjectPath && !candidates.includes(smProjectPath)) {
            candidates.push(smProjectPath);
        }
        if (smWorkspacePath && !candidates.includes(smWorkspacePath)) {
            candidates.push(smWorkspacePath);
        }
        console.log("[MigrationEnhancement] StateMachine candidates:", smProjectPath, smWorkspacePath);
    } catch {
        // StateMachine may not be initialized yet — ignore
    }

    // Return the first candidate that actually contains the toml file.
    for (const candidate of candidates) {
        const tomlPath = path.join(candidate, AI_ENHANCE_TOML_FILENAME);
        const exists = fs.existsSync(tomlPath);
        console.log("[MigrationEnhancement] checking toml at:", tomlPath, "exists:", exists);
        if (exists) {
            return candidate;
        }
    }

    // No toml found in any candidate – still return the workspace folder so
    // the caller can decide (it will get null from readEnhanceToml and fall back).
    return candidates[0];
}
