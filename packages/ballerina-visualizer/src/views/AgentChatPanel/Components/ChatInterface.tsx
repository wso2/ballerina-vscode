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

import React, { useState, useEffect, useRef } from "react";
import styled from "@emotion/styled";
import ChatInput from "./ChatInput";
import LoadingIndicator from "./LoadingIndicator";
import { ExecutionTimeline } from "./ExecutionTimeline";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Icon, Button, ThemeColors } from "@wso2/ui-toolkit";
import ReactMarkdown from "react-markdown";
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { ExecutionStep } from "@wso2/ballerina-core";

enum ChatMessageType {
    MESSAGE = "message",
    ERROR = "error",
}

interface ChatMessage {
    type: ChatMessageType;
    text: string;
    isUser: boolean;
    traceId?: string;
    executionSteps?: ExecutionStep[];
}

// ---------- WATER MARK ----------
const Watermark = styled.div`
    position: absolute;
    width: 80%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
    user-select: none;
`;

const ChatIcon = styled.span`
    font-size: 60px !important;
    width: 60px;
    height: 60px;
    display: block;
    margin: 0 0;
`;

const WatermarkTitle = styled.div`
    font-size: 1.5em;
    font-weight: bold;
`;

const WatermarkSubTitle = styled.div`
    font-size: 14px;
    margin-top: 24px;
    color: var(--vscode-descriptionForeground);
`;

// ---------- CHAT AREA ----------
export const ChatWrapper = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
`;

export const ChatContainer = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    margin: 20px 0 32px 0;
`;

export const Messages = styled.div`
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
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

export const MessageContainer = styled.div<{ isUser: boolean }>`
    display: flex;
    align-items: flex-end;
    justify-content: ${({ isUser }: { isUser: boolean }) => (isUser ? "flex-end" : "flex-start")};
    gap: 6px;
`;

export const ProfilePic = styled.div`
    padding: 4px;
    border: 1px solid var(--vscode-panel-border);
    background-color: var(--vscode-editor-background);
    border-radius: 50%;
    object-fit: cover;
`;

export const MessageBubble = styled.div<{ isUser: boolean; isError?: boolean; isLoading?: boolean }>`
    position: relative;
    padding: ${({ isLoading }: { isLoading?: boolean }) => (isLoading ? "10px 14px" : "2px 14px")};
    max-width: 100%;
    align-self: ${({ isUser }: { isUser: boolean }) => (isUser ? "flex-end" : "flex-start")};
    overflow-wrap: break-word;
    word-break: break-word;
    hyphens: auto;

    color: ${({ isError }: { isError: boolean }) => (isError ? "var(--vscode-errorForeground)" : "inherit")};

    &:before {
        content: "";
        position: absolute;
        inset: 0;
        background-color: ${({ isUser, isError }: { isUser: boolean; isError?: boolean }) =>
        isError ? "var(--vscode-errorForeground)" : isUser ? "var(--vscode-button-background)" : "var(--vscode-input-background)"};
        opacity: ${({ isUser, isError }: { isUser: boolean; isError?: boolean }) => (isUser ? "0.3" : isError ? "0.05" : "1")};
        border-radius: inherit;
        border: 1px solid ${({ isUser }: { isUser: boolean }) =>
        isUser ? "var(--vscode-peekView-border)" : "var(--vscode-panel-border)"};
        z-index: -1;
    }

    border-radius: ${({ isUser }: { isUser: boolean }) => (isUser ? "12px 12px 0px 12px" : "12px 12px 12px 0px")};
`;

const MessageActionsContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    margin: -4px 0 0 36px;
    flex-wrap: wrap;
`;

// ---------- CHAT FOOTER ----------
const ChatFooter = styled.div`
    position: sticky;
    bottom: 20px;
    width: 100%;
    padding: 0 20px;
`;

const ShowLogsButton = styled.button`
    background: none;
    border: none;
    color: var(--vscode-textLink-foreground);
    font-size: 12px;
    padding: 4px 0;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;

    &:hover {
        text-decoration: underline;
        color: var(--vscode-textLink-activeForeground);
    }
`;

