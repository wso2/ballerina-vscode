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
import { AIMachineEventType, Command, ChatNotify } from "@wso2/ballerina-core";
import { commands, EventEmitter, Uri, window, workspace } from "vscode";
import { extension } from "../../../BalExtensionContext";
import { StateMachine } from "../../../stateMachine";
import { AIStateMachine, openAIPanelWithPrompt } from "../../../views/ai-panel/aiMachine";
import { AgentExecutor } from "../agent/AgentExecutor";
import { AICommandConfig } from "../executors/base/AICommandExecutor";
import { createMigrationEventHandler, createVisualizerMigrationEventHandler, createAIPanelMigrationEventHandler } from "../utils/events";
import { sendVisualizerMigrationNotification, sendAIPanelNotification } from "../utils/ai-utils";
import { getEnhancementStages } from "./prompts";
import { saveAgentHistory, loadAgentHistory, clearAgentHistory } from "./history";
import { chatStateStorage } from "../../../views/ai-panel/chatStateStorage";

// ── Wizard streaming emitter – exposed via extension.ts exports ──────────────
const _wizardChatEmitter = new EventEmitter<ChatNotify>();
/** `vscode.Event<ChatNotify>` subscribed by the wi-extension to relay streaming events. */
export const onWizardChatNotify = _wizardChatEmitter.event;
import {
    AI_ENHANCE_TOML_FILENAME,
    AI_MIGRATION_DIR,
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
let _activeSession: ActiveMigrationSessionLocal = { isActive: false, aiFeatureUsed: false, fullyEnhanced: true };

/** `true` when enhancement was triggered from AI Chat (not the wizard). Routes events to the AI Panel. */
let _enhancementFromAIChat = false;

/** `true` while `runWizardMigrationEnhancement` is executing in AI Chat mode. Used to route the abort handler. */
let _runningFromAIChat = false;

// ===========================================================================
// Toml helpers – `.ai-migrate-enhance.toml`
// ===========================================================================

/**
 * Reads and parses the `state.toml` from `.ballerina-ai-migration/` inside the given directory.
 * Returns `null` if the file does not exist or cannot be parsed.
 */
export function readEnhanceToml(projectRoot: string): EnhanceTomlData | null {
    try {
        const filePath = path.join(projectRoot, AI_MIGRATION_DIR, AI_ENHANCE_TOML_FILENAME);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const content = fs.readFileSync(filePath, "utf8");
        const aiFeatureUsedMatch = content.match(/aiFeatureUsed\s*=\s*(true|false)/);
        const fullyEnhancedMatch = content.match(/fullyEnhanced\s*=\s*(true|false)/);
        const sourcePathMatch = content.match(/sourcePath\s*=\s*"([^"]+)"/);
        return {
            aiFeatureUsed: aiFeatureUsedMatch?.[1] === "true",
            fullyEnhanced: fullyEnhancedMatch?.[1] === "true",
            sourcePath: sourcePathMatch?.[1],
        };
    } catch {
        return null;
    }
}

/**
 * Writes the `state.toml` to `.ballerina-ai-migration/` inside the given directory.
 */
export function writeEnhanceToml(
    projectRoot: string,
    aiFeatureUsed: boolean,
    fullyEnhanced: boolean,
    sourcePath?: string,
): void {
    const dir = path.join(projectRoot, AI_MIGRATION_DIR);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, AI_ENHANCE_TOML_FILENAME);
    let content = `[enhancement]\naiFeatureUsed = ${aiFeatureUsed}\nfullyEnhanced = ${fullyEnhanced}\n`;
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
            aiFeatureUsed: data.aiFeatureUsed,
            fullyEnhanced: data.fullyEnhanced,
        };
    }

    // Toml not found – fall back to whatever _activeSession reports.
    // checkAndRunPendingEnhancement may have set it to { fullyEnhanced: false }
    // when aiFeatureUsed=false.  If it's still the cold default (fullyEnhanced: true)
    // the card will remain hidden – that is correct for non-migration projects.
    return { ..._activeSession };
}

/**
 * Marks the enhancement as complete by updating `fullyEnhanced = true` in the
 * toml file and clearing the in-memory active session.
 */
