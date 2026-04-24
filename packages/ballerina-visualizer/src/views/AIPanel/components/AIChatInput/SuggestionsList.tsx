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

import { RefObject, MouseEvent } from "react";
import styled from "@emotion/styled";
import { Suggestion, SuggestionType } from "./hooks/useCommands";

const SuggestionsListContainer = styled.ul`
    position: absolute;
    bottom: 100%;
    left: 0;
    background-color: var(--vscode-quickInput-background);
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 8px;
    list-style: none;
    padding: 4px;
    margin: 4px 0 0 0;
    max-height: 240px;
    overflow-y: auto;
    width: 100%;
    box-sizing: border-box;
    z-index: 1000;
`;

interface SuggestionItemProps {
    active: boolean;
}

const SuggestionItem = styled.li<SuggestionItemProps>`
    padding: 6px 12px;
    cursor: pointer;
    border-radius: 6px;
    background-color: ${(props: SuggestionItemProps) =>
        props.active ? "var(--vscode-quickInputList-focusBackground)" : "transparent"};
    color: ${(props: SuggestionItemProps) =>
        props.active ? "var(--vscode-quickInputList-focusForeground)" : "var(--vscode-quickInput-foreground)"};

    &:hover {
        background-color: ${(props: SuggestionItemProps) =>
            props.active ? "var(--vscode-quickInputList-focusBackground)" : "var(--vscode-list-hoverBackground)"};
    }
`;

const CommandItem = styled.li<SuggestionItemProps>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    cursor: pointer;
    border-radius: 6px;
    background-color: ${(props: SuggestionItemProps) =>
        props.active ? "var(--vscode-quickInputList-focusBackground)" : "transparent"};
    color: ${(props: SuggestionItemProps) =>
        props.active ? "var(--vscode-quickInputList-focusForeground)" : "var(--vscode-quickInput-foreground)"};

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
`;

const CommandIconBox = styled.span<{ active: boolean }>`
    width: 26px;
    height: 26px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 13px;
    background-color: ${(props: { active: boolean }) =>
        props.active ? "var(--vscode-button-background)" : "var(--vscode-editor-background)"};
    color: ${(props: { active: boolean }) =>
        props.active ? "var(--vscode-button-foreground)" : "var(--vscode-descriptionForeground)"};
`;

const CommandTextGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
`;

const CommandName = styled.span`
    font-size: 13px;
    font-family: var(--vscode-font-family);
`;

const CommandDescription = styled.span`
    font-size: 11px;
    opacity: 0.7;
    font-family: var(--vscode-font-family);
`;

interface SuggestionsListProps {
    suggestions: Suggestion[];
    activeSuggestionIndex: number;
    activeSuggestionRef: RefObject<HTMLLIElement | null>;
    onSuggestionClick: (suggestion: Suggestion) => void;
    onSuggestionMouseDown: (e: MouseEvent) => void;
}

const SuggestionsList: React.FC<SuggestionsListProps> = ({
    suggestions,
    activeSuggestionIndex,
    activeSuggestionRef,
    onSuggestionClick,
    onSuggestionMouseDown,
}) => {
    if (suggestions.length === 0) {
        return null;
    }

    return (
        <SuggestionsListContainer role="listbox">
            {suggestions.map((suggestion, index) => {
                const isActive = index === activeSuggestionIndex;

                if (suggestion.type === SuggestionType.Command) {
                    return (
                        <CommandItem
                            key={suggestion.text + index}
                            ref={isActive ? activeSuggestionRef : null}
                            active={isActive}
                            onClick={() => onSuggestionClick(suggestion)}
                            onMouseDown={onSuggestionMouseDown}
                            role="option"
                            aria-selected={isActive}
                        >
                            <CommandIconBox active={isActive}>
                                <span className={`codicon ${suggestion.icon}`} />
                            </CommandIconBox>
                            <CommandTextGroup>
                                <CommandName>{suggestion.text}</CommandName>
                                {suggestion.description && (
                                    <CommandDescription>{suggestion.description}</CommandDescription>
                                )}
                            </CommandTextGroup>
                        </CommandItem>
                    );
                }

                return (
                    <SuggestionItem
                        key={suggestion.text + index}
                        ref={isActive ? activeSuggestionRef : null}
                        active={isActive}
                        onClick={() => onSuggestionClick(suggestion)}
                        onMouseDown={onSuggestionMouseDown}
                        role="option"
                        aria-selected={isActive}
                    >
                        {suggestion.text}
                    </SuggestionItem>
                );
            })}
        </SuggestionsListContainer>
    );
};

export default SuggestionsList;
