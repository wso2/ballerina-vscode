/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { Plan } from '@wso2/ballerina-core';

/**
 * Runtime state for AI chat session
 * Stores transient state that doesn't need persistence
 */
export interface RuntimeState {
    currentPlan?: Plan;
    autoApproveEnabled?: boolean;
    showReviewActions?: boolean;
}

/**
 * Simple runtime state manager for AI chat sessions
 * Replaces XState state machine for basic state storage
 */
class RuntimeStateManager {
    private static instance: RuntimeStateManager;
    private state: RuntimeState = {};

    private constructor() {}

    static getInstance(): RuntimeStateManager {
        if (!RuntimeStateManager.instance) {
            RuntimeStateManager.instance = new RuntimeStateManager();
        }
        return RuntimeStateManager.instance;
    }

    /**
     * Get current runtime state
     */
    getState(): RuntimeState {
        return { ...this.state };
    }

    /**
     * Update runtime state
     */
    updateState(updates: Partial<RuntimeState>): void {
        this.state = { ...this.state, ...updates };
    }

    /**
     * Clear all runtime state
     */
    clearState(): void {
        this.state = {};
    }

    /**
     * Get current plan
     */
    getCurrentPlan(): Plan | undefined {
        return this.state.currentPlan;
    }

    /**
     * Set current plan
     */
    setCurrentPlan(plan: Plan | undefined): void {
        this.state.currentPlan = plan;
    }

    /**
     * Get auto-approve setting
     */
    isAutoApproveEnabled(): boolean {
        return this.state.autoApproveEnabled === true;
    }

    /**
     * Set auto-approve setting
     */
    setAutoApproveEnabled(enabled: boolean): void {
        this.state.autoApproveEnabled = enabled;
    }

    /**
     * Get review actions visibility
     */
    shouldShowReviewActions(): boolean {
        return this.state.showReviewActions === true;
    }

    /**
     * Set review actions visibility
     */
    setShowReviewActions(show: boolean): void {
        this.state.showReviewActions = show;
    }
}

export const runtimeStateManager = RuntimeStateManager.getInstance();
