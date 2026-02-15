/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import React, { useState } from "react";
import styled from "@emotion/styled";
import { Button, Icon, ThemeColors } from "@wso2/ui-toolkit";
import { PromptMode } from "@wso2/ballerina-core";

interface RefinementBarProps {
    onRefine: (instructions: string) => void;
    onRetry: () => void;
    onReject: () => void;
    onAccept: () => void;
    isEnhancing: boolean;
    versionCount: number;
    currentVersionIndex: number;
    onVersionNavigate: (index: number) => void;
    promptMode?: PromptMode;
}

const BarContainer = styled.div`
    display: flex;
    flex-direction: column;
    padding: 12px 0 0;
    background-color: var(--vscode-editor-background);
    border-top: 1px solid var(--vscode-panel-border); 
    gap: 6px;
`;

const InputSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const InputWrapper = styled.div`
    display: flex;
    gap: 4px;
    align-items: center;
    position: relative;
`;

const RefineInput = styled.input`
    flex: 1;
    padding: 6px 10px;
    padding-right: 36px; /* Space for send button if absolute, or just padding */
    font-size: 13px;
    font-family: inherit;
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    outline: none;
    height: 32px;
    box-sizing: border-box;

    &::placeholder {
        color: var(--vscode-input-placeholderForeground);
    }
`;

const SendButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border: none;
    border-radius: 4px;
    background-color: ${ThemeColors.PRIMARY}; 
    border: 1px solid var(--vscode-dropdown-border);
    color: ${ThemeColors.ON_PRIMARY};
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover:not(:disabled) {
        opacity: 0.9;
    }

    &:disabled {
        background-color: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        cursor: not-allowed;
    }
`;

const ChipsRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
`;

const Chip = styled.button`
    padding: 4px 8px;
    font-size: 11px;
    border-radius: 4px;
    border: 1px solid var(--vscode-button-secondaryHoverBackground);
    background-color: transparent;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;

    &:hover:not(:disabled) {
        background-color: var(--vscode-button-secondaryHoverBackground);
        color: var(--vscode-foreground);
        border-color: var(--vscode-button-secondaryHoverBackground);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const FooterRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 4px;
    border-top: 1px solid var(--vscode-panel-border);
    margin-top: 4px;
    padding-top: 12px;
`;

const VersionControl = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
`;

const NavButton = styled.button`
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 2px;
    border-radius: 3px;

    &:hover:not(:disabled) {
        background-color: var(--vscode-list-hoverBackground);
        color: var(--vscode-foreground);
    }
    &:disabled {
        opacity: 0.3;
        cursor: default;
    }
`;

const ActionGroup = styled.div`
    display: flex;
    gap: 8px;
`;

type QuickChip = { label: string; instruction: string };

const CHIPS_BY_MODE: Record<PromptMode, QuickChip[]> = {
    [PromptMode.ROLE]: [
        { label: "Shorten", instruction: "Make it shorter and more concise" },
        { label: "Clarify Persona", instruction: "Clarify the persona and identity" },
        { label: "Adjust Tone", instruction: "Adjust the tone" },
    ],
    [PromptMode.INSTRUCTIONS]: [
        { label: "Shorten", instruction: "Make it shorter and more concise" },
        { label: "Elaborate", instruction: "Make it more detailed and elaborate" },
        { label: "Add Steps", instruction: "Add step-by-step reasoning" },
    ],
    [PromptMode.QUERY]: [
        { label: "Be Specific", instruction: "Be more specific about what's expected" },
        { label: "Add Context", instruction: "Add more context to the query" },
        { label: "Simplify", instruction: "Simplify the query" },
    ],
    [PromptMode.DEFAULT]: [
        { label: "Shorten", instruction: "Make it shorter and more concise" },
        { label: "Elaborate", instruction: "Make it more detailed and elaborate" },
        { label: "Add Examples", instruction: "Add concrete examples" },
    ],
};

export const RefinementBar: React.FC<RefinementBarProps> = ({
    onRefine,
    onRetry,
    onReject,
    onAccept,
    isEnhancing,
    versionCount,
    currentVersionIndex,
    onVersionNavigate,
    promptMode = PromptMode.DEFAULT,
}) => {
    const [refineText, setRefineText] = useState("");

    const handleSend = () => {
        const text = refineText.trim();
        if (!text) return;
        setRefineText("");
        onRefine(text);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <BarContainer>
            <InputSection>
                <InputWrapper>
                    <RefineInput
                        type="text"
                        placeholder="Describe how to refine... (e.g., 'Make it more concise')"
                        value={refineText}
                        onChange={(e) => setRefineText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isEnhancing}
                        autoFocus
                    />
                    <SendButton
                        onClick={handleSend}
                        disabled={isEnhancing || !refineText.trim()}
                        title="Send refinement"
                    >
                        <Icon name="bi-send" sx={{ fontSize: "16px", width: "16px", height: "16px" }} />
                    </SendButton>
                </InputWrapper>

                <ChipsRow>
                    {CHIPS_BY_MODE[promptMode].map((chip) => (
                        <Chip
                            key={chip.label}
                            onClick={() => onRefine(chip.instruction)}
                            disabled={isEnhancing}
                        >
                            {chip.label}
                        </Chip>
                    ))}
                </ChipsRow>
            </InputSection>

            <FooterRow>
                <VersionControl>
                    {versionCount > 1 ? (
                        <>
                            <NavButton
                                onClick={() => onVersionNavigate(currentVersionIndex - 1)}
                                disabled={isEnhancing || currentVersionIndex <= 0}
                            >
                                <Icon name="chevron-left" isCodicon sx={{ fontSize: "14px" }} />
                            </NavButton>
                            <span>
                                Version {currentVersionIndex + 1} / {versionCount}
                            </span>
                            <NavButton
                                onClick={() => onVersionNavigate(currentVersionIndex + 1)}
                                disabled={isEnhancing || currentVersionIndex >= versionCount - 1}
                            >
                                <Icon name="chevron-right" isCodicon sx={{ fontSize: "14px" }} />
                            </NavButton>
                        </>
                    ) : (
                        <span>Original Version</span>
                    )}
                </VersionControl>

                <ActionGroup>
                    <Button
                        appearance="secondary"
                        onClick={onReject}
                        disabled={isEnhancing}
                        sx={{ color: 'var(--vscode-descriptionForeground)' }}
                    >
                        Discard
                    </Button>
                    <Button
                        appearance="primary"
                        onClick={onAccept}
                        disabled={isEnhancing}
                    >
                        <Icon name="bi-check" sx={{ fontSize: "16px", marginRight: "4px" }} />
                        Keep This
                    </Button>
                </ActionGroup>
            </FooterRow>
        </BarContainer>
    );
};
