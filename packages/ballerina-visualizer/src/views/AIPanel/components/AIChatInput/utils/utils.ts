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

import { PlaceholderDefinition } from "../../../commandTemplates/models/placeholder.model";
import { TemplateDefinition } from "../../../commandTemplates/models/template.model";

export const decodeHTML = (str: string): string => {
    const element = document.createElement("div");
    element.innerHTML = str;
    return element.innerText;
};

type TemplateMatchResult = {
    template: TemplateDefinition;
    match: Record<string, string>;
};

export const generateRegexFromTemplateText = (
    templateText: string,
    placeholders: PlaceholderDefinition[] = []
): RegExp => {
    let pattern = templateText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (const { id, text, multiline } of placeholders) {
        const escapedName = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const namedGroup = multiline
            ? `(?<${id}>[\\s\\S]+)`
            : `(?<${id}>[^\\n]+?)`;

        pattern = pattern.replace(escapedName, namedGroup);
    }

    return new RegExp(`^${pattern}$`);
}

export const matchCommandTemplate = (
    input: string,
    templates: TemplateDefinition[]
): TemplateMatchResult | undefined => {
    for (const template of templates) {
        const regex = generateRegexFromTemplateText(template.text, template.placeholders);
        const match = input.match(regex);

        if (match) {
            return {
                template,
                match: match.groups ?? {}
            };
        }
    }

    return undefined;
}

export const getFirstOccurringPlaceholder = (
    text: string,
    placeholderDefs: PlaceholderDefinition[]
): PlaceholderDefinition | null => {
    let firstIndex = Infinity;
    let firstMatch: PlaceholderDefinition | null = null;

    for (const placeholderDef of placeholderDefs) {
        const index = text.indexOf(placeholderDef.text);
        if (index !== -1 && index < firstIndex) {
            firstIndex = index;
            firstMatch = placeholderDef;
        }
    }

    return firstMatch;
};
