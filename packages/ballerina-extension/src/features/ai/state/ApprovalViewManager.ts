/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as fs from 'fs';
import { MACHINE_VIEW, EVENT_TYPE, VisualizerLocation, PopupVisualizerLocation, AgentMetadata, navigateReviewIndex, reviewModeOpened, reviewModeClosed, ReviewModeData } from '@wso2/ballerina-core';
import { AiPanelWebview } from '../../../views/ai-panel/webview';
import { chatStateStorage } from '../../../views/ai-panel/chatStateStorage';
import { getPendingReviewRestore, clearPendingReviewRestore } from './reviewRestoreStore';
import { sendReviewRestoreDidOpenBatch } from '../utils/project/ls-schema-notifications';
import { VisualizerWebview } from '../../../views/visualizer/webview';
import { openView as openMainView, StateMachine } from '../../../stateMachine';
import { openPopupView, StateMachinePopup } from '../../../stateMachinePopup';
import { notifyApprovalOverlayState, RPCLayer } from '../../../RPCLayer';

export type ApprovalType = 'configuration' | 'task' | 'plan' | 'connector_spec';

const REVIEW_NAVIGATION_DEBOUNCE_MS = 150;
const REVIEW_MODE_READY_TIMEOUT_MS = 15_000;

interface OpenedApprovalView {
    requestId: string;
    viewType: 'popup' | 'main' | 'inline';
    approvalType: ApprovalType;
    machineView: MACHINE_VIEW | null;
    isAutoOpened: boolean;
    hadExistingVisualizer: boolean;
    timestamp: number;
    isClosed?: boolean;
    projectPath?: string;
    agentMetadata?: AgentMetadata;
}

/**
 * Centralized manager for approval view lifecycles.
 * Handles opening, tracking, and cleanup of approval views with chat overlay coordination.
 */
export class ApprovalViewManager {
    private static instance: ApprovalViewManager;
    private openedViews = new Map<string, OpenedApprovalView>();

    private constructor() {}

    static getInstance(): ApprovalViewManager {
        if (!this.instance) {
            this.instance = new ApprovalViewManager();
        }
        return this.instance;
    }

    /**
     * Register an inline approval shown in chat without opening a separate view.
     */
    registerInlineApproval(
        requestId: string,
        approvalType: ApprovalType
    ): void {
        console.log(`[ApprovalViewManager] Registering inline ${approvalType} approval:`, requestId);

        this.openedViews.set(requestId, {
            requestId,
            viewType: 'inline',
            approvalType,
            machineView: null,
            isAutoOpened: true,
            hadExistingVisualizer: false,
            timestamp: Date.now()
        });
    }

    /**
     * Open an approval view as popup (or main view if no visualizer exists).
     */
    openApprovalViewPopup(
        requestId: string,
        approvalType: ApprovalType,
        viewLocation: VisualizerLocation | PopupVisualizerLocation
    ): void {
        const isAutoOpened = true;
        const machineView = viewLocation.view!;
        const projectPath = viewLocation.projectPath;
        const agentMetadata = 'agentMetadata' in viewLocation ? viewLocation.agentMetadata : undefined;

        const { viewType, hadExistingVisualizer } = this._openApprovalViewPopup(
            machineView,
            projectPath,
            agentMetadata
        );

        console.log(`[ApprovalViewManager] Opening ${approvalType} view:`, {
            requestId,
            machineView,
            viewType,
            isAutoOpened,
            hadExistingVisualizer
        });

        this.openedViews.set(requestId, {
            requestId,
            viewType,
            approvalType,
            machineView,
            isAutoOpened,
            hadExistingVisualizer,
            timestamp: Date.now(),
            projectPath,
            agentMetadata
        });

        const overlayMessage = this.getOverlayMessage(approvalType);
        this.sendChatOverlayNotification(true, overlayMessage, requestId);
    }

