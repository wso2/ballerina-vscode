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

import { Skill, CustomSkillMeta } from './types';
import { dataMapSkill } from './data-map';
import { skillCreatorSkill } from './skill-creator';

export type { Skill, CustomSkillMeta };

export const REGISTERED_SKILLS: Skill[] = [
    dataMapSkill,
    skillCreatorSkill,
];

function formatSkill(skill: Skill | CustomSkillMeta): string {
    return `## Skill: ${skill.name}

**Trigger**: ${skill.trigger}

**How to use**: Call the \`invoke_skill\` tool with \`skillName="${skill.name}"\` to fetch the full rules.`;
}

const SKILL_USAGE_RULES = `**Rules for using skills**:
- **One at a time**: Always invoke one skill per message. Never call \`invoke_skill\` for multiple skills in the same turn — load each skill, apply it, then decide if another is needed.
- **Silent operation**: Never announce or narrate skill usage in text. Call \`invoke_skill\` directly and apply the rules silently.
- **Priority over tools**: Skills take priority over direct tool calls. Before using tools like \`LibrarySearchTool\`, \`web_search\`, \`web_fetch\`, or invoking sub-skills, always check first whether any skill's trigger condition is met and invoke that skill. Follow all tool references (web search, library selection, sub-skill invocations) mentioned in the skill content rather than the default workflow steps.`;

export function getBuiltInSkillsSection(disabledSkills?: Set<string>): string {
    const activeSkills = disabledSkills
        ? REGISTERED_SKILLS.filter(s => !disabledSkills.has(s.name))
        : REGISTERED_SKILLS;
    if (activeSkills.length === 0) { return ''; }
    return `# Skills

Skills are specialised rule sets for specific tasks. **Skills have the highest priority** — always check skill trigger conditions before using any tool directly. When a skill's trigger condition is met, call \`invoke_skill\` to load the full rules, then apply them exactly, including any tool references (library search, web search, sub-skills) the skill specifies.

${SKILL_USAGE_RULES}

${activeSkills.map(formatSkill).join('\n\n')}`;
}

export function getCustomSkillsSection(customSkills: CustomSkillMeta[]): string {
    if (customSkills.length === 0) { return ''; }
    return `# Project Skills

These skills are defined by the project team. Skill names follow the format \`<projectName>/<skillName>\` for project-wide skills and \`<packageName>/<skillName>\` for package-specific skills — the prefix distinguishes them from built-in skills with the same base name. Call \`invoke_skill\` with the full prefixed name to load the rules, then apply them exactly.

${customSkills.map(formatSkill).join('\n\n')}`;
}

export function getUserSkillsSection(userSkills: CustomSkillMeta[]): string {
    if (userSkills.length === 0) { return ''; }
    return `# User Skills

These skills are defined by you in \`~/.ballerina/copilot/skills/\` and apply across all projects. Skill names use the \`user/<skillName>\` prefix. Call \`invoke_skill\` with the full prefixed name to load the full rules.

${userSkills.map(formatSkill).join('\n\n')}`;
}