export function markEnhancementComplete(): void {
    const projectRoot = _resolveCurrentProjectRoot();
    if (projectRoot) {
        const data = readEnhanceToml(projectRoot);
        if (data) {
            writeEnhanceToml(projectRoot, data.aiFeatureUsed, true, data.sourcePath);
        }
        // Clean up the history file – no longer needed after full completion
        clearAgentHistory(projectRoot);
    }
    _activeSession = { isActive: false, aiFeatureUsed: _activeSession.aiFeatureUsed, fullyEnhanced: true };
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
 * Allows the user to start (or re-trigger) the enhancement pipeline from AI Chat.
 * Updates the toml with `fullyEnhanced = false` and sets up the pipeline for AI Chat.
 */
export async function startMigrationEnhancement(): Promise<void> {
    const projectRoot = _resolveCurrentProjectRoot();
    if (projectRoot) {
        const existing = readEnhanceToml(projectRoot);
        writeEnhanceToml(projectRoot, true, false, existing?.sourcePath);
        // Set wizard module variables so runWizardMigrationEnhancement() can be
        // triggered by the AI Chat via wizardEnhancementReady().
        _wizardProjectRoot = projectRoot;
        _wizardSourcePath = existing?.sourcePath;
    }

    // Mark the session as active (panel is already open when called from AI Chat)
    _activeSession = { isActive: true, aiFeatureUsed: true, fullyEnhanced: false };
    // Signal runWizardMigrationEnhancement to route events to AI Chat, not the wizard.
    _enhancementFromAIChat = true;
    console.log("[MigrationEnhancement] Enhancement started – pipeline ready for AI Chat trigger.");
}

// ===========================================================================
// Schedule – called before vscode.openFolder so data survives the reload
// ===========================================================================

/**
 * Persists the enhancement state to VS Code global state so that
 * `checkAndRunPendingEnhancement` can find the toml in the freshly opened window.
 *
 * Call this right before `commands.executeCommand('vscode.openFolder', …)`.
 */
export function scheduleMigrationEnhancement(
    aiFeatureUsed: boolean,
    projectRoot: string,
    sourcePath?: string,
): void {
    const entry: PendingMigrationEnhancement = {
        aiFeatureUsed,
        projectRoot,
        timestamp: Date.now(),
        sourcePath,
    };
    extension.context.globalState.update(PENDING_MIGRATION_ENHANCEMENT_KEY, entry);
    // Also persist the project root without expiry so getActiveMigrationSessionState
    // can always resolve the toml even if the webview beats checkAndRunPendingEnhancement.
    extension.context.globalState.update(MIGRATION_PROJECT_ROOT_KEY, projectRoot);
    console.log(`[MigrationEnhancement] Scheduled enhancement (aiFeatureUsed=${aiFeatureUsed}) for project: ${projectRoot}`);
}

// ===========================================================================
// Check & Run – called once the extension reaches the extensionReady state
// ===========================================================================

/**
 * Checks whether a migration enhancement was scheduled in a previous window.
 * Reads the `state.toml` from the stored project root and decides what to do:
 * - `aiFeatureUsed = true` + `fullyEnhanced = false` → show notification to resume via AI Chat
 * - `aiFeatureUsed = false` → project opened without AI; session + notification shown
 * - `fullyEnhanced = true` → nothing to do
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

    if (data.fullyEnhanced) {
        console.log("[MigrationEnhancement] Enhancement already completed – nothing to do.");
        return;
    }

    console.log(`[MigrationEnhancement] Found pending enhancement (aiFeatureUsed=${data.aiFeatureUsed}) for: ${stored.projectRoot}`);

    if (data.aiFeatureUsed) {
        // Set session state so other parts of the extension know about the migration
        _activeSession = { isActive: false, aiFeatureUsed: true, fullyEnhanced: false };

        const message = loadAgentHistory(stored.projectRoot)
            ? "Migration AI enhancement was paused. You can resume it from AI Chat."
            : "Migration project created. You can start AI enhancement from AI Chat.";

        const action = await window.showInformationMessage(
            message,
            "Open AI Chat"
        );

        if (action === "Open AI Chat") {
            openAIPanelWithPrompt();
        }
    } else {
        // User skipped AI — expose the session so the card shows in AI Chat with
        // a "Start AI Enhancement" button, and notify the user.
        _activeSession = { isActive: false, aiFeatureUsed: false, fullyEnhanced: false };
        console.log("[MigrationEnhancement] AI not enabled at wizard – notification shown.");
        const action = await window.showInformationMessage(
            "Your migrated project is ready. Open AI Chat to run AI enhancement — it can resolve TODOs, fix build errors, and refine tests.",
            "Open AI Chat"
        );
        if (action === "Open AI Chat") {
            openAIPanelWithPrompt();
        }
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
    // Determine the project root (workspace folder)
    const projectRoot = _resolveCurrentProjectRoot()
        ?? workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!projectRoot) {
        window.showErrorMessage("Migration enhancement: unable to determine project root.");
        return;
    }

    // Read source path from toml — the agent will access source files on demand
    // via migration_source_list / migration_source_read tools.
    const tomlData = readEnhanceToml(projectRoot);
    const sourcePath = tomlData?.sourcePath;

    const stages = getEnhancementStages();
    const eventHandler = createMigrationEventHandler(Command.Agent);

    _migrationAbortController = new AbortController();

    console.log(`[MigrationEnhancement] Starting migration agent (${stages.length} stages) – model: ${_selectedModelId}, sourcePath: ${sourcePath ?? 'none'}`);

    try {
        for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];

            if (_migrationAbortController.signal.aborted) {
                console.log(`[MigrationEnhancement] Aborted before ${stage.name}`);
                break;
            }

            eventHandler({
                type: "content_block",
                content: `\n\n---\n\n**Starting ${stage.name}** (${i + 1} of ${stages.length})\n\n`,
            });

            const stageGenId = `migration-stage${i + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

            const config: AICommandConfig = {
                executionContext: {
                    projectPath: projectRoot,
                    workspacePath: projectRoot,
                },
                eventHandler,
                generationId: stageGenId,
                abortController: _migrationAbortController,
                params: {
                    usecase: stage.prompt,
                    fileAttachmentContents: [],
                    isPlanMode: false,
                },
                chatStorage: undefined,
                lifecycle: {
                    cleanupStrategy: "immediate",
                },
                toolOptions: {
                    migrationSourcePath: sourcePath,
                },
                agentLimits: stage.agentLimits,
            };

            console.log(`[MigrationEnhancement] Running ${stage.name} (maxSteps: ${stage.agentLimits.maxSteps})`);

            await new AgentExecutor(config).run();

            console.log(`[MigrationEnhancement] ${stage.name} completed.`);

            eventHandler({
                type: "content_block",
                content: `\n\n**${stage.name} — Complete** ✅\n\n`,
            });
        }

        if (!_migrationAbortController.signal.aborted) {
            markEnhancementComplete();
            console.log("[MigrationEnhancement] Migration agent completed all stages successfully.");
        }
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

/**
 * Returns the persisted migration conversation history messages as simple
 * role/content pairs suitable for display in the AI Chat panel.
 */
export function getMigrationHistoryMessages(): Array<{ role: string; content: string }> {
    const projectRoot = _resolveCurrentProjectRoot();
    if (!projectRoot) {
        return [];
    }
    const history = loadAgentHistory(projectRoot);
    if (!history) {
        return [];
    }
    return history.messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
            role: m.role,
            content: typeof m.content === "string"
                ? m.content
                : Array.isArray(m.content)
                    ? m.content
                          .filter((part: any) => part.type === "text")
                          .map((part: any) => part.text)
                          .join("")
                    : String(m.content),
        }));
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
 * project root (when `aiFeatureUsed === true`).  Stores the project
 * root so the wizard enhancement can be kicked off from the webview.
 */
