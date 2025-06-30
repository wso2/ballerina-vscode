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
import { Suggestion } from "./hooks/useCommands";

/**
 * Styles for the overall suggestions list container.
 */
const SuggestionsListContainer = styled.ul`
    position: absolute;
    bottom: 100%;
    left: 0;
    background-color: var(--vscode-dropdown-listBackground);
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 4px;
    list-style: none;
    padding: 0;
    margin: 4px 0 0 0;
    max-height: 150px;
    overflow-y: auto;
    width: 100%;
    box-sizing: border-box;
    z-index: 1000;
`;

/**
 * Props to indicate whether this suggestion is currently active/selected.
 */
interface SuggestionItemProps {
    active: boolean;
}

const SuggestionItem = styled.li<SuggestionItemProps>`
    padding: 6px 12px;
    cursor: pointer;
    background-color: ${(props: SuggestionItemProps) =>
        props.active ? "var(--vscode-editorActionList-focusBackground)" : "var(--vscode-editorActionList-background)"};
    color: ${(props: SuggestionItemProps) =>
        props.active ? "var(--vscode-editorActionList-focusForeground)" : "var(--vscode-editorActionList-foreground)"};

    &:hover {
        background-color: ${(props: SuggestionItemProps) =>
            props.active ? "var(--vscode-editorActionList-focusBackground)" : "var(--vscode-list-hoverBackground)"};
    }
`;

interface SuggestionsListProps {
    suggestions: Suggestion[];
    activeSuggestionIndex: number;
    activeSuggestionRef: RefObject<HTMLLIElement | null>;
    onSuggestionClick: (suggestion: Suggestion) => void;
    onSuggestionMouseDown: (e: MouseEvent) => void;
}

/**
 * A small presentational component for rendering suggestions below the input.
 */
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
