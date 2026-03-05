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
    padding: "10px",
    gap: "10px",
});

export const HeaderButtons = styled.div({
    display: "flex",
    justifyContent: "flex-end",
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
    padding: "20px",
    borderTop: "1px solid var(--vscode-editorWidget-border)",
});

export const Badge = styled.div`
    // padding: 5px;
    // margin-left: 10px;
    display: inline-block;
    text-align: left;
`;

export const ResetsInBadge = styled.div`
    font-size: 10px;
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
`;
