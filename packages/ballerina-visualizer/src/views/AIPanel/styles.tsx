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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */

import styled from "@emotion/styled";

export const FlexRow = styled.div({
    display: "flex",
    flexDirection: "row",
});

export const AIChatView = styled.div({
    display: "flex",
    flexDirection: "column",
    height: "100%",
});

export const Header = styled.header({
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 10px",
    gap: "10px",
    borderBottom: "1px solid var(--vscode-panel-border)",
});

export const HeaderButtons = styled.div({
    display: "flex",
    justifyContent: "flex-end",
    gap: "4px",
    marginRight: "10px",
});

export const TodoPanel = styled.div`
    border-bottom: 1px solid rgba(128, 128, 128, 0.3);
    background-color: var(--vscode-editor-background);
    padding: 8px 12px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
`;

export const Main = styled.main({
    flex: 1,
    flexDirection: "column",
    overflowY: "auto",
});

export const ChatMessage = styled.div({
    padding: "8px 20px",
});

export const TurnGroup = styled.div``;

export const AuthProviderChip = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-font-family);
`;

export const UsageBadge = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    font-family: var(--vscode-font-family);
    white-space: nowrap;
`;

export const ApprovalOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    pointer-events: all;
`;

export const OverlayMessage = styled.div`
    color: var(--vscode-foreground);
    font-size: 14px;
    padding: 16px 24px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 12px;
`;

export const OverlayCloseButton = styled.button`
    background: transparent;
    border: none;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    &:hover {
        color: var(--vscode-foreground);
        background: var(--vscode-toolbar-hoverBackground);
    }
`;
