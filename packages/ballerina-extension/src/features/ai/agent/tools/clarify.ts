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

import { tool } from 'ai';
import { z } from 'zod';
import * as crypto from "crypto";
import { CopilotEventHandler } from '../../utils/events';
import { approvalManager } from '../../state/ApprovalManager';

export const CLARIFY_TOOL = "Clarify";

const ClarifyInputSchema = z.object({
    questions: z.array(
        z.object({
            question: z.string().describe('The question to ask the user.'),
            tabLabel: z.string().describe('Short 1-2 word label for the navigation tab, e.g. "Integration", "Systems", "Tests".'),
            options: z.array(
                z.object({
                    label: z.string().describe('Display label for the option.'),
                    value: z.string().describe('Value returned if this option is selected.'),
                })
            ).describe('Predefined answer options for the user to choose from. Do NOT include an "Other" option — a free-text input is always provided automatically.'),
            selectionType: z.enum(["single", "multiple"]).describe(
                'Use "single" when only one answer applies, "multiple" when several can.'
            ),
        })
    ).describe('All questions to ask the user in this single interaction.'),
});

export type ClarifyInput = z.infer<typeof ClarifyInputSchema>;

export function createClarifyTool(eventHandler: CopilotEventHandler) {
    return tool({
        description: `Use this tool to ask the user clarifying questions before starting implementation when the request leaves critical decisions unspecified and a wrong assumption would produce results the user did not want.

Call this when the request does not specify key parameters that meaningfully affect the design — such as the data source, integration target, API contract, or architecture approach — and these cannot be reasonably inferred from the codebase or conversation.

Do NOT call this for details you can infer from context, trivial stylistic choices, or anything that can be safely defaulted.

STRICT RULES:
- Call AT MOST ONCE per task. Batch ALL questions into a single call.
- Only ask what you genuinely cannot assume or infer.
- Use "single" when one answer applies, "multiple" when several can.`,
        inputSchema: ClarifyInputSchema,
        execute: async (input, context?: { toolCallId?: string }): Promise<{ answers: Array<{ question: string; answers: string[] }> } | { skipped: boolean }> => {
            const toolCallId = context?.toolCallId || `fallback-${Date.now()}`;
            const requestId = crypto.randomUUID();

            eventHandler({ type: "tool_call", toolName: CLARIFY_TOOL, toolInput: input, toolCallId });

            const response = await approvalManager.requestClarify(requestId, input, eventHandler);

            if (!response.answered) {
                eventHandler({
                    type: "clarify_event",
                    requestId,
                    stage: "skipped",
                    questions: input.questions,
                });
                eventHandler({ type: "tool_result", toolName: CLARIFY_TOOL, toolOutput: { skipped: true }, toolCallId });
                return { skipped: true };
            }

            eventHandler({
                type: "clarify_event",
                requestId,
                stage: "answered",
                questions: input.questions,
                answers: response.answers,
            });
            eventHandler({ type: "tool_result", toolName: CLARIFY_TOOL, toolOutput: { answers: response.answers }, toolCallId });
            return { answers: response.answers ?? [] };
        },
    });
}
