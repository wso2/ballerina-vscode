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

import React from "react";
import styled from "@emotion/styled";
import { EvalCase, EvalSet, EvalFunctionCall, EvalsetTrace } from "@wso2/ballerina-core";
import { MessageContainer, MessageBubble, ProfilePic, preprocessLatex } from "./AgentChatPanel/Components/ChatInterface";
import { ToolCallsTimeline } from "./AgentChatPanel/Components/ToolCallsTimeline";
import { Icon } from "@wso2/ui-toolkit";
import ReactMarkdown from "react-markdown";
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { TopNavigationBar } from "../components/TopNavigationBar";

const Container = styled.div`
    height: 100%;
    width: 100%;
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);

    *, *::before, *::after {
        box-sizing: content-box;
    }
`;

const Header = styled.div`
    top: 0;
    padding: 12px 20px;
    background-color: var(--vscode-editorWidget-background);
    z-index: 2;
`;

const Title = styled.h2`
    font-size: 1.2em;
    font-weight: 600;
    margin: 0 0 4px 0;
    color: var(--vscode-foreground);
`;

const Subtitle = styled.p`
    font-size: 14px;
    color: var(--vscode-descriptionForeground);
    margin: 0;
`;

export const Messages = styled.div`
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    gap: 8px;
    position: relative;
    z-index: 1;
    padding: 8px 20px;
    height: 100%;

    @media (min-width: 1000px) {
        padding: 8px 10%;
    }

    @media (min-width: 1600px) {
        padding: 8px 15%;
    }

    @media (min-width: 2000px) {
        padding: 8px 20%;
    }
`;

interface EvalCaseViewerProps {
    projectPath: string;
    evalSet: EvalSet;
    evalCase: EvalCase;
}

export const EvalCaseViewer: React.FC<EvalCaseViewerProps> = ({ projectPath, evalSet, evalCase }) => {

    const extractToolCalls = (trace: EvalsetTrace): EvalFunctionCall[] => {
        const toolCalls: EvalFunctionCall[] = [];
        if (trace.output?.toolCalls) {
            return trace.output.toolCalls as EvalFunctionCall[];
        }
        return toolCalls;
    };

    return (
        <>
            <TopNavigationBar projectPath={projectPath} />
            <Container>
                <Header>
                    <Title>{evalSet.name}</Title>
                    <Subtitle>{evalCase.name} • {evalCase.traces.length} trace(s)</Subtitle>
                </Header>
                <Messages>
                    {evalCase.traces.map((trace, traceIdx) => {
                        const toolCalls = extractToolCalls(trace);

                        return (
                            <React.Fragment key={traceIdx}>
                                {/* Render user's initial message */}
                                <MessageContainer isUser={true}>
                                    <MessageBubble isUser={true}>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath, remarkGfm]}
                                            rehypePlugins={[rehypeKatex]}
                                        >
                                            {preprocessLatex(typeof trace.userMessage.content === 'string'
                                                ? trace.userMessage.content
                                                : JSON.stringify(trace.userMessage.content))}
                                        </ReactMarkdown>
                                    </MessageBubble>
                                    <ProfilePic>
                                        <Icon
                                            name="bi-user"
                                            iconSx={{
                                                fontSize: "18px",
                                                color: "var(--vscode-foreground)",
                                                cursor: "default",
                                            }}
                                        />
                                    </ProfilePic>
                                </MessageContainer>

                                {/* Render agent response */}
                                <MessageContainer isUser={false}>
                                    <ProfilePic>
                                        <Icon
                                            name="bi-ai-agent"
                                            iconSx={{
                                                fontSize: "18px",
                                                color: "var(--vscode-terminal-ansiBrightCyan)",
                                                cursor: "default",
                                            }}
                                        />
                                    </ProfilePic>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                        <ToolCallsTimeline toolCalls={toolCalls} />
                                        <MessageBubble isUser={false}>
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath, remarkGfm]}
                                                rehypePlugins={[rehypeKatex]}
                                            >
                                                {preprocessLatex(typeof trace.output?.content === 'string'
                                                    ? trace.output?.content
                                                    : JSON.stringify(trace.output?.content))}
                                            </ReactMarkdown>
                                        </MessageBubble>
                                    </div>
                                </MessageContainer>
                            </React.Fragment>
                        );
                    })}
                </Messages>
            </Container >
        </>
    );
};
