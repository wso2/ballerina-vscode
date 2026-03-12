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
import { AIMachineEventType, Command, MigrationEnhancementMode } from "@wso2/ballerina-core";
import { commands, Uri, window, workspace } from "vscode";
import { extension } from "../../../BalExtensionContext";
import { StateMachine } from "../../../stateMachine";
import { AIStateMachine, openAIPanelWithPrompt } from "../../../views/ai-panel/aiMachine";
import { AgentExecutor } from "../agent/AgentExecutor";
import { AICommandConfig } from "../executors/base/AICommandExecutor";
import { createMigrationEventHandler, createVisualizerMigrationEventHandler } from "../utils/events";
import { sendVisualizerMigrationNotification } from "../utils/ai-utils";
import { getLightweightEnhancementPrompt, getWizardEnhancementPrompt } from "./prompts";
import { saveAgentHistory, loadAgentHistory, clearAgentHistory } from "./history";
import { chatStateStorage } from "../../../views/ai-panel/chatStateStorage";
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
        const partialMatch = content.match(/isPartiallyEnhanced\s*=\s*(true|false)/);
        const sourcePathMatch = content.match(/sourcePath\s*=\s*"([^"]+)"/);
        return {
            mode: (modeMatch?.[1] ?? "none") as MigrationEnhancementMode,
            isEnhanced: enhancedMatch?.[1] === "true",
            isPartiallyEnhanced: partialMatch?.[1] === "true",
            sourcePath: sourcePathMatch?.[1],
        };
    } catch {
        return null;
    }
}

/**
 * Writes the `.ai-migrate-enhance.toml` to the given directory.
 */
export function writeEnhanceToml(
    projectRoot: string,
    mode: MigrationEnhancementMode,
    isEnhanced: boolean,
    sourcePath?: string,
    isPartiallyEnhanced?: boolean,
): void {
    const filePath = path.join(projectRoot, AI_ENHANCE_TOML_FILENAME);
    let content = `[enhancement]\nmode = "${mode}"\nisEnhanced = ${isEnhanced}\n`;
    if (isPartiallyEnhanced !== undefined) {
        content += `isPartiallyEnhanced = ${isPartiallyEnhanced}\n`;
    }
    if (sourcePath) {
        content += `sourcePath = "${sourcePath}"\n`;
    }
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
            isPartiallyEnhanced: data.isPartiallyEnhanced,
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
            writeEnhanceToml(projectRoot, data.mode, true, data.sourcePath);
        }
        // Clean up the history file – no longer needed after full completion
        clearAgentHistory(projectRoot);
    }
    _activeSession = { isActive: false, mode: _activeSession.mode, isEnhanced: true };
    console.log("[MigrationEnhancement] Enhancement marked as complete.");
}

/**
 * Seeds the AI Chat's `chatStateStorage` with the migration conversation
 * history loaded from disk.  This allows the AI Chat agent to pick up
 * previous messages as context when the user resumes enhancement.
 *
 * @returns `true` if history was loaded and seeded successfully.
 */
