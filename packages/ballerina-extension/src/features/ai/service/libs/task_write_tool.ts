// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

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

import { tool } from 'ai';
import { z } from 'zod';
import { CopilotEventHandler } from '../event';
import { Task, TaskStatus, TaskTypes, Plan, AIChatMachineEventType } from '@wso2/ballerina-core';
import { AIChatStateMachine } from '../../../../views/ai-panel/aiChatMachine';

export const TASK_WRITE_TOOL_NAME = "TaskWrite";

/**
 * Result returned by TaskWrite tool
 */
export interface TaskWriteResult {
    success: boolean;
    message: string;
    tasks: Task[];
}

/**
 * Zod schema for a single task input
 */
export const TaskInputSchema = z.object({
    id: z.string().optional().describe("Task ID (required when updating existing tasks, omit when creating new tasks)"),
    description: z.string().min(1).describe("Clear, actionable description of the task to be implemented"),
    status: z.enum([TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW]).describe("Current status of the task. Use 'pending' for tasks not started yet, 'in_progress' when actively working on a task, 'review' when task work is completed and ready for user approval. Note: 'done' and 'rejected' statuses are managed by the system after user review."),
    type: z.enum(["service_design", "connections_init", "implementation"]).describe("Type of the implementation task. service_design will only generate the http service contract. not the implementation. connections_init will only generate the connection initializations. All of the other tasks will be of type implementation.")
});

/**
 * Type for a single task input
 */
export type TaskInput = z.infer<typeof TaskInputSchema>;

/**
 * Zod schema for TaskWrite tool input
 */
const TaskWriteInputSchema = z.object({
    tasks: z.array(TaskInputSchema).min(1).describe("ALL TASKS - EVERY SINGLE ONE. This tool is stateless. Always send the COMPLETE list. Never send just 1 task when updating. Creating new plan = all tasks without IDs. Updating existing plan = ALL tasks with IDs and statuses.")
});

/**
 * Type for TaskWrite tool input
 */
export type TaskWriteInput = z.infer<typeof TaskWriteInputSchema>;

/**
 * Factory function to create the TaskWrite tool
 *
 * Tool is stateless - LLM sends ALL tasks on every call and receives ALL tasks back
 * No IDs needed since we're always replacing the entire task list
 *
 * @param eventHandler Event handler for emitting approval requests to the UI
 * @returns The TaskWrite tool
 */
