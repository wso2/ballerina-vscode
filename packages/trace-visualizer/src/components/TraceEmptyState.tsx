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

import styled from "@emotion/styled";
import { Codicon } from "@wso2/ui-toolkit";

interface TraceEmptyStateProps {
    icon?: string;
    title: string;
    subtitle?: string;
}

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    text-align: center;
    padding: 40px;
    color: var(--vscode-descriptionForeground);
`;

const EmptyStateIcon = styled.div`
    font-size: 48px;
    margin-bottom: 20px;
    opacity: 0.5;
`;

const EmptyStateText = styled.div`
    font-size: 16px;
    margin-bottom: 8px;
`;

export function TraceEmptyState({ icon = 'comment-discussion', title, subtitle }: TraceEmptyStateProps) {
    return (
        <EmptyState>
            <EmptyStateIcon>
                <Codicon name={icon} />
            </EmptyStateIcon>
            <EmptyStateText>
                {title}
            </EmptyStateText>
            {subtitle && (
                <EmptyStateText style={{ fontSize: '14px', opacity: 0.7 }}>
                    {subtitle}
                </EmptyStateText>
            )}
        </EmptyState>
    );
}
