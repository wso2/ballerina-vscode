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

import React, { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import {
    SourceFile,
    MappingParameters,
    LLMDiagnostics,
    DiagnosticEntry,
    AIPanelPrompt,
    Command,
    TemplateId,
    ChatNotify,
    DocumentationGeneratorIntermediaryState,
    OperationType,
    ExtendedDataMapperMetadata,
    DocGenerationRequest,
    DocGenerationType,
    FileChanges,
    CodeContext,
    ApprovalOverlayState,
    WebToolToggle,
    LoginMethod,
} from "@wso2/ballerina-core";

import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Codicon, Icon } from "@wso2/ui-toolkit";

import { AIChatInputRef } from "../AIChatInput";
import ToolCallSegment from "../ToolCallSegment";
import ToolCallGroupSegment, { ToolCallItem } from "../ToolCallGroupSegment";
import TryItScenariosSegment from "../TryItScenariosSegment";
import TodoSection from "../TodoSection";
import AgentStreamView from "../AgentStreamView";
import { StreamEntry, StreamItem } from "../AgentStreamView/types";
import { ConnectorGeneratorSegment } from "../ConnectorGeneratorSegment";
import { ConfigurationCollectorSegment, ConfigurationCollectionData } from "../ConfigurationCollectorSegment";
import CheckpointSeparator from "../CheckpointSeparator";
import { Attachment, AttachmentStatus, TaskApprovalRequest } from "@wso2/ballerina-core";

import { AIChatView, Header, HeaderButtons, ChatMessage, TurnGroup, AuthProviderChip, UsageBadge, ApprovalOverlay, OverlayMessage } from "../../styles";
import ReferenceDropdown from "../ReferenceDropdown";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import MarkdownRenderer from "../MarkdownRenderer";
import { CodeSection } from "../CodeSection";
import ErrorBox from "../ErrorBox";
import { Input, parseInput, stringifyInputArrayWithBadges } from "../AIChatInput/utils/inputUtils";
import { commandTemplates, NATURAL_PROGRAMMING_TEMPLATES } from "../../commandTemplates/data/commandTemplates.const";
import { placeholderTags } from "../../commandTemplates/data/placeholderTags.const";
import {
    getTemplateById,
    getTemplateTextById,
    removeTemplate,
    upsertTemplate,
} from "../../commandTemplates/utils/utils";
import { acceptResolver, handleAttachmentSelection } from "../../utils/attachment/attachmentManager";
import { SYSTEM_ERROR_SECRET } from "../AIChatInput/constants";
import { CodeSegment } from "../CodeSegment";
import AttachmentBox, { AttachmentsContainer } from "../AttachmentBox";
import Footer from "./Footer";
import { AgentMode } from "../AIChatInput/ModeToggle";
import CommonApprovalFooter from "./Footer/CommonApprovalFooter";
import { useFooterLogic } from "./Footer/useFooterLogic";
import { SettingsPanel } from "../../SettingsPanel";
import WelcomeMessage from "./Welcome";
import { getOnboardingOpens, incrementOnboardingOpens, convertToUIMessages, isContainsSyntaxError } from "./utils/utils";

import FeedbackBar from "./../FeedbackBar";
import { useFeedback } from "./utils/useFeedback";
import { SegmentType, splitContent } from "./segment";
import { ReviewBar } from "../ReviewBar";

const NO_DRIFT_FOUND = "No drift identified between the code and the documentation.";
const DRIFT_CHECK_ERROR = "Failed to check drift between the code and the documentation. Please try again.";

const USAGE_EXCEEDED_THRESHOLD_PERCENT = 3;

//TODO: Add better error handling from backend. stream error type and non 200 status codes

const MessageBody = styled.div<{ isUserMessage: boolean }>(({ isUserMessage }: { isUserMessage: boolean }) => ({
    display: "flex",
    flexDirection: "column",
    width: isUserMessage ? "fit-content" : "100%",
    maxWidth: isUserMessage ? "85%" : "100%",
    marginLeft: isUserMessage ? "auto" : "0",
    padding: isUserMessage ? "6px 12px" : "0",
    border: isUserMessage ? "1px solid var(--vscode-panel-border)" : "none",
    borderRadius: isUserMessage ? "12px" : "0",
    background: isUserMessage ? "var(--vscode-editor-inactiveSelectionBackground)" : "transparent",
    overflowWrap: "anywhere",
}));

// ── Agent stream serialization ────────────────────────────────────────────────

function serializeStream(entries: StreamEntry[], existingContent: string): string {
    const blob = `<agentstream>${JSON.stringify({ entries })}</agentstream>`;
    if (existingContent.includes("<agentstream>")) {
        return existingContent.replace(/<agentstream>[\s\S]*?<\/agentstream>/, blob);
    }
    return existingContent + blob;
}

function parseStream(content: string): StreamEntry[] {
    const match = content.match(/<agentstream>([\s\S]*?)<\/agentstream>/);
    if (!match) return [];
    try { return JSON.parse(match[1]).entries ?? []; } catch { return []; }
}

function appendToLastEntry(entries: StreamEntry[], item: StreamItem): StreamEntry[] {
    if (entries.length === 0) return [{ description: "", items: [item] }];
    const last = entries[entries.length - 1];
    return [...entries.slice(0, -1), { ...last, items: [...last.items, item] }];
}