    private sendChatOverlayNotification(show: boolean, message?: string, requestId?: string): void {
        try {
            notifyApprovalOverlayState({ show, message, requestId });
            console.log(`[ApprovalViewManager] Chat overlay ${show ? 'enabled' : 'disabled'}`, message ? `with message: ${message}` : '');
        } catch (error) {
            console.error('[ApprovalViewManager] Failed to send chat overlay notification:', error);
        }
    }

    private getOverlayMessage(approvalType: ApprovalType): string {
        const messages: Record<ApprovalType, string> = {
            'configuration': 'Waiting for configuration...',
            'task': 'Waiting for task approval...',
            'plan': 'Waiting for plan approval...',
            'connector_spec': 'Waiting for connector spec approval...'
        };
        return messages[approvalType];
    }

    getView(requestId: string): OpenedApprovalView | undefined {
        return this.openedViews.get(requestId);
    }

    /**
     * Check if there are any active approval views requiring chat overlay.
     */
    hasActiveApprovals(): boolean {
        return Array.from(this.openedViews.values()).some(view => !view.isClosed);
    }

    /**
     * Handle popup close by user. Preserves metadata for reopening and manages navigation.
     */
    handlePopupClosed(requestId: string): void {
        const view = this.openedViews.get(requestId);
        if (!view) { return; }

        console.log(`[ApprovalViewManager] Popup closed by user:`, {
            requestId,
            hadExistingVisualizer: view.hadExistingVisualizer
        });

        view.isClosed = true;

        // Close the popup webview if it is still open (e.g. when dismissed via the overlay X).
        // When the popup itself triggered this call, ctx.view won't match so this is a no-op.
        if (view.viewType === 'popup') {
            const popupCtx = StateMachinePopup.context();
            if (popupCtx.view === view.machineView) {
                StateMachinePopup.sendEvent(EVENT_TYPE.CLOSE_VIEW, { view: null, agentMetadata: undefined });
            }
        }

        if (!this.hasActiveApprovals()) {
            this.sendChatOverlayNotification(false);
        }

        if (!view.hadExistingVisualizer) {
            const ctx = StateMachine.context();
            openMainView(EVENT_TYPE.OPEN_VIEW, {
                view: MACHINE_VIEW.PackageOverview,
                projectPath: ctx.projectPath
            });
        }
    }

    cleanupView(requestId: string, clearMetadata: boolean = true): void {
        const view = this.openedViews.get(requestId);
        if (!view) { return; }

        console.log(`[ApprovalViewManager] Cleaning up ${view.approvalType} view:`, requestId);

        if (clearMetadata) {
            this.clearViewMetadata(view);
        }

        this.openedViews.delete(requestId);
        this.sendChatOverlayNotification(false);
    }

    cleanupAllViews(): void {
        console.log('[ApprovalViewManager] Cleaning up all approval views');

        const allViews = Array.from(this.openedViews.values());

        for (const view of allViews) {
            this.clearViewMetadata(view);
        }

        this.openedViews.clear();
        this.sendChatOverlayNotification(false);
    }

    private clearViewMetadata(view: OpenedApprovalView): void {
        console.log(`[ApprovalViewManager] Clearing metadata for ${view.approvalType}:`, view.requestId);

        if (view.viewType === 'inline') {
            return;
        }

        if (view.viewType === 'popup') {
            const ctx = StateMachinePopup.context();

            if (ctx.view === view.machineView) {
                StateMachinePopup.sendEvent(EVENT_TYPE.CLOSE_VIEW, {
                    view: null,
                    agentMetadata: undefined
                });
            }
        } else if (view.viewType === 'main') {
            const ctx = StateMachine.context();

            if (ctx.view === view.machineView) {
                openMainView(EVENT_TYPE.OPEN_VIEW, {
                    view: MACHINE_VIEW.PackageOverview,
                    projectPath: ctx.projectPath
                });
            }
        }
    }

