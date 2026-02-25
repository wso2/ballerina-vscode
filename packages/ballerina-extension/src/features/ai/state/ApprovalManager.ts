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

import { Task, MACHINE_VIEW } from "@wso2/ballerina-core/lib/state-machine-types";
import { CopilotEventHandler } from "../utils/events";
import { ConfigVariable } from "../../../utils/toml-utils";
import { StateMachine } from "../../../stateMachine";
import { approvalViewManager } from './ApprovalViewManager';

/**
 * Plan approval response
 */
export interface PlanApprovalResponse {
    approved: boolean;
    comment?: string;
}

/**
 * Task approval response
 */
export interface TaskApprovalResponse {
    approved: boolean;
    comment?: string;
    approvedTaskDescription?: string;
}

/**
 * Connector spec response
 */
export interface ConnectorSpecResponse {
    provided: boolean;
    spec?: any;
    comment?: string;
}

/**
 * Configuration response containing actual values (converted to metadata before exposing to agent)
 */
export interface ConfigurationResponse {
    provided: boolean;
    configValues?: Record<string, string>;
    comment?: string;
}

/**
 * Generic promise resolver for approval requests
 */
interface PromiseResolver<T> {
    resolve: (value: T) => void;
    reject: (error: Error) => void;
    timeoutId?: NodeJS.Timeout;
}

/**
 * ApprovalManager - Global singleton for managing human-in-the-loop approval workflows
 *
 * Replaces XState state machine subscription pattern with promise-based approvals.
 * Supports parallel executions through unique requestId per execution.
 */
//TODO: Migrate this to be part of chat state manager.
export class ApprovalManager {
    private static instance: ApprovalManager;

    private planApprovals = new Map<string, PromiseResolver<PlanApprovalResponse>>();
    private taskApprovals = new Map<string, PromiseResolver<TaskApprovalResponse>>();
    private connectorSpecs = new Map<string, PromiseResolver<ConnectorSpecResponse>>();
    private configurationRequests = new Map<string, PromiseResolver<ConfigurationResponse>>();

    // Default timeout for abandoned approvals (30 minutes)
    private readonly DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

    private constructor() {
        // Private constructor for singleton pattern
    }

    static getInstance(): ApprovalManager {
        if (!ApprovalManager.instance) {
            ApprovalManager.instance = new ApprovalManager();
        }
        return ApprovalManager.instance;
    }

    // ============================================
    // Plan Approval
    // ============================================