export function seedMigrationHistoryIntoChatState(): boolean {
    const projectRoot = _resolveCurrentProjectRoot();
    if (!projectRoot) {
        return false;
    }
    const history = loadAgentHistory(projectRoot);
    if (!history || history.messages.length === 0) {
        return false;
    }

    const workspaceId = projectRoot;
    const threadId = "default";

    // Add a synthetic generation that carries the migration history messages
    const gen = chatStateStorage.addGeneration(
        workspaceId,
        threadId,
        "[Migration AI Enhancement – prior conversation]",
        { generationType: "agent" },
        `migration-history-${Date.now()}`
    );

    chatStateStorage.updateGeneration(workspaceId, threadId, gen.id, {
        modelMessages: history.messages,
    });

    console.log(
        `[MigrationEnhancement] Seeded ${history.messages.length} messages into chatStateStorage (thread: ${threadId})`
    );
    return true;
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
        const existing = readEnhanceToml(projectRoot);
        writeEnhanceToml(projectRoot, mode, false, existing?.sourcePath);
    }

    // Mark the session as active and open AI Chat so the user can interact
    _activeSession = { isActive: true, mode: "auto-fix", isEnhanced: false };
    openAIPanelWithPrompt();
    console.log("[MigrationEnhancement] Enhancement started – AI Chat opened.");
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
    projectRoot: string,
    sourcePath?: string,
): void {
    const entry: PendingMigrationEnhancement = {
        mode,
        projectRoot,
        timestamp: Date.now(),
        sourcePath,
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
 * - `mode = "auto-fix"` + `isEnhanced = false` → show notification to resume via AI Chat
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

    console.log(`[MigrationEnhancement] Found pending '${data.mode}' enhancement for: ${stored.projectRoot}`);

    switch (data.mode) {
        case "auto-fix": {
            // Set session state so other parts of the extension know about the migration
            _activeSession = { isActive: false, mode: "auto-fix", isEnhanced: false };

            // Determine notification message based on partial state
            const message = data.isPartiallyEnhanced
                ? "Migration AI enhancement was paused. You can resume it from AI Chat."
                : "Migration project created. You can start AI enhancement from AI Chat.";

            const action = await window.showInformationMessage(
                message,
                "Open AI Chat"
            );

            if (action === "Open AI Chat") {
                openAIPanelWithPrompt();
            }
            break;
        }
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

    // Read source path from toml so the agent knows where the original Mule source lives
    const tomlData = readEnhanceToml(projectRoot);
    const sourcePath = tomlData?.sourcePath;
    const sourceContext = sourcePath
        ? `## Original Mule Source Directory\nThe original Mule project source is at: \`${sourcePath}\`\nAlways consult this directory for Mule XML configs, DataWeave scripts, and property files referenced in the enhancement instructions below.\n\n---\n\n`
        : '';
    const prompt = sourceContext + getWizardEnhancementPrompt();

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
            isPlanMode: false,
        },
        // No chat storage – migration runs are single-shot
        chatStorage: undefined,
        lifecycle: {
            cleanupStrategy: "immediate",
        },
    };

    console.log(`[MigrationEnhancement] Starting migration agent – mode: ${mode}, model: ${_selectedModelId}, sourcePath: ${sourcePath ?? 'none'}`);

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
// Wizard-level AI Enhancement
// ===========================================================================

/** The project root created by the wizard that hasn't been opened yet. */
let _wizardProjectRoot: string | undefined;
/** The original source path for the wizard enhancement. */
let _wizardSourcePath: string | undefined;

/**
 * Called by the RPC manager after `createBIProjectFromMigration` returns the
 * project root (when `enhancementMode === 'auto-fix'`).  Stores the project
 * root so the wizard enhancement can be kicked off from the webview.
 */
export function setWizardProjectRoot(projectRoot: string, sourcePath?: string): void {
    _wizardProjectRoot = projectRoot;
    _wizardSourcePath = sourcePath;
}

/**
 * Runs the AI enhancement agent against the wizard-created project.
 * Streams events to the Visualizer webview instead of the Migration Panel.
 * Called when the wizard enhancement step is ready.
 */
/**
 * Ensures the user is authenticated before running the AI agent.
 * If not authenticated, triggers the login flow and waits for completion.
 * Returns true if authenticated, false if auth was cancelled or timed out.
 */
async function ensureAuthenticated(): Promise<boolean> {
    const AUTH_TIMEOUT_MS = 120_000; // 2 minutes

    const state = AIStateMachine.state();
    if (state === "Authenticated") {
        return true;
    }

    // Tell the wizard UI we're signing in
    sendVisualizerMigrationNotification({
        type: "content_block",
        content: "Signing in to BI Copilot...\n\n",
    });

    // If state is Initialize, wait for it to resolve first
    if (state === "Initialize") {
        const resolved = await new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => {
                sub.unsubscribe();
                resolve(false);
            }, AUTH_TIMEOUT_MS);

            const sub = AIStateMachine.service().subscribe((snapshot) => {
                const s = snapshot.value;
                if (s === "Authenticated") {
                    clearTimeout(timeout);
                    sub.unsubscribe();
                    resolve(true);
                } else if (s === "Unauthenticated" || s === "Disabled") {
                    clearTimeout(timeout);
                    sub.unsubscribe();
                    resolve(false);
                }
            });
        });

        if (resolved) {
            return true;
        }
        // Fell through to Unauthenticated – continue to trigger login below
        if (AIStateMachine.state() === "Disabled") {
            return false;
        }
    }

    // Trigger the login flow (same as AI Chat's LOGIN event)
    AIStateMachine.sendEvent(AIMachineEventType.LOGIN);

    // Wait for Authenticated, or timeout / cancellation
    return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
            sub.unsubscribe();
            resolve(false);
        }, AUTH_TIMEOUT_MS);

        const sub = AIStateMachine.service().subscribe((snapshot) => {
            const s = snapshot.value;
            if (s === "Authenticated") {
                clearTimeout(timeout);
                sub.unsubscribe();
                resolve(true);
            } else if (s === "Unauthenticated" || s === "Disabled") {
                // Login was cancelled or failed
                clearTimeout(timeout);
                sub.unsubscribe();
                resolve(false);
            }
        });
    });
}