    onVisualizerClosed(): void {
        if (StateMachine.context().view === MACHINE_VIEW.ReviewMode) {
            this.notifyReviewModeClosed();
        }

        if (!this.hasActiveApprovals()) {
            return;
        }

        console.log('[ApprovalViewManager] VisualizerWebview closed, marking all views as closed');

        for (const view of this.openedViews.values()) {
            view.isClosed = true;
        }

        this.sendChatOverlayNotification(false);
    }

    getOpenViews(): OpenedApprovalView[] {
        return Array.from(this.openedViews.values());
    }

    /**
     * Opens approval view as popup if visualizer exists, otherwise as main view.
     */
    private _openApprovalViewPopup(
        machineView: MACHINE_VIEW,
        projectPath: string,
        agentMetadata?: AgentMetadata
    ): { viewType: 'popup' | 'main', hadExistingVisualizer: boolean } {
        const hadExistingVisualizer = !!VisualizerWebview.currentPanel;
        const viewType: 'popup' | 'main' = hadExistingVisualizer ? 'popup' : 'main';

        if (viewType === 'popup') {
            openPopupView(EVENT_TYPE.OPEN_VIEW, {
                view: machineView,
                projectPath,
                agentMetadata
            });
        } else {
            openMainView(EVENT_TYPE.OPEN_VIEW, {
                view: machineView,
                projectPath,
                agentMetadata
            });
        }

        return { viewType, hadExistingVisualizer };
    }

    /**
     * Reopen a previously closed approval view.
     */
    reopenApprovalViewPopup(requestId: string): void {
        const view = this.openedViews.get(requestId);

        if (!view) {
            console.error('[ApprovalViewManager] Cannot reopen - approval view not found:', requestId);
            return;
        }

        if (view.viewType === 'inline') {
            console.log('[ApprovalViewManager] Inline approval - no view to reopen');
            return;
        }

        if (!view.projectPath || !view.machineView) {
            console.error('[ApprovalViewManager] Cannot reopen - missing required metadata:', requestId);
            return;
        }

        console.log(`[ApprovalViewManager] Reopening ${view.approvalType} view:`, {
            requestId,
            wasClosed: view.isClosed,
            viewType: view.viewType
        });

        view.isClosed = false;
        view.isAutoOpened = false;

        const overlayMessage = this.getOverlayMessage(view.approvalType);
        this.sendChatOverlayNotification(true, overlayMessage, view.requestId);

        const { viewType, hadExistingVisualizer } = this._openApprovalViewPopup(
            view.machineView,
            view.projectPath,
            view.agentMetadata
        );
        view.viewType = viewType;
        view.hadExistingVisualizer = hadExistingVisualizer;
    }

    /**
     * Open a view in main view (not as popup, no tracking).
     * Only opens if AI panel is active.
     */
    openView(machineView: MACHINE_VIEW): void {
        if (!AiPanelWebview.currentPanel) {
            return;
        }
        openMainView(EVENT_TYPE.OPEN_VIEW, { view: machineView });
    }

    private cachedReviewData: ReviewModeData | null = null;
    // Shared while a restore-rebuild is running so concurrent navigateReviewMode calls
    // await the same result instead of each re-opening the same LS documents.
    private rebuildInFlight: Promise<ReviewModeData | null> | null = null;
    // Chat entries send fire-and-forget navigation notifications. Keep a single open
    // transition in flight and coalesce rapid clicks to the most recent requested view.
    private reviewOpenInFlight: Promise<void> | null = null;
    private queuedReviewIndex: number | null = null;
    private reviewNavigationTimer: ReturnType<typeof setTimeout> | null = null;
    private reviewOpenAttempt = 0;
    private lastReviewNavigationRequestAt = 0;

    private isReviewModeReady(): boolean {
        return StateMachine.isReady()
            && StateMachine.context().view === MACHINE_VIEW.ReviewMode
            && !!VisualizerWebview.currentPanel;
    }

