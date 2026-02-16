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

import { MACHINE_VIEW, EVENT_TYPE, VisualizerLocation, PopupVisualizerLocation, AgentMetadata } from '@wso2/ballerina-core';
import { AiPanelWebview } from '../../../views/ai-panel/webview';
import { VisualizerWebview } from '../../../views/visualizer/webview';
import { openView as openMainView, StateMachine } from '../../../stateMachine';
import { openPopupView, StateMachinePopup } from '../../../stateMachinePopup';
import { notifyApprovalOverlayState } from '../../../RPCLayer';

export type ApprovalType = 'configuration' | 'task' | 'plan' | 'connector_spec';

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
        this.sendChatOverlayNotification(true, overlayMessage);
    }

    private sendChatOverlayNotification(show: boolean, message?: string): void {
        try {
            notifyApprovalOverlayState({ show, message });
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
        this.sendChatOverlayNotification(true, overlayMessage);

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
            console.log(`[ApprovalViewManager] Skipping ${machineView} open (AI panel closed)`);
            return;
        }

        console.log(`[ApprovalViewManager] Opening ${machineView} in main view`);
        openMainView(EVENT_TYPE.OPEN_VIEW, { view: machineView });
    }
}

export const approvalViewManager = ApprovalViewManager.getInstance();
