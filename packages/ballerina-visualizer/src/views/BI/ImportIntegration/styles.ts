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

import styled from "@emotion/styled";
import { Button, Codicon, Typography } from "@wso2/ui-toolkit";

// Main container styles
export const FormContainer = styled.div`
    max-width: 660px;
    margin: 80px 120px;
    overflow-y: auto;
    max-height: calc(100vh - 100px);

    /* Ensure dropdowns have proper stacking context */
    position: relative;
    z-index: 1;
    padding-bottom: 40px;
`;

export const TitleContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 32px;
`;

export const IconButton = styled.div`
    cursor: pointer;
    border-radius: 4px;
    width: 20px;
    height: 20px;
    font-size: 20px;
    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }
`;

export const ButtonWrapper = styled.div`
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
`;

// Form-specific styles
export const IntegrationCardGrid = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12px;
    margin: 20px 0;
`;

export const ParametersSection = styled.div`
    margin: 20px 0;
`;

export const PathText = styled.div`
    font-family: var(--vscode-editor-font-family);
    padding: 4px 0;
    opacity: 0.8;
`;

export const ParameterItem = styled.div`
    margin-bottom: 12px;
    &:last-child {
        margin-bottom: 0;
    }
`;

// Configure Project Form styles
export const InputPreviewWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 20px 0;
`;

export const PreviewText = styled(Typography)`
    color: var(--vscode-sideBarTitle-foreground);
    opacity: 0.5;
    font-family: var(--vscode-editor-font-family, "Monaco", "Menlo", "Ubuntu Mono", monospace);
    word-break: break-all;
    min-width: 100px;
    display: flex;
    align-items: center;
    line-height: 1;
`;

export const PreviewIcon = styled(Codicon)`
    display: flex;
    align-items: center;
`;

export const PreviewContainer = styled.div`
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    padding: 8px 12px;
    display: inline-flex;
    align-items: center;
    width: fit-content;
    height: 28px;
    gap: 8px;
    background-color: var(--vscode-editor-background);
    * {
        cursor: default !important;
    }
`;

export const LocationSelectorWrapper = styled.div`
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

// Migration Progress styles
export const ProgressContainer = styled.div`
    max-width: 660px;
    margin: 80px 120px;
    display: flex;
    flex-direction: column;
    gap: 40px;
    max-height: 100vh;
    overflow-y: auto;
    padding-bottom: 20px;
`;

export const StepWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
    align-items: flex-start;
    margin-top: 20px;
`;

export const LogsContainer = styled.div`
    border: 1px solid var(--vscode-widget-border);
    border-radius: 4px;
    padding: 16px;
    background-color: var(--vscode-editor-background);
    max-height: 300px;
    overflow-y: auto;
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
`;

export const LogEntry = styled.div`
    color: var(--vscode-foreground);
    margin-bottom: 4px;
    white-space: pre-wrap;
    word-break: break-word;
`;

export const CollapsibleHeader = styled.div`
    display: flex;
    cursor: pointer;
    gap: 8px;
    align-items: center;
    &:hover {
        opacity: 0.8;
    }
`;

export const CardAction = styled.div`
    margin-left: auto;
`;

// Coverage Summary styles
export const CoverageContainer = styled.div`
    border: 1px solid var(--vscode-widget-border);
    border-radius: 4px;
    padding: 24px;
    background-color: var(--vscode-editor-background);
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
`;

export const CoverageHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    justify-content: space-between;
`;

export const CoveragePercentage = styled.div<{ coverageColor: string }>`
    font-size: 48px;
    font-weight: bold;
    color: ${(props: { coverageColor: string }) => props.coverageColor};
`;

export const CoverageLabel = styled.div`
    font-size: 14px;
    color: var(--vscode-descriptionForeground);
`;

export const CoverageProgressBar = styled.div`
    width: 100%;
    height: 8px;
    background-color: var(--vscode-editorWidget-border);
    border-radius: 4px;
    overflow: hidden;
`;

export const CoverageProgressFill = styled.div<{ percentage: number; coverageColor: string }>`
    height: 100%;
    width: ${(props: { percentage: number; coverageColor: string }) => props.percentage}%;
    background-color: ${(props: { percentage: number; coverageColor: string }) => props.coverageColor};
    transition: width 0.3s ease;
`;

export const CoverageStats = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const CoverageStat = styled.div`
    display: flex;
    justify-content: space-between;
    font-size: 14px;
`;

export const CoverageBadge = styled.div`
    background-color: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    align-self: flex-start;
`;

// Estimation Table styles
export const EstimationTableContainer = styled.div`
    border: 1px solid var(--vscode-widget-border);
    border-radius: 4px;
    padding: 24px;
    background-color: var(--vscode-editor-background);
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
`;

export const ReportButtonsContainer = styled.div`
    display: flex;
    gap: 12px;
    align-self: flex-start;
    margin-top: 8px;
`;

export const ViewReportButton = styled(Button)``;

export const SaveReportButton = styled(Button)``;

export const NextButtonWrapper = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
    width: 100%;
`;

// ImportIntegrationForm specific styles
export const FolderSelectionContainer = styled.div`
    display: flex;
    justify-content: flex-start;
    margin: 16px 0;
`;

export const SelectedFolderContainer = styled.div`
    margin: 16px 0;
`;

export const SelectedFolderDisplay = styled.div`
    padding: 12px 16px;
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

export const FolderPathText = styled.span`
    font-family: var(--vscode-editor-font-family);
`;

export const StepContainer = styled.div`
    margin-top: 20px;
`;
