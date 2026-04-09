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

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { Codicon, Icon } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { BetaSVG } from "../../views/Connectors/Marketplace/BetaSVG";
import { UndoRedoGroup } from "../UndoRedoGroup";
import { MACHINE_VIEW } from "@wso2/ballerina-core";

const TitleBarContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px;
    min-height: 56px;
    background-color: var(--vscode-editorWidget-background);
    z-index: 1000;
`;

const LeftContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    width: 100%;
`;

const RightContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const TitleSection = styled.div`
    display: flex;
    align-items: baseline;
    gap: 12px;
`;

const Title = styled.h2`
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--vscode-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: fit-content;
`;

const SubTitle = styled.span`
    font-size: 14px;
    color: var(--vscode-descriptionForeground);
`;

const ActionsContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const IconButton = styled.div`
    padding: 4px;
    cursor: pointer;
    border-radius: 4px;

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }

    & > div:first-child {
        width: 20px;
        height: 20px;
        font-size: 20px;
    }
`;

const BetaSVGWrapper = styled.span`
    display: inline-flex;
    align-items: center;
    margin-top: 2px;
`;

const EditableTitleWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    outline: none;

    &:is(:hover, :focus-visible) .edit-title-icon-wrapper {
        opacity: 1;
        max-width: 28px;
    }
`;

const EditTitleIconWrapper = styled.div`
    opacity: 0;
    max-width: 0;
    overflow: hidden;
    transition: opacity 0.2s, max-width 0.2s;
    display: flex;
    align-items: center;
`;

const TitleInput = styled.input<{ $hasError?: boolean }>`
    font-size: 20px;
    font-weight: 600;
    margin: 0;
    background: transparent;
    border: none;
    border-bottom: 2px solid ${({ $hasError }: { $hasError?: boolean }) => $hasError
        ? 'var(--vscode-inputValidation-errorBorder)'
        : 'var(--vscode-focusBorder)'};
    color: var(--vscode-foreground);
    outline: none;
    padding: 0;
    font-family: inherit;
    min-width: 120px;
    white-space: nowrap;
`;

const TitleValidationMessage = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.72rem;
    color: var(--vscode-inputValidation-errorForeground, var(--vscode-errorForeground));
    background: var(--vscode-inputValidation-errorBackground, transparent);
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    border-radius: 2px;
    padding: 2px 6px;
    margin-top: 2px;
    position: absolute;
    top: 100%;
    left: 0;
    max-width: 320px;
    white-space: normal;
    word-break: break-word;
    z-index: 10;
`;

interface TitleBarProps {
    title: string;
    subtitle?: string;
    subtitleElement?: ReactNode;
    actions?: ReactNode;
    hideBack?: boolean;
    hideUndoRedo?: boolean;
    onBack?: () => void; // Override back functionality
    isBetaFeature?: boolean;
    onTitleEdit?: (newTitle: string) => Promise<void>;
    validateTitle?: (value: string) => string;
}

