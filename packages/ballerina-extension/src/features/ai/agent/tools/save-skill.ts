// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

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
import * as crypto from 'crypto';
import { CopilotEventHandler } from '../../utils/events';
import { approvalManager } from '../../state/ApprovalManager';

export const SAVE_SKILL_TOOL_NAME = "save_skill";

export function createSaveSkillTool(eventHandler: CopilotEventHandler) {
    return tool({
        description: `Save a newly created skill definition so the user can reuse it in future sessions.

Call this tool ONCE after you have fully formulated the skill's name, trigger, and body.
Do NOT call this tool until the skill definition is complete.
Do NOT announce that you are saving — just call the tool immediately.`,
        inputSchema: z.object({
            name: z.string().describe(
                "Skill name: lowercase, kebab-case (e.g. 'api-error-handler'). No spaces or special characters."
            ),
            trigger: z.string().describe(
                "One or two sentences describing when to invoke this skill. Start with 'Use this skill when...'."
            ),
            body: z.string().optional().describe(
                "Detailed rules, constraints, and examples for the skill (markdown). Omit only for very simple skills where the trigger alone is sufficient."
            ),
        }),
        execute: async ({ name, trigger, body }, context?: { toolCallId?: string }) => {
            const toolCallId = context?.toolCallId ?? `save-skill-${Date.now()}`;
            const requestId = crypto.randomUUID();

            eventHandler({ type: "tool_call", toolName: SAVE_SKILL_TOOL_NAME, toolInput: { name, trigger, body }, toolCallId });

            const response = await approvalManager.requestSkillSave(requestId, { name, trigger, body }, eventHandler);

            if (!response.saved) {
                eventHandler({
                    type: "skill_save_event",
                    requestId,
                    stage: "cancelled",
                    name,
                    trigger,
                    body,
                });
                const result = { saved: false, message: "Skill save was cancelled by the user." };
                eventHandler({ type: "tool_result", toolName: SAVE_SKILL_TOOL_NAME, toolOutput: result, toolCallId });
                return result;
            }

            eventHandler({
                type: "skill_save_event",
                requestId,
                stage: "saved",
                name,
                trigger,
                body,
                tier: response.tier as "user" | "custom",
            });
            const result = { saved: true, tier: response.tier, message: `Skill "${name}" saved as a ${response.tier} skill.` };
            eventHandler({ type: "tool_result", toolName: SAVE_SKILL_TOOL_NAME, toolOutput: result, toolCallId });
            return result;
        },
    });
}