export function createTaskWriteTool(eventHandler?: CopilotEventHandler) {
    return tool({
        description: `Create and update implementation tasks for the design plan.
## Task Ordering:
- Tasks should be ordered sequentially as they need to be executed.
- Prioritize service design, then connection initializations, then implementation tasks.

## CRITICAL RULE - ALWAYS SEND ALL TASKS:
This tool is STATELESS. Every call MUST include ALL tasks.

- Have 5 tasks? Send all 5 EVERY time
- Updating 1 task? Send ALL tasks with the update
- NEVER send just 1 task - the tool will reject it
- Think: You're replacing the entire list, not editing one item

## USER APPROVAL REQUIRED:
1. **Plan Approval**: User approves/rejects initial task list
2. **Task Completion Approval**: User approves/rejects each completed task before moving to the next

## CREATING TASKS (First Call):
Send ALL tasks with status "pending", no IDs.
Example:
[
  {"description": "Create the HTTP service contract", "status": "pending", "type": "service_design"},
  {"description": "Create the MYSQL Connection", "status": "pending", "type": "connections_init"},
  {"description": "Implement the resource functions", "status": "pending", "type": "implementation"}
]

## UPDATING TASKS (Every Other Call):
Send ALL tasks with IDs and updated statuses.

Workflow per task (after plan approval):
1. Mark in_progress → Send ALL tasks
2. Do the work immediately
3. Mark completed → Send ALL tasks
4. Wait for user approval of the completed task
5. If approved → Start next task (repeat from step 1)
6. If rejected → Redo the task based on feedback

Example (3 tasks total):
Start task 1 - Send ALL:
[
  {"id": "1", "description": "Create the HTTP service contract", "status": "in_progress", "type": "service_design"},
  {"id": "2", "description": "Create the MYSQL Connection", "status": "pending", "type": "connections_init"},
  {"id": "3", "description": "Implement the resource functions", "status": "pending", "type": "implementation"}
]

Complete task 1 - Send ALL:
[
  {"id": "1", "description": "Create the HTTP service contract", "status": "complete", "type": "service_design"},
  {"id": "2", "description": "Create the MYSQL Connection", "status": "pending", "type": "connections_init"},
  {"id": "3", "description": "Implement the resource functions", "status": "pending", "type": "implementation"}
]

Start task 2 - Send ALL:
[
  {"id": "1", "description": "Create the HTTP service contract", "status": "complete", "type": "service_design"},
  {"id": "2", "description": "Create the MYSQL Connection", "status": "in_progress", "type": "connections_init"},
  {"id": "3", "description": "Implement the resource functions", "status": "pending", "type": "implementation"}
]

Rules:
- Send ALL tasks every single call (tool will reject partial lists)
- Only ONE task "in_progress" at a time
- After plan approval, start first task immediately
- Wait for approval after each task completion before starting next
- Continue autonomously through all tasks with approval checkpoints`,
        inputSchema: TaskWriteInputSchema,
        execute: async (input: TaskWriteInput): Promise<TaskWriteResult> => {
            try {
                // Tool is stateless - just process and return ALL tasks sent by LLM
                // No IDs needed, no state management - LLM maintains the full task list

                // Get existing plan from state machine to preserve system-managed statuses (done/rejected)
                const currentContext = AIChatStateMachine.context();
                const existingPlan = currentContext.currentPlan;

                const allTasks: Task[] = input.tasks.map(task => {
                    const taskId = task.id || `task_${Date.now()}_${Math.random()}`;

                    // If task exists in state machine with done/rejected status, preserve that status
                    const existingTask = existingPlan?.tasks.find(t => t.id === taskId);
                    const shouldPreserveStatus = existingTask && existingTask.status === TaskStatus.DONE;

                    return {
                        id: taskId,
                        description: task.description,
                        status: shouldPreserveStatus ? existingTask.status : (task.status as TaskStatus),
                        type: task.type as TaskTypes
                    };
                });

                console.log(`[TaskWrite Tool] Received ${allTasks.length} task(s)`);

                // STRICTLY ENFORCE: Return error if only 1 task with ID (violates "send ALL tasks" rule)
                if (allTasks.length === 1 && input.tasks[0].id) {
                    console.error(`[TaskWrite Tool] ❌ ERROR: Received only 1 task with ID. This violates the tool requirement. You MUST send ALL tasks on every call, not just the one being updated!`);
                    return {
                        success: false,
                        message: "ERROR: You sent only 1 task. You MUST send ALL tasks with their current statuses on every call. This is a strict requirement - the tool cannot process partial task lists. Please retry with the COMPLETE task list including all tasks (pending, in_progress, and completed).",
                        tasks: []
                    };
                }

                // Determine if this is a new plan creation, plan remodification, or task update
                const hasNewTasks = input.tasks.some(t => !t.id);
                const reviewTasks = allTasks.filter((t) => t.status === TaskStatus.REVIEW);
                const inProgressTasks = allTasks.filter(t => t.status === TaskStatus.IN_PROGRESS);
                const pendingTasks = allTasks.filter(t => t.status === TaskStatus.PENDING);
                const doneTasks = allTasks.filter(t => t.status === TaskStatus.DONE);

                // Detect plan remodification: plan exists but structure changed significantly
                const isPlanRemodification = existingPlan && (
                    allTasks.length !== existingPlan.tasks.length || // Different number of tasks
                    hasNewTasks // Has new tasks added
                );

                // Check if we need to request approval
                let approvalResult: { approved: boolean; comment?: string } | undefined;
                let approvalType: "plan" | "completion" | undefined;
                let approvedTaskId: string | undefined;

                if (eventHandler) {
                    // Case 1: New plan creation OR plan remodification
                    if ((hasNewTasks || isPlanRemodification) && reviewTasks.length === 0 && inProgressTasks.length === 0 && doneTasks.length === 0) {
                        console.log(`[TaskWrite Tool] ${isPlanRemodification ? 'Plan remodified' : 'Plan created'}, emitting PLAN_GENERATED event`);
                        approvalType = "plan";

                        // Create Plan object
                        const plan: Plan = {
                            id: `plan-${Date.now()}`,
                            tasks: allTasks,
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                        };

                        // Emit PLAN_GENERATED event to state machine (non-blocking)
                        AIChatStateMachine.sendEvent({
                            type: AIChatMachineEventType.PLAN_GENERATED,
                            payload: { plan }
                        });

                        // Also emit UI event for task approval display
                        eventHandler({
                            type: "task_approval_request",
                            approvalType: "plan",
                            tasks: allTasks,
                            message: "Please review the implementation plan"
                        });

                        // Wait for user approval - state machine will transition out of PlanReview
                        console.log("[TaskWrite Tool] Waiting for plan approval/rejection...");
                        approvalResult = await new Promise<{ approved: boolean; comment?: string }>((resolve) => {
                            // Subscribe to state machine changes
                            const subscription = AIChatStateMachine.service().subscribe((state) => {
                                const currentState = state.value;

                                // If we moved from PlanReview to ApprovedPlan = approved
                                if (currentState === 'ApprovedPlan') {
                                    console.log("[TaskWrite Tool] Plan approved by user");
                                    subscription.unsubscribe();
                                    resolve({ approved: true });
                                }
                                // If we moved from PlanReview to GeneratingPlan = rejected
                                else if (currentState === 'GeneratingPlan') {
                                    // Get rejection comment from state machine context
                                    const rejectionComment = state.context.currentApproval?.comment;
                                    console.log(`[TaskWrite Tool] Plan rejected by user${rejectionComment ? `: "${rejectionComment}"` : ''}`);
                                    subscription.unsubscribe();
                                    resolve({ approved: false, comment: rejectionComment });
                                }
                            });
                        });
                    }
                    // Case 2: Tasks completed and in review (waiting for approval)
                    // LLM may have completed multiple tasks at once
                    else if (reviewTasks.length > 0 && inProgressTasks.length === 0) {
                        // Get the last task in review (most recently completed)
                        const lastReviewTask = reviewTasks[reviewTasks.length - 1];
                        console.log(`[TaskWrite Tool] Requesting completion approval for ${reviewTasks.length} task(s), latest: ${lastReviewTask.id}`);
                        approvalType = "completion";
                        approvedTaskId = lastReviewTask.id;

                        // Emit TASK_COMPLETED event to state machine (non-blocking)
                        AIChatStateMachine.sendEvent({
                            type: AIChatMachineEventType.TASK_COMPLETED
                        });

                        // Also emit UI event for task approval display
                        eventHandler({
                            type: "task_approval_request",
                            approvalType: "completion",
                            tasks: allTasks,
                            taskId: lastReviewTask.id,
                            message: `Please verify the completed work for: ${lastReviewTask.description}`
                        });

                        // Wait for user approval - state machine will transition out of TaskReview
                        console.log("[TaskWrite Tool] Waiting for task approval/rejection...");

                        approvalResult = await new Promise<{ approved: boolean; comment?: string }>((resolve) => {
                            // Subscribe to state machine changes
                            const subscription = AIChatStateMachine.service().subscribe((state) => {
                                const currentState = state.value;

                                // If we moved from TaskReview to ApprovedTask = approved
                                if (currentState === 'ApprovedTask') {
                                    console.log(`[TaskWrite Tool] Task(s) approved by user (${reviewTasks.length} task(s))`);

                                    // Update all review tasks to done status
                                    reviewTasks.forEach(task => {
                                        const taskIndex = allTasks.findIndex(t => t.id === task.id);
                                        if (taskIndex !== -1) {
                                            allTasks[taskIndex].status = TaskStatus.DONE;
                                        }
                                    });

                                    subscription.unsubscribe();
                                    resolve({ approved: true });
                                }
                                // If we moved from TaskReview to RejectedTask = rejected
                                else if (currentState === 'RejectedTask') {
                                    // Get rejection comment from state machine context
                                    const rejectionComment = state.context.currentApproval?.comment;
                                    console.log(`[TaskWrite Tool] Task rejected by user${rejectionComment ? `: "${rejectionComment}"` : ''}`);

                                    // Update the last review task (the one being rejected) to rejected status
                                    const taskIndex = allTasks.findIndex(t => t.id === lastReviewTask.id);
                                    if (taskIndex !== -1) {
                                        allTasks[taskIndex].status = TaskStatus.REJECTED;
                                    }

                                    subscription.unsubscribe();
                                    resolve({ approved: false, comment: rejectionComment });
                                }
                            });
                        });
                    } else if (inProgressTasks.length > 0) {
                        // Emit START_TASK_EXECUTION event to state machine (non-blocking)
                        AIChatStateMachine.sendEvent({
                            type: AIChatMachineEventType.START_TASK_EXECUTION,
                        });
                        console.log(`[TaskWrite Tool] Task in progress, no approval needed: ${inProgressTasks[0].description}`);
                    }
                }

                // Generate contextual message based on approval result and task statuses
                let message: string;
                if (approvalResult) {
                    if (approvalResult.approved) {
                        if (approvalType === "plan") {
                            message = `Plan approved! Ready to start execution. ${allTasks.length} tasks created.`;
                        } else {
                            message = `Work approved! Task completed successfully. ${approvedTaskId ? `Task: ${allTasks.find(t => t.id === approvedTaskId)?.description}` : ''}`;
                        }
                        if (approvalResult.comment) {
                            message += ` User comment: "${approvalResult.comment}"`;
                        }
                    } else {
                        if (approvalType === "plan") {
                            message = `Plan not approved. Please revise the plan based on feedback.${approvalResult.comment ? ` User comment: "${approvalResult.comment}"` : ''}`;
                        } else {
                            message = `Work not approved. Please redo the task based on feedback.${approvalResult.comment ? ` User comment: "${approvalResult.comment}"` : ''}`;
                        }
                    }
                } else {
                    // No approval needed - just status update
                    if (inProgressTasks.length > 0) {
                        message = `Started working on: ${inProgressTasks[0].description}`;
                    } else if (doneTasks.length === allTasks.length) {
                        message = `All tasks completed!`;
                    } else if (doneTasks.length > 0) {
                        message = `Completed: ${doneTasks[doneTasks.length - 1].description}`;
                    } else {
                        message = `Successfully created ${allTasks.length} implementation tasks. Tasks are now ready for execution.`;
                    }
                }

                // ALWAYS return ALL tasks
                console.log(`[TaskWrite Tool] Returning ${allTasks.length} tasks (${doneTasks.length} done, ${reviewTasks.length} in review, ${inProgressTasks.length} in progress, ${pendingTasks.length} pending)`);

                return {
                    success: approvalResult ? approvalResult.approved : true,
                    message,
                    tasks: allTasks
                };
            } catch (error) {
                console.error("Error in TaskWrite tool:", error);
                return {
                    success: false,
                    message: `Failed to process tasks: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    tasks: []
                };
            }
        }
    });
}
