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
import { ProjectSource } from '@wso2/ballerina-core';
import { CopilotEventHandler } from '../../../utils/events';
import { Skill } from '../../skills/types';
import { readCustomSkillContent, readUserSkillContent } from './skill-reader';

export const SKILL_TOOL_NAME = "invoke_skill";

export function createSkillTool(
    builtInSkills: Skill[],
    projectRootPath: string,
    projects: ProjectSource[],
    eventHandler: CopilotEventHandler,
) {
    return tool({
        description:
            `Fetches the full rule set for a named skill and returns it ready to apply.

Call this tool once per skill whenever a skill's trigger condition is met. Each call loads exactly one skill.
- Built-in skills: plain name (e.g. "data-map").
- Project / package skills: "<projectName>/<skillName>" or "<packageName>/<skillName>".
- User skills: "user/<skillName>".`,
        inputSchema: z.object({
            skillName: z.string().describe(
                "Name of the skill to invoke. Case-insensitive. " +
                "Plain name for built-in skills and full prefixed name for project/package or user skills."
            ),
        }),
        execute: async ({ skillName }, context?: { toolCallId?: string }) => {
            const toolCallId = context?.toolCallId ?? `skill-${Date.now()}`;
            eventHandler({
                type: "tool_call",
                toolName: SKILL_TOOL_NAME,
                toolInput: { skillName },
                toolCallId,
            } as any);

            const lower = skillName.toLowerCase();
            const builtIn = builtInSkills.find(s => s.name.toLowerCase() === lower);
            const custom = projectRootPath
                ? readCustomSkillContent(projectRootPath, projects, skillName)
                : null;
            const userSkill = readUserSkillContent(skillName);

            const resolved = custom ?? userSkill ?? builtIn;

            if (!resolved) {
                const result = {
                    found: false,
                    message: `No skill named '${skillName}' found.`,
                };
                eventHandler({ type: "tool_result", toolName: SKILL_TOOL_NAME, toolOutput: result, toolCallId } as any);
                return result;
            }

            const result = { found: true, skillName: resolved.name, content: resolved.content };
            eventHandler({ type: "tool_result", toolName: SKILL_TOOL_NAME, toolOutput: result, toolCallId } as any);
            return result;
        },
    });
}
