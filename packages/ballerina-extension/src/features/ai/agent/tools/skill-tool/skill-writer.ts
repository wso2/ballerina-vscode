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

export const GLOBAL_SKILLS_CONFIG_PATH = path.join(
    os.homedir(), '.ballerina', 'copilot', 'skills.config.json'
);

export interface SkillsConfig {
    disabledSkills: string[];
}

export function getSkillsConfig(configPath: string): SkillsConfig {
    try {
        if (fs.existsSync(configPath)) {
            const raw = fs.readFileSync(configPath, 'utf-8');
            const parsed = JSON.parse(raw);
            return { disabledSkills: Array.isArray(parsed.disabledSkills) ? parsed.disabledSkills : [] };
        }
    } catch { /* fall through to default */ }
    return { disabledSkills: [] };
}

export function setSkillEnabled(configPath: string, skillId: string, enabled: boolean): void {
    const config = getSkillsConfig(configPath);
    if (enabled) {
        config.disabledSkills = config.disabledSkills.filter(id => id !== skillId);
    } else {
        if (!config.disabledSkills.includes(skillId)) {
            config.disabledSkills.push(skillId);
        }
    }
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

function buildSkillMd(name: string, trigger: string, body?: string): string {
    const frontmatter = `---\nname: ${name}\ndescription: ${trigger}\n---`;
    return body && body.trim() ? `${frontmatter}\n\n${body.trim()}\n` : `${frontmatter}\n`;
}

export function writeUserSkill(name: string, trigger: string, body?: string): void {
    const skillDir = path.join(os.homedir(), '.ballerina', 'copilot', 'skills', name);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), buildSkillMd(name, trigger, body), 'utf-8');
}

export function writeCustomSkill(
    projectRoot: string,
    packagePath: string | null,
    name: string,
    trigger: string,
    body?: string
): void {
    const baseDir = packagePath
        ? path.join(projectRoot, packagePath, 'skills', name)
        : path.join(projectRoot, 'skills', name);
    fs.mkdirSync(baseDir, { recursive: true });
    fs.writeFileSync(path.join(baseDir, 'SKILL.md'), buildSkillMd(name, trigger, body), 'utf-8');
}

export function deleteUserSkill(name: string): void {
    const skillDir = path.join(os.homedir(), '.ballerina', 'copilot', 'skills', name);
    if (fs.existsSync(skillDir)) {
        fs.rmSync(skillDir, { recursive: true, force: true });
    }
}

export function deleteCustomSkill(
    projectRoot: string,
    packagePath: string | null,
    name: string
): void {
    const skillDir = packagePath
        ? path.join(projectRoot, packagePath, 'skills', name)
        : path.join(projectRoot, 'skills', name);
    if (fs.existsSync(skillDir)) {
        fs.rmSync(skillDir, { recursive: true, force: true });
    }
}
