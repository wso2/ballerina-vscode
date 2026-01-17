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

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Codicon, Icon } from '@wso2/ui-toolkit';
import { ToolCallSummary } from '@wso2/ballerina-core';

interface ExecutionStepsProps {
    toolCalls: ToolCallSummary[];
    traceId: string;
    onViewInTrace: (traceId: string, spanId: string) => void;
}

const ExecutionSteps: React.FC<ExecutionStepsProps> = ({ toolCalls, traceId, onViewInTrace }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!toolCalls || toolCalls.length === 0) {
        return null;
    }

    return (
        <>
            <StepsToggle onClick={() => setIsExpanded(!isExpanded)}>
                <Codicon name={isExpanded ? 'chevron-down' : 'chevron-right'} />
                <ToggleText>
                    {isExpanded ? 'Hide' : 'View'} execution steps
                </ToggleText>
            </StepsToggle>

            {isExpanded && (
                <StepsContent>
                    {toolCalls.map((tool, idx) => (
                        <ToolStep key={tool.spanId}>
                            <StepNumber>{idx + 1}.</StepNumber>
                            <Icon name="bi-wrench"
                                sx={{
                                    fontSize: '14px',
                                    width: '14px',
                                    height: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                iconSx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            />
                            <ToolInfo>
                                <ToolName>{tool.toolName}</ToolName>
                            </ToolInfo>
                            <JumpLink onClick={() => onViewInTrace(traceId, tool.spanId)}>
                                Jump to span →
                            </JumpLink>
                        </ToolStep>
                    ))}
                </StepsContent>
            )}
        </>
    );
};

// Styled components
const StepsToggle = styled.button`
    display: flex;
    align-items: center;
    gap: 2px;
    background: none;
    border: none;
    color: var(--vscode-textLink-foreground);
    font-size: 12px;
    padding: 4px 0;
    cursor: pointer;

    &:hover {
        text-decoration: underline;
        color: var(--vscode-textLink-activeForeground);
    }
`;

const ToggleText = styled.span`
    font-size: 12px;
`;

const StepsContent = styled.div`
    margin-top: 8px;
    margin-left: 24px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 600px;
    width: 100%;
`;

const ToolStep = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 8px;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    font-size: 12px;
`;

const StepNumber = styled.span`
    color: var(--vscode-descriptionForeground);
    font-weight: 500;
    min-width: 20px;
`;

const ToolInfo = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    overflow: hidden;
`;

const ToolName = styled.span`
    font-weight: 500;
    color: var(--vscode-foreground);
`;

const JumpLink = styled.button`
    background: none;
    border: none;
    color: var(--vscode-textLink-foreground);
    font-size: 11px;
    padding: 0;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
        text-decoration: underline;
    }
`;

export default ExecutionSteps;
