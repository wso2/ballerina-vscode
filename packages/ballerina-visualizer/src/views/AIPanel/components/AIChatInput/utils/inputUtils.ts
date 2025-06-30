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

import { Command, TemplateId } from "@wso2/ballerina-core";
import { CommandTemplates } from "../../../commandTemplates/data/commandTemplates.const";
import { getTemplateDefinitionsByCommand } from "../../../commandTemplates/utils/utils";
import { ChatBadgeType } from "../../ChatBadge";
import { SYSTEM_BADGE_SECRET } from "../constants";
import { matchCommandTemplate } from "./utils";

// ==================================
// Represents AIChatInput's General Contents (Badges + Text)
// ==================================
export type Input = TextInput | BadgeInput;

interface TextInput {
    content: string;
}

interface BaseBadgeInput {
    badgeType: ChatBadgeType;
    display: string;
    rawValue?: string;
}

interface CommandBadgeInput extends BaseBadgeInput {
    badgeType: ChatBadgeType.Command;
    command: Command;
}

interface TagBadgeInput extends BaseBadgeInput {
    badgeType: ChatBadgeType.Tag;
}

type BadgeInput = CommandBadgeInput | TagBadgeInput;

// ==================================
// Input Parsing Utils
// ==================================
export interface InputPlainTextResult {
    text: string;
}

export interface InputCommandTemplateResult {
    command: Command;
    templateId: string;
    placeholderValues?: Record<string, string>;
    text?: string;
}

export interface InputParseErrorResult {
    type: 'error';
    message: string;
}

export type InputParseResult =
    | InputPlainTextResult
    | InputCommandTemplateResult
    | InputParseErrorResult;

export function parseInput(inputs: Input[], commandTemplates: CommandTemplates): InputParseResult {
    let command: Command | undefined = undefined;
    let textInput: string = "";

    const [first, ...rest] = inputs;

    if (isCommandBadge(first)) {
        command = first.command;
        textInput = stringifyInputArray(rest);

        if (rest.some(isCommandBadge)) {
            return {
                type: 'error',
                message: "Multiple command badges found. Only one is allowed.",
            };
        }
    } else {
        textInput = stringifyInputArray(inputs);

        return {
            text: textInput,
        };
    }

    // Templates for command
    const templateDefinitions = getTemplateDefinitionsByCommand(commandTemplates, command);
    const isWildcardTemplate = templateDefinitions.some(t => t.id === TemplateId.Wildcard);
    const textInputLeadingTrimmed = textInput.replace(/^\s+/, '');
    const matches = matchCommandTemplate(textInputLeadingTrimmed, templateDefinitions);

    if (!matches) {
        if (isWildcardTemplate) {
            return {
                command,
                templateId: TemplateId.Wildcard,
                text: textInputLeadingTrimmed,
            };
        }

        return {
            type: 'error',
            message: `Input doesn't match any known template for command "${command}".`,
        };
    }

    const { template, match } = matches;
    const expectedPlaceholders = template.placeholders?.map(p => p.id) ?? [];
    const allPresent = expectedPlaceholders.every(id => match[id]?.trim());

    if (!allPresent) {
        return {
            type: 'error',
            message: `Missing required input params: ${expectedPlaceholders
                .filter(id => !match[id]?.trim())
                .join(', ')}`,
        };
    }

    const placeholderValues: Record<string, string> = {};
    for (const id of expectedPlaceholders) {
        placeholderValues[id] = match[id];
    }

    return {
        command,
        templateId: template.id,
        placeholderValues,
    };
}

export const stringifyInputArrayWithBadges = (inputs: Input[]): string => {
    return inputs
        .map((input) => {
            if ('content' in input) {
                return input.content;
            }

            // Common attributes for all system badges
            const baseAttrs = `data-system="true" data-auth="${SYSTEM_BADGE_SECRET}"`;

            if (input.badgeType === ChatBadgeType.Command) {
                return `<badge ${baseAttrs} data-type="command" data-command="${input.command}">${input.display}</badge>`;
            } else if (input.badgeType === ChatBadgeType.Tag) {
                return `<badge ${baseAttrs} data-type="tag">${input.display}</badge>`;
            }

            return '';
        })
        .join('');
};

export const parseBadgeString = (badgeString: string): Input[] => {
    // const badgeString: string = `<badge data-system="true" data-auth="xf42Zkpq71" data-type="command" data-command="/ask">/ask</badge> how to write a concurrent application?`;
    
    const inputs: Input[] = [];
    
    // Regex to match badge elements
    const badgeRegex = /<badge([^>]*)>(.*?)<\/badge>/g;
    let lastIndex = 0;
    let match;
    
    // Find all badges in the string
    while ((match = badgeRegex.exec(badgeString)) !== null) {
        // If there's text before the badge, add it as TextInput
        if (match.index > lastIndex) {
            const textBefore = badgeString.substring(lastIndex, match.index).trim();
            if (textBefore) {
                inputs.push({ content: textBefore });
            }
        }
        
        // Extract badge attributes and content
        const attributesStr = match[1];
        const display = match[2];
        
        // Parse attributes
        const attributes: Record<string, string> = {};
        const attrRegex = /data-([a-z-]+)="([^"]*)"/g;
        let attrMatch;
        
        while ((attrMatch = attrRegex.exec(attributesStr)) !== null) {
            const key = attrMatch[1];
            const value = attrMatch[2];
            attributes[key] = value;
        }
        
        // Check if this is a valid system badge
        if (attributes.system === 'true' && attributes.auth === SYSTEM_BADGE_SECRET) {
            if (attributes.type === 'command' && attributes.command) {
                // Create CommandBadgeInput
                inputs.push({
                    badgeType: ChatBadgeType.Command,
                    display,
                    command: attributes.command as Command,
                });
            } else if (attributes.type === 'tag') {
                // Create TagBadgeInput
                inputs.push({
                    badgeType: ChatBadgeType.Tag,
                    display,
                });
            }
        }
        
        lastIndex = match.index + match[0].length;
    }
    
    // Add any remaining text after the last badge as TextInput
    if (lastIndex < badgeString.length) {
        const remainingText = badgeString.substring(lastIndex).trim();
        if (remainingText) {
            inputs.push({ content: remainingText });
        }
    }
    
    return inputs;
}

const isCommandBadge = (input: Input): input is CommandBadgeInput => {
    return (
        'badgeType' in input &&
        input.badgeType === ChatBadgeType.Command &&
        'command' in input
    );
}

const stringifyInputArray = (inputs: Input[]): string => {
    return inputs
        .map(input => {
            if ('content' in input) {
                return input.content;
            } else if (input.badgeType === ChatBadgeType.Tag) {
                return input.rawValue ?? input.display;
            }
            return '';
        })
        .join('');
};