    private async waitForReviewModeReady(attempt: number): Promise<boolean> {
        const timeoutAt = Date.now() + REVIEW_MODE_READY_TIMEOUT_MS;
        while (attempt === this.reviewOpenAttempt && Date.now() < timeoutAt) {
            if (this.isReviewModeReady()) {
                return true;
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
        return false;
    }

    private async waitForReviewNavigationQuiet(attempt: number): Promise<boolean> {
        while (attempt === this.reviewOpenAttempt) {
            const remaining = this.lastReviewNavigationRequestAt
                + REVIEW_NAVIGATION_DEBOUNCE_MS
                - Date.now();
            if (remaining <= 0) {
                return true;
            }
            await new Promise((resolve) => setTimeout(resolve, remaining));
        }
        return false;
    }

    private scheduleQueuedReviewNavigation(): void {
        if (this.reviewNavigationTimer) {
            clearTimeout(this.reviewNavigationTimer);
        }
        // The small trailing-edge delay both collapses click bursts and lets the newly
        // mounted ReviewMode register its navigateReviewIndex listener.
        this.reviewNavigationTimer = setTimeout(() => {
            this.reviewNavigationTimer = null;
            const index = this.queuedReviewIndex;
            if (index === null || !this.isReviewModeReady()) {
                return;
            }
            this.queuedReviewIndex = null;
            RPCLayer._messenger.sendNotification(navigateReviewIndex, {
                type: 'webview',
                webviewType: VisualizerWebview.viewType
            }, index);
        }, REVIEW_NAVIGATION_DEBOUNCE_MS);
    }

    private resetReviewNavigationState(): void {
        this.reviewOpenAttempt++;
        this.queuedReviewIndex = null;
        this.lastReviewNavigationRequestAt = 0;
        if (this.reviewNavigationTimer) {
            clearTimeout(this.reviewNavigationTimer);
            this.reviewNavigationTimer = null;
        }
    }

    private async openQueuedReviewMode(): Promise<void> {
        const pendingAttempt = this.reviewOpenAttempt;
        if (!this.cachedReviewData) {
            this.rebuildInFlight ??= this.rebuildReviewDataFromStorage();
            try {
                const rebuiltReviewData = await this.rebuildInFlight;
                if (pendingAttempt !== this.reviewOpenAttempt) {
                    return;
                }
                this.cachedReviewData = rebuiltReviewData;
            } finally {
                this.rebuildInFlight = null;
            }
        }
        if (!this.cachedReviewData) {
            this.queuedReviewIndex = null;
            return;
        }

        // Wait for a trailing-edge pause before opening so a burst chooses one initial
        // index instead of loading the first diagram and immediately replacing it.
        if (!await this.waitForReviewNavigationQuiet(pendingAttempt)) {
            return;
        }

        const initialIndex = this.queuedReviewIndex ?? 0;
        this.queuedReviewIndex = null;
        const attempt = ++this.reviewOpenAttempt;
        openMainView(EVENT_TYPE.OPEN_VIEW, {
            view: MACHINE_VIEW.ReviewMode,
            reviewData: { ...this.cachedReviewData, currentIndex: initialIndex }
        });
        RPCLayer._messenger.sendNotification(reviewModeOpened, {
            type: 'webview',
            webviewType: AiPanelWebview.viewType
        });

        if (await this.waitForReviewModeReady(attempt)) {
            if (this.queuedReviewIndex !== null) {
                this.scheduleQueuedReviewNavigation();
            }
        } else if (attempt === this.reviewOpenAttempt) {
            console.warn('[ApprovalViewManager] Timed out waiting for ReviewMode to become ready');
            this.queuedReviewIndex = null;
        }
    }

    /**
     * Open ReviewMode with review data passed via OPEN_VIEW reviewData field.
     * Data is cached for chip re-clicks while review is active.
     */
    openReviewMode(data: ReviewModeData, autoOpen: boolean = true): void {
        if (!AiPanelWebview.currentPanel) { return; }
        this.cachedReviewData = data;
        if (!autoOpen) { return; }
        void this.navigateReviewMode(data.currentIndex).catch((error) =>
            console.error('[ApprovalViewManager] Failed to open ReviewMode:', error));
    }

    /**
     * Navigate ReviewMode to a specific index.
     * If ReviewMode is already open, coalesces rapid index requests before notifying it.
     * If not open, opens it with cached data — rebuilt from the persisted review
     * state when the cache is gone (extension host restarted mid-review). Concurrent
     * requests share one open transition so they cannot create competing view loads.
     */
    async navigateReviewMode(index: number): Promise<void> {
        if (!AiPanelWebview.currentPanel) { return; }
        this.queuedReviewIndex = index;
        this.lastReviewNavigationRequestAt = Date.now();

        if (this.isReviewModeReady()) {
            this.scheduleQueuedReviewNavigation();
            return;
        }

        if (!this.reviewOpenInFlight) {
            const openPromise = this.openQueuedReviewMode();
            this.reviewOpenInFlight = openPromise;
        }
        const openPromise = this.reviewOpenInFlight;
        try {
            await openPromise;
        } finally {
            if (this.reviewOpenInFlight === openPromise) {
                this.reviewOpenInFlight = null;
            }
        }
    }

    /**
     * Rebuild ReviewModeData for the pending review after an extension host
     * restart: the review payload survives in the workspace Memento
     * (reviewRestoreStore) and the checkpoint snapshot in chatStateStorage,
     * but the Language Server restarted with the in-memory ai:// (modified)
     * and file:// (original) documents — so the modified files are re-opened
     * in the LS before reopening the view.
     */
    private async rebuildReviewDataFromStorage(): Promise<ReviewModeData | null> {
        const ctx = StateMachine.context();
        const projectRootPath = ctx.workspacePath || ctx.projectPath || '';
        const generation = chatStateStorage.getPendingReviewGeneration(projectRootPath, 'default');
        if (!generation) {
            return null;
        }
        const restore = getPendingReviewRestore();
        if (!restore || restore.generationId !== generation.id) {
            console.error('[ApprovalViewManager] No restore data for pending review generation', generation.id);
            // Drop the stale payload so we don't repeat this failed lookup every navigation.
            await clearPendingReviewRestore();
            return null;
        }
        if (!fs.existsSync(restore.tempProjectPath)) {
            console.error('[ApprovalViewManager] Temp project of the pending review no longer exists:', restore.tempProjectPath);
            await clearPendingReviewRestore();
            return null;
        }

        // Rehydrate runtime-only state as well as the view. Accept/decline can now clean up
        // restored temp projects even though chat persistence deliberately omits these fields.
        chatStateStorage.updateReviewState(projectRootPath, 'default', generation.id, {
            tempProjectPath: restore.tempProjectPath,
            affectedPackagePaths: restore.affectedPackagePaths,
        });

        sendReviewRestoreDidOpenBatch(
            restore.tempProjectPath,
            restore.modifiedFiles,
            restore.baselineProjectPath,
            generation.checkpoint?.workspaceSnapshot
        );

        return {
            views: [],
            currentIndex: 0,
            semanticDiffs: restore.semanticDiffs,
            loadDesignDiagrams: restore.loadDesignDiagrams,
            affectedPackages: restore.affectedPackagePaths,
            modifiedFiles: restore.modifiedFiles,
            tempProjectPath: restore.tempProjectPath,
            isWorkspace: restore.isWorkspace,
        };
    }

    /**
     * Notify the AI panel webview that ReviewMode has been closed.
     */
    notifyReviewModeClosed(): void {
        this.resetReviewNavigationState();
        if (!AiPanelWebview.currentPanel) { return; }
        RPCLayer._messenger.sendNotification(reviewModeClosed, { type: 'webview', webviewType: AiPanelWebview.viewType });
    }

    /**
     * Clear cached review data after accept or discard.
     */
    clearReviewData(): void {
        this.resetReviewNavigationState();
        this.cachedReviewData = null;
        // Fire-and-forget: a lost clear only leaves stale restore data, which
        // rebuildReviewDataFromStorage detects and clears on the next navigation.
        void clearPendingReviewRestore();
    }
}

export const approvalViewManager = ApprovalViewManager.getInstance();
