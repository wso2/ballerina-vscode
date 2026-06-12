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

import { SkillCommand, SkillCommandTemplate } from '@wso2/ballerina-core';

export interface Skill {
    name: string;
    trigger: string;
    content: string;
    /** Whether the user can toggle this skill on/off. False = always active, no toggle shown. */
    optional?: boolean;
    /** Default enabled state before any user preference is set. */
    default?: boolean;
    commandTemplates?: SkillCommandTemplate[];
    /** Identifies this skill as a specific slash command, used for attachment type resolution. */
    skillCommand?: SkillCommand;
}

export interface ProjectSkillMeta {
    name: string;
    trigger: string;
}