    /**
     * Request plan approval from user
     * Emits task_approval_request event and waits for user response
     *
     * @param requestId - Unique identifier for this approval request
     * @param tasks - Array of tasks in the plan
     * @param eventHandler - Event handler to emit approval request
     * @returns Promise that resolves when user approves/declines
     */
    requestPlanApproval(
        requestId: string,
        tasks: Task[],
        eventHandler: CopilotEventHandler,
    ): Promise<PlanApprovalResponse> {
        console.log(`[ApprovalManager] Requesting plan approval: ${requestId}`);

        // Emit event to frontend
        eventHandler({
            type: "task_approval_request",
            requestId: requestId,
            approvalType: "plan",
            tasks: tasks,
            message: "Please review the implementation plan",
        });

        // Create promise that will be resolved by resolvePlanApproval()
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.planApprovals.delete(requestId);
                reject(new Error(`Plan approval timeout for request ${requestId}`));
            }, this.DEFAULT_TIMEOUT_MS);

            this.planApprovals.set(requestId, { resolve, reject, timeoutId });
        });
    }

    /**
     * Resolve plan approval (called by RPC method when user responds)
     *
     * @param requestId - Unique identifier for this approval request
     * @param approved - Whether the plan was approved
     * @param comment - Optional comment from user
     */
    resolvePlanApproval(requestId: string, approved: boolean, comment?: string): void {
        const resolver = this.planApprovals.get(requestId);
        if (!resolver) {
            console.warn(`[ApprovalManager] No pending plan approval for request: ${requestId}`);
            return;
        }

        console.log(`[ApprovalManager] Resolving plan approval: ${requestId}, approved: ${approved}`);

        // Clear timeout
        if (resolver.timeoutId) {
            clearTimeout(resolver.timeoutId);
        }

        // Resolve promise
        resolver.resolve({ approved, comment });

        // Cleanup
        this.planApprovals.delete(requestId);
    }

    // ============================================
    // Task Approval
    // ============================================

    /**
     * Request task completion approval from user
     * Emits task_approval_request event and waits for user response
     *
     * @param requestId - Unique identifier for this approval request
     * @param taskDescription - Description of the completed task
     * @param tasks - Array of all tasks (for UI display)
     * @param eventHandler - Event handler to emit approval request
     * @returns Promise that resolves when user approves/declines
     */
    requestTaskApproval(
        requestId: string,
        taskDescription: string,
        tasks: Task[],
        eventHandler: CopilotEventHandler,
    ): Promise<TaskApprovalResponse> {
        console.log(`[ApprovalManager] Requesting task approval: ${requestId}`);

        // Emit event to frontend
        eventHandler({
            type: "task_approval_request",
            requestId: requestId,
            approvalType: "completion",
            tasks: tasks,
            taskDescription: taskDescription,
            message: `Please verify the completed work for: ${taskDescription}`,
        });

        // Create promise that will be resolved by resolveTaskApproval()
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.taskApprovals.delete(requestId);
                reject(new Error(`Task approval timeout for request ${requestId}`));
            }, this.DEFAULT_TIMEOUT_MS);

            this.taskApprovals.set(requestId, { resolve, reject, timeoutId });
        });
    }

    /**
     * Resolve task approval (called by RPC method when user responds)
     *
     * @param requestId - Unique identifier for this approval request
     * @param approved - Whether the task was approved
     * @param comment - Optional comment from user
     * @param approvedTaskDescription - Description of approved task
     */
    resolveTaskApproval(
        requestId: string,
        approved: boolean,
        comment?: string,
        approvedTaskDescription?: string,
    ): void {
        const resolver = this.taskApprovals.get(requestId);
        if (!resolver) {
            console.warn(`[ApprovalManager] No pending task approval for request: ${requestId}`);
            return;
        }

        console.log(`[ApprovalManager] Resolving task approval: ${requestId}, approved: ${approved}`);

        // Clear timeout
        if (resolver.timeoutId) {
            clearTimeout(resolver.timeoutId);
        }

        // Resolve promise
        resolver.resolve({ approved, comment, approvedTaskDescription });

        // Cleanup
        this.taskApprovals.delete(requestId);
    }

    // ============================================
    // Connector Spec Request
    // ============================================

    /**
     * Request connector spec from user
     * Emits connector_generation_notification event and waits for user response
     *
     * @param requestId - Unique identifier for this approval request
     * @param eventHandler - Event handler to emit spec request
     * @returns Promise that resolves when user provides/cancels spec
     */
    requestConnectorSpec(requestId: string, eventHandler: CopilotEventHandler): Promise<ConnectorSpecResponse> {
        console.log(`[ApprovalManager] Requesting connector spec: ${requestId}`);

        // Emit event to frontend
        eventHandler({
            type: "connector_generation_notification",
            requestId: requestId,
            stage: "requesting_input",
            message: "Please provide the OpenAPI specification",
        });

        // Create promise that will be resolved by resolveConnectorSpec()
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.connectorSpecs.delete(requestId);
                reject(new Error(`Connector spec request timeout for request ${requestId}`));
            }, this.DEFAULT_TIMEOUT_MS);

            this.connectorSpecs.set(requestId, { resolve, reject, timeoutId });
        });
    }

    /**
     * Resolve connector spec request (called by RPC method when user responds)
     *
     * @param requestId - Unique identifier for this approval request
     * @param provided - Whether the spec was provided
     * @param spec - The OpenAPI spec (if provided)
     * @param comment - Optional comment from user
     */
    resolveConnectorSpec(requestId: string, provided: boolean, spec?: any, comment?: string): void {
        const resolver = this.connectorSpecs.get(requestId);
        if (!resolver) {
            console.warn(`[ApprovalManager] No pending connector spec request for: ${requestId}`);
            return;
        }

        console.log(`[ApprovalManager] Resolving connector spec: ${requestId}, provided: ${provided}`);

        // Clear timeout
        if (resolver.timeoutId) {
            clearTimeout(resolver.timeoutId);
        }

        // Resolve promise
        resolver.resolve({ provided, spec, comment });

        // Cleanup
        this.connectorSpecs.delete(requestId);
    }

    // ============================================
    // Configuration Collection
    // ============================================

    /**
     * Request configuration values from user
     * Returns actual configuration values to tool (tool converts to metadata for agent)
     * Opens a popup in the BI Visualizer for user input
     *
     * @param isTestConfig - Flag to indicate this is for test configuration (affects UI messaging)
     * @param message - Custom message from configuration collector (includes smart analysis for test mode)
     */
    requestConfiguration(
        requestId: string,
        variables: ConfigVariable[],
        existingValues: Record<string, string>,
        eventHandler: CopilotEventHandler,
        isTestConfig?: boolean,
        message?: string
    ): Promise<ConfigurationResponse> {
        console.log(`[ApprovalManager] Requesting ${isTestConfig ? 'test ' : ''}configuration: ${requestId}`);

        // Use provided message or generate default
        const displayMessage = message || `Please provide ${variables.length} configuration value(s)`;

        // Emit collecting stage to AI Panel
        eventHandler({
            type: "configuration_collection_event",
            requestId,
            stage: "collecting",
            variables,
            existingValues,
            message: displayMessage,
            isTestConfig,
        });

        const { projectPath } = StateMachine.context();

        // Open configuration collector view
        approvalViewManager.openApprovalViewPopup(
            requestId,
            'configuration',
            {
                view: MACHINE_VIEW.ConfigurationCollector,
                projectPath,
                agentMetadata: {
                    configurationCollector: {
                        requestId,
                        variables,
                        existingValues,
                        message: displayMessage,
                        isTestConfig,
                    },
                },
            }
        );

        // Create promise that will be resolved by resolveConfiguration()
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.configurationRequests.delete(requestId);
                reject(new Error(`Configuration request timeout for request ${requestId}`));
            }, this.DEFAULT_TIMEOUT_MS);

            this.configurationRequests.set(requestId, { resolve, reject, timeoutId });
        });
    }

    /**
     * Resolve configuration request (called by RPC method when user responds)
     * Contains actual configuration values - tool will convert to metadata for agent
     */
    resolveConfiguration(
        requestId: string,
        provided: boolean,
        configValues?: Record<string, string>,
        comment?: string,
    ): void {
        const resolver = this.configurationRequests.get(requestId);
        if (!resolver) {
            console.warn(`[ApprovalManager] No pending configuration request for: ${requestId}`);
            return;
        }

        console.log(`[ApprovalManager] Resolving configuration request: ${requestId}, provided: ${provided}`);

        // Clear timeout
        if (resolver.timeoutId) {
            clearTimeout(resolver.timeoutId);
        }

        // Resolve promise with actual configuration values (tool will sanitize before returning to agent)
        resolver.resolve({ provided, configValues, comment });

        // Cleanup
        this.configurationRequests.delete(requestId);

        // Cleanup view and clear state machine metadata
        approvalViewManager.cleanupView(requestId, true);
    }

    // ============================================
    // Cleanup
    // ============================================

    /**
     * Cancel all pending approvals (useful for abort scenarios)
     *
     * @param reason - Reason for cancellation
     */
    cancelAllPending(reason: string): void {
        console.log(`[ApprovalManager] Cancelling all pending approvals: ${reason}`);

        // Cleanup all approval views
        approvalViewManager.cleanupAllViews();

        const error = new Error(reason);

        // Cancel plan approvals
        for (const [requestId, resolver] of this.planApprovals.entries()) {
            if (resolver.timeoutId) {
                clearTimeout(resolver.timeoutId);
            }
            resolver.reject(error);
        }
        this.planApprovals.clear();

        // Cancel task approvals
        for (const [requestId, resolver] of this.taskApprovals.entries()) {
            if (resolver.timeoutId) {
                clearTimeout(resolver.timeoutId);
            }
            resolver.reject(error);
        }
        this.taskApprovals.clear();

        // Cancel connector specs
        for (const [requestId, resolver] of this.connectorSpecs.entries()) {
            if (resolver.timeoutId) {
                clearTimeout(resolver.timeoutId);
            }
            resolver.reject(error);
        }
        this.connectorSpecs.clear();

        // Resolve configuration requests as skipped so callers handle it as a normal skip
        for (const [, resolver] of this.configurationRequests.entries()) {
            if (resolver.timeoutId) {
                clearTimeout(resolver.timeoutId);
            }
            resolver.resolve({ provided: false, comment: reason });
        }
        this.configurationRequests.clear();
    }

    /**
     * Get count of pending approvals (useful for debugging)
     */
    getPendingCount(): { plans: number; tasks: number; connectorSpecs: number; configurations: number } {
        return {
            plans: this.planApprovals.size,
            tasks: this.taskApprovals.size,
            connectorSpecs: this.connectorSpecs.size,
            configurations: this.configurationRequests.size,
        };
    }
}

// Export singleton instance for convenience
export const approvalManager = ApprovalManager.getInstance();
