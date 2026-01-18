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
import { Icon } from "@wso2/ui-toolkit";

interface AIBadgeProps {
    type: 'invoke' | 'chat' | 'tool' | 'other';
}

const AISpanBadge = styled.span<{ type: string }>`
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 3px;
    font-weight: 500;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    background-color: var(--vscode-editor-background);
    color: ${(props: { type: string }) => {
        switch (props.type) {
            case 'invoke': return 'var(--vscode-terminal-ansiCyan)';
            case 'chat': return 'var(--vscode-terminalSymbolIcon-optionForeground)';
            case 'tool': return 'var(--vscode-terminal-ansiBrightMagenta)';
            default: return 'var(--vscode-badge-foreground)';
        }
    }};
    border: 1px solid var(--vscode-dropdown-border);

    .ai-span-label {
        color: var(--vscode-foreground);
    }
`;

export function AIBadge({ type }: AIBadgeProps) {
    const getIconName = () => {
        switch (type) {
            case 'invoke': return 'bi-ai-agent';
            case 'chat': return 'bi-chat';
            case 'tool': return 'bi-wrench';
            default: return 'bi-action';
        }
    };

    const getLabel = () => {
        switch (type) {
            case 'invoke': return 'Invoke Agent';
            case 'chat': return 'Chat';
            case 'tool': return 'Execute Tool';
            default: return 'Operation';
        }
    };

    return (
        <AISpanBadge type={type}>
            <Icon
                name={getIconName()}
                sx={{
                    fontSize: '16px',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                iconSx={{
                    fontSize: "16px",
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            />
            <span className="ai-span-label">{getLabel()}</span>
        </AISpanBadge>
    );
}
