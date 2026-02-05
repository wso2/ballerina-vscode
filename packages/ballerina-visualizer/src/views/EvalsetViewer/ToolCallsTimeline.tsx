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

import { useState } from "react";
import styled from "@emotion/styled";
import { Codicon, Icon } from "@wso2/ui-toolkit";
import { EvalFunctionCall } from "@wso2/ballerina-core";

interface ToolCallsTimelineProps {
    toolCalls: EvalFunctionCall[];
}

const TimelineContainer = styled.div`
    max-width: 600px;
    margin: 12px 0 8px;
`;

const TimelineTitle = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    letter-spacing: 0.5px;
`;

const TimelineHeader = styled.button`
    display: flex;
    align-items: center;
    gap: 2px;
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
`;

const ToggleIcon = styled.span<{ isOpen: boolean }>`
    color: var(--vscode-descriptionForeground);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease;
    transform: ${(props: { isOpen: boolean }) => (props.isOpen ? "rotate(90deg)" : "rotate(0deg)")};
`;

const TimelineList = styled.div`
    margin-top: 8px;
    margin-bottom: 4px;
    display: flex;
    flex-direction: column;
    gap: 0;
`;

const TimelineItem = styled.div`
    display: flex;
    align-items: flex-start;
    position: relative;
    margin-bottom: 8px;

    &:last-of-type {
        margin-bottom: 0;
    }
`;

const ConnectorColumn = styled.div<{ isLast: boolean }>`
    width: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    flex-shrink: 0;
    padding-top: 4px;

    &::after {
        content: '';
        position: absolute;
        top: 14px;
        left: 50%;
        transform: translateX(-50%);
        width: 1px;
        height: calc(100% + 8px);
        background-color: var(--vscode-panel-border);
        display: ${(props: { isLast: boolean }) => props.isLast ? 'none' : 'block'};
    }
`;

const Dot = styled.div`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--vscode-panel-border);
    z-index: 1;
    flex-shrink: 0;
`;

const ContentCard = styled.div`
    width: 60%;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 8px 12px;
    transition: background-color 0.15s ease;
`;

const CardContent = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const IconBadge = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--vscode-terminal-ansiBrightMagenta);
    flex-shrink: 0;
`;

const OperationLabel = styled.span`
    font-size: 10px;
    font-weight: 600;
    flex-shrink: 0;
`;

const ToolName = styled.span`
    font-size: 12px;
    color: var(--vscode-foreground);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export function ToolCallsTimeline({ toolCalls }: ToolCallsTimelineProps) {
    const [open, setOpen] = useState(false);

    if (!toolCalls || toolCalls.length === 0) {
        return null;
    }

    return (
        <TimelineContainer>
            <TimelineHeader onClick={() => setOpen(!open)} aria-expanded={open}>
                <TimelineTitle>Tools Used ({toolCalls.length})</TimelineTitle>
                <ToggleIcon isOpen={open}>
                    <Codicon name="chevron-right" sx={{ fontSize: "14px", width: "14px", height: "14px", display: "flex", alignItems: "center", justifyContent: "center" }} iconSx={{ display: "flex" }} />
                </ToggleIcon>
            </TimelineHeader>
            {open && (
                <TimelineList>
                    {toolCalls.map((toolCall, index) => (
                        <TimelineItem key={toolCall.id || index}>
                            <ConnectorColumn isLast={index === toolCalls.length - 1}>
                                <Dot />
                            </ConnectorColumn>
                            <ContentCard title={toolCall.name}>
                                <CardContent>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <IconBadge>
                                            <Icon
                                                name="bi-wrench"
                                                sx={{
                                                    fontSize: '14px',
                                                    width: '14px',
                                                    height: '14px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                iconSx={{
                                                    fontSize: "14px",
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            />
                                        </IconBadge>
                                        <OperationLabel>
                                            Execute Tool
                                        </OperationLabel>
                                    </div>
                                    <ToolName>{toolCall.name}</ToolName>
                                </CardContent>
                            </ContentCard>
                        </TimelineItem>
                    ))}
                </TimelineList>
            )}
        </TimelineContainer>
    );
}