export function TitleBar(props: TitleBarProps) {
    const { title, subtitle, subtitleElement, actions, hideBack, hideUndoRedo, onBack, isBetaFeature, onTitleEdit, validateTitle } = props;
    const { rpcClient } = useRpcContext();

    const [isDiagramView, setIsDiagramView] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInputValue, setTitleInputValue] = useState("");
    const [titleError, setTitleError] = useState("");
    const titleInputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        rpcClient.getVisualizerLocation().then((res) => {
            if (res.view === MACHINE_VIEW.BIDiagram) {
                setIsDiagramView(true);
            } else {
                setIsDiagramView(false);
            }
        });
    }, [title]);

    const startEditingTitle = useCallback(() => {
        setTitleInputValue(title);
        setTitleError("");
        setIsEditingTitle(true);
        setTimeout(() => { titleInputRef.current?.select(); }, 0);
    }, [title]);

    const commitTitleEdit = useCallback(async () => {
        const trimmed = titleInputValue.trim();
        const liveError = validateTitle ? validateTitle(trimmed) : "";
        if (!trimmed || liveError) {
            setTitleError("");
            setIsEditingTitle(false);
            setTimeout(() => { wrapperRef.current?.focus(); }, 0);
            return;
        }
        if (trimmed === title) {
            setIsEditingTitle(false);
            setTimeout(() => { wrapperRef.current?.focus(); }, 0);
            return;
        }
        // Guard against onTitleEdit being absent at call-time (e.g. prop removed between renders).
        if (!onTitleEdit) { setIsEditingTitle(false); setTimeout(() => { wrapperRef.current?.focus(); }, 0); return; }
        try {
            await onTitleEdit(trimmed);
            setIsEditingTitle(false);
            setTimeout(() => { wrapperRef.current?.focus(); }, 0);
        } catch {
            // Keep edit mode open so the user can correct or cancel — do not silently discard their input.
        }
    }, [titleInputValue, title, onTitleEdit, validateTitle]);

    const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
        } else if (e.key === "Escape") {
            setTitleError("");
            setIsEditingTitle(false);
            setTimeout(() => { wrapperRef.current?.focus(); }, 0);
        }
    }, []);

    const handleBackButtonClick = () => {
        if (onBack) {
            onBack();
        } else {
            rpcClient.getVisualizerRpcClient().goBack();
        }
    };

    return (
        <TitleBarContainer>
            <LeftContainer>
                {!hideBack && (
                    <IconButton data-testid="back-button" onClick={handleBackButtonClick}>
                        <Icon name="bi-arrow-back" iconSx={{ fontSize: "20px", color: "var(--vscode-foreground)" }} />
                    </IconButton>
                )}
                <TitleSection>
                    {onTitleEdit ? (
                        <div style={{ position: "relative" }}>
                            {isEditingTitle ? (
                                <>
                                    <TitleInput
                                        ref={titleInputRef}
                                        value={titleInputValue}
                                        size={Math.max(titleInputValue.length, 8)}
                                        $hasError={!!titleError}
                                        aria-label="Edit name"
                                        onChange={(e) => {
                                            setTitleInputValue(e.target.value);
                                            setTitleError(validateTitle ? validateTitle(e.target.value) : "");
                                        }}
                                        onKeyDown={handleTitleKeyDown}
                                        onBlur={commitTitleEdit}
                                        autoFocus
                                    />
                                    {titleError && (
                                        <TitleValidationMessage>
                                            <Codicon name="info" sx={{ fontSize: '12px', flexShrink: 0 }} />
                                            {titleError}
                                        </TitleValidationMessage>
                                    )}
                                </>
                            ) : (
                                <EditableTitleWrapper
                                    ref={wrapperRef}
                                    role="button"
                                    tabIndex={0}
                                    onClick={startEditingTitle}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            startEditingTitle();
                                        }
                                    }}
                                    title="Click to edit name"
                                    aria-label="Edit name"
                                >
                                    <Title>{title}</Title>
                                    <EditTitleIconWrapper className="edit-title-icon-wrapper">
                                        <Codicon name="edit" sx={{ color: 'var(--vscode-descriptionForeground)', fontSize: '14px', width: '16px' }} />
                                    </EditTitleIconWrapper>
                                </EditableTitleWrapper>
                            )}
                        </div>
                    ) : (
                        <Title>{title}</Title>
                    )}
                    {subtitle && <SubTitle>{subtitle}</SubTitle>}
                    {subtitleElement && subtitleElement}
                </TitleSection>
                {isBetaFeature && (
                    <BetaSVGWrapper>
                        <BetaSVG width={45} height={18} />
                    </BetaSVGWrapper>
                )}
            </LeftContainer>
            <RightContainer>
                {(!hideUndoRedo && (actions || isDiagramView)) && <UndoRedoGroup key={Date.now()} />}
                {actions && <ActionsContainer>{actions}</ActionsContainer>}
            </RightContainer>
        </TitleBarContainer>
    );
}