const ChatHeader = styled.div`
    position: sticky;
    top: 0;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 12px 8px 8px;
    z-index: 2;
    border-bottom: 1px solid var(--vscode-panel-border);
    gap: 8px;
`;

const ClearChatButton = styled.button`
    background: none;
    border: 1px solid var(--vscode-panel-border);
    color: var(--vscode-foreground);
    font-size: 12px;
    padding: 4px 8px;
    cursor: pointer;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    gap: 4px;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

// ---------- WARNING POPUP ----------
const ModalBackdrop = styled.div({
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
});

const ModalContent = styled.div<{ maxWidth: string }>(({ maxWidth }: { maxWidth: string }) => ({
    backgroundColor: ThemeColors.SURFACE,
    color: ThemeColors.ON_SURFACE,
    padding: '20px',
    border: `1px solid ${ThemeColors.OUTLINE_VARIANT}`,
    borderRadius: '4px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
    width: maxWidth,
    textAlign: 'center'
}));

const ButtonContainer = styled.div({
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'center',
    gap: '10px'
});

// ---------- HELPER COMPONENTS ----------
interface ModalProps {
    isOpen: boolean;
    children: React.ReactNode;
    onClose?: () => void;
    maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, children, onClose, maxWidth = '400px' }) => {
    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && onClose) {
            onClose();
        }
    };

    return (
        <ModalBackdrop onClick={handleBackdropClick}>
            <ModalContent maxWidth={maxWidth}>
                {children}
            </ModalContent>
        </ModalBackdrop>
    );
};

interface ClearChatWarningPopupProps {
    isOpen: boolean;
    onContinue: () => void;
    onCancel: () => void;
}

const ClearChatWarningPopup: React.FC<ClearChatWarningPopupProps> = ({ isOpen, onContinue, onCancel }) => {
    return (
        <Modal isOpen={isOpen} onClose={onCancel} maxWidth='60%'>
            <p>Are you sure you want to clear the chat? This will remove all messages and cannot be undone.</p>
            <ButtonContainer>
                <Button
                    appearance='primary'
                    onClick={onContinue}>
                    Clear Chat
                </Button>
                <Button
                    appearance='secondary'
                    onClick={onCancel}>
                    Cancel
                </Button>
            </ButtonContainer>
        </Modal>
    );
};

// Preprocess LaTeX delimiters to convert \(...\) and \[...\] to $...$ and $$...$$
export function preprocessLatex(text: string): string {
    if (!text || typeof text !== 'string') return text;

    // Convert display math \[...\] to $$...$$
    let processed = text.replace(/\\\[(.*?)\\\]/gs, (_, math) => `$$${math}$$`);

    // Convert inline math \(...\) to $...$
    processed = processed.replace(/\\\((.*?)\\\)/gs, (_, math) => `$${math}$`);

    return processed;
}

const ChatInterface: React.FC = () => {
    const { rpcClient } = useRpcContext();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isTracingEnabled, setIsTracingEnabled] = useState(false);
    const [showClearWarning, setShowClearWarning] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Check if we have any traces (to enable/disable Session Logs button)
    const hasTraces = messages.some(msg => !msg.isUser && msg.traceId);

    // Load chat history and check tracing status on mount
    useEffect(() => {
        const loadChatHistory = async () => {
            try {
                const history = await rpcClient.getAgentChatRpcClient().getChatHistory();

                // Only restore chat if the agent is still running
                if (history.isAgentRunning && history.messages.length > 0) {
                    // Convert ChatHistoryMessage to ChatMessage format
                    const chatMessages: ChatMessage[] = history.messages.map(msg => ({
                        type: msg.type === 'error' ? ChatMessageType.ERROR : ChatMessageType.MESSAGE,
                        text: msg.text,
                        isUser: msg.isUser,
                        traceId: msg.traceId,
                        executionSteps: msg.executionSteps
                    }));
                    setMessages(chatMessages);
                }
                // If agent is not running, chat history is cleared automatically
            } catch (error) {
                console.error('Failed to load chat history:', error);
            }
        };

        const checkTracingStatus = async () => {
            try {
                const status = await rpcClient.getAgentChatRpcClient().getTracingStatus();
                setIsTracingEnabled(status.enabled);
            } catch (error) {
                console.error('Failed to get tracing status:', error);
                setIsTracingEnabled(false);
            }
        };

        loadChatHistory();
        checkTracingStatus();
    }, [rpcClient]);

    // Auto scroll to the bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return;

        setMessages((prev) => [...prev, { type: ChatMessageType.MESSAGE, text, isUser: true }]);
        setIsLoading(true);

        try {
            const chatResponse = await rpcClient.getAgentChatRpcClient().getChatMessage({ message: text });

            setMessages((prev) => [
                ...prev,
                {
                    type: ChatMessageType.MESSAGE,
                    text: chatResponse.message,
                    isUser: false,
                    traceId: chatResponse.traceId,
                    executionSteps: chatResponse.executionSteps
                },
            ]);
        } catch (error) {
            let errorMessage = "An unknown error occurred";
            let traceId: string | undefined;
            let executionSteps: ExecutionStep[] | undefined;

            // Try to parse structured error with trace information
            if (error && typeof error === "object" && "message" in error) {
                try {
                    const parsedError = JSON.parse(String(error.message));
                    if (parsedError.message && parsedError.traceInfo) {
                        errorMessage = parsedError.message;
                        traceId = parsedError.traceInfo.traceId;
                        executionSteps = parsedError.traceInfo.executionSteps;
                    } else {
                        // Fallback to regular error message
                        errorMessage = String(error.message);
                    }
                } catch (parseError) {
                    // If JSON parsing fails, use the original error message
                    errorMessage = String(error.message);
                }
            }

            console.error("Chat message error:", error);

            setMessages((prev) => [...prev, {
                type: ChatMessageType.ERROR,
                text: errorMessage,
                isUser: false,
                traceId,
                executionSteps
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStop = () => {
        rpcClient.getAgentChatRpcClient().abortChatRequest();
        setIsLoading(false);
    };

    const handleShowLogs = async (messageIndex: number) => {
        try {
            // Get the trace ID from the agent's response message
            const message = messages[messageIndex];

            if (!message || message.isUser || !message.traceId) {
                console.error('No trace ID found for this message');
                return;
            }

            await rpcClient.getAgentChatRpcClient().showTraceView({
                traceId: message.traceId
            });
        } catch (error) {
            console.error('Failed to show trace view:', error);
        }
    };

    const handleClearChat = () => {
        // Show the warning popup
        setShowClearWarning(true);
    };

    const confirmClearChat = async () => {
        try {
            // Clear the chat history on the backend and get a new session ID
            await rpcClient.getAgentChatRpcClient().clearChatHistory();
            // Clear the messages in the UI
            setMessages([]);
            // Close the warning popup
            setShowClearWarning(false);
        } catch (error) {
            console.error("Failed to clear chat history:", error);
        }
    };

    const cancelClearChat = () => {
        // Close the warning popup
        setShowClearWarning(false);
    };

    const handleViewInTrace = async (traceId: string, spanId: string) => {
        try {
            await rpcClient.getAgentChatRpcClient().showTraceView({
                traceId,
                focusSpanId: spanId
            });
        } catch (error) {
            console.error('Failed to show trace view:', error);
        }
    };

    const handleShowSessionLogs = async () => {
        try {
            await rpcClient.getAgentChatRpcClient().showSessionOverview({});
        } catch (error) {
            console.error('Failed to show session overview:', error);
        }
    };

    return (
        <ChatWrapper>
            {messages.length > 0 && (
                <ChatHeader>
                    <div>
                        {isTracingEnabled && hasTraces && (
                            <ClearChatButton onClick={handleShowSessionLogs} disabled={isLoading} title="View traces for the entire conversation">
                                <span className="codicon codicon-list-tree" />
                                Session Logs
                            </ClearChatButton>
                        )}
                    </div>
                    <ClearChatButton onClick={handleClearChat} disabled={isLoading}>
                        <Icon name="bi-delete" sx={{ fontSize: 16, width: 16, height: 16 }} iconSx={{ fontSize: "16px" }} />
                        Clear Chat
                    </ClearChatButton>
                </ChatHeader>
            )}
            <ChatContainer>
                {messages.length === 0 && (
                    <Watermark>
                        <ChatIcon className="codicon codicon-comment-discussion" />
                        <WatermarkTitle>Agent Chat</WatermarkTitle>
                        <WatermarkSubTitle>
                            The chat interface serves as a testing environment to evaluate and refine the flow of the AI
                            agent.
                        </WatermarkSubTitle>
                    </Watermark>
                )}
                <Messages>
                    {/* Render each message */}
                    {messages.map((msg, idx) => (
                        <React.Fragment key={idx}>
                            {!msg.isUser && isTracingEnabled && msg?.executionSteps && msg.executionSteps.length > 0 && msg.traceId && (
                                <ExecutionTimeline
                                    steps={msg.executionSteps}
                                    traceId={msg.traceId}
                                    onViewInTrace={handleViewInTrace}
                                />
                            )}
                            <MessageContainer isUser={msg.isUser}>
                                {!msg.isUser && (
                                    <ProfilePic>
                                        <Icon
                                            name="bi-ai-agent"
                                            sx={{ width: 18, height: 18 }}
                                            iconSx={{
                                                fontSize: "18px",
                                                color: "var(--vscode-terminal-ansiBrightCyan)",
                                                cursor: "default",
                                            }}
                                        />
                                    </ProfilePic>
                                )}
                                <MessageBubble isUser={msg.isUser} isError={msg.type === ChatMessageType.ERROR}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath, remarkGfm]}
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {preprocessLatex(msg.text)}
                                    </ReactMarkdown>
                                </MessageBubble>
                                {msg.isUser && (
                                    <ProfilePic>
                                        <Icon
                                            name="bi-user"
                                            sx={{ width: 18, height: 18 }}
                                            iconSx={{
                                                fontSize: "18px",
                                                color: "var(--vscode-foreground)",
                                                cursor: "default",
                                            }}
                                        />
                                    </ProfilePic>
                                )}
                            </MessageContainer>
                            {!msg.isUser && isTracingEnabled && msg.traceId && (
                                <MessageActionsContainer>
                                    <ShowLogsButton onClick={() => handleShowLogs(idx)} title="View trace logs for this message">
                                        View Logs
                                    </ShowLogsButton>
                                </MessageActionsContainer>
                            )}
                        </React.Fragment>
                    ))}

                    {/* If waiting on a response, show the loading bubble */}
                    {isLoading && (
                        <MessageContainer isUser={false}>
                            <ProfilePic>
                                <Icon
                                    name="bi-ai-agent"
                                    sx={{ width: 18, height: 18 }}
                                    iconSx={{
                                        fontSize: "18px",
                                        color: "var(--vscode-foreground)",
                                        cursor: "default",
                                    }}
                                />
                            </ProfilePic>
                            <MessageBubble isUser={false} isLoading={true}>
                                <LoadingIndicator />
                            </MessageBubble>
                        </MessageContainer>
                    )}
                    <div ref={messagesEndRef} />
                </Messages>
            </ChatContainer>
            <ChatFooter>
                <ChatInput value="" onSend={handleSendMessage} onStop={handleStop} isLoading={isLoading} />
                {/* <FooterText>
                    <SmallInfoIcon className="codicon codicon-info" />
                    <span>Add chat to external application.</span>
                    <a
                        href="https://example.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            marginLeft: "8px",
                            textDecoration: "underline",
                            cursor: "pointer",
                        }}
                    >
                        More info
                    </a>
                </FooterText> */}
            </ChatFooter>
            <ClearChatWarningPopup
                isOpen={showClearWarning}
                onContinue={confirmClearChat}
                onCancel={cancelClearChat}
            />
        </ChatWrapper>
    );
};

export default ChatInterface;
