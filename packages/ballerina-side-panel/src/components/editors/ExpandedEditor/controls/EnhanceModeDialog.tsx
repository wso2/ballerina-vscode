/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState, useEffect } from "react";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { TextArea, Button, Typography, ThemeColors, Icon } from "@wso2/ui-toolkit";
import { PromptMode } from "@wso2/ballerina-core";

interface EnhanceModeDialogProps {
    isOpen: boolean;
    isLoading?: boolean;
    onEnhance: (mode: PromptMode, instructions?: string) => void;
    onClose: () => void;
    promptMode?: PromptMode;
}

const fadeIn = keyframes`
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
`;

const slideUp = keyframes`
    from {
        opacity: 0;
        transform: translateY(15px) scale(0.98);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
`;

const PopupContainer = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 30000;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: none;
`;

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: color-mix(in srgb, ${ThemeColors.SECONDARY_CONTAINER} 80%, transparent);
    z-index: 29999;
    animation: ${fadeIn} 0.2s ease-out forwards;
    will-change: opacity;
`;

const PopupBox = styled.div`
    width: 600px;
    max-width: 90vw;
    max-height: 90vh;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 3px;
    background-color: var(--vscode-editor-background);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
    z-index: 30001;
    font-family: var(--font-family);
    pointer-events: auto;
    animation: ${slideUp} 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    will-change: transform, opacity;
`;

const PopupHeader = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 22px 24px;
    background-color: var(--vscode-editor-background);
    border-bottom: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    font-family: GilmerRegular;
`;

const PopupContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px 24px;
    overflow-y: auto;
    flex: 1;
`;

const SectionTitle = styled.div`
    font-size: 13px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin-bottom: 6px;
`;

const DialogActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    padding: 16px 24px;
    background-color: var(--vscode-editor-background);
    border-top: 1px solid ${ThemeColors.OUTLINE_VARIANT};
`;

const DisclaimerText = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    opacity: 0.7;
`;

const SuggestionsSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SuggestionsLabel = styled.div`
    font-size: 11px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    opacity: 0.8;
`;

const SuggestionPills = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const SuggestionPill = styled.button<{ isSelected?: boolean }>`
    padding: 4px 10px;
    font-size: 11px;
    border-radius: 6px;
    border: 1px solid ${props => props.isSelected ? ThemeColors.PRIMARY : 'var(--vscode-panel-border)'};
    background-color: ${props => props.isSelected
        ? `color-mix(in srgb, ${ThemeColors.PRIMARY} 14%, transparent)`
        : ThemeColors.SURFACE};
    color: ${props => props.isSelected ? ThemeColors.PRIMARY : ThemeColors.ON_SURFACE};
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 4px;

    &:hover:not(:disabled) {
        background-color: ${props => props.isSelected
        ? `color-mix(in srgb, ${ThemeColors.PRIMARY} 20%, transparent)`
        : 'var(--vscode-list-hoverBackground)'};
        border-color: ${ThemeColors.PRIMARY};
    }

    &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }
`;

const DescriptionText = styled.div`
    font-size: 13px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin-bottom: 4px;
`;

const SUGGESTIONS_BY_MODE: Record<PromptMode, string[]> = {
    [PromptMode.ROLE]: [
        "Make it more concise",
        "Clarify the persona",
        "Add domain expertise",
        "Adjust the tone"
    ],
    [PromptMode.INSTRUCTIONS]: [
        "Make it shorter",
        "Make it more detailed",
        "Add step-by-step reasoning",
        "Define output format",
        "Add error handling",
        "Fix vague instructions"
    ],
    [PromptMode.QUERY]: [
        "Be more specific",
        "Add context",
        "Break into sub-questions",
        "Define expected output"
    ],
    [PromptMode.DEFAULT]: [
        "Make it shorter",
        "Make it more detailed",
        "Add examples",
        "Add step-by-step reasoning",
        "Define output format",
        "Fix vague instructions"
    ]
};

