/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { Command } from "@wso2/ballerina-core";
import { CommandTemplates } from "../data/commandTemplates.const";
import { placeholderTags } from "../data/placeholderTags.const";
import { PlaceholderDefinition } from "../models/placeholder.model";
import { Tag } from "../models/tag.model";
import { TemplateDefinition } from "../models/template.model";

export const getAllCommands = (templates: CommandTemplates): Command[] => {
    return Object.keys(templates) as Command[];
}

export const getCommand = (input: string): Command | undefined => {
    const values = Object.values(Command);
    return values.includes(input as Command) ? (input as Command) : undefined;
}

export const getTemplateDefinitionsByCommand = (
    templates: CommandTemplates,
    command: Command
): TemplateDefinition[] => {
    const raw = templates[command] as unknown as unknown[];

    return raw.filter(isValidTemplateDefinition);
}

export const getTemplateTextById = (
    templates: CommandTemplates,
    command: Command,
    templateId: string
): string | undefined => {
    const defs = templates[command];
    const found = defs.find((tpl) => tpl.id === templateId);
    return found?.text;
};

export const getTemplateById = (
    templateId: string,
    templateDefs: TemplateDefinition[]
): TemplateDefinition | undefined => {
    return templateDefs.find(template => template.id === templateId);
}

export const upsertTemplate = (commandTemplates: CommandTemplates, command: Command, newTemplate: TemplateDefinition) => {
    const templates = commandTemplates[command] as unknown as TemplateDefinition[];
    const index = templates.findIndex(t => t.id === newTemplate.id);

    if (index !== -1) {
        templates[index] = newTemplate;
    } else {
        templates.push(newTemplate);
    }
}

export const removeTemplate = (
    commandTemplates: CommandTemplates,
    command: Command,
    templateId: string
) => {
    const templates = commandTemplates[command] as unknown as TemplateDefinition[];

    const index = templates.findIndex(t => t.id === templateId);
    if (index !== -1) {
        templates.splice(index, 1);
    }
};

export const injectTags = (
    command: Command,
    templateId: string,
    placeholderId: string,
    tags: Tag[]
): void => {
    const commandMap = placeholderTags[command];
    if (!commandMap || !(templateId in commandMap)) return;

    const templateMap = commandMap[templateId as keyof typeof commandMap];
    if (!templateMap || !(placeholderId in templateMap)) return;

    const placeholderTagsList = templateMap[placeholderId as keyof typeof templateMap] as Tag[];

    for (let i = placeholderTagsList.length - 1; i >= 0; i--) {
        if (placeholderTagsList[i].injected) {
            placeholderTagsList.splice(i, 1);
        }
    }

    const existingValues = new Set(placeholderTagsList.map(tag => tag.value));

    const newTags = tags.filter(tag => !existingValues.has(tag.value));

    placeholderTagsList.push(...newTags);
}

export const getTags = (
    command: Command,
    templateId: string,
    placeholderId: string
): Tag[] | undefined => {
    const commandMap = placeholderTags[command];
    if (!commandMap) return undefined;

    const templateMap = commandMap[templateId as keyof typeof commandMap];
    if (!templateMap) return undefined;

    const tags = templateMap[placeholderId as keyof typeof templateMap] as Tag[] | undefined;
    return tags;
}

// HELPERS
function isValidPlaceholder(placeholder: any): placeholder is PlaceholderDefinition {
    return (
        typeof placeholder === 'object' &&
        typeof placeholder.id === 'string' &&
        typeof placeholder.text === 'string'
    );
}

function isValidTemplateDefinition(template: any): template is TemplateDefinition {
    return (
        typeof template === 'object' &&
        typeof template.id === 'string' &&
        typeof template.text === 'string' &&
        Array.isArray(template.placeholders) &&
        template.placeholders.every(isValidPlaceholder)
    );
}