const AIChat: React.FC = () => {
    const { rpcClient } = useRpcContext();
    const [messages, setMessages] = useState<Array<{ role: string; content: string; type: string; checkpointId?: string; messageId?: string }>>([]);

    const getLatestAssistantMessageIndex = (chatMessages: Array<{ role: string }>): number => {
        for (let i = chatMessages.length - 1; i >= 0; i--) {
            const role = chatMessages[i]?.role;
            if (role === "Copilot" || role === "assistant") {
                return i;
            }
        }
        return -1;
    };

    const ensureAssistantMessage = (
        chatMessages: Array<{ role: string; content: string; type: string; checkpointId?: string; messageId?: string }>
    ): number => {
        let targetIndex = getLatestAssistantMessageIndex(chatMessages);
        if (targetIndex === -1) {
            chatMessages.push({ role: "Copilot", content: "", type: "assistant_message" });
            targetIndex = chatMessages.length - 1;
        }
        return targetIndex;
    };

    const updateLastMessage = (updater: (content: string) => string) => {
        setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            const targetIndex = ensureAssistantMessage(newMessages);
            newMessages[targetIndex].content = updater(newMessages[targetIndex].content);
            return newMessages;
        });
    };

    const [isLoading, setIsLoading] = useState(false);
    const [hoveredTurnIndex, setHoveredTurnIndex] = useState<number | null>(null);
    const [lastQuestionIndex, setLastQuestionIndex] = useState(-1);
    const [isCodeLoading, setIsCodeLoading] = useState(false);
    const [currentGeneratingPromptIndex, setCurrentGeneratingPromptIndex] = useState(-1);
    const [isReqFileExists, setIsReqFileExists] = useState(false);
    const [isPromptExecutedInCurrentWindow, setIsPromptExecutedInCurrentWindow] = useState(false);

    const [docGenIntermediaryState, setDocGenIntermediaryState] =
        useState<DocumentationGeneratorIntermediaryState | null>(null);
    const [isAddingToWorkspace, setIsAddingToWorkspace] = useState(false);

    const [showSettings, setShowSettings] = useState(false);
    const [isAutoApproveEnabled, setIsAutoApproveEnabled] = useState(false);
    const [isWebToolsEnabled, setIsWebToolsEnabled] = useState(false);
    const userWebSearchPreferenceRef = useRef(false);
    const [agentMode, setAgentMode] = useState<AgentMode>(AgentMode.Edit);

    const [availableCheckpointIds, setAvailableCheckpointIds] = useState<Set<string>>(new Set());
    const [hasActiveReview, setHasActiveReview] = useState(false);

    const [approvalRequest, setApprovalRequest] = useState<TaskApprovalRequest | null>(null);
    const [approvalOverlay, setApprovalOverlay] = useState<ApprovalOverlayState>({ show: false });
    const [webToolApprovalRequest, setWebToolApprovalRequest] = useState<{
        requestId: string;
        toolName: "web_search" | "web_fetch";
        content: string;
    } | null>(null);

    const [currentFileArray, setCurrentFileArray] = useState<SourceFile[]>([]);
    const [codeContext, setCodeContext] = useState<CodeContext | undefined>(undefined);

    const [usage, setUsage] = useState<{ remainingUsagePercentage: number; resetsIn: number } | null>(null);
    const [isUsageExceeded, setIsUsageExceeded] = useState(false);
    const [loginMethod, setLoginMethod] = useState<LoginMethod | null>(null);

    //TODO: Need a better way of storing data related to last generation to be in the repair state.
    const currentDiagnosticsRef = useRef<DiagnosticEntry[]>([]);
    const codeContextRef = useRef<CodeContext | undefined>(undefined);
    const functionsRef = useRef<any>([]);
    const lastAttatchmentsRef = useRef<any>([]);
    const aiChatInputRef = useRef<AIChatInputRef>(null);
    const messagesRef = useRef<any>([]);

    const isErrorChunkReceivedRef = useRef(false);

    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    /* REFACTORED CODE START [2] */
    // custom hooks: commands + attachments
    const { loadGeneralTags, injectPlaceholderTags } = useFooterLogic({
        rpcClient,
    });

    const { feedbackGiven, setFeedbackGiven, handleFeedback } = useFeedback({
        messages,
        currentDiagnosticsRef,
    });

    const updateCodeContext = (context?: CodeContext) => {
        codeContextRef.current = context;
        setCodeContext(context);
    };

    /**
     * Effect: Initialize the component with initial prompts
     */
    useEffect(function initializeWithInitialPrompts() {
        const fetchPrompt = () => {
            rpcClient
                .getAiPanelRpcClient()
                .getDefaultPrompt()
                .then((defaultPrompt: AIPanelPrompt) => {
                    if (defaultPrompt) {
                        // Extract CodeContext from both command-template metadata and text-type direct param
                        const codeCtx = defaultPrompt.type === 'command-template'
                            ? defaultPrompt.metadata?.codeContext
                            : defaultPrompt.type === 'text'
                                ? defaultPrompt.codeContext
                                : undefined;

                        updateCodeContext(codeCtx);

                        // Handle plan mode for text-type prompts
                        if (defaultPrompt.type === 'text') {
                            setAgentMode(defaultPrompt.planMode ? AgentMode.Plan : AgentMode.Edit);

                            if (defaultPrompt.autoSubmit && defaultPrompt.text.trim().length > 0) {
                                void handleSend({
                                    input: [{ content: defaultPrompt.text }],
                                    attachments: [],
                                });
                                return;
                            }
                        }

                        aiChatInputRef.current?.setInputContent(defaultPrompt);
                    }
                });
        };

        // Fetch prompt on mount
        fetchPrompt();

        // Listen for prompt updates when panel is already open
        rpcClient.onPromptUpdated(() => {
            fetchPrompt();
        });
    }, []);

    /**
     * Effect: Update onboarding state
     */
    useEffect(function updateOnboardingState() {
        incrementOnboardingOpens();
    }, []);
    /* REFACTORED CODE END [2] */

    const formatResetsIn = (seconds: number): string => {
        const days = Math.floor(seconds / 86400);
        if (days >= 1) return `${days} day${days > 1 ? 's' : ''}`;
        const hours = Math.floor(seconds / 3600);
        if (hours >= 1) return `${hours} hour${hours > 1 ? 's' : ''}`;
        const mins = Math.floor(seconds / 60);
        return `${mins} min${mins > 1 ? 's' : ''}`;
    };

    const formatResetsInExact = (seconds: number): string => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const parts: string[] = [];
        if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
        if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
        if (mins > 0) parts.push(`${mins} minute${mins > 1 ? 's' : ''}`);
        return parts.length > 0 ? parts.join(', ') : 'less than a minute';
    };

    const fetchUsage = async () => {
        try {
            const result = await rpcClient.getAiPanelRpcClient().getUsage();
            if (result) {
                setUsage(result);
                setIsUsageExceeded(result.resetsIn !== -1 && result.remainingUsagePercentage < USAGE_EXCEEDED_THRESHOLD_PERCENT);
            } else {
                setUsage(null);
                setIsUsageExceeded(false);
            }
        } catch (e) {
            console.error("Failed to fetch usage:", e);
            // Reset on error to avoid permanently blocking the user on transient failures
            setUsage(null);
            setIsUsageExceeded(false);
        }
    };

    const fetchLoginMethod = async () => {
        try {
            const method = await rpcClient.getAiPanelRpcClient().getLoginMethod();
            setLoginMethod(method);
        } catch (e) {
            console.error("Failed to fetch login method:", e);
        }
    };

    useEffect(() => { fetchUsage(); fetchLoginMethod(); }, []);

    const handleCheckpointRestore = async (checkpointId: string) => {
        try {
            // Call backend to restore checkpoint (files + chat history)
            await rpcClient.getAiPanelRpcClient().restoreCheckpoint({ checkpointId });

            // Fetch updated messages from backend
            const updatedMessages = await rpcClient.getAiPanelRpcClient().getChatMessages();
            const uiMessages = convertToUIMessages(updatedMessages);
            setMessages(uiMessages);

            // Update available checkpoint IDs after restore (checkpoints are trimmed during restore)
            const checkpoints = await rpcClient.getAiPanelRpcClient().getCheckpoints();
            const checkpointIds = checkpoints.map(cp => cp.id);
            setAvailableCheckpointIds(new Set(checkpointIds));

            // Reset UI state
            setIsLoading(false);
            setIsCodeLoading(false);
            setDocGenIntermediaryState(null);
            setIsAddingToWorkspace(false);
            setCurrentFileArray([]);
            setLastQuestionIndex(-1);
            setCurrentGeneratingPromptIndex(-1);
            setHasActiveReview(false);
        } catch (error) {
            console.error("Failed to restore checkpoint:", error);
        }
    };

    useEffect(() => {
        const initializeCheckpoints = async () => {
            try {
                // Fetch available checkpoints
                const checkpoints = await rpcClient.getAiPanelRpcClient().getCheckpoints();
                const checkpointIds = checkpoints.map(cp => cp.id);
                setAvailableCheckpointIds(new Set(checkpointIds));
            } catch (error) {
                console.error("[AIChat] Failed to initialize checkpoints:", error);
            }
        };

        initializeCheckpoints();
    }, [rpcClient]);



    useEffect(() => {
        const handleApprovalOverlay = (data: ApprovalOverlayState) => {
            console.log("[AIChat] Approval overlay notification:", data);
            setApprovalOverlay(data);
        };

        rpcClient.onApprovalOverlayState(handleApprovalOverlay);
    }, [rpcClient]);

    useEffect(() => {
        rpcClient.onWebToolToggle((payload: WebToolToggle) => {
            setIsWebToolsEnabled(payload.active ? true : userWebSearchPreferenceRef.current);
        });
    }, [rpcClient]);

    /**
     * Effect: Load initial chat history from aiChatMachine context
     */
    useEffect(function loadInitialChatHistory() {
        const loadHistory = async () => {
            try {
                const historyMessages = await rpcClient.getAiPanelRpcClient().getChatMessages();
                if (historyMessages && historyMessages.length > 0) {
                    const uiMessages = convertToUIMessages(historyMessages);
                    setMessages((prevMessages) => (prevMessages.length > 0 ? prevMessages : uiMessages));
                }
            } catch (error) {
                console.error('[AIChat] Failed to load initial chat history:', error);
                // Continue with empty messages - don't block the UI
            }
        };

        loadHistory();
    }, [rpcClient]);

    rpcClient?.onCheckpointCaptured(async (payload: { messageId: string; checkpointId: string }) => {
        setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages];
            for (let i = updatedMessages.length - 1; i >= 0; i--) {
                if (updatedMessages[i].type === "user_message" && !updatedMessages[i].checkpointId) {
                    updatedMessages[i] = {
                        ...updatedMessages[i],
                        checkpointId: payload.checkpointId,
                        messageId: payload.messageId
                    };
                    break;
                }
            }
            return updatedMessages;
        });

        // Update available checkpoint IDs after a new checkpoint is captured
        // This ensures the set reflects any cleanup of old checkpoints (maxCount enforcement)
        try {
            const checkpoints = await rpcClient.getAiPanelRpcClient().getCheckpoints();
            const checkpointIds = checkpoints.map(cp => cp.id);
            setAvailableCheckpointIds(new Set(checkpointIds));
        } catch (error) {
            console.error("[AIChat] Failed to update available checkpoint IDs:", error);
        }
    });

    rpcClient?.onChatNotify(async (response: ChatNotify) => {
        const type = response.type;

        if (type === "content_block") {
            const content = response.content;
            if (content === "") return;
            setMessages(prevMessages => {
                const msgs = [...prevMessages];
                const targetIndex = ensureAssistantMessage(msgs);
                const last = msgs[targetIndex];
                const entries = parseStream(last.content);
                // Merge into trailing text item of the last entry if possible, otherwise append
                if (entries.length > 0) {
                    const lastEntry = entries[entries.length - 1];
                    const lastItem = lastEntry.items[lastEntry.items.length - 1];
                    if (lastItem?.kind === "text") {
                        const updatedItems = [...lastEntry.items.slice(0, -1), { ...lastItem, text: lastItem.text + content }];
                        const updated = [...entries.slice(0, -1), { ...lastEntry, items: updatedItems }];
                        msgs[targetIndex] = { ...last, content: serializeStream(updated, last.content) };
                        return msgs;
                    }
                }
                const updated = appendToLastEntry(entries, { kind: "text", text: content });
                msgs[targetIndex] = { ...last, content: serializeStream(updated, last.content) };
                return msgs;
            });

        } else if (type === "tool_call") {
            const newItem: StreamItem = { kind: "tool_call", toolCallId: response.toolCallId, toolName: response.toolName, toolInput: response.toolInput };
            setMessages(prevMessages => {
                const msgs = [...prevMessages];
                const targetIndex = ensureAssistantMessage(msgs);
                const last = msgs[targetIndex];
                const entries = parseStream(last.content);
                const updated = appendToLastEntry(entries, newItem);
                msgs[targetIndex] = { ...last, content: serializeStream(updated, last.content) };
                return msgs;
            });

        } else if (type === "tool_result") {
            if (response.toolName === "TaskWrite") {
                const tasks: Array<{ status: string; description: string }> = response.toolOutput?.tasks ?? [];
                const inProgressTask = tasks.find(t => t.status === "in_progress");
                const lastCompletedTask = [...tasks].reverse().find(t => t.status === "completed");
                setMessages(prevMessages => {
                    const msgs = [...prevMessages];
                    const targetIndex = ensureAssistantMessage(msgs);
                    const last = msgs[targetIndex];
                    let entries = parseStream(last.content);
                    if (inProgressTask) {
                        // Push a named entry for this task (skip if already present)
                        if (entries.some(e => e.description === inProgressTask.description)) return prevMessages;
                        entries = [...entries, { description: inProgressTask.description, items: [], status: "in_progress" as const }];
                    } else {
                        // Mark the just-completed named entry as done
                        if (lastCompletedTask) {
                            entries = entries.map(e =>
                                e.description === lastCompletedTask.description
                                    ? { ...e, status: "completed" as const }
                                    : e
                            );
                        }
                        // Push a floating entry for subsequent content (if not already present)
                        const lastEntry = entries[entries.length - 1];
                        if (!lastEntry || lastEntry.description !== "") {
                            entries = [...entries, { description: "", items: [] }];
                        }
                    }
                    msgs[targetIndex] = { ...last, content: serializeStream(entries, last.content) };
                    return msgs;
                });
            } else {
                // Replace the matching tool_call item with tool_result
                setMessages(prevMessages => {
                    const msgs = [...prevMessages];
                    const targetIndex = ensureAssistantMessage(msgs);
                    const last = msgs[targetIndex];
                    const entries = parseStream(last.content);
                    const resultItem: StreamItem = { kind: "tool_result", toolCallId: response.toolCallId, toolName: response.toolName, toolOutput: response.toolOutput, failed: (response as any).failed };
                    let matched = false;
                    const updated = entries.map(entry => {
                        if (matched) return entry;
                        const idx = entry.items.findIndex(i => i.kind === "tool_call" && i.toolCallId === response.toolCallId);
                        if (idx === -1) return entry;
                        matched = true;
                        const updatedItems = entry.items.map((item, i) => i === idx ? resultItem : item);
                        return { ...entry, items: updatedItems };
                    });
                    if (!matched) {
                        // No matching call found — append as new item to last entry
                        msgs[targetIndex] = { ...last, content: serializeStream(appendToLastEntry(entries, resultItem), last.content) };
                    } else {
                        msgs[targetIndex] = { ...last, content: serializeStream(updated, last.content) };
                    }
                    return msgs;
                });
            }

        } else if (type === "task_approval_request") {
            if (response.approvalType === "plan") {
                setMessages(prevMessages => {
                    const msgs = [...prevMessages];
                    const targetIndex = ensureAssistantMessage(msgs);
                    const last = msgs[targetIndex];
                    const entries = parseStream(last.content);
                    const planItem: StreamItem = { kind: "plan", tasks: response.tasks, message: response.message };
                    const updated = appendToLastEntry(entries, planItem);
                    msgs[targetIndex] = { ...last, content: serializeStream(updated, last.content) };
                    return msgs;
                });
            }

            if (isAutoApproveEnabled && response.approvalType === "completion") {
                await rpcClient.getAiPanelRpcClient().approveTask({ requestId: response.requestId });
                return;
            }

            setApprovalRequest({
                type: "task_approval_request",
                requestId: response.requestId,
                approvalType: response.approvalType,
                tasks: response.tasks,
                taskDescription: response.taskDescription,
                message: response.message,
            });

        } else if (type === "web_tool_approval_request") {
            setWebToolApprovalRequest({
                requestId: response.requestId,
                toolName: response.toolName,
                content: response.content,
            });

        } else if (type === "intermediary_state") {
            const state = response.state;
            if ("serviceName" in state && "documentation" in state) {
                setDocGenIntermediaryState(state as DocumentationGeneratorIntermediaryState);
            }

        } else if (type === "generated_sources") {
            setCurrentFileArray(response.fileArray);

        } else if (type === "connector_generation_notification") {
            const connectorNotification = response as any;
            const connectorData = {
                requestId: connectorNotification.requestId,
                stage: connectorNotification.stage,
                serviceName: connectorNotification.serviceName,
                serviceDescription: connectorNotification.serviceDescription,
                spec: connectorNotification.spec,
                connector: connectorNotification.connector,
                error: connectorNotification.error,
                message: connectorNotification.message,
                inputMethod: connectorNotification.inputMethod,
                sourceIdentifier: connectorNotification.sourceIdentifier
            };
            setMessages(prevMessages => {
                const msgs = [...prevMessages];
                const targetIndex = ensureAssistantMessage(msgs);
                const last = msgs[targetIndex];
                const entries = parseStream(last.content);
                let found = false;
                let updated = entries.map(entry => {
                    const idx = entry.items.findIndex(item => item.kind === "connector" && (item.data as any)?.requestId === connectorData.requestId);
                    if (idx === -1) return entry;
                    found = true;
                    return { ...entry, items: entry.items.map((item, i) => i === idx ? { kind: "connector" as const, data: connectorData } : item) };
                });
                if (!found) updated = appendToLastEntry(entries, { kind: "connector", data: connectorData });
                msgs[targetIndex] = { ...last, content: serializeStream(updated, last.content) };
                return msgs;
            });

        } else if (type === "configuration_collection_event") {
            const configurationNotification = response as any;
            const configurationData: ConfigurationCollectionData = {
                requestId: configurationNotification.requestId,
                stage: configurationNotification.stage,
                variables: configurationNotification.variables,
                existingValues: configurationNotification.existingValues,
                message: configurationNotification.message,
                isTestConfig: configurationNotification.isTestConfig,
                error: configurationNotification.error
            };
            setMessages(prevMessages => {
                const msgs = [...prevMessages];
                const targetIndex = ensureAssistantMessage(msgs);
                const last = msgs[targetIndex];
                const entries = parseStream(last.content);
                let found = false;
                let updated = entries.map(entry => {
                    const idx = entry.items.findIndex(item => item.kind === "config" && (item.data as any)?.requestId === configurationData.requestId);
                    if (idx === -1) return entry;
                    found = true;
                    return { ...entry, items: entry.items.map((item, i) => i === idx ? { kind: "config" as const, data: configurationData } : item) };
                });
                if (!found) updated = appendToLastEntry(entries, { kind: "config", data: configurationData });
                msgs[targetIndex] = { ...last, content: serializeStream(updated, last.content) };
                return msgs;
            });

        } else if (type === "diagnostics") {
            currentDiagnosticsRef.current = response.diagnostics;

        } else if ((response as any).type === "chat_component") {
            const { componentType, data } = response as any;
            setMessages(prevMessages => {
                const msgs = [...prevMessages];
                const targetIndex = ensureAssistantMessage(msgs);
                const last = msgs[targetIndex];
                const entries = parseStream(last.content);
                // For "review" components, update the existing item by merging data instead of appending
                let found = false;
                let updated = entries.map(entry => {
                    const idx = entry.items.findIndex(item => item.kind === "component" && (item as any).componentType === componentType);
                    if (idx === -1) return entry;
                    found = true;
                    return {
                        ...entry,
                        items: entry.items.map((item, i) =>
                            i === idx
                                ? { ...item, data: { ...(item as any).data, ...data } }
                                : item
                        )
                    };
                });
                if (!found) updated = appendToLastEntry(entries, { kind: "component", componentType, data });
                msgs[targetIndex] = { ...last, content: serializeStream(updated, last.content) };
                return msgs;
            });
            if (componentType === "review") {
                setHasActiveReview(true);
            }

        } else if (type === "messages") {
            messagesRef.current = response.messages;

        } else if (type === "stop") {
            console.log("Received stop signal");
            setIsWebToolsEnabled(userWebSearchPreferenceRef.current);
            setWebToolApprovalRequest(null);
            setIsCodeLoading(false);
            setIsLoading(false);
            fetchUsage();

        } else if (type === "abort") {
            console.log("Received abort signal");
            setIsWebToolsEnabled(userWebSearchPreferenceRef.current);
            setWebToolApprovalRequest(null);
            const abortItem: StreamItem = { kind: "text", text: "*[Request interrupted by user]*" };
            setMessages(prevMessages => {
                const msgs = [...prevMessages];
                const targetIndex = ensureAssistantMessage(msgs);
                const last = msgs[targetIndex];
                const entries = parseStream(last.content);
                const updated = appendToLastEntry(entries, abortItem);
                msgs[targetIndex] = { ...last, content: serializeStream(updated, last.content) };
                return msgs;
            });
            setIsCodeLoading(false);
            setIsLoading(false);

        } else if (type === "save_chat") {
            console.log("Received save_chat signal");
            const assistantIndex = getLatestAssistantMessageIndex(messages);
            const contentToSave = assistantIndex >= 0 ? messages[assistantIndex]?.content : messages[messages.length - 1]?.content;
            await rpcClient.getAiPanelRpcClient().updateChatMessage({
                messageId: response.messageId,
                content: contentToSave || "",
            });

        } else if (type === "error") {
            console.log("Received error signal");
            const errorContent = response.content;
            const errorTemplate = `\n\n<error data-system="true" data-auth="${SYSTEM_ERROR_SECRET}">${errorContent}</error>`;
            setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                const targetIndex = ensureAssistantMessage(newMessages);
                let content = newMessages[targetIndex].content;

                // Check if there's an unclosed code block and close it properly
                const codeBlockPattern = /<code filename="[^"]+">[\s]*```\w+/g;
                const openCodeBlocks = (content.match(codeBlockPattern) || []).length;
                const closedCodeBlocks = (content.match(/<\/code>/g) || []).length;

                if (openCodeBlocks > closedCodeBlocks) {
                    const endsWithPartialClose = /```\s*<\/cod?e?$/.test(content.trim());
                    const endsWithBackticks = /```\s*$/.test(content.trim());
                    const endsWithPartialBackticks = /`{1,2}$/.test(content.trim());

                    if (endsWithPartialClose) {
                        content = content.replace(/```\s*<\/cod?e?$/, "");
                        content += "\n```\n</code>";
                    } else if (endsWithBackticks) {
                        content += "\n</code>";
                    } else if (endsWithPartialBackticks) {
                        content = content.replace(/`{1,2}$/, "");
                        content += "\n```\n</code>";
                    } else {
                        content += "\n```\n</code>";
                    }
                }

                newMessages[targetIndex].content = content + errorTemplate;
                return newMessages;
            });
            setIsCodeLoading(false);
            setIsLoading(false);
            isErrorChunkReceivedRef.current = true;
        }
    });

    function generateNaturalProgrammingTemplate(isReqFileExists: boolean) {
        if (isReqFileExists) {
            upsertTemplate(
                commandTemplates,
                Command.NaturalProgramming,
                getTemplateById("code-doc-drift-check", NATURAL_PROGRAMMING_TEMPLATES)
            );
            upsertTemplate(
                commandTemplates,
                Command.NaturalProgramming,
                getTemplateById("generate-code-from-requirements", NATURAL_PROGRAMMING_TEMPLATES)
            );
            upsertTemplate(
                commandTemplates,
                Command.NaturalProgramming,
                getTemplateById("generate-test-from-requirements", NATURAL_PROGRAMMING_TEMPLATES)
            );
            removeTemplate(commandTemplates, Command.NaturalProgramming, "generate-code-from-following-requirements");
        } else {
            upsertTemplate(
                commandTemplates,
                Command.NaturalProgramming,
                getTemplateById("generate-code-from-following-requirements", NATURAL_PROGRAMMING_TEMPLATES)
            );
            upsertTemplate(
                commandTemplates,
                Command.NaturalProgramming,
                getTemplateById("code-doc-drift-check", NATURAL_PROGRAMMING_TEMPLATES)
            );
            upsertTemplate(
                commandTemplates,
                Command.NaturalProgramming,
                getTemplateById("generate-test-from-requirements", NATURAL_PROGRAMMING_TEMPLATES)
            );
            removeTemplate(commandTemplates, Command.NaturalProgramming, "generate-code-from-requirements");
        }
    }

    useEffect(() => {
        generateNaturalProgrammingTemplate(isReqFileExists);
    }, [isReqFileExists]);

    useEffect(() => {
        // Step 2: Scroll into view when messages state changes or review bar appears
        // Use a small delay when the review bar just appeared to let the DOM settle
        const doScroll = () => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
            }
        };
        if (hasActiveReview) {
            setTimeout(doScroll, 50);
        } else {
            doScroll();
        }
    }, [messages, hasActiveReview]);

    async function handleSendQuery(content: {
        input: Input[];
        attachments: Attachment[];
        metadata?: Record<string, any>;
    }) {
        // Clear previous generation refs
        currentDiagnosticsRef.current = [];
        functionsRef.current = [];
        lastAttatchmentsRef.current = null;
        setCurrentFileArray([]);

        try {
            await processContent(content);
        } catch (error: any) {
            setIsLoading(false);
            setIsCodeLoading(false);
            if (error.name === "AbortError") {
                updateLastMessage((lastContent) =>
                    lastContent + `\n\n<error data-system="true" data-auth="${SYSTEM_ERROR_SECRET}">Generation stopped by the user</error>`
                );
            } else {
                updateLastMessage((lastContent) => {
                    if (error && "message" in error) {
                        return lastContent + `\n\n<error data-system="true" data-auth="${SYSTEM_ERROR_SECRET}">${error.message}</error>`;
                    }
                    return lastContent + `\n\n<error data-system="true" data-auth="${SYSTEM_ERROR_SECRET}">${error}</error>`;
                });
            }
        }
    }

    async function handleSend(content: { input: Input[]; attachments: Attachment[]; metadata?: Record<string, any> }) {
        setCurrentGeneratingPromptIndex(otherMessages.length);
        setIsPromptExecutedInCurrentWindow(true);
        setFeedbackGiven(null);

        if (content.input.length === 0) {
            return;
        }
        if (hasActiveReview) {
            await rpcClient.getAiPanelRpcClient().acceptChanges().catch((e: unknown) => console.warn("[AIChat] auto-accept failed:", e));
            setHasActiveReview(false);
        }
        // Clear until onCheckpointCaptured repopulates with the new set
        setAvailableCheckpointIds(new Set());
        rpcClient.getAiPanelRpcClient().clearInitialPrompt();
        setMessages((prevMessages) => prevMessages.filter((message) => message.type !== "label"));
        setMessages((prevMessages) => prevMessages.filter((message) => message.type !== "question"));
        setIsLoading(true);
        isErrorChunkReceivedRef.current = false;
        setMessages((prevMessages) =>
            prevMessages.filter((message, index) => index <= lastQuestionIndex || message.type !== "question")
        );

        const stringifiedContent = stringifyInputArrayWithBadges(content.input);
        const uerMessage = getUserMessage([stringifiedContent, content.attachments]);
        setMessages((prevMessages) => [
            ...prevMessages,
            { role: "User", content: uerMessage, type: "user_message" },
            { role: "Copilot", content: "", type: "assistant_message" }, // Add a new message for the assistant
        ]);

        await handleSendQuery(content);
    }

    function getUserMessage(content: [string, Attachment[]]): string {
        const [message, attachments] = content;

        return attachments.reduce((acc, attachment) => {
            return acc + `<attachment>${attachment.name}</attachment>`;
        }, message);
    }

    async function processContent(content: {
        input: Input[];
        attachments: Attachment[];
        metadata?: Record<string, any>;
    }) {
        const inputText = stringifyInputArrayWithBadges(content.input);
        const parsedInput = parseInput(content.input, commandTemplates);
        const attachments = content.attachments;
        let metadata = content.metadata;

        if (parsedInput && "type" in parsedInput && parsedInput.type === "error") {
            throw new Error(parsedInput.message);
        } else if ("text" in parsedInput && !("command" in parsedInput)) {
            await processAgentGeneration(parsedInput.text, attachments);
        } else if ("command" in parsedInput) {
            switch (parsedInput.command) {
                case Command.NaturalProgramming: {
                    let useCase = "";
                    switch (parsedInput.templateId) {
                        case "code-doc-drift-check":
                            await processLLMDiagnostics();
                            break;
                        case "generate-code-from-following-requirements":
                            await rpcClient.getAiPanelRpcClient().updateRequirementSpecification({
                                content: parsedInput.placeholderValues.requirements
                            });
                            setIsReqFileExists(true);

                            useCase = parsedInput.placeholderValues.requirements;
                            await processAgentGeneration(
                                useCase, attachments, "CODE_FOR_USER_REQUIREMENT"
                            );
                            break;
                        case "generate-test-from-requirements":
                            rpcClient.getAiPanelRpcClient().createTestDirecoryIfNotExists();

                            useCase = getTemplateTextById(
                                commandTemplates,
                                Command.NaturalProgramming,
                                "generate-test-from-requirements"
                            );
                            await processAgentGeneration(
                                useCase, attachments, "TESTS_FOR_USER_REQUIREMENT"
                            );
                            break;
                        case "generate-code-from-requirements":
                            useCase = getTemplateTextById(
                                commandTemplates,
                                Command.NaturalProgramming,
                                "generate-code-from-requirements"
                            );
                            await processAgentGeneration(
                                useCase, attachments, "CODE_FOR_USER_REQUIREMENT"
                            );
                            break;
                    }
                    break;
                }
                case Command.DataMap: {
                    switch (parsedInput.templateId) {
                        case "mappings-for-records":
                            // TODO: Update this to use the LS API for validating function names
                            const invalidPattern = /[<>\/\(\)\{\}\[\]\\!@#$%^&*+=|;:'",.?`~]/;
                            if (invalidPattern.test(parsedInput.placeholderValues.functionName)) {
                                throw new Error("Please provide a valid function name without special characters.");
                            }

                            await processMappingParameters(
                                {
                                    inputRecord: parsedInput.placeholderValues.inputRecords
                                        .split(",")
                                        .map((item) => item.trim()),
                                    outputRecord: parsedInput.placeholderValues.outputRecord,
                                    functionName: parsedInput.placeholderValues.functionName,
                                },
                                metadata as ExtendedDataMapperMetadata,
                                attachments
                            );
                            break;
                        case "mappings-for-function":
                            await processMappingParameters(
                                {
                                    inputRecord: [],
                                    outputRecord: "",
                                    functionName: parsedInput.placeholderValues.functionName,
                                },
                                metadata as ExtendedDataMapperMetadata,
                                attachments
                            );
                            break;
                        case "inline-mappings":
                            await processInlineMappingParameters(
                                metadata as ExtendedDataMapperMetadata,
                                attachments
                            );
                            break;
                    }
                    break;
                }
                case Command.TypeCreator: {
                    switch (parsedInput.templateId) {
                        case "types-for-attached":
                            if (attachments) {
                                await processContextTypeCreation(attachments);
                                break;
                            } else {
                                throw new Error("Error: Missing Attach context");
                            }
                    }
                    break;
                }
                // case Command.Healthcare: {
                //     switch (parsedInput.templateId) {
                //         case TemplateId.Wildcard:
                //             await processHealthcareCodeGeneration(parsedInput.text, inputText);
                //             break;
                //     }
                //     break;
                // }
                case Command.Ask: {
                    switch (parsedInput.templateId) {
                        case TemplateId.Wildcard:
                            await findInDocumentation(parsedInput.text, inputText);
                            break;
                    }
                    break;
                }
                case Command.OpenAPI: {
                    switch (parsedInput.templateId) {
                        case TemplateId.Wildcard:
                            await processOpenAPICodeGeneration(parsedInput.text, inputText);
                            break;
                    }
                    break;
                }
                case Command.Doc: {
                    switch (parsedInput.templateId) {
                        case "generate-user-doc":
                            await processUserDocGeneration(parsedInput.placeholderValues.servicename);
                            break;
                    }
                    break;
                }
            }
        }
    }

    const handleAddAllCodeSegmentsToWorkspace = async (
        codeSegments: any,
        setIsCodeAdded: React.Dispatch<React.SetStateAction<boolean>>,
        command: string    ) => {
        console.log("Add to integration called. Command: ", command);
        const fileChanges: FileChanges[] = [];
        for (let { segmentText, filePath } of codeSegments) {
            fileChanges.push({
                filePath: filePath,
                content: segmentText,
            });
        }
        await rpcClient.getAiPanelRpcClient().addFilesToProject({
            fileChanges: fileChanges,
        })
        setIsAddingToWorkspace(true);
    };

    const handleRevertChanges = async (
        codeSegments: any,
        setIsCodeAdded: React.Dispatch<React.SetStateAction<boolean>>,
        command: string
    ) => {
        console.log("Revert gration called. Command: ", command);
        setIsAddingToWorkspace(true);
    };

    async function processUserDocGeneration(serviceName: string) {
        try {
            const requestBody: DocGenerationRequest = {
                type: DocGenerationType.User,
                serviceName: serviceName,
            };

            await rpcClient.getAiPanelRpcClient().getGeneratedDocumentation(requestBody);
        } catch (error: any) {
            setIsLoading(false);
            const errorName = error instanceof Error ? error.name : "Unknown error";
            const errorMessage = "message" in error ? error.message : "Unknown error";

            if (errorName === "AbortError") {
                throw new Error("Failed: The user cancelled the request.");
            } else {
                throw new Error(errorMessage);
            }
        }
    }

    async function processMappingParameters(
        parameters: MappingParameters,
        metadata?: ExtendedDataMapperMetadata,
        attachments?: Attachment[]
    ) {
        await rpcClient.getAiPanelRpcClient().generateMappingCode({
            parameters,
            metadata,
            attachments
        });
    }

    async function processInlineMappingParameters(
        metadata: ExtendedDataMapperMetadata,
        attachments?: Attachment[]
    ) {
        await rpcClient.getAiPanelRpcClient().generateInlineMappingCode({
            metadata,
            attachments
        });
    }

    async function processContextTypeCreation(attachments: Attachment[]) {
        if (!attachments || attachments.length === 0) {
            throw new Error(`Missing attachment`);
        }

        await rpcClient.getAiPanelRpcClient().generateContextTypes({
            attachments
        });
    }

    async function findInDocumentation(messageBody: string, message: string) {
        let assistant_response = "";
        let formatted_response = ";";
        setIsLoading(true);
        try {
            assistant_response = await rpcClient.getAiPanelRpcClient().getFromDocumentation(messageBody);
            formatted_response = assistant_response.replace(
                /^([ \t]*)```ballerina\s*\n([\s\S]*?)^[ \t]*```/gm,
                (_, indent, codeBlock) => {
                    // Remove the common indent from all lines in the code block
                    const cleanedCode = codeBlock
                        .split("\n")
                        .map((line: string) => (line.startsWith(indent) ? line.slice(indent.length) : line))
                        .join("\n");

                    return `<inlineCode>\n${cleanedCode}\n<inlineCode>`;
                }
            );

            const referenceRegex = /reference sources:\s*((?:<https?:\/\/[^\s>]+>\s*)+)/;
            const match = formatted_response.match(referenceRegex);

            if (match) {
                const references = match[1].trim().split(/\s+/);
                const referencesTag = `<references>${JSON.stringify(references)}<references>`;
                formatted_response = formatted_response.replace(referenceRegex, referencesTag);
            }

            updateLastMessage(() => formatted_response);
            setIsLoading(false);
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    }

    async function processOpenAPICodeGeneration(useCase: string, message: string) {
        const requestBody: any = {
            query: useCase,
            chatHistory: [],
        };

        await rpcClient.getAiPanelRpcClient().generateOpenAPI(requestBody);
    }

    async function processAgentGeneration(useCase: string, attachments: Attachment[], operationType?: OperationType) {
        const fileAttatchments = attachments.map((file) => ({
            fileName: file.name,
            content: file.content,
        }));

        const currentCodeContext = codeContextRef.current;
        console.log("Submitting agent prompt:", { useCase, agentMode, codeContext: currentCodeContext, operationType, fileAttatchments });
        rpcClient.getAiPanelRpcClient().generateAgent({
            usecase: useCase, isPlanMode: agentMode === AgentMode.Plan, codeContext: currentCodeContext, operationType, fileAttachmentContents: fileAttatchments, webSearchEnabled: isWebToolsEnabled
        })
    }

    async function handleStop() {
        // Call RPC with empty params (defaults to current workspace + 'default' thread)
        rpcClient.getAiPanelRpcClient().abortAIGeneration({});

        setIsLoading(false);
        setIsCodeLoading(false);
    }

    async function handleSettings() {
        setShowSettings(true);
    }

    async function handleClearChat(): Promise<void> {
        setMessages([]);
        setApprovalRequest(null);
        await rpcClient.getAiPanelRpcClient().clearChat();
    }

    const handleToggleAutoApprove = () => {
        const newValue = !isAutoApproveEnabled;
        setIsAutoApproveEnabled(newValue);
    };

    const handleToggleWebSearch = () => {
        const next = !isWebToolsEnabled;
        userWebSearchPreferenceRef.current = next;
        setIsWebToolsEnabled(next);
    };

    const handleChangeAgentMode = (mode: AgentMode) => {
        // message.content is already up-to-date with the serialized agent stream — nothing to persist here
        setAgentMode(mode);
    };

    const questionMessages = messages.filter((message) => message.type === "question");
    if (questionMessages.length > 0) {
        // localStorage.setItem(
        //     `Question-AIGenerationChat-${projectUuid}`,
        //     questionMessages[questionMessages.length - 1].content
        // );
    }
    const otherMessages = messages.filter((message) => message.type !== "question");
    useEffect(() => {
        // Set the currentGeneratingPromptIndex to the last prompt index whenever otherMessages updates
        if (otherMessages.length > 0) {
            setCurrentGeneratingPromptIndex(otherMessages.length - 1);
        }
    }, [otherMessages.length]);


    const updateReviewStatus = (message: { role: string; content: string; type: string }, newStatus: "discarded") => {
        setMessages(prevMessages => {
            const msgs = [...prevMessages];
            const idx = msgs.findIndex(m => m === message);
            if (idx === -1) return prevMessages;
            const entries = parseStream(msgs[idx].content);
            const updated = entries.map(entry => ({
                ...entry,
                items: entry.items.map(item =>
                    item.kind === "component" && (item as any).componentType === "review"
                        ? { ...item, data: { ...(item as any).data, status: newStatus } }
                        : item
                )
            }));
            msgs[idx] = { ...msgs[idx], content: serializeStream(updated, msgs[idx].content) };
            return msgs;
        });
    };

    const saveDocumentation = async () => {
        if (!docGenIntermediaryState) return;

        setIsAddingToWorkspace(true);
        try {
            rpcClient.getAiPanelRpcClient().addFilesToProject({
                fileChanges: [
                    {
                        filePath: `docs/api_doc.md`,
                        content: docGenIntermediaryState.documentation,
                    },
                ],
            });

            // Update the stream item to show "Saved" state
            setMessages((prevMessages) => {
                const msgs = [...prevMessages];
                const targetIndex = msgs.findLastIndex((m: any) => m.actor === "copilot");
                if (targetIndex === -1) return prevMessages;
                const last = msgs[targetIndex];
                const entries = parseStream(last.content);
                const updated = entries.map((entry: StreamEntry) => ({
                    ...entry,
                    items: entry.items.map((item: StreamItem) =>
                        item.kind === "component" && (item as any).componentType === "button" && (item as any).data.buttonType === "save_documentation"
                            ? { kind: "component" as const, componentType: "button", data: { buttonType: "documentation_saved" } }
                            : item
                    )
                }));
                msgs[targetIndex] = { ...last, content: serializeStream(updated, last.content) };
                return msgs;
            });
        } catch (error) {
            console.error("Error saving documentation:", error);
        } finally {
            setIsAddingToWorkspace(false);
        }
    };

    const regenerateDocumentation = async () => {
        if (!docGenIntermediaryState) return;

        setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            const targetIndex = ensureAssistantMessage(newMessages);
            newMessages[targetIndex].content = "";
            return newMessages;
        });

        setIsLoading(true);
        await rpcClient.getAiPanelRpcClient().getGeneratedDocumentation({
            type: DocGenerationType.User,
            serviceName: docGenIntermediaryState.serviceName,
        });
    };

    const handleRetryRepair = async () => {
        //TODO: Remove this and implement retry UX with agent.
    };

    const handleApprovalApprove = async (enableAutoApprove: boolean) => {
        if (!approvalRequest) return;

        // Update auto-approve setting (managed locally in visualizer)
        if (enableAutoApprove !== isAutoApproveEnabled) {
            setIsAutoApproveEnabled(enableAutoApprove);
        }

        // Approve plan or task
        if (approvalRequest.approvalType === "plan") {
            await rpcClient.getAiPanelRpcClient().approvePlan({
                requestId: approvalRequest.requestId,
                comment: undefined
            });
            // Collapse TodoSection into approval summary — mark plan items as approved
            setMessages(prevMessages => {
                const msgs = [...prevMessages];
                const lastIdx = [...msgs].map(m => m.role).lastIndexOf("Copilot");
                if (lastIdx === -1) return prevMessages;
                const last = msgs[lastIdx];
                const entries = parseStream(last.content);
                const updated = entries.map(entry => ({
                    ...entry,
                    items: entry.items.map(item =>
                        item.kind === "plan" ? { ...item, approvalStatus: "approved" as const } : item
                    )
                }));
                msgs[lastIdx] = { ...last, content: serializeStream(updated, last.content) };
                return msgs;
            });
        } else if (approvalRequest.approvalType === "completion") {
            const reviewTasks = approvalRequest.tasks.filter(t => t.status === "review");
            const lastReviewTask = reviewTasks[reviewTasks.length - 1];

            await rpcClient.getAiPanelRpcClient().approveTask({
                requestId: approvalRequest.requestId,
                approvedTaskDescription: lastReviewTask?.description
            });
        }

        setApprovalRequest(null);
    };

    const handleApprovalReject = async (comment: string) => {
        if (!approvalRequest) return;

        if (approvalRequest.approvalType === "plan") {
            await rpcClient.getAiPanelRpcClient().declinePlan({
                requestId: approvalRequest.requestId,
                comment
            });
            // Collapse TodoSection into revision summary — mark plan items as revised
            setMessages(prevMessages => {
                const msgs = [...prevMessages];
                const lastIdx = [...msgs].map(m => m.role).lastIndexOf("Copilot");
                if (lastIdx === -1) return prevMessages;
                const last = msgs[lastIdx];
                const entries = parseStream(last.content);
                const updated = entries.map(entry => ({
                    ...entry,
                    items: entry.items.map(item =>
                        item.kind === "plan" ? { ...item, approvalStatus: "revised" as const, approvalComment: comment } : item
                    )
                }));
                msgs[lastIdx] = { ...last, content: serializeStream(updated, last.content) };
                return msgs;
            });
        } else if (approvalRequest.approvalType === "completion") {
            await rpcClient.getAiPanelRpcClient().declineTask({
                requestId: approvalRequest.requestId,
                comment
            });
        }

        setApprovalRequest(null);
    };

    const handleWebToolAllow = async () => {
        if (!webToolApprovalRequest) return;
        await rpcClient.getAiPanelRpcClient().approveWebTool({ requestId: webToolApprovalRequest.requestId });
        setWebToolApprovalRequest(null);
    };

    const handleWebToolDeny = async () => {
        if (!webToolApprovalRequest) return;
        await rpcClient.getAiPanelRpcClient().declineWebTool({ requestId: webToolApprovalRequest.requestId });
        setWebToolApprovalRequest(null);
    };

    async function processLLMDiagnostics() {
        let response: LLMDiagnostics = await rpcClient.getAiPanelRpcClient().getDriftDiagnosticContents();

        const responseStatus = response.statusCode;
        const invalidResponse = response == null || response.statusCode == null;

        if (invalidResponse) {
            throw new Error(DRIFT_CHECK_ERROR);
        }

        if (!(responseStatus >= 200 && responseStatus < 300)) {
            throw new Error(DRIFT_CHECK_ERROR);
        }

        if (response.diags == null || response.diags == "") {
            response.diags = NO_DRIFT_FOUND;
        }

        setIsLoading(false);

        setMessages((prevMessages) => {
            const newMessage = [...prevMessages];
            const targetIndex = ensureAssistantMessage(newMessage);
            newMessage[targetIndex].content = response.diags;
            return newMessage;
        });
    }
    return (
        <>
            {!showSettings && (
                <AIChatView style={{ position: "relative" }}>
                    {approvalOverlay.show && (
                        <ApprovalOverlay>
                            <OverlayMessage>{approvalOverlay.message || 'Processing...'}</OverlayMessage>
                        </ApprovalOverlay>
                    )}
                    <Header>
                        {loginMethod === LoginMethod.ANTHROPIC_KEY || loginMethod === LoginMethod.AWS_BEDROCK || loginMethod === LoginMethod.VERTEX_AI ? (
                            <AuthProviderChip>
                                <UsageBadge>
                                    <span className="codicon codicon-key" style={{ fontSize: 11 }} />
                                    {loginMethod === LoginMethod.ANTHROPIC_KEY ? "Anthropic (own key)"
                                        : loginMethod === LoginMethod.AWS_BEDROCK ? "AWS Bedrock (own key)"
                                        : "Vertex AI (own key)"}
                                </UsageBadge>
                            </AuthProviderChip>
                        ) : (
                            <AuthProviderChip>
                                Remaining Usage:
                                <UsageBadge>
                                    {!usage ? "N/A"
                                        : usage.resetsIn === -1 ? "Unlimited"
                                        : isUsageExceeded ? "Exceeded"
                                        : `${Math.round(usage.remainingUsagePercentage)}%`}
                                </UsageBadge>
                                {usage && usage.resetsIn !== -1 && (
                                    <span style={{ fontSize: 10, opacity: 0.7 }} title={formatResetsInExact(usage.resetsIn)}>
                                        Resets in: {formatResetsIn(usage.resetsIn)}
                                    </span>
                                )}
                            </AuthProviderChip>
                        )}
                        <HeaderButtons>
                            {otherMessages.length > 0 && (
                                <Button
                                    appearance="icon"
                                    onClick={() => handleClearChat()}
                                    tooltip="Clear Chat"
                                    disabled={isLoading}
                                >
                                    <Icon name="PlaylistRemove" sx={{ fontSize: "18px", marginRight: 6 }} iconSx={{ position: "relative"}} />
                                    Clear
                                </Button>
                            )}
                            <Button appearance="icon" onClick={() => handleSettings()} tooltip="Settings">
                                <Icon name="SettingsRounded" sx={{ fontSize: "18px", marginRight: 6 }} iconSx={{ position: "relative" }} />
                                Settings
                            </Button>
                        </HeaderButtons>
                    </Header>
                    <main style={{ flex: 1, overflowY: "auto" }}>
                        {Array.isArray(otherMessages) && otherMessages.length === 0 && (
                            <WelcomeMessage isOnboarding={getOnboardingOpens() <= 3.0} />
                        )}
                        {(() => {
                            // Group flat message list into [userMsg, assistantMsg | undefined] pairs for turn-level hover
                            const turns: Array<[typeof otherMessages[0], number, typeof otherMessages[0] | undefined, number | undefined]> = [];
                            let i = 0;
                            while (i < otherMessages.length) {
                                const msg = otherMessages[i];
                                if (msg.role === "User") {
                                    const next = otherMessages[i + 1];
                                    const hasAssistant = next?.role === "Copilot";
                                    turns.push([msg, i, hasAssistant ? next : undefined, hasAssistant ? i + 1 : undefined]);
                                    i += hasAssistant ? 2 : 1;
                                } else {
                                    turns.push([msg, i, undefined, undefined]);
                                    i++;
                                }
                            }
                            const lastAssistantIndex = otherMessages.map((m) => m.role).lastIndexOf("Copilot");

                            return turns.map(([userMsg, userIndex, assistantMsg, assistantIndex], turnIndex) => {
                                const renderMessage = (message: typeof otherMessages[0], index: number) => {
                                    const isLastResponse = index === currentGeneratingPromptIndex;
                                    const isUserMessage = message.role === "User";
                                    const isAssistantMessage = message.role === "Copilot";
                                    const isLatestAssistantMessage = isAssistantMessage && index === lastAssistantIndex;

                            // Note: Cannot use useMemo here as it's inside map() callback
                            // The stateless regex implementation in splitContent() ensures no corruption during streaming
                            const segmentedContent = splitContent(message.content);
                            const hasReviewActions = isLatestAssistantMessage && hasActiveReview;
                            return (
                                <ChatMessage key={index}>
                                    {/* Checkpoint separator before user messages */}
                                    {message.role === "User" && (() => {
                                        // Show "Creating checkpoints..." while loading for the latest user message
                                        // Once done loading, show the restore button
                                        const isLatestUserMessage = index === otherMessages.length - 2;
                                        const shouldShowCreating = isLoading && isLatestUserMessage;
                                        const shouldShowRestore = !isLoading && message.checkpointId;

                                        return (
                                            <>
                                                {/* Show "Creating checkpoints..." while generating for latest message */}
                                                {shouldShowCreating && (
                                                    <CheckpointSeparator
                                                        checkpointId={message.checkpointId}
                                                        isAvailable={false}
                                                        isDisabled={true}
                                                        isCreating={true}
                                                        isGroupHovered={hoveredTurnIndex === turnIndex}
                                                        onRestore={handleCheckpointRestore}
                                                    />
                                                )}
                                                {/* Show restore button when done loading */}
                                                {shouldShowRestore && (
                                                    <CheckpointSeparator
                                                        checkpointId={message.checkpointId}
                                                        isAvailable={availableCheckpointIds.has(message.checkpointId)}
                                                        isDisabled={isLoading}
                                                        isCreating={false}
                                                        isGroupHovered={hoveredTurnIndex === turnIndex}
                                                        onRestore={handleCheckpointRestore}
                                                    />
                                                )}
                                            </>
                                        );
                                    })()}

                                    <MessageBody isUserMessage={isUserMessage}>
                                        {segmentedContent.map((segment, i) => {
                                            if (segment.type === SegmentType.AgentStream) {
                                                const stream = segment.stream ?? [];
                                                const allItems = stream.flatMap((e: StreamEntry) => e.items);
                                                const buttonItems = allItems.filter((item: StreamItem) => item.kind === "component" && (item as any).componentType === "button");
                                                const reviewItem = allItems.find((item: StreamItem) => item.kind === "component" && (item as any).componentType === "review");
                                                return (
                                                    <React.Fragment key={`agent-stream-${i}`}>
                                                        <AgentStreamView
                                                            stream={stream}
                                                            isLoading={isLoading && isLatestAssistantMessage}
                                                            rpcClient={rpcClient}
                                                        />
                                                        {reviewItem && (
                                                            <ReviewBar
                                                                modifiedFiles={(reviewItem as any).data.modifiedFiles ?? []}
                                                                semanticDiffs={(reviewItem as any).data.semanticDiffs}
                                                                loadDesignDiagrams={(reviewItem as any).data.loadDesignDiagrams}
                                                                isWorkspace={(reviewItem as any).data.isWorkspace}
                                                                diffPackageMap={(reviewItem as any).data.diffPackageMap}
                                                                isDiscarded={(reviewItem as any)?.data?.status === "discarded"}
                                                                rpcClient={isLatestAssistantMessage ? rpcClient : undefined}
                                                                isActive={isLatestAssistantMessage && !isLoading && hasActiveReview}
                                                                onDiscarded={() => {
                                                                    updateReviewStatus(message, "discarded");
                                                                    setHasActiveReview(false);
                                                                }}
                                                            />
                                                        )}
                                                        {buttonItems.map((item: StreamItem, ci: number) => {
                                                            const buttonType = (item as any).data.buttonType;
                                                            if (buttonType === "save_documentation" && !isCodeLoading && isLastResponse && !isLoading) {
                                                                return (
                                                                    <div key={`comp-${ci}`} style={{ display: "flex", gap: "10px" }}>
                                                                        <VSCodeButton title="Save Documentation" onClick={saveDocumentation}>Save Documentation</VSCodeButton>
                                                                        <VSCodeButton title="Regenerate documentation" appearance="secondary" onClick={regenerateDocumentation}>
                                                                            <Codicon name="refresh" />
                                                                        </VSCodeButton>
                                                                    </div>
                                                                );
                                                            }
                                                            if (buttonType === "documentation_saved") {
                                                                return <VSCodeButton key={`comp-${ci}`} title="Documentation has been saved" disabled>Saved</VSCodeButton>;
                                                            }
                                                            return null;
                                                        })}
                                                    </React.Fragment>
                                                );
                                            }

                                            if (segment.type === SegmentType.Code) {
                                                const nextSegment = segmentedContent[i + 1];
                                                if (
                                                    nextSegment &&
                                                    (nextSegment.type === SegmentType.Code ||
                                                        (nextSegment.type === SegmentType.Text &&
                                                            (nextSegment.text != "\n" && nextSegment.text.trim() === "")))
                                                ) {
                                                    return;
                                                } else {
                                                    const codeSegments = [];
                                                    let j = i;
                                                    while (j >= 0) {
                                                        const prevSegment = segmentedContent[j];
                                                        if (prevSegment.type === SegmentType.Code) {
                                                            codeSegments.unshift({
                                                                source: prevSegment.text.trim(),
                                                                fileName: prevSegment.fileName,
                                                                language: prevSegment.language,
                                                            });
                                                        } else if (
                                                            prevSegment.type === SegmentType.Text &&
                                                            prevSegment.text.trim() === ""
                                                        ) {
                                                            j--;
                                                            continue;
                                                        } else {
                                                            break;
                                                        }
                                                        j--;
                                                    }
                                                    return (
                                                        <CodeSection
                                                            key={`code-${i}`}
                                                            codeSegments={codeSegments}
                                                            loading={isLoading}
                                                            handleAddAllCodeSegmentsToWorkspace={handleAddAllCodeSegmentsToWorkspace}
                                                            handleRevertChanges={handleRevertChanges}
                                                            isReady={!isCodeLoading}
                                                            message={message}
                                                            buttonsActive={true}
                                                            isSyntaxError={isContainsSyntaxError(currentDiagnosticsRef.current)}
                                                            command={segment.command}
                                                            diagnostics={currentDiagnosticsRef.current}
                                                            onRetryRepair={handleRetryRepair}
                                                            isPromptExecutedInCurrentWindow={isPromptExecutedInCurrentWindow}
                                                            isErrorChunkReceived={isErrorChunkReceivedRef.current}
                                                            isAddingToWorkspace={isAddingToWorkspace}
                                                            fileArray={currentFileArray}
                                                        />
                                                    );
                                                }
                                            } else if (segment.type === SegmentType.ToolCall) {
                                                const currentToolName = segment.toolName;

                                                let nextIdx = i + 1;
                                                while (
                                                    nextIdx < segmentedContent.length &&
                                                    segmentedContent[nextIdx].type === SegmentType.Text &&
                                                    segmentedContent[nextIdx].text.trim() === ""
                                                ) {
                                                    nextIdx++;
                                                }
                                                const nextSeg = segmentedContent[nextIdx];
                                                if (
                                                    nextSeg &&
                                                    nextSeg.type === SegmentType.ToolCall &&
                                                    nextSeg.toolName === currentToolName
                                                ) {
                                                    return null;
                                                }

                                                const groupItems: ToolCallItem[] = [];
                                                let j = i;
                                                while (j >= 0) {
                                                    const seg = segmentedContent[j];
                                                    if (
                                                        seg.type === SegmentType.ToolCall &&
                                                        seg.toolName === currentToolName
                                                    ) {
                                                        groupItems.unshift({
                                                            text: seg.text,
                                                            loading: seg.loading,
                                                            failed: seg.failed,
                                                            toolName: seg.toolName,
                                                        });
                                                    } else if (
                                                        seg.type === SegmentType.Text &&
                                                        seg.text.trim() === ""
                                                    ) {
                                                        j--;
                                                        continue;
                                                    } else {
                                                        break;
                                                    }
                                                    j--;
                                                }

                                                if (groupItems.length === 1) {
                                                    return (
                                                        <ToolCallSegment
                                                            key={`tool-call-${i}`}
                                                            text={segment.text}
                                                            loading={segment.loading}
                                                            failed={segment.failed}
                                                        />
                                                    );
                                                }

                                                return (
                                                    <ToolCallGroupSegment
                                                        key={`tool-call-group-${i}`}
                                                        segments={groupItems}
                                                    />
                                                );
                                            } else if (segment.type === SegmentType.TryItScenarios) {
                                                return (
                                                    <TryItScenariosSegment
                                                        key={`try-it-scenarios-${i}`}
                                                        text={segment.text}
                                                        loading={segment.loading}
                                                    />
                                                );
                                            } else if (segment.type === SegmentType.Todo) {
                                                return (
                                                    <TodoSection
                                                        key={`todo-${i}`}
                                                        tasks={segment.tasks || []}
                                                        message={segment.message}
                                                    />
                                                );
                                            } else if (segment.type === SegmentType.SpecFetcher) {
                                                return (
                                                    <ConnectorGeneratorSegment
                                                        key={`connector-generator-${i}`}
                                                        data={segment.specData}
                                                        rpcClient={rpcClient}
                                                    />
                                                );
                                            } else if (segment.type === SegmentType.ConfigurationCollector) {
                                                return (
                                                    <ConfigurationCollectorSegment
                                                        key={`configuration-collector-${i}`}
                                                        data={segment.configurationData}
                                                        rpcClient={rpcClient}
                                                    />
                                                );
                                            } else if (segment.type === SegmentType.Attachment) {
                                                return (
                                                    <AttachmentsContainer>
                                                        {segment.text.split(",").map((fileName: string, attachmentIndex: number) => (
                                                            <AttachmentBox
                                                                key={`attachment-${i}-${attachmentIndex}`}
                                                                status={AttachmentStatus.Success}
                                                                fileName={fileName.trim()}
                                                                index={attachmentIndex}
                                                                removeAttachment={null}
                                                                readOnly={true}
                                                            />
                                                        ))}
                                                    </AttachmentsContainer>
                                                );
                                            } else if (segment.type === SegmentType.InlineCode) {
                                                return (
                                                    <CodeSegment
                                                        key={`code-segment-${i}`}
                                                        source={segment.text}
                                                        fileName={"Ballerina"}
                                                        language={"ballerina"}
                                                        collapsible={false}
                                                        showCopyButton={true}
                                                    />
                                                );
                                            } else if (segment.type === SegmentType.References) {
                                                return <ReferenceDropdown key={`references-${i}`} links={JSON.parse(segment.text)} />;
                                            } else {
                                                if (message.type === "Error") {
                                                    return <ErrorBox key={`error-${i}`}>{segment.text}</ErrorBox>;
                                                }
                                                return <MarkdownRenderer key={`markdown-${i}`} markdownContent={segment.text} />;
                                            }
                                        })}
                                    </MessageBody>
                                    {/* Show feedback bar only for the latest assistant message and when loading is complete, but not if review actions are present */}
                                    {isAssistantMessage && isLatestAssistantMessage && !isLoading && !isCodeLoading && !hasReviewActions && (
                                        <FeedbackBar
                                            messageIndex={index}
                                            onFeedback={handleFeedback}
                                            currentFeedback={feedbackGiven}
                                        />
                                    )}
                                </ChatMessage>
                            );
                        };

                                return (
                                    <TurnGroup
                                        key={userIndex}
                                        onMouseEnter={() => setHoveredTurnIndex(turnIndex)}
                                        onMouseLeave={() => setHoveredTurnIndex(null)}
                                    >
                                        {renderMessage(userMsg, userIndex)}
                                        {assistantMsg !== undefined && renderMessage(assistantMsg, assistantIndex!)}
                                    </TurnGroup>
                                );
                            });
                        })()}
                        <div ref={messagesEndRef} />
                    </main>
                    {webToolApprovalRequest ? (
                        <CommonApprovalFooter
                            type="web_tool"
                            toolName={webToolApprovalRequest.toolName}
                            content={webToolApprovalRequest.content}
                            onAllow={handleWebToolAllow}
                            onDeny={handleWebToolDeny}
                        />
                    ) : approvalRequest ? (
                        <CommonApprovalFooter
                            type={approvalRequest.approvalType}
                            onApprove={handleApprovalApprove}
                            onReject={handleApprovalReject}
                        />
                    ) : (
                        <Footer
                            aiChatInputRef={aiChatInputRef}
                            tagOptions={{
                                placeholderTags: placeholderTags,
                                loadGeneralTags: loadGeneralTags,
                                injectPlaceholderTags: injectPlaceholderTags,
                            }}
                            attachmentOptions={{
                                multiple: true,
                                acceptResolver: acceptResolver,
                                handleAttachmentSelection: handleAttachmentSelection,
                            }}
                            inputPlaceholder="Describe your integration..."
                            onSend={handleSend}
                            onStop={handleStop}
                            isLoading={isLoading}
                            showSuggestedCommands={Array.isArray(otherMessages) && otherMessages.length === 0}
                            codeContext={codeContext}
                            onRemoveCodeContext={() => updateCodeContext(undefined)}
                            agentMode={agentMode}
                            onChangeAgentMode={handleChangeAgentMode}
                            isAutoApproveEnabled={isAutoApproveEnabled}
                            onDisableAutoApprove={handleToggleAutoApprove}
                            isWebToolsEnabled={isWebToolsEnabled}
                            onToggleWebSearch={handleToggleWebSearch}
                            disabled={isUsageExceeded}
                        />
                    )}
                </AIChatView>
            )}
            {showSettings && <SettingsPanel onClose={() => setShowSettings(false)}></SettingsPanel>}
        </>
    );
};

export default AIChat;
