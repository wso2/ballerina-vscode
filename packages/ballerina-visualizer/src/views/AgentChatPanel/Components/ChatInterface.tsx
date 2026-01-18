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
import { Codicon, Icon, Button, ThemeColors } from "@wso2/ui-toolkit";
import ReactMarkdown from "react-markdown";
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { ToolCallSummary, ExecutionStep } from "@wso2/ballerina-core";

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
const ChatWrapper = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
`;

const ChatContainer = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    margin: 20px 0 32px 0;
`;

const Messages = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    z-index: 1;
    padding: 8px 20px;
`;

const MessageContainer = styled.div<{ isUser: boolean }>`
    display: flex;
    align-items: flex-end;
    justify-content: ${({ isUser }: { isUser: boolean }) => (isUser ? "flex-end" : "flex-start")};
    gap: 6px;
`;

const ProfilePic = styled.div`
    width: 18px;
    height: 18px;
    border-radius: 50%;
    object-fit: cover;
`;

const MessageBubble = styled.div<{ isUser: boolean; isError?: boolean; isLoading?: boolean }>`
    position: relative;
    padding: ${({ isLoading }: { isLoading?: boolean }) => (isLoading ? "10px 14px" : "0 14px")};
    max-width: 55%;
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
        isUser ? "var(--vscode-peekView-border)" : "var(--vscode-panel-border)"};;
        z-index: -1;
    }

    border-radius: ${({ isUser }: { isUser: boolean }) => (isUser ? "12px 12px 0px 12px" : "12px 12px 12px 0px")};
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
    padding: 12px 8px 8px;
    z-index: 2;
    border-bottom: 1px solid var(--vscode-panel-border);
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
function preprocessLatex(text: string): string {
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
    const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});

    const messagesEndRef = useRef<HTMLDivElement>(null);

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
                        traceId: msg.traceId
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
                    toolCalls: chatResponse.toolCalls,
                    executionSteps: chatResponse.executionSteps
                },
            ]);
        } catch (error) {
            const errorMessage =
                error && typeof error === "object" && "message" in error
                    ? String(error.message)
                    : "An unknown error occurred";

            setMessages((prev) => [...prev, { type: ChatMessageType.ERROR, text: errorMessage, isUser: false }]);
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
            // Find the corresponding user message
            // Look backwards from the current index to find the last user message
            let userMessage = '';

            for (let i = messageIndex - 1; i >= 0; i--) {
                if (messages[i].isUser) {
                    userMessage = messages[i].text;
                    break;
                }
            }

            if (!userMessage) {
                console.error('Could not find user message for this response');
                return;
            }

            // Call the RPC method to show the trace view
            await rpcClient.getAgentChatRpcClient().showTraceView({ message: userMessage });
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
                focusSpanId: spanId,
                openInFocusMode: true
            });
        } catch (error) {
            console.error('Failed to show trace view:', error);
        }
    };

    return (
        <ChatWrapper>
            {messages.length > 0 && (
                <ChatHeader>
                    <ClearChatButton onClick={handleClearChat} disabled={isLoading}>
                        <span className="codicon codicon-clear-all" />
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
                            {/* Show execution timeline ABOVE agent message if available */}
                            {!msg.isUser && msg?.executionSteps && msg.executionSteps.length > 0 && msg.traceId && (
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
                                                color: "var(--vscode-foreground)",
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
                            {/* Show "View All Logs" link below message if tracing is enabled */}
                            {!msg.isUser && isTracingEnabled && (
                                <MessageActionsContainer>
                                    <ShowLogsButton onClick={() => handleShowLogs(idx)}>
                                        View All Logs
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
