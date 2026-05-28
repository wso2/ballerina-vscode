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

export enum ChatBadgeType {
    Command = "command",
    Tag = "tag",
}

interface ChatBadgeProps {
    children: React.ReactNode;
    rawValue?: string;
    badgeType: ChatBadgeType;
}

const ChatBadge: React.FC<ChatBadgeProps> = ({ children, rawValue, badgeType }) => {
    return (
        <div
            contentEditable={false}
            style={{
                backgroundColor: "var(--vscode-toolbar-hoverBackground)",
                color: "var(--vscode-icon-foreground)",
                padding: "4px 0",
                borderRadius: "4px",
                display: "inline-flex",
                alignItems: "center",
                lineHeight: 1,
                fontFamily: "'Source Code Pro', monospace",
                marginRight: "2px",
            }}
            data-raw-value={rawValue ?? children}
            data-badge-type={badgeType}
        >
            {children}
        </div>
    );
};

export default ChatBadge;
