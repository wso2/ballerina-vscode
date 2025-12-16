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

import React from "react";
import styled from "@emotion/styled";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { ThemeColors } from "@wso2/ui-toolkit";

const NavigationContainer = styled.div`
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 24px;
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
    border-right: 1px solid var(--vscode-panel-border);
`;

const ViewCounter = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
`;

const ViewLabel = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const NavigationButtons = styled.div`
    display: flex;
    gap: 8px;
`;

const ActionButtons = styled.div`
    display: flex;
    gap: 8px;
    padding-left: 16px;
    border-left: 1px solid var(--vscode-panel-border);
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
        canGoNext
    } = props;

    console.log('[ReviewNavigation] Props received:', {
        currentIndex,
        totalViews,
        canGoPrevious,
        canGoNext,
        disabledPrevious: !canGoPrevious,
        disabledNext: !canGoNext
    });

    const handlePreviousClick = () => {
        console.log('[ReviewNavigation] Previous button clicked!');
        if (canGoPrevious) {
            onPrevious();
        } else {
            console.log('[ReviewNavigation] Cannot go previous - at first view');
        }
    };

    const handleNextClick = () => {
        console.log('[ReviewNavigation] Next button clicked!');
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
                <VSCodeButton
                    appearance="icon"
                    onClick={handlePreviousClick}
                    // disabled={isPreviousDisabled}
                    title="Previous View"
                    aria-label="Previous View"
                    style={{ opacity: isPreviousDisabled ? 0.4 : 1, cursor: isPreviousDisabled ? 'not-allowed' : 'pointer' }}
                >
                    <span className="codicon codicon-chevron-left"></span>
                </VSCodeButton>
                <VSCodeButton
                    appearance="icon"
                    onClick={handleNextClick}
                    // disabled={isNextDisabled}
                    title="Next View"
                    aria-label="Next View"
                    style={{ opacity: isNextDisabled ? 0.4 : 1, cursor: isNextDisabled ? 'not-allowed' : 'pointer' }}
                >
                    <span className="codicon codicon-chevron-right"></span>
                </VSCodeButton>
            </NavigationButtons>

            <ViewInfo>
                <ViewCounter>
                    {currentIndex + 1} / {totalViews}
                </ViewCounter>
                {currentLabel && <ViewLabel title={currentLabel}>{currentLabel}</ViewLabel>}
            </ViewInfo>

            <ActionButtons>
                <VSCodeButton
                    appearance="secondary"
                    onClick={onReject}
                    title="Reject Changes"
                >
                    <span className="codicon codicon-close"></span>
                    &nbsp;Reject
                </VSCodeButton>
                <VSCodeButton
                    appearance="primary"
                    onClick={onAccept}
                    title="Accept All Changes"
                >
                    <span className="codicon codicon-check"></span>
                    &nbsp;Accept All
                </VSCodeButton>
            </ActionButtons>
        </NavigationContainer>
    );
}


