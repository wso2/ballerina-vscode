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

import React, { useState } from "react";
import styled from "@emotion/styled";
import { Button } from "@wso2/ui-toolkit";

const NavigationContainer = styled.div`
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    font-family: var(--vscode-font-family);
`;

const ViewInfo = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 0 16px;
`;

const ViewCounter = styled.div`
    font-size: 14px;
    font-weight: 600;
    text-align: center;
    min-width: 60px;
    color: var(--vscode-foreground);
`;

const PackageLabel = styled.div`
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-statusBarItem-prominentForeground);
    background: var(--vscode-statusBarItem-prominentBackground);
    padding: 2px 8px;
    border-radius: 2px;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const ViewLabel = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const NavigationButtons = styled.div`
    display: flex;
    gap: 8px;
`;

const VersionToggle = styled.div`
    display: flex;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    overflow: hidden;
`;

const ToggleSegment = styled.button<{ active: boolean; disabled?: boolean }>`
    background: ${(props: { active: boolean }) =>
        props.active ? "var(--vscode-button-background)" : "transparent"};
    color: ${(props: { active: boolean }) =>
        props.active ? "var(--vscode-button-foreground)" : "var(--vscode-foreground)"};
    border: none;
    padding: 4px 12px;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    cursor: ${(props: { disabled?: boolean }) => (props.disabled ? "default" : "pointer")};
    opacity: ${(props: { disabled?: boolean }) => (props.disabled ? 0.5 : 1)};
    transition: background 0.15s, color 0.15s;

    &:hover:not(:disabled) {
        background: ${(props: { active: boolean }) =>
            props.active
                ? "var(--vscode-button-hoverBackground)"
                : "var(--vscode-toolbar-hoverBackground)"};
    }
`;

const ActionButtons = styled.div`
    display: flex;
    gap: 8px;
    padding-left: 16px;
    border-left: 1px solid var(--vscode-panel-border);
    min-width: 158px;
`;

interface ReviewNavigationProps {
    currentIndex: number;
    totalViews: number;
    currentLabel?: string;
    onPrevious: () => void;
    onNext: () => void;
    onAccept: () => void;
    onReject: () => void;
    canGoPrevious: boolean;
    canGoNext: boolean;
    showOldVersion: boolean;
    onToggleVersion: () => void;
    canToggleVersion: boolean;
}

export function ReviewNavigation(props: ReviewNavigationProps): JSX.Element {
    const {
        currentIndex,
        totalViews,
        currentLabel,
        onPrevious,
        onNext,
        onAccept,
        onReject,
        canGoPrevious,
        canGoNext,
        showOldVersion,
        onToggleVersion,
        canToggleVersion
    } = props;

    const [isProcessing, setIsProcessing] = useState(false);

    const handleAccept = async () => {
        setIsProcessing(true);
        await onAccept();
        // setIsProcessing(false);
    };

    const handleReject = async () => {
        setIsProcessing(true);
        await onReject();
        // setIsProcessing(false);
    };

    const handlePreviousClick = () => {
        if (canGoPrevious) {
            onPrevious();
        } else {
            console.log('[ReviewNavigation] Cannot go previous - at first view');
        }
    };

    const handleNextClick = () => {
        if (canGoNext) {
            onNext();
        } else {
            console.log('[ReviewNavigation] Cannot go next - at last view');
        }
    };

    // Convert to explicit boolean to avoid VSCode button disabled prop issues
    const isPreviousDisabled = canGoPrevious === false;
    const isNextDisabled = canGoNext === false;

    return (
        <NavigationContainer>
            <NavigationButtons>
                <Button
                    appearance="icon"
                    onClick={handlePreviousClick}
                    disabled={isPreviousDisabled}
                    tooltip="Previous View"
                    aria-label="Previous View"
                >
                    <span className="codicon codicon-chevron-left"></span>
                </Button>
                <Button
                    appearance="icon"
                    onClick={handleNextClick}
                    disabled={isNextDisabled}
                    tooltip="Next View"
                    aria-label="Next View"
                >
                    <span className="codicon codicon-chevron-right"></span>
                </Button>
            </NavigationButtons>

            <ViewInfo>
                <ViewCounter>
                    {currentIndex + 1} / {totalViews}
                </ViewCounter>
                {currentLabel && <ViewLabel title={currentLabel}>{currentLabel}</ViewLabel>}
            </ViewInfo>

            <VersionToggle>
                <ToggleSegment
                    active={!showOldVersion}
                    disabled={!canToggleVersion}
                    onClick={() => { if (canToggleVersion && showOldVersion) { onToggleVersion(); } }}
                    title="Show new version"
                >
                    New
                </ToggleSegment>
                <ToggleSegment
                    active={showOldVersion}
                    disabled={!canToggleVersion}
                    onClick={() => { if (canToggleVersion && !showOldVersion) { onToggleVersion(); } }}
                    title="Show old version"
                >
                    Old
                </ToggleSegment>
            </VersionToggle>

            <ActionButtons>
                <Button
                    appearance="secondary"
                    onClick={handleReject}
                    tooltip="Discard All Changes"
                    disabled={isProcessing}
                >
                    Discard
                </Button>
                <Button
                    appearance="primary"
                    onClick={handleAccept}
                    tooltip="Keep All Changes"
                    disabled={isProcessing}
                >
                    Keep
                </Button>
            </ActionButtons>
        </NavigationContainer>
    );
}