export async function runWizardMigrationEnhancement(): Promise<void> {
    const projectRoot = _wizardProjectRoot;
    if (!projectRoot) {
        window.showErrorMessage("Migration enhancement: no project root set for wizard enhancement.");
        return;
    }

    // Ensure the user is authenticated before running the AI agent
    const eventHandler = createVisualizerMigrationEventHandler(Command.Agent);
    eventHandler({ type: "start" });

    const isAuthenticated = await ensureAuthenticated();
    if (!isAuthenticated) {
        eventHandler({
            type: "error",
            content: "Please sign in to BI Copilot to use AI enhancement. You can sign in from the AI Chat panel and retry.",
        });
        return;
    }

    // Prepend the absolute Mule source path so the agent can locate original XML/DWL files
    const sourcePath = _wizardSourcePath;
    const sourceContext = sourcePath
        ? `## Original Mule Source Directory\nThe original Mule project source is at: \`${sourcePath}\`\nAlways consult this directory for Mule XML configs, DataWeave scripts, and property files referenced in the enhancement instructions below.\n\n---\n\n`
        : '';
    const prompt = sourceContext + getWizardEnhancementPrompt();

    _migrationAbortController = new AbortController();

    const config: AICommandConfig = {
        executionContext: {
            projectPath: projectRoot,
            workspacePath: projectRoot,
        },
        eventHandler,
        generationId: `wizard-migration-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        abortController: _migrationAbortController,
        params: {
            usecase: prompt,
            fileAttachmentContents: [],
            isPlanMode: false,
        },
        chatStorage: undefined,
        onMessagesAvailable: (messages, status) => {
            saveAgentHistory(projectRoot, messages, status);
            console.log(`[MigrationEnhancement] Saved wizard agent history (${status}, ${messages.length} messages)`);
        },
        lifecycle: {
            // Work directly on the wizard-created project (not a temp copy)
            // so changes persist when the user opens it in VS Code.
            existingTempPath: projectRoot,
            // Don't delete the project directory after the agent finishes.
            cleanupStrategy: "review",
        },
    };

    console.log(`[MigrationEnhancement] Starting wizard migration agent – projectRoot: ${projectRoot}`);

    try {
        await new AgentExecutor(config).run();
        // Agent finished successfully – mark enhancement as complete in the toml
        const data = readEnhanceToml(projectRoot);
        if (data) {
            writeEnhanceToml(projectRoot, data.mode, true, data.sourcePath);
        }
        console.log("[MigrationEnhancement] Wizard migration agent completed successfully.");
    } catch (error) {
        if (_migrationAbortController.signal.aborted) {
            console.log("[MigrationEnhancement] Wizard migration agent was aborted by user.");
        } else {
            console.error("[MigrationEnhancement] Wizard migration agent error:", error);
        }
    } finally {
        _migrationAbortController = undefined;
    }
}

/**
 * Opens the migrated project in VS Code.
 * Called by the wizard after AI enhancement completes or is skipped.
 */
export function openMigratedProject(): void {
    const projectRoot = _wizardProjectRoot;
    if (!projectRoot) {
        window.showErrorMessage("Migration enhancement: no project root to open.");
        return;
    }

    // Read the current toml to determine the state
    const data = readEnhanceToml(projectRoot);
    const mode = data?.mode ?? 'none';
    const sourcePath = data?.sourcePath ?? _wizardSourcePath;

    // If the AI agent was running (paused by user), mark as partially enhanced
    const wasRunning = _migrationAbortController !== undefined;
    if (wasRunning && data && !data.isEnhanced) {
        writeEnhanceToml(projectRoot, mode, false, sourcePath, true);
    }

    scheduleMigrationEnhancement(mode, projectRoot, sourcePath);

    // Clear the wizard state
    _wizardProjectRoot = undefined;
    _wizardSourcePath = undefined;

    commands.executeCommand('vscode.openFolder', Uri.file(projectRoot));
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
