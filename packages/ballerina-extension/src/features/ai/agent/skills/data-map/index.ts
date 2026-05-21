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

import skillMd from './SKILL.md';
import { getDataMappingSkillContent } from '../../../data-mapper/prompts/mapping-prompt';
import { DIAGNOSTICS_TOOL_NAME } from '../../tools/diagnostics';
import { Skill } from '../types';

function parseSkillMd(content: string): { name: string; description: string } {
    const start = content.indexOf('---');
    const end = content.indexOf('---', start + 3);
    const frontmatter = start !== -1 && end !== -1 ? content.slice(start + 3, end) : content;
    return {
        name: /^name:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim() ?? '',
        description: /^description:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim() ?? '',
    };
}

const { name, description } = parseSkillMd(skillMd);

export const dataMapSkill: Skill = {
    name,
    trigger: description,
    content: getDataMappingSkillContent(DIAGNOSTICS_TOOL_NAME),
};