export function setWizardProjectRoot(projectRoot: string, sourcePath?: string): void {
    console.log('[orchestrator] setWizardProjectRoot called. projectRoot:', projectRoot, 'sourcePath:', sourcePath);
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
    console.log('[orchestrator] ensureAuthenticated called. AIStateMachine state:', state);
    if (state === "Authenticated") {
        return true;
    }

    // Tell the wizard UI we're signing in
    const signingInMsg = { type: "content_block" as const, content: "Signing in to BI Copilot...\n\n" };
    sendVisualizerMigrationNotification(signingInMsg);
    _wizardChatEmitter.fire(signingInMsg);

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
    console.log('[orchestrator] runWizardMigrationEnhancement called. _wizardProjectRoot:', _wizardProjectRoot);
    const projectRoot = _wizardProjectRoot;
    if (!projectRoot) {
        console.error('[orchestrator] runWizardMigrationEnhancement: NO project root set!');
        window.showErrorMessage("Migration enhancement: no project root set for wizard enhancement.");
        return;
    }

    // Ensure the user is authenticated before running the AI agent
    // Route events to AI Chat when triggered from there, otherwise to the wizard Visualizer.
    const fromAIChat = _enhancementFromAIChat;
    _enhancementFromAIChat = false; // consume the flag
    _runningFromAIChat = fromAIChat;
    const baseHandler = fromAIChat
        ? createAIPanelMigrationEventHandler(Command.Agent)
        : createVisualizerMigrationEventHandler(Command.Agent);
    const eventHandler = (event: ChatNotify) => {
        baseHandler(event);
        _wizardChatEmitter.fire(event);
    };
    eventHandler({ type: "start" });

    const isAuthenticated = await ensureAuthenticated();
    if (!isAuthenticated) {
        eventHandler({
            type: "error",
            content: "Please sign in to BI Copilot to use AI enhancement. You can sign in from the AI Chat panel and retry.",
        });
        return;
    }

    // Read the source path fresh from the toml so that any edits the user made
    // to state.toml after the enhancement was scheduled are honoured.
    // Fall back to the in-memory value captured at wizard/startMigrationEnhancement time.
    const tomlData = readEnhanceToml(projectRoot);
    const sourcePath = tomlData?.sourcePath ?? _wizardSourcePath;

    // --- Multi-stage execution ---
    // Each stage runs in a fresh AgentExecutor with its own context window.
    // Between stages the project files persist on disk (existingTempPath)
    // and getProjectSource() re-reads them, so the next stage sees all
    // changes made by the previous one.
    const stages = getEnhancementStages();

    _migrationAbortController = new AbortController();

    console.log(`[MigrationEnhancement] Starting wizard migration agent (${stages.length} stages) – projectRoot: ${projectRoot}, sourcePath: ${sourcePath ?? 'none'}`);

    try {
        for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];

            // Check for abort between stages
            if (_migrationAbortController.signal.aborted) {
                console.log(`[MigrationEnhancement] Aborted before ${stage.name}`);
                break;
            }

            // Notify the UI of stage progress
            eventHandler({
                type: "content_block",
                content: `\n\n---\n\n**Starting ${stage.name}** (${i + 1} of ${stages.length})\n\n`,
            });

            const stageGenId = `wizard-migration-stage${i + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

            const config: AICommandConfig = {
                executionContext: {
                    projectPath: projectRoot,
                    workspacePath: projectRoot,
                },
                eventHandler,
                generationId: stageGenId,
                abortController: _migrationAbortController,
                params: {
                    usecase: stage.prompt,
                    fileAttachmentContents: [],
                    isPlanMode: false,
                },
                chatStorage: fromAIChat
                    ? { projectRootPath: projectRoot, threadId: "default", enabled: true }
                    : undefined,
                onMessagesAvailable: (messages, status) => {
                    saveAgentHistory(projectRoot, messages, status);
                    console.log(`[MigrationEnhancement] Saved ${stage.name} history (${status}, ${messages.length} messages)`);
                },
                lifecycle: {
                    existingTempPath: projectRoot,
                    cleanupStrategy: "review",
                },
                toolOptions: {
                    migrationSourcePath: sourcePath,
                },
                agentLimits: stage.agentLimits,
            };

            console.log(`[MigrationEnhancement] Running ${stage.name} (maxSteps: ${stage.agentLimits.maxSteps})`);

            await new AgentExecutor(config).run();

            console.log(`[MigrationEnhancement] ${stage.name} completed.`);

            // Notify the UI of stage completion
            eventHandler({
                type: "content_block",
                content: `\n\n**${stage.name} — Complete** ✅\n\n`,
            });
        }

        // All stages finished — mark enhancement as complete in the toml
        if (!_migrationAbortController.signal.aborted) {
            const data = readEnhanceToml(projectRoot);
            if (data) {
                writeEnhanceToml(projectRoot, data.aiFeatureUsed, true, data.sourcePath);
            }
            console.log("[MigrationEnhancement] Wizard migration agent completed all stages successfully.");
        }
    } catch (error) {
        if (_migrationAbortController.signal.aborted) {
            console.log("[MigrationEnhancement] Wizard migration agent was aborted by user.");
            if (_runningFromAIChat && projectRoot) {
                // Persist partial state so the Resume button can appear
                const data = readEnhanceToml(projectRoot);
                writeEnhanceToml(projectRoot, data?.aiFeatureUsed ?? true, false, data?.sourcePath);
                // Notify AI Chat panel to show the interrupted message
                sendAIPanelNotification({ type: "abort", command: Command.Agent });
                // Show a VS Code notification so the user can jump back to AI Chat
                window.showInformationMessage(
                    "AI Enhancement paused. Your progress has been saved.",
                    "Open AI Chat"
                ).then((selection) => {
                    if (selection === "Open AI Chat") {
                        openAIPanelWithPrompt();
                    }
                });
            }
        } else {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("[MigrationEnhancement] Wizard migration agent error:", error);
            eventHandler({ type: "error", content: `An error occurred during AI enhancement: ${errorMessage}` });
        }
    } finally {
        _runningFromAIChat = false;
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
    const aiFeatureUsed = data?.aiFeatureUsed ?? true;
    const sourcePath = data?.sourcePath ?? _wizardSourcePath;

    // If the AI agent was running (paused by user), the toml already reflects fullyEnhanced=false
    const wasRunning = _migrationAbortController !== undefined;
    if (wasRunning && data && !data.fullyEnhanced) {
        writeEnhanceToml(projectRoot, aiFeatureUsed, false, sourcePath);
    }

    scheduleMigrationEnhancement(aiFeatureUsed, projectRoot, sourcePath);

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
        const tomlPath = path.join(candidate, AI_MIGRATION_DIR, AI_ENHANCE_TOML_FILENAME);
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
