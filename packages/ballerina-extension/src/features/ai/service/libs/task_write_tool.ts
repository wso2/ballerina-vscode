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
import { Task, TaskStatus, TaskTypes } from '@wso2/ballerina-core';

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
    status: z.enum(["pending", "in_progress", "completed"]).describe("Current status of the task. Use 'pending' for new tasks, 'in_progress' when starting work, 'completed' when done."),
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

// Single pending approval promise (only one approval at a time)
let pendingApprovalResolve: ((response: { approved: boolean; comment?: string }) => void) | null = null;

/**
 * Function to be called when user responds to approval
 */
export function resolveTaskApproval(response: { approved: boolean; comment?: string }) {
    if (pendingApprovalResolve) {
        pendingApprovalResolve(response);
        pendingApprovalResolve = null;
    }
}

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

                const allTasks: Task[] = input.tasks.map(task => ({
                    id: task.id || `task_${Date.now()}_${Math.random()}`, // Generate ID only if not provided
                    description: task.description,
                    status: task.status as TaskStatus,
                    type: task.type as TaskTypes
                }));

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

                // Determine if this is a new plan creation or an update
                const hasNewTasks = input.tasks.some(t => !t.id);
                const completedTasks = allTasks.filter(t => t.status === TaskStatus.COMPLETED);
                const inProgressTasks = allTasks.filter(t => t.status === TaskStatus.IN_PROGRESS);
                const pendingTasks = allTasks.filter(t => t.status === TaskStatus.PENDING);

                // Check if we need to request approval
                let approvalResult: { approved: boolean; comment?: string } | undefined;
                let approvalType: "plan" | "completion" | undefined;
                let approvedTaskId: string | undefined;

                if (eventHandler) {
                    // Case 1: New plan creation (all tasks are new and pending)
                    if (hasNewTasks && completedTasks.length === 0 && inProgressTasks.length === 0) {
                        console.log("[TaskWrite Tool] Requesting plan approval from user");
                        approvalType = "plan";

                        // Create promise and emit approval request
                        const responsePromise = new Promise<{ approved: boolean; comment?: string }>((resolve) => {
                            pendingApprovalResolve = resolve;
                        });

                        eventHandler({
                            type: "task_approval_request",
                            approvalType: "plan",
                            tasks: allTasks,
                            message: "Please review the implementation plan"
                        });

                        approvalResult = await responsePromise;
                    }
                    // Case 2: Task just completed (no in-progress tasks means agent finished work)
                    // If there's an in_progress task, the agent is just starting work - no approval needed
                    else if (completedTasks.length > 0 && inProgressTasks.length === 0) {
                        // No in-progress task means the last completed task was just finished
                        const lastCompletedTask = completedTasks[completedTasks.length - 1];
                        console.log(`[TaskWrite Tool] Requesting completion approval for task: ${lastCompletedTask.id}`);
                        approvalType = "completion";
                        approvedTaskId = lastCompletedTask.id;

                        // Create promise and emit approval request
                        const responsePromise = new Promise<{ approved: boolean; comment?: string }>((resolve) => {
                            pendingApprovalResolve = resolve;
                        });

                        eventHandler({
                            type: "task_approval_request",
                            approvalType: "completion",
                            tasks: allTasks,
                            taskId: lastCompletedTask.id,
                            message: `Please verify the completed work for: ${lastCompletedTask.description}`
                        });

                        approvalResult = await responsePromise;
                    } else if (inProgressTasks.length > 0) {
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
                    } else if (completedTasks.length === allTasks.length) {
                        message = `All tasks completed!`;
                    } else if (completedTasks.length > 0) {
                        message = `Completed: ${completedTasks[completedTasks.length - 1].description}`;
                    } else {
                        message = `Successfully created ${allTasks.length} implementation tasks. Tasks are now ready for execution.`;
                    }
                }

                // ALWAYS return ALL tasks
                console.log(`[TaskWrite Tool] Returning ${allTasks.length} tasks (${completedTasks.length} completed, ${inProgressTasks.length} in progress, ${pendingTasks.length} pending)`);

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
