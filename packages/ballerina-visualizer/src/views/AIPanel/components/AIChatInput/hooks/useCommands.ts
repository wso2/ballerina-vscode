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

import { useState } from "react";
import { getAllCommands, getTags, getTemplateDefinitionsByCommand } from "../../../commandTemplates/utils/utils";
import { CommandTemplates } from "../../../commandTemplates/data/commandTemplates.const";
import { Tag } from "../../../commandTemplates/models/tag.model";
import { matchCommandTemplate } from "../utils/utils"
import { PlaceholderTagMap } from "../../../commandTemplates/data/placeholderTags.const";
import { Command, TemplateId } from "@wso2/ballerina-core";

export enum SuggestionType {
    Command = "command",
    Tag = "tag",
    Template = "template",
}

interface BaseSuggestion {
    text: string;
    type: SuggestionType;
}

export interface CommandSuggestion extends BaseSuggestion {
    type: SuggestionType.Command;
    command: Command;
}

export interface TagSuggestion extends BaseSuggestion {
    type: SuggestionType.Tag;
    rawValue: string;
}

export interface TemplateSuggestion extends BaseSuggestion {
    type: SuggestionType.Template;
    templateId: string;
}

// Discriminated union of all possible suggestions
export type Suggestion = CommandSuggestion | TagSuggestion | TemplateSuggestion;

interface UseCommandsParams {
    commandTemplate: CommandTemplates;
}

type SuggestionHandlerParams = {
    commandTemplate: CommandTemplates;
    isCursorNextToDiv: boolean;
    text: string;
    calledOnSuggestionInsertion: boolean;
    currentCursorPosition: number;
    generalTags: Tag[];
};

export function useCommands({ commandTemplate }: UseCommandsParams) {
    const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([]);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [activeSuggestionValue, setActiveSuggestionValue] = useState<string | null>(null);
    const [activeCommand, setActiveCommand] = useState<Command | null>(null);

    const handleSuggestionOnTextChange = ({
        commandTemplate,
        isCursorNextToDiv,
        text,
        calledOnSuggestionInsertion,
        currentCursorPosition,
        generalTags,
    }: SuggestionHandlerParams) => {
        let filtered: Suggestion[] = [];

        // If the command is selected, we have to show the templates
        if (activeCommand) {
            // If the command is selected, we need to show the templates
            const query = text.toLowerCase();
            const templates = getTemplateDefinitionsByCommand(commandTemplate, activeCommand);

            const templateQuery = query.substring(activeCommand.length);
            if (templateQuery.startsWith(" ")) {
                const filterText = templateQuery.slice(1);
                filtered = templates.filter((template) => {
                    return (template.text.toLowerCase().startsWith(filterText) && template.id !== TemplateId.Wildcard);
                }).map((template) => ({
                    text: template.text,
                    type: SuggestionType.Template,
                    templateId: template.id,
                }));
            } else {
                filtered = [];
            }
        } else {
            // Show the command suggestions if the input starts with a slash (/) and no commands are present
            if (text.startsWith("/")) {
                const query = text.toLowerCase();
                const commands = getAllCommands(commandTemplate);
                filtered = commands.filter((cmd) => cmd.toLowerCase().startsWith(query)).map((cmd) => ({
                    text: cmd,
                    type: SuggestionType.Command,
                    command: cmd,
                }));
            }
        }

        // only load tags if no suggestions have been filtered yet
        if (filtered.length === 0) {
            const valueUpToCursor = text.slice(0, currentCursorPosition);
            const atIndex = valueUpToCursor.lastIndexOf("@");

            if (
                atIndex !== -1 &&
                (atIndex === 0 || valueUpToCursor[atIndex - 1] === " ") &&
                (
                    currentCursorPosition === text.length ||
                    text[currentCursorPosition] === " "
                )
            ) {
                // Helper: get global tag suggestions based on input
                const getGlobalTagSuggestions = (query: string): Suggestion[] =>
                    generalTags
                        .filter(tag => tag.display.toLowerCase().startsWith(query))
                        .map(tag => ({
                            text: tag.display,
                            type: SuggestionType.Tag,
                            rawValue: tag.value,
                        }));

                if (activeCommand) {
                    const query = text.toLowerCase();
                    const templateQuery = query.substring(activeCommand.length + 1);

                    const matchResult = matchCommandTemplate(
                        templateQuery,
                        getTemplateDefinitionsByCommand(commandTemplate, activeCommand)
                    );

                    if (matchResult) {
                        const { match, template } = matchResult;

                        // Extract current word before the cursor
                        let start = currentCursorPosition - 1;
                        while (start > 0 && text[start] !== " ") {
                            start--;
                        }

                        const currentWord = text
                            .substring(start === 0 ? 0 : start + 1, currentCursorPosition)
                            .toLowerCase();

                        // Find which placeholder value matches the current word
                        const matchedKey = Object.entries(match).find(
                            ([_, value]) => value.toLowerCase() === currentWord
                        )?.[0];

                        if (matchedKey) {
                            const placeholder = template.placeholders?.find(p => p.id === matchedKey);
                            const tags = getTags(activeCommand, template.id, placeholder.id)
                            if (tags) {
                                filtered = tags
                                    .filter(tag => tag.display.toLowerCase().startsWith(currentWord))
                                    .map(tag => ({
                                        text: tag.display,
                                        type: SuggestionType.Tag,
                                        rawValue: tag.value,
                                    }));
                            }
                        }
                    } else {
                        // No template match, fall back to global tags based on @ query
                        const query = valueUpToCursor.slice(atIndex).toLowerCase();
                        filtered = getGlobalTagSuggestions(query);
                    }
                } else {
                    // No command active, fall back to global tag suggestions
                    const query = valueUpToCursor.slice(atIndex).toLowerCase();
                    filtered = getGlobalTagSuggestions(query);
                }
            }
        }

        setFilteredSuggestions((calledOnSuggestionInsertion || isCursorNextToDiv) ? [] : filtered);
    }

    const setActiveSuggestion = (newIndex: number, suggestionList: Suggestion[]) => {
        setActiveSuggestionIndex(newIndex);
        setActiveSuggestionValue(suggestionList[newIndex].text || null);
    };

    const completeSuggestionSelection = () => {
        setActiveSuggestionIndex(0);
        setActiveSuggestionValue(null);
        setFilteredSuggestions([]);
    };

    return {
        filteredSuggestions,
        setFilteredSuggestions,
        activeSuggestionIndex,
        setActiveSuggestionIndex,
        activeSuggestionValue,
        setActiveSuggestionValue,
        activeCommand,
        setActiveCommand,
        handleSuggestionOnTextChange,
        setActiveSuggestion,
        completeSuggestionSelection,
    };
}
