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

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ProjectSkillMeta } from '../../skills/types';

const USER_SKILLS_DIR = path.join(os.homedir(), '.ballerina', 'copilot', 'skills');
const USER_SKILL_PREFIX = 'user';

export interface ProjectSkillContent extends ProjectSkillMeta {
    content: string;
}

export function parseSkillMd(raw: string): { name: string; trigger: string; content: string } {
    if (raw.trimStart().startsWith('---')) {
        const start = raw.indexOf('---');
        const end = raw.indexOf('---', start + 3);
        if (end !== -1) {
            const frontmatter = raw.slice(start + 3, end);
            const name    = /^name:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim() ?? '';
            const trigger = /^description:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim() ?? '';
            const body    = raw.slice(end + 3).trim();
            return { name, trigger, content: body || trigger };
        }
    }
    const nameMatch = /^name:\s*(.+)$/m.exec(raw);
    const descMatch = /^description:\s*(.+)$/m.exec(raw);
    const name    = nameMatch?.[1]?.trim() ?? '';
    const trigger = descMatch?.[1]?.trim() ?? '';
    const lastIdx = Math.max(
        nameMatch ? raw.indexOf(nameMatch[0]) + nameMatch[0].length : -1,
        descMatch ? raw.indexOf(descMatch[0]) + descMatch[0].length : -1,
    );
    const body = lastIdx >= 0 ? raw.slice(lastIdx).trim() : '';
    return { name, trigger, content: body || trigger };
}

function readSkillFromDir(skillsDir: string, skillNameLower: string): ProjectSkillContent | null {
    if (!fs.existsSync(skillsDir)) { return null; }
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(skillsDir, { withFileTypes: true }); } catch { return null; }
    for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.toLowerCase() !== skillNameLower) { continue; }
        const mdPath = path.join(skillsDir, entry.name, 'SKILL.md');
        if (!fs.existsSync(mdPath)) { continue; }
        try { return parseSkillMd(fs.readFileSync(mdPath, 'utf-8')) as ProjectSkillContent; } catch { return null; }
    }
    return null;
}

export function scanUserSkills(): ProjectSkillMeta[] {
    const results: ProjectSkillMeta[] = [];
    if (!fs.existsSync(USER_SKILLS_DIR)) { return results; }
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(USER_SKILLS_DIR, { withFileTypes: true }); } catch { return results; }
    for (const entry of entries) {
        if (!entry.isDirectory()) { continue; }
        const mdPath = path.join(USER_SKILLS_DIR, entry.name, 'SKILL.md');
        if (!fs.existsSync(mdPath)) { continue; }
        try {
            const raw = fs.readFileSync(mdPath, 'utf-8');
            const { trigger } = parseSkillMd(raw);
            results.push({ name: `${USER_SKILL_PREFIX}/${entry.name}`, trigger });
        } catch { /* skip unreadable files */ }
    }
    return results;
}

export function readUserSkillContent(skillName: string): ProjectSkillContent | null {
    const slashIdx = skillName.indexOf('/');
    if (slashIdx === -1) { return null; }
    if (skillName.slice(0, slashIdx).toLowerCase() !== USER_SKILL_PREFIX) { return null; }
    const bareSkillName = skillName.slice(slashIdx + 1).toLowerCase();
    return readSkillFromDir(USER_SKILLS_DIR, bareSkillName);
}

export function scanProjectSkills(projectRootPath: string): ProjectSkillMeta[] {
    const results: ProjectSkillMeta[] = [];
    const projectName = path.basename(projectRootPath);
    const skillsDir = path.join(projectRootPath, '.agents', 'skills');

    if (!fs.existsSync(skillsDir)) { return results; }
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(skillsDir, { withFileTypes: true }); } catch { return results; }
    for (const entry of entries) {
        if (!entry.isDirectory()) { continue; }
        const mdPath = path.join(skillsDir, entry.name, 'SKILL.md');
        if (!fs.existsSync(mdPath)) { continue; }
        try {
            const raw = fs.readFileSync(mdPath, 'utf-8');
            const { trigger } = parseSkillMd(raw);
            results.push({ name: `${projectName}/${entry.name}`, trigger });
        } catch { /* skip unreadable files */ }
    }
    return results;
}

export function readProjectSkillContent(
    projectRootPath: string,
    skillName: string
): ProjectSkillContent | null {
    const slashIdx = skillName.indexOf('/');
    if (slashIdx === -1) { return null; }

    const bareSkillName = skillName.slice(slashIdx + 1).toLowerCase();
    return readSkillFromDir(path.join(projectRootPath, '.agents', 'skills'), bareSkillName);
}