export const EnhanceModeDialog: React.FC<EnhanceModeDialogProps> = ({
    isOpen,
    isLoading = false,
    onEnhance,
    onClose,
    promptMode = PromptMode.DEFAULT
}) => {
    const [customInstructions, setCustomInstructions] = useState("");
    const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
    const [selectedMode, setSelectedMode] = useState<PromptMode>(promptMode);

    // Reset state when dialog opens
    useEffect(() => {
        if (isOpen) {
            setCustomInstructions("");
            setSelectedSuggestions(new Set());
            setSelectedMode(promptMode);
        }
    }, [isOpen, promptMode]);

    const handleEnhanceTrigger = () => {
        const parts: string[] = [];
        if (selectedSuggestions.size > 0) {
            parts.push([...selectedSuggestions].join(". "));
        }
        if (customInstructions.trim()) {
            parts.push(customInstructions.trim());
        }
        const combined = parts.join(". ") || undefined;
        onEnhance(selectedMode, combined);
    };

    const handleClose = () => {
        if (!isLoading) {
            setCustomInstructions("");
            setSelectedSuggestions(new Set());
            onClose();
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        if (isLoading) return;
        setSelectedSuggestions(prev => {
            const next = new Set(prev);
            if (next.has(suggestion)) {
                next.delete(suggestion);
            } else {
                next.add(suggestion);
            }
            return next;
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape" && !isLoading) {
            e.preventDefault();
            handleClose();
        } else if (e.key === "Enter" && e.ctrlKey && !isLoading) {
            e.preventDefault();
            handleEnhanceTrigger();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <Overlay onClick={handleClose} />
            <PopupContainer>
                <PopupBox onKeyDown={handleKeyDown} tabIndex={-1} autoFocus>
                    <PopupHeader>
                        <Typography variant="h3" sx={{ margin: 0, gap: "8px", display: "flex", alignItems: "center" }}>
                            <Icon name="wand-magic-sparkles-solid" sx={{ width: "14px", height: "14px", fontSize: "14px" }} />
                            Enhance Prompt with AI
                        </Typography>
                        <Icon
                            name="bi-close"
                            onClick={handleClose}
                            sx={{
                                fontSize: '16px',
                                width: '16px',
                                height: '16px',
                                color: ThemeColors.ON_SURFACE_VARIANT,
                                opacity: isLoading ? 0.5 : 1
                            }}
                        />
                    </PopupHeader>

                    <PopupContent>
                        <DescriptionText>
                            Let AI polish and refine your prompt. Select any quick options below, or add your own instructions.
                        </DescriptionText>

                        <SuggestionsSection>
                            <SuggestionsLabel>Quick options</SuggestionsLabel>
                            <SuggestionPills>
                                {SUGGESTIONS_BY_MODE[selectedMode].map((suggestion) => (
                                    <SuggestionPill
                                        key={suggestion}
                                        isSelected={selectedSuggestions.has(suggestion)}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        disabled={isLoading}
                                    >
                                        {selectedSuggestions.has(suggestion) && (
                                            <Icon name="bi-check" sx={{ fontSize: '12px', width: '12px', height: '12px' }} />
                                        )}
                                        {suggestion}
                                    </SuggestionPill>
                                ))}
                            </SuggestionPills>
                        </SuggestionsSection>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <SectionTitle>
                                <span style={{ fontWeight: 600 }}>Custom instructions</span> (Optional)
                            </SectionTitle>
                            <TextArea
                                placeholder="Describe how you'd like the prompt improved..."
                                value={customInstructions}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomInstructions(e.target.value)}
                                rows={3}
                                disabled={isLoading}
                                style={{ fontSize: '13px', fontFamily: 'inherit', width: '100%' }}
                            />
                        </div>

                        <DisclaimerText>
                            <span>AI-generated enhancements may differ from your original. Review before accepting.</span>
                        </DisclaimerText>
                    </PopupContent>

                    <DialogActions>
                        <Button appearance="secondary" onClick={handleClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button appearance="primary" onClick={handleEnhanceTrigger} disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <span style={{ marginLeft: '8px' }}>Optimizing...</span>
                                </>
                            ) : (
                                "Enhance"
                            )}
                        </Button>
                    </DialogActions>
                </PopupBox>
            </PopupContainer>
        </>
    );
};
