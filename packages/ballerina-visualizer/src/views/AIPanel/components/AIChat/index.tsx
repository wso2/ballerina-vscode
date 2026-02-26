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
import {
    GetWorkspaceContextResponse,
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
} from "@wso2/ballerina-core";

import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Codicon } from "@wso2/ui-toolkit";

import { AIChatInputRef } from "../AIChatInput";
import ProgressTextSegment from "../ProgressTextSegment";
import ToolCallSegment from "../ToolCallSegment";
import ToolCallGroupSegment, { ToolCallItem } from "../ToolCallGroupSegment";
import TryItScenariosSegment from "../TryItScenariosSegment";
import TodoSection from "../TodoSection";
import PlanStepper, { ExecutionTask, ExecutionEvent } from "../PlanStepper";
import { ConnectorGeneratorSegment } from "../ConnectorGeneratorSegment";
import { ConfigurationCollectorSegment, ConfigurationCollectionData } from "../ConfigurationCollectorSegment";
import RoleContainer from "../RoleContainter";
import CheckpointSeparator from "../CheckpointSeparator";
import { Attachment, AttachmentStatus, TaskApprovalRequest } from "@wso2/ballerina-core";

import { AIChatView, Header, HeaderButtons, ChatMessage, Badge, ResetsInBadge, ApprovalOverlay, OverlayMessage } from "../../styles";
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
import ApprovalFooter from "./Footer/ApprovalFooter";
import { useFooterLogic } from "./Footer/useFooterLogic";
import { SettingsPanel } from "../../SettingsPanel";
import WelcomeMessage from "./Welcome";
import { getOnboardingOpens, incrementOnboardingOpens, convertToUIMessages, isContainsSyntaxError, ChatIndexes } from "./utils/utils";

import FeedbackBar from "./../FeedbackBar";
import { useFeedback } from "./utils/useFeedback";
import { SegmentType, splitContent } from "./segment";
import ReviewActions from "../ReviewActions";

const NO_DRIFT_FOUND = "No drift identified between the code and the documentation.";
const DRIFT_CHECK_ERROR = "Failed to check drift between the code and the documentation. Please try again.";

const GENERATE_CODE_AGAINST_THE_PROVIDED_REQUIREMENTS = "Generate code based on the following requirements: ";
const GENERATE_CODE_AGAINST_THE_PROVIDED_REQUIREMENTS_TRIMMED = GENERATE_CODE_AGAINST_THE_PROVIDED_REQUIREMENTS.trim();

const USAGE_EXCEEDED_THRESHOLD_PERCENT = 3;

/**
 * Formats a file path into a user-friendly display name
 * - Removes .bal extension
 * - Replaces _ and - with spaces
 * - Preserves directory structure for context (e.g., "tests/")
 */
function formatFileNameForDisplay(filePath: string): string {
    // Remove .bal extension
    let displayName = filePath.replace(/\.bal$/, '');

    // Extract directory and filename
    const lastSlashIndex = displayName.lastIndexOf('/');
    if (lastSlashIndex !== -1) {
        const directory = displayName.substring(0, lastSlashIndex + 1);
        const fileName = displayName.substring(lastSlashIndex + 1);

        // Replace _ and - with spaces in the filename only
        const formattedFileName = fileName.replace(/[_-]/g, ' ');
        displayName = directory + formattedFileName;
    } else {
        // No directory, just format the filename
        displayName = displayName.replace(/[_-]/g, ' ');
    }

    return displayName;
}

//TODO: Add better error handling from backend. stream error type and non 200 status codes

// ── Plan mode execution stream helpers ────────────────────────────────────────

function getPlanModeToolCallLabel(toolName: string, toolInput: any): string {
    switch (toolName) {
        case "TaskWrite": return "Planning...";
        case "LibrarySearchTool": {
            const desc = toolInput?.searchDescription;
            return desc ? `Searching for ${desc}...` : "Searching libraries...";
        }
        case "LibraryGetTool": return "Fetching library details...";
        case "HealthcareLibraryProviderTool": return "Analyzing healthcare libraries...";
        case "file_write": return `Creating ${formatFileNameForDisplay(toolInput?.fileName || "file")}...`;
        case "file_edit": return `Updating ${formatFileNameForDisplay(toolInput?.fileName || "file")}...`;
        case "file_batch_edit": return `Editing files...`;
        case "getCompilationErrors": return "Checking for errors...";
        case "ConnectorGeneratorTool": return "Generating connector...";
        case "ConfigCollector": return "Reading config...";
        case "runTests": return "Running tests...";
        default: return "Working...";
    }
}

function getPlanModeToolResultLabel(toolName: string, toolOutput: any): string {
    switch (toolName) {
        case "LibrarySearchTool": {
            const desc = toolOutput?.searchDescription;
            return desc ? `${desc.charAt(0).toUpperCase() + desc.slice(1)} search completed` : "Library search completed";
        }
        case "LibraryGetTool": {
            const names = toolOutput || [];
            return names.length > 0 ? `Fetched libraries: [${names.join(", ")}]` : "No relevant libraries found";
        }
        case "HealthcareLibraryProviderTool": {
            const names = toolOutput || [];
            return names.length > 0 ? `Fetched healthcare libraries: [${names.join(", ")}]` : "No relevant healthcare libraries found";
        }
        case "file_write": return toolOutput?.action === "updated" ? `Updated ${formatFileNameForDisplay(toolOutput?.fileName || "file")}` : `Created ${formatFileNameForDisplay(toolOutput?.fileName || "file")}`;
        case "file_edit": return `Updated ${formatFileNameForDisplay(toolOutput?.fileName || "file")}`;
        case "file_batch_edit": return "Files updated";
        case "getCompilationErrors": return toolOutput?.diagnostics?.length > 0 ? `Found ${toolOutput.diagnostics.length} error(s)` : "No issues found";
        case "ConnectorGeneratorTool": return "Connector ready";
        case "ConfigCollector": return "Config loaded";
        case "runTests": return toolOutput?.summary ?? "Tests completed";
        default: return "Done";
    }
}

function serializeExecutionStream(stream: ExecutionTask[]): string {
    return `<executionstream>${JSON.stringify({ tasks: stream })}</executionstream>`;
}

function addEventToLastTask(stream: ExecutionTask[], event: ExecutionEvent): ExecutionTask[] {
    if (stream.length === 0) return stream;
    const last = stream[stream.length - 1];
    return [...stream.slice(0, -1), { ...last, events: [...last.events, event] }];
}

function updateEventInLastTask(
    stream: ExecutionTask[],
    toolCallId: string | undefined,
    toolName: string,
    update: Partial<ExecutionEvent>
): ExecutionTask[] {
    if (stream.length === 0) return stream;

    // If we have a toolCallId, search all entries (not just last) so results that
    // arrive after new entries have been pushed (e.g. TaskWrite) are still matched.
    if (toolCallId) {
        let matched = false;
        const updated = stream.map(task => {
            const idx = task.events.findIndex(e => e.toolCallId === toolCallId);
            if (idx === -1) return task;
            matched = true;
            const updatedEvents = task.events.map((e, i) => i === idx ? { ...e, ...update } : e);
            return { ...task, events: updatedEvents };
        });
        if (matched) return updated;
    }

    // Fallback: update last loading event with matching toolName in the last entry
    const last = stream[stream.length - 1];
    const updatedEvents = last.events.map((e: ExecutionEvent) =>
        (!toolCallId && e.toolName === toolName && e.loading)
            ? { ...e, ...update }
            : e
    );
    return [...stream.slice(0, -1), { ...last, events: updatedEvents }];
}

const AIChat: React.FC = () => {
    const { rpcClient } = useRpcContext();
    const [messages, setMessages] = useState<Array<{ role: string; content: string; type: string; checkpointId?: string; messageId?: string }>>([]);

    // Helper function to update the last message
    const updateLastMessage = (updater: (content: string) => string) => {
        setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            if (newMessages.length > 0) {
                newMessages[newMessages.length - 1].content = updater(newMessages[newMessages.length - 1].content);
            }
            return newMessages;
        });
    };
    const [isLoading, setIsLoading] = useState(false);
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
    const [agentMode, setAgentMode] = useState<AgentMode>(AgentMode.Edit);
    const [isPlanModeFeatureEnabled, setIsPlanModeFeatureEnabled] = useState(false);
    const [showReviewActions, setShowReviewActions] = useState(false);
    const [availableCheckpointIds, setAvailableCheckpointIds] = useState<Set<string>>(new Set());

    const [approvalRequest, setApprovalRequest] = useState<TaskApprovalRequest | null>(null);
    const [approvalOverlay, setApprovalOverlay] = useState<ApprovalOverlayState>({ show: false });

    // Plan mode: execution stream shown below the frozen plan list
    const [executionStream, setExecutionStream] = useState<ExecutionTask[]>([]);
    const currentTaskDescriptionRef = useRef<string | null>(null);

    const [currentFileArray, setCurrentFileArray] = useState<SourceFile[]>([]);
    const [codeContext, setCodeContext] = useState<CodeContext | undefined>(undefined);

    const [usage, setUsage] = useState<{ remainingUsagePercentage: number; resetsIn: number } | null>(null);
    const [isUsageExceeded, setIsUsageExceeded] = useState(false);

    //TODO: Need a better way of storing data related to last generation to be in the repair state.
    const currentDiagnosticsRef = useRef<DiagnosticEntry[]>([]);
    const functionsRef = useRef<any>([]);
    const lastAttatchmentsRef = useRef<any>([]);
    const aiChatInputRef = useRef<AIChatInputRef>(null);
    const messagesRef = useRef<any>([]);

    const isErrorChunkReceivedRef = useRef(false);

    const messagesEndRef = React.createRef<HTMLDivElement>();

    /* REFACTORED CODE START [2] */
    // custom hooks: commands + attachments
    const { loadGeneralTags, injectPlaceholderTags } = useFooterLogic({
        rpcClient,
    });

    const { feedbackGiven, setFeedbackGiven, handleFeedback } = useFeedback({
        messages,
        currentDiagnosticsRef,
    });

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
                        aiChatInputRef.current?.setInputContent(defaultPrompt);

                        // Extract CodeContext from both command-template metadata and text-type direct param
                        const codeCtx = defaultPrompt.type === 'command-template'
                            ? defaultPrompt.metadata?.codeContext
                            : defaultPrompt.type === 'text'
                                ? defaultPrompt.codeContext
                                : undefined;

                        if (codeCtx) {
                            setCodeContext(codeCtx);
                        }

                        // Handle plan mode for text-type prompts
                        if (defaultPrompt.type === 'text') {
                            setAgentMode(defaultPrompt.planMode ? AgentMode.Plan : AgentMode.Edit);
                        }
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

    useEffect(() => { fetchUsage(); }, []);

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
            setShowReviewActions(false);
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
        const checkPlanModeFeatureEnabled = async () => {
            try {
                const enabled = await rpcClient.getAiPanelRpcClient().isPlanModeFeatureEnabled();
                setIsPlanModeFeatureEnabled(enabled);
            } catch (error) {
                console.error("[AIChat] Failed to check plan mode feature enabled status:", error);
                setIsPlanModeFeatureEnabled(false);
            }
        };

        checkPlanModeFeatureEnabled();
    }, [rpcClient]);

    useEffect(() => {
        const handleHideReviewActions = () => {
            console.log("[AIChat] Received hideReviewActions notification from extension");
            setShowReviewActions(false);
        };

        rpcClient.onHideReviewActions(handleHideReviewActions);
    }, [rpcClient]);

    useEffect(() => {
        const handleApprovalOverlay = (data: ApprovalOverlayState) => {
            console.log("[AIChat] Approval overlay notification:", data);
            setApprovalOverlay(data);
        };

        rpcClient.onApprovalOverlayState(handleApprovalOverlay);
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
                    setMessages(uiMessages);
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
        // TODO: Need to handle the content as step blocks
        const type = response.type;
        if (type === "content_block") {
            // In plan mode, route ALL text into executionStream from the very first chunk.
            // - If a task is in progress: append under that task's events
            // - Otherwise: append to a floating entry (description="")
            if (agentMode === AgentMode.Plan) {
                const content = response.content;
                setExecutionStream(prev => {
                    if (!content.trim()) return prev;

                    // If stream is empty, push the first floating entry (planning preamble)
                    if (prev.length === 0) {
                        return [{ description: "", events: [{ type: "text" as const, text: content, loading: false }] }];
                    }

                    const last = prev[prev.length - 1];

                    // Determine whether there is an active named task.
                    // A named task is "active" (still receiving events) when:
                    //  - The ref says it's the current task AND
                    //  - The last entry is that named task (not a floating entry that was pushed after it)
                    const isActiveNamedTask =
                        !!currentTaskDescriptionRef.current &&
                        last.description === currentTaskDescriptionRef.current;

                    if (!isActiveNamedTask) {
                        // No active task — route to a floating entry
                        const lastEvent = last.events[last.events.length - 1];
                        if (last.description === "" && lastEvent?.type === "text") {
                            // Append to existing trailing text event in the floating entry
                            const updatedEvents = [
                                ...last.events.slice(0, -1),
                                { ...lastEvent, text: lastEvent.text + content }
                            ];
                            return [...prev.slice(0, -1), { ...last, events: updatedEvents }];
                        } else if (last.description === "") {
                            // Add a new text event to the existing floating entry
                            const newEvent = { type: "text" as const, text: content, loading: false };
                            return [...prev.slice(0, -1), { ...last, events: [...last.events, newEvent] }];
                        } else {
                            // Last entry is a named task — push a new floating entry
                            return [...prev, { description: "", events: [{ type: "text" as const, text: content, loading: false }] }];
                        }
                    }

                    // Active named task — append text event to it
                    const lastEvent = last.events[last.events.length - 1];
                    if (lastEvent?.type === "text") {
                        const updatedEvents = [
                            ...last.events.slice(0, -1),
                            { ...lastEvent, text: lastEvent.text + content }
                        ];
                        return [...prev.slice(0, -1), { ...last, events: updatedEvents }];
                    } else {
                        return [...prev.slice(0, -1), { ...last, events: [...last.events, { type: "text" as const, text: content, loading: false }] }];
                    }
                });
                return;
            }
            const content = response.content;
            setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                newMessages[newMessages.length - 1].content += content;
                return newMessages;
            });
        } else if (type === "content_replace") {
            if (agentMode === AgentMode.Plan) {
                // In plan mode message.content is never written to — skip entirely
                return;
            }
            const content = response.content;
            setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                newMessages[newMessages.length - 1].content = content;
                return newMessages;
            });
        } else if (type === "tool_call") {
            // In plan mode, route ALL tool calls to executionStream — regardless of whether a task is active.
            // If no task is active yet (planning phase), append to the last floating entry or create one.
            if (agentMode === AgentMode.Plan) {
                const label = getPlanModeToolCallLabel(response.toolName, response.toolInput);
                const newEvent: ExecutionEvent = { toolCallId: response.toolCallId, toolName: response.toolName, text: label, loading: true };
                setExecutionStream(prev => {
                    if (prev.length === 0) {
                        return [{ description: "", events: [newEvent] }];
                    }
                    const last = prev[prev.length - 1];
                    const isActiveNamedTask =
                        !!currentTaskDescriptionRef.current &&
                        last.description === currentTaskDescriptionRef.current;
                    if (!isActiveNamedTask && last.description !== "") {
                        // No active task and last entry is a named task — push to a new floating entry
                        return [...prev, { description: "", events: [newEvent] }];
                    }
                    return addEventToLastTask(prev, newEvent);
                });
                return;
            }
            if (response.toolName === "LibrarySearchTool") {
                const toolCallId = response?.toolCallId;
                const toolInput = response.toolInput;
                const searchDescription = toolInput?.searchDescription;
                const displayMessage = searchDescription
                    ? `Searching for ${searchDescription}...`
                    : "Searching for libraries...";

                updateLastMessage((content) =>
                    content + `\n\n<toolcall id="${toolCallId}" tool="${response.toolName}">${displayMessage}</toolcall>`
                );
            } else if (response.toolName === "LibraryGetTool") {
                const toolCallId = response?.toolCallId;

                updateLastMessage((content) =>
                    content + `\n\n<toolcall id="${toolCallId}" tool="${response.toolName}">Fetching library details...</toolcall>`
                );
            } else if (response.toolName == "HealthcareLibraryProviderTool") {
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        newMessages[newMessages.length - 1].content += `\n\n<toolcall tool="${response.toolName}">Analyzing request & selecting healthcare libraries...</toolcall>`;
                    }
                    return newMessages;
                });
            } else if (response.toolName === "task_write") {
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        newMessages[newMessages.length - 1].content += `\n\n<toolcall tool="${response.toolName}">Planning...</toolcall>`;
                    }
                    return newMessages;
                });
            } else if (["file_write", "file_edit", "file_batch_edit"].includes(response.toolName)) {
                const fileName = response.toolInput?.fileName || "file";
                const displayName = formatFileNameForDisplay(fileName);
                const message = response.toolName === "file_write"
                    ? `Creating ${displayName}...`
                    : `Updating ${displayName}...`;

                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        newMessages[newMessages.length - 1].content += `\n\n<toolcall tool="${response.toolName}">${message}</toolcall>`;
                    }
                    return newMessages;
                });
            } else if (response.toolName === "getCompilationErrors") {
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        newMessages[newMessages.length - 1].content += `\n\n<toolcall tool="${response.toolName}">Checking for errors...</toolcall>`;
                    }
                    return newMessages;
                });
            } else if (response.toolName === "runTests") {
                const toolCallId = response?.toolCallId;
                updateLastMessage((content) =>
                    content + `\n\n<toolcall id="${toolCallId}" tool="${response.toolName}">Running tests...</toolcall>`
                );
            } else if (response.toolName === "curlRequest") {
                const toolCallId = response?.toolCallId;
                const toolInput = response.toolInput;
                let tool_content = encodeURIComponent(JSON.stringify({ request: { method: "", url: "Sending HTTP request...", headers: {}, data: null } }));
                try{
                    tool_content = encodeURIComponent(JSON.stringify(toolInput));
                }catch(error){
                    console.error("Failed to stringify HTTP request tool input:", error);
                }

                updateLastMessage((content) =>
                    content + `\n\n<tryitcall id="${toolCallId}">${tool_content}</tryitcall>`
                );
            } else if (response.toolName === "runBallerinaPackage") {
                const toolCallId = response?.toolCallId;
                const runType = response.toolInput?.runType === "service" ? "service" : "program";
                updateLastMessage((content) =>
                    content + `\n\n<toolcall id="${toolCallId}" tool="${response.toolName}">Running ${runType}...</toolcall>`
                );
            } else if (response.toolName === "getServiceLogs") {
                const toolCallId = response?.toolCallId;
                updateLastMessage((content) =>
                    content + `\n\n<toolcall id="${toolCallId}" tool="${response.toolName}">Fetching logs...</toolcall>`
                );
            } else if (response.toolName === "stopBallerinaService") {
                const toolCallId = response?.toolCallId;
                updateLastMessage((content) =>
                    content + `\n\n<toolcall id="${toolCallId}" tool="${response.toolName}">Stopping service...</toolcall>`
                );
            }
        } else if (type === "tool_result") {
            // In plan mode, route ALL tool results to executionStream — regardless of whether a task is active.
            if (agentMode === AgentMode.Plan && response.toolName !== "TaskWrite") {
                const label = getPlanModeToolResultLabel(response.toolName, response.toolOutput);
                setExecutionStream(prev => updateEventInLastTask(prev, response.toolCallId, response.toolName, {
                    text: label,
                    loading: false,
                    failed: false,
                }));
                return;
            }
            // TaskWrite result: resolve the "Planning..." loading event in the stream.
            if (agentMode === AgentMode.Plan && response.toolName === "TaskWrite") {
                setExecutionStream(prev => updateEventInLastTask(prev, response.toolCallId, "TaskWrite", {
                    text: "Plan ready",
                    loading: false,
                    failed: false,
                }));
            }
            if (response.toolName === "LibrarySearchTool") {
                const toolCallId = response.toolCallId;
                const toolOutput = response.toolOutput;
                const searchDescription = toolOutput?.searchDescription;

                // Build the original message to replace
                const originalMessage = searchDescription
                    ? `Searching for ${searchDescription}...`
                    : "Searching for libraries...";

                // Build the completion message
                const completionMessage = searchDescription
                    ? `${searchDescription.charAt(0).toUpperCase() + searchDescription.slice(1)} search completed`
                    : "Library search completed";

                updateLastMessage((content) =>
                    content.replace(
                        `<toolcall id="${toolCallId}" tool="${response.toolName}">${originalMessage}</toolcall>`,
                        `<toolresult id="${toolCallId}" tool="${response.toolName}">${completionMessage}</toolresult>`
                    )
                );
            } else if (response.toolName === "LibraryGetTool") {
                const toolCallId = response.toolCallId;
                const libraryNames = response.toolOutput || [];
                if (toolCallId) {
                    const searchPattern = `<toolcall id="${toolCallId}" tool="${response.toolName}">Fetching library details...</toolcall>`;
                    const resultMessage = libraryNames.length === 0
                        ? "No relevant libraries found"
                        : `Fetched libraries: [${libraryNames.join(", ")}]`;
                    const replacement = `<toolresult id="${toolCallId}" tool="${response.toolName}">${resultMessage}</toolresult>`;

                    updateLastMessage((content) => content.replace(searchPattern, replacement));
                }
            } else if (response.toolName == "HealthcareLibraryProviderTool") {
                const libraryNames = response.toolOutput;
                const searchPattern = `<toolcall tool="${response.toolName}">Analyzing request & selecting healthcare libraries...</toolcall>`;
                const resultMessage = libraryNames.length === 0
                    ? "No relevant healthcare libraries found."
                    : `Fetched healthcare libraries: [${libraryNames.join(", ")}]`;
                const replacement = `<toolresult tool="${response.toolName}">${resultMessage}</toolresult>`;

                updateLastMessage((content) => content.replace(searchPattern, replacement));
            } else if (response.toolName == "TaskWrite") {
                const taskOutput = response.toolOutput;

                // In plan mode, track in-progress task to route events to the execution stream
                if (agentMode === AgentMode.Plan && taskOutput?.tasks) {
                    const inProgressTask = taskOutput.tasks.find((t: { status: string }) => t.status === "in_progress");
                    if (inProgressTask && inProgressTask.description !== currentTaskDescriptionRef.current) {
                        // New task started — push it to the execution stream
                        currentTaskDescriptionRef.current = inProgressTask.description;
                        setExecutionStream(prev => {
                            // Only add if not already present
                            if (prev.some((t: ExecutionTask) => t.description === inProgressTask.description)) return prev;
                            return [...prev, { description: inProgressTask.description, events: [] }];
                        });
                    } else if (!inProgressTask && currentTaskDescriptionRef.current !== null) {
                        // No in-progress task — all tasks completed or back to plan state.
                        // Clear the ref so content_block and tool events render normally again.
                        currentTaskDescriptionRef.current = null;
                    }
                }

                // In plan mode, TaskWrite never touches message.content — everything is in executionStream.
                if (agentMode !== AgentMode.Plan) {
                    setMessages((prevMessages) => {
                        const newMessages = [...prevMessages];
                        if (newMessages.length > 0) {
                            if (!taskOutput.success || !taskOutput.tasks || taskOutput.tasks.length === 0) {
                                const isInternalError = taskOutput.message &&
                                    taskOutput.message.includes("ERROR: Missing");

                                const indicatorPattern = /<toolcall tool="TaskWrite">Planning\.\.\.<\/toolcall>/;
                                const todoPattern = /<todo>.*?<\/todo>/s;

                                if (isInternalError) {
                                    newMessages[newMessages.length - 1].content = newMessages[
                                        newMessages.length - 1
                                    ].content.replace(indicatorPattern, "").replace(todoPattern, "");
                                } else {
                                    let simplifiedMessage = "Task update failed";

                                    if (taskOutput.message) {
                                        const commentMatch = taskOutput.message.match(/User comment: "([^"]+)"/);
                                        const userComment = commentMatch ? commentMatch[1] : null;

                                        if (taskOutput.message.includes("Plan not approved")) {
                                            simplifiedMessage = userComment
                                                ? `Plan not approved: ${userComment}`
                                                : "Plan not approved";
                                        }
                                    }

                                    newMessages[newMessages.length - 1].content = newMessages[
                                        newMessages.length - 1
                                    ].content.replace(indicatorPattern, `<toolcall tool="TaskWrite">${simplifiedMessage}</toolcall>`).replace(todoPattern, "");
                                }
                            } else {
                                const todoData = {
                                    tasks: taskOutput.tasks,
                                    message: taskOutput.message
                                };
                                const todoJson = JSON.stringify(todoData);

                                const lastMessageContent = newMessages[newMessages.length - 1].content;
                                const todoPattern = /<todo>.*?<\/todo>/s;

                                if (todoPattern.test(lastMessageContent)) {
                                    newMessages[newMessages.length - 1].content = lastMessageContent.replace(
                                        todoPattern,
                                        `<todo>${todoJson}</todo>`
                                    );
                                } else {
                                    newMessages[newMessages.length - 1].content += `\n\n<todo>${todoJson}</todo>`;
                                }
                            }
                        }
                        return newMessages;
                    });
                }
            } else if (["file_write", "file_edit", "file_batch_edit"].includes(response.toolName)) {
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        const lastMessageContent = newMessages[newMessages.length - 1].content;
                        const creatingPattern = /<toolcall tool="([^"]+)">Creating (.+?)\.\.\.<\/toolcall>/;
                        const updatingPattern = /<toolcall tool="([^"]+)">Updating (.+?)\.\.\.<\/toolcall>/;

                        let updatedContent = lastMessageContent;

                        if (creatingPattern.test(lastMessageContent)) {
                            // For file_write, check if it was an update or create
                            const action = response.toolOutput?.action;
                            const resultText = action === 'updated' ? 'Updated' : 'Created';
                            updatedContent = lastMessageContent.replace(
                                creatingPattern,
                                (_match, toolName, fileName) => `<toolresult tool="${toolName}">${resultText} ${fileName}</toolresult>`
                            );
                        } else if (updatingPattern.test(lastMessageContent)) {
                            updatedContent = lastMessageContent.replace(
                                updatingPattern,
                                (_match, toolName, fileName) => `<toolresult tool="${toolName}">Updated ${fileName}</toolresult>`
                            );
                        }

                        newMessages[newMessages.length - 1].content = updatedContent;
                    }
                    return newMessages;
                });
            } else if (response.toolName === "getCompilationErrors") {
                const diagnosticsOutput = response.toolOutput;
                // Backend already filters for errors only (severity === 1), so no need to filter again
                const errors = diagnosticsOutput?.diagnostics || [];
                const errorCount = errors.length;

                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        const lastMessageContent = newMessages[newMessages.length - 1].content;
                        const toolName = response.toolName;
                        const checkingPattern = new RegExp(`<toolcall tool="${toolName}">Checking for errors\\.\\.\\.<\\/toolcall>`);

                        const message = errorCount === 0
                            ? "No errors found"
                            : `Found ${errorCount} error${errorCount > 1 ? 's' : ''}`;

                        const updatedContent = lastMessageContent.replace(
                            checkingPattern,
                            `<toolresult tool="${toolName}">${message}</toolresult>`
                        );

                        newMessages[newMessages.length - 1].content = updatedContent;
                    }
                    return newMessages;
                });
            } else if (response.toolName === "runTests") {
                const toolCallId = response.toolCallId;
                if (toolCallId) {
                    const searchPattern = `<toolcall id="${toolCallId}" tool="${response.toolName}">Running tests...</toolcall>`;
                    const resultMessage = response.toolOutput?.summary ?? "Tests completed";
                    const replacement = `<toolresult id="${toolCallId}" tool="${response.toolName}">${resultMessage}</toolresult>`;
                    updateLastMessage((content) => content.replace(searchPattern, replacement));
                }
            } else if (response.toolName === "curlRequest") {
                const toolCallId = response.toolCallId;
                const toolOutput = response.toolOutput;
                let tool_content: string | null = null;
                try {
                    tool_content = encodeURIComponent(JSON.stringify(toolOutput));
                } catch (error) {
                    console.error("Failed to stringify HTTP request tool output:", error);
                }

                if (tool_content !== null) {
                    const searchPattern = `<tryitcall id="${toolCallId}">`;
                    updateLastMessage((content) => {
                        const start = content.indexOf(searchPattern);
                        if (start === -1) return content;
                        const end = content.indexOf("</tryitcall>", start);
                        if (end === -1) return content;
                        return (
                            content.slice(0, start) +
                            `<tryitresult id="${toolCallId}">${tool_content}</tryitresult>` +
                            content.slice(end + "</tryitcall>".length)
                        );
                    });
                }
            } else if (response.toolName === "runBallerinaPackage") {
                const toolCallId = response.toolCallId;
                if (toolCallId) {
                    const status = response.toolOutput?.status ?? "completed";
                    const runType = status === "started" ? "service" : "program";
                    const searchPattern = new RegExp(`<toolcall id="${toolCallId}" tool="${response.toolName}">Running (?:service|program)\\.\\.\\.<\\/toolcall>`);
                    const resultMessage = status === "started"
                        ? "Service started"
                        : status === "completed"
                            ? "Program completed"
                            : status === "timeout"
                                ? "Program timed out"
                                : "Run failed";
                    const replacement = `<toolresult id="${toolCallId}" tool="${response.toolName}">${resultMessage}</toolresult>`;
                    updateLastMessage((content) => content.replace(searchPattern, replacement));
                }
            } else if (response.toolName === "getServiceLogs") {
                const toolCallId = response.toolCallId;
                if (toolCallId) {
                    const searchPattern = `<toolcall id="${toolCallId}" tool="${response.toolName}">Fetching logs...</toolcall>`;
                    const status = response.toolOutput?.status ?? "running";
                    const resultMessage = status === "exited" ? "Service exited" : status === "not_found" ? "Service not found" : "Logs retrieved";
                    const replacement = `<toolresult id="${toolCallId}" tool="${response.toolName}">${resultMessage}</toolresult>`;
                    updateLastMessage((content) => content.replace(searchPattern, replacement));
                }
            } else if (response.toolName === "stopBallerinaService") {
                const toolCallId = response.toolCallId;
                if (toolCallId) {
                    const searchPattern = `<toolcall id="${toolCallId}" tool="${response.toolName}">Stopping service...</toolcall>`;
                    const status = response.toolOutput?.status ?? "stopped";
                    const resultMessage = status === "stopped" ? "Service stopped" : status === "already_exited" ? "Service already exited" : "Service not found";
                    const replacement = `<toolresult id="${toolCallId}" tool="${response.toolName}">${resultMessage}</toolresult>`;
                    updateLastMessage((content) => content.replace(searchPattern, replacement));
                }
            }
        } else if (type === "task_approval_request") {
            if (response.approvalType === "plan") {
                if (agentMode === AgentMode.Plan) {
                    // In plan mode: push planTasks as a new floating entry for the TodoSection to render.
                    setExecutionStream(prev => [
                        ...prev,
                        { description: "", events: [], planTasks: response.tasks, planMessage: response.message }
                    ]);
                } else {
                    // Edit mode fallback: write the frozen plan list into message content as a <todo> tag
                    const todoJson = JSON.stringify({ tasks: response.tasks, message: response.message });
                    updateLastMessage((content) => {
                        const cleaned = content
                            .replace(/<toolcall>Planning\.\.\.<\/toolcall>/, '')
                            .replace(/<todo>.*?<\/todo>/s, '');
                        return cleaned + `\n\n<todo>${todoJson}</todo>`;
                    });
                }
            }
            // Note: completion approvals do NOT update the <todo> tag — the plan list stays frozen.
            // The review checkpoint is shown via ApprovalFooter only.

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
        } else if (type === "intermediary_state") {
            const state = response.state;
            // Check if it's a documentation state by looking for specific properties
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

            if (agentMode === AgentMode.Plan) {
                // Route connector events to executionStream as a floating entry
                setExecutionStream(prev => {
                    const existingIdx = prev.findIndex(t => t.description === "" && (t as any).connectorData?.requestId === connectorData.requestId);
                    if (existingIdx !== -1) {
                        // Update existing floating entry
                        const updated = [...prev];
                        updated[existingIdx] = { ...updated[existingIdx], connectorData };
                        return updated;
                    }
                    // Push new floating entry for this connector notification
                    return [...prev, { description: "", events: [], connectorData }];
                });
                return;
            }

            const connectorJson = JSON.stringify(connectorData);
            setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                if (newMessages.length > 0) {
                    const lastMessageContent = newMessages[newMessages.length - 1].content;

                    const escapeRegex = (str: string): string => {
                        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    };

                    const searchPattern = `<connectorgenerator>{"requestId":"${connectorNotification.requestId}"`;

                    if (lastMessageContent.includes(searchPattern)) {
                        const replacePattern = new RegExp(
                            `<connectorgenerator>[^<]*${escapeRegex(connectorNotification.requestId)}[^<]*</connectorgenerator>`,
                            's'
                        );
                        newMessages[newMessages.length - 1].content = lastMessageContent.replace(
                            replacePattern,
                            `<connectorgenerator>${connectorJson}</connectorgenerator>`
                        );
                    } else {
                        newMessages[newMessages.length - 1].content += `\n\n<connectorgenerator>${connectorJson}</connectorgenerator>`;
                    }
                }
                return newMessages;
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

            if (agentMode === AgentMode.Plan) {
                // Route config collection events to executionStream as a floating entry
                setExecutionStream(prev => {
                    const existingIdx = prev.findIndex(t => t.description === "" && (t as any).configData?.requestId === configurationData.requestId);
                    if (existingIdx !== -1) {
                        // Update existing floating entry
                        const updated = [...prev];
                        updated[existingIdx] = { ...updated[existingIdx], configData: configurationData };
                        return updated;
                    }
                    // Push new floating entry for this config collection event
                    return [...prev, { description: "", events: [], configData: configurationData }];
                });
                return;
            }

            const configurationJson = JSON.stringify(configurationData);
            setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                if (newMessages.length > 0) {
                    const lastMessageContent = newMessages[newMessages.length - 1].content;

                    const escapeRegex = (str: string): string => {
                        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    };

                    const searchPattern = `<configurationcollector>{"requestId":"${configurationNotification.requestId}"`;

                    if (lastMessageContent.includes(searchPattern)) {
                        const replacePattern = new RegExp(
                            `<configurationcollector>[^<]*${escapeRegex(configurationNotification.requestId)}[^<]*</configurationcollector>`,
                            's'
                        );
                        newMessages[newMessages.length - 1].content = lastMessageContent.replace(
                            replacePattern,
                            `<configurationcollector>${configurationJson}</configurationcollector>`
                        );
                    } else {
                        newMessages[newMessages.length - 1].content += `\n\n<configurationcollector>${configurationJson}</configurationcollector>`;
                    }
                }
                return newMessages;
            });
        } else if (type === "diagnostics") {
            //TODO: Handle this in review mode
            const content = response.diagnostics;
            currentDiagnosticsRef.current = content;
        } else if ((response as any).type === "review_actions") {
            setShowReviewActions(true);
        } else if (type === "messages") {
            const messages = response.messages;
            messagesRef.current = messages;
        } else if (type === "stop") {
            console.log("Received stop signal");
            setIsCodeLoading(false);
            setIsLoading(false);
            fetchUsage();
            // Stream ended — clear task ref so any subsequent content renders normally
            currentTaskDescriptionRef.current = null;
        } else if (type === "abort") {
            console.log("Received abort signal");
            const interruptedMessage = "*[Request interrupted by user]*";
            if (agentMode === AgentMode.Plan) {
                // In plan mode, route abort message to executionStream
                setExecutionStream(prev => {
                    const abortEvent = { type: "text" as const, text: interruptedMessage, loading: false };
                    if (prev.length === 0) {
                        return [{ description: "", events: [abortEvent] }];
                    }
                    const last = prev[prev.length - 1];
                    if (last.description === "") {
                        return [...prev.slice(0, -1), { ...last, events: [...last.events, abortEvent] }];
                    }
                    return [...prev, { description: "", events: [abortEvent] }];
                });
            } else {
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        newMessages[newMessages.length - 1].content += `\n\n${interruptedMessage}`;
                    } else {
                        newMessages.push({ role: "assistant", content: interruptedMessage, type: "text" });
                    }
                    return newMessages;
                });
            }
            setIsCodeLoading(false);
            setIsLoading(false);
            currentTaskDescriptionRef.current = null;
        } else if (type === "save_chat") {
            console.log("Received save_chat signal");
            const messageId = response.messageId;

            // In plan mode the message content is never written to — serialize the
            // executionStream instead so the history can be replayed on reload.
            const contentToSave =
                agentMode === AgentMode.Plan && executionStream.length > 0
                    ? serializeExecutionStream(executionStream)
                    : messages[messages.length - 1].content;

            // Update chat message in state machine with UI message
            await rpcClient.getAiPanelRpcClient().updateChatMessage({
                messageId,
                content: contentToSave,
            });
        } else if (type === "error") {
            console.log("Received error signal");
            const errorContent = response.content;
            const errorTemplate = `\n\n<error data-system="true" data-auth="${SYSTEM_ERROR_SECRET}">${errorContent}</error>`;
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    let content = newMessages[newMessages.length - 1].content;

                    // Check if there's an unclosed code block and close it properly
                    const codeBlockPattern = /<code filename="[^"]+">[\s]*```\w+/g;
                    const openCodeBlocks = (content.match(codeBlockPattern) || []).length;
                    const closedCodeBlocks = (content.match(/<\/code>/g) || []).length;

                    if (openCodeBlocks > closedCodeBlocks) {
                        // Check what's missing at the end
                        const endsWithPartialClose = /```\s*<\/cod?e?$/.test(content.trim());
                        const endsWithBackticks = /```\s*$/.test(content.trim());
                        const endsWithPartialBackticks = /`{1,2}$/.test(content.trim());

                        if (endsWithPartialClose) {
                            // Remove partial closing and add complete one
                            content = content.replace(/```\s*<\/cod?e?$/, "");
                            content += "\n```\n</code>";
                        } else if (endsWithBackticks) {
                            // Already has ```, just need </code>
                            content += "\n</code>";
                        } else if (endsWithPartialBackticks) {
                            // Remove partial backticks and add complete closing
                            content = content.replace(/`{1,2}$/, "");
                            content += "\n```\n</code>";
                        } else {
                            // No closing elements, add both
                            content += "\n```\n</code>";
                        }
                    }

                    newMessages[newMessages.length - 1].content = content + errorTemplate;
                    console.log(newMessages);
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
        // Step 2: Scroll into view when messages state changes
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    }, [messages, executionStream]);

    async function handleSendQuery(content: {
        input: Input[];
        attachments: Attachment[];
        metadata?: Record<string, any>;
    }) {
        // Hide review actions when a new prompt is submitted
        if (showReviewActions) {
            setShowReviewActions(false);
        }
        
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
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    newMessages[
                        newMessages.length - 1
                    ].content += `\n\n<error data-system="true" data-auth="${SYSTEM_ERROR_SECRET}">Generation stopped by the user</error>`;
                    return newMessages;
                });
            } else {
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (error && "message" in error) {
                        newMessages[
                            newMessages.length - 1
                        ].content += `\n\n<error data-system="true" data-auth="${SYSTEM_ERROR_SECRET}">${error.message}</error>`;
                    } else {
                        newMessages[
                            newMessages.length - 1
                        ].content += `\n\n<error data-system="true" data-auth="${SYSTEM_ERROR_SECRET}">${error}</error>`;
                    }
                    return newMessages;
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
        rpcClient.getAiPanelRpcClient().clearInitialPrompt();
        var context: GetWorkspaceContextResponse[] = [];
        setMessages((prevMessages) => prevMessages.filter((message, index) => message.type !== "label"));
        setMessages((prevMessages) => prevMessages.filter((message, index) => message.type !== "question"));
        setIsLoading(true);
        isErrorChunkReceivedRef.current = false;
        // In plan mode, persist the current execution stream into the last assistant message
        // so it continues to render after executionStream is cleared for the new query.
        if (agentMode === AgentMode.Plan && executionStream.length > 0) {
            setMessages((prevMessages) => {
                const lastAssistantIdx = [...prevMessages].map(m => m.role).lastIndexOf("Copilot");
                if (lastAssistantIdx === -1) return prevMessages;
                const updated = [...prevMessages];
                updated[lastAssistantIdx] = {
                    ...updated[lastAssistantIdx],
                    content: serializeExecutionStream(executionStream),
                };
                return updated;
            });
        }
        // Reset plan mode execution stream for each new generation
        setExecutionStream([]);
        currentTaskDescriptionRef.current = null;
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
        command: string,
        filePaths?: SourceFile[]
    ) => {
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

            setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                newMessages[newMessages.length - 1].content = formatted_response;
                return newMessages;
            });
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

        console.log("Submitting agent prompt:", { useCase, agentMode, codeContext, operationType, fileAttatchments });
        rpcClient.getAiPanelRpcClient().generateAgent({
            usecase: useCase, isPlanMode: agentMode === AgentMode.Plan, codeContext: codeContext, operationType, fileAttachmentContents: fileAttatchments
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
        setShowReviewActions(false);
        setExecutionStream([]);
        currentTaskDescriptionRef.current = null;

        await rpcClient.getAiPanelRpcClient().clearChat();
    }

    const handleToggleAutoApprove = () => {
        const newValue = !isAutoApproveEnabled;
        setIsAutoApproveEnabled(newValue);
    };

    const handleChangeAgentMode = (mode: AgentMode) => {
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

            // Update the message content to show "Saved" state
            setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.content) {
                    lastMessage.content = lastMessage.content.replace(
                        /<button type="save_documentation">Save Documentation<\/button>/g,
                        '<button type="documentation_saved">Saved</button>'
                    );
                }
                return newMessages;
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
            newMessages[newMessages.length - 1].content = "";
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
            if (agentMode === AgentMode.Plan) {
                // Collapse TodoSection into approval summary — keep planTasks so user can expand to see them
                setExecutionStream(prev => prev.map(t =>
                    t.planTasks ? { ...t, planApprovalStatus: "approved" } : t
                ));
            } else {
                updateLastMessage((content) => content.replace(/<todo>.*?<\/todo>/s, "").trimEnd());
            }
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
            if (agentMode === AgentMode.Plan) {
                // Collapse TodoSection into revision summary — keep planTasks so user can expand to see them
                setExecutionStream(prev => prev.map(t =>
                    t.planTasks ? { ...t, planApprovalStatus: "revised", planRevisionComment: comment } : t
                ));
            }
        } else if (approvalRequest.approvalType === "completion") {
            await rpcClient.getAiPanelRpcClient().declineTask({
                requestId: approvalRequest.requestId,
                comment
            });
        }

        setApprovalRequest(null);
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
            newMessage[newMessage.length - 1].content = response.diags;
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
                        <Badge>
                            {usage ? (
                                <>
                                    Remaining Usage: {usage.resetsIn === -1 ? "Unlimited" : (isUsageExceeded ? "Exceeded" : `${Math.round(usage.remainingUsagePercentage)}%`)}
                                    {usage.resetsIn !== -1 && (
                                        <>
                                            <br />
                                            <ResetsInBadge title={formatResetsInExact(usage.resetsIn)}>{`Resets in: ${formatResetsIn(usage.resetsIn)}`}</ResetsInBadge>
                                        </>
                                    )}
                                </>
                            ) : (
                                "Remaining Usage: N/A"
                            )}
                        </Badge>
                        <HeaderButtons>
                            <Button
                                appearance="icon"
                                onClick={() => handleClearChat()}
                                tooltip="Clear Chat"
                                disabled={isLoading}
                            >
                                <Codicon name="clear-all" />
                                &nbsp;&nbsp;Clear
                            </Button>
                            <Button appearance="icon" onClick={() => handleSettings()} tooltip="Settings">
                                <Codicon name="settings-gear" />
                                &nbsp;&nbsp;Settings
                            </Button>
                        </HeaderButtons>
                    </Header>
                    <main style={{ flex: 1, overflowY: "auto" }}>
                        {Array.isArray(otherMessages) && otherMessages.length === 0 && (
                            <WelcomeMessage isOnboarding={getOnboardingOpens() <= 3.0} />
                        )}
                        {otherMessages.map((message, index) => {
                            const isLastResponse = index === currentGeneratingPromptIndex;
                            const isAssistantMessage = message.role === "Copilot";
                            const lastAssistantIndex = otherMessages.map((m) => m.role).lastIndexOf("Copilot");
                            const isLatestAssistantMessage = isAssistantMessage && index === lastAssistantIndex;

                            // Note: Cannot use useMemo here as it's inside map() callback
                            // The stateless regex implementation in splitContent() ensures no corruption during streaming
                            const segmentedContent = splitContent(message.content);
                            const areTestsGenerated = segmentedContent.some(
                                (segment) => segment.type === SegmentType.Progress
                            );
                            const hasReviewActions = segmentedContent.some(
                                (segment) => segment.type === SegmentType.ReviewActions
                            );
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
                                                        onRestore={handleCheckpointRestore}
                                                    />
                                                )}
                                            </>
                                        );
                                    })()}

                                    {/* Message header */}
                                    {message.type !== "question" && message.type !== "label" && (
                                        <RoleContainer
                                            icon={message.role === "User" ? "bi-user" : "bi-ai-chat"}
                                            title={message.role}
                                        />
                                    )}
                                    {!(agentMode === AgentMode.Plan && isAssistantMessage && isLatestAssistantMessage) && segmentedContent.map((segment, i) => {
                                        if (segment.type === SegmentType.ExecutionStream) {
                                            return (
                                                <PlanStepper
                                                    key={`exec-stream-${i}`}
                                                    executionStream={segment.executionStream}
                                                    isLoading={false}
                                                    rpcClient={undefined}
                                                />
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
                                                    const prevSegment = splitContent(message.content)[j];
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
                                                        handleAddAllCodeSegmentsToWorkspace={
                                                            handleAddAllCodeSegmentsToWorkspace
                                                        }
                                                        handleRevertChanges={handleRevertChanges}
                                                        isReady={!isCodeLoading}
                                                        message={message}
                                                        buttonsActive={true}
                                                        isSyntaxError={isContainsSyntaxError(
                                                            currentDiagnosticsRef.current
                                                        )}
                                                        command={segment.command}
                                                        diagnostics={currentDiagnosticsRef.current}
                                                        onRetryRepair={handleRetryRepair}
                                                        isPromptExecutedInCurrentWindow={
                                                            isPromptExecutedInCurrentWindow
                                                        }
                                                        isErrorChunkReceived={isErrorChunkReceivedRef.current}
                                                        isAddingToWorkspace={isAddingToWorkspace}
                                                        fileArray={currentFileArray}
                                                    />
                                                );
                                            }
                                        } else if (segment.type === SegmentType.Progress) {
                                            return (
                                                <ProgressTextSegment
                                                    key={`progress-${i}`}
                                                    text={segment.text}
                                                    loading={segment.loading}
                                                    failed={segment.failed}
                                                />
                                            );
                                        } else if (segment.type === SegmentType.ToolCall) {
                                            const currentToolName = segment.toolName;

                                            // Skip if the next segment with the same tool name follows
                                            // (skip over whitespace-only Text segments between tool calls)
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

                                            // Collect consecutive same-tool segments backward from this index,
                                            // skipping over whitespace-only Text segments between them
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

                                            // Single tool call or different tool: bare ToolCallSegment
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

                                            // 2+ same-tool consecutive calls: use collapsible group
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
                                        } else if (segment.type === SegmentType.ReviewActions) {
                                            return (
                                                <ReviewActions
                                                    key={`review-actions-${i}`}
                                                    rpcClient={rpcClient}
                                                    onReviewActionsChange={setShowReviewActions}
                                                />
                                            );
                                        } else if (segment.type === SegmentType.Attachment) {
                                            return (
                                                <AttachmentsContainer>
                                                    {segment.text.split(",").map((fileName, index) => (
                                                        <AttachmentBox
                                                            key={`attachment-${i}-${index}`}
                                                            status={AttachmentStatus.Success}
                                                            fileName={fileName.trim()}
                                                            index={index}
                                                            removeAttachment={null}
                                                            readOnly={true}
                                                        />
                                                    ))}
                                                </AttachmentsContainer>
                                            );
                                        } else if (segment.type === SegmentType.InlineCode) {
                                            // return <BallerinaCodeBlock key={i} code={segment.text} />;
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
                                        } else if (segment.type === SegmentType.Button) {
                                             if (
                                                "buttonType" in segment &&
                                                segment.buttonType === "save_documentation" &&
                                                !isCodeLoading &&
                                                isLastResponse &&
                                                !isLoading
                                            ) {
                                                return (
                                                    <div key={`btn-save-${i}`} style={{ display: "flex", gap: "10px" }}>
                                                        <VSCodeButton
                                                            title="Save Documentation"
                                                            onClick={saveDocumentation}
                                                        >
                                                            {"Save Documentation"}
                                                        </VSCodeButton>
                                                        <VSCodeButton
                                                            title="Regenerate documentation"
                                                            appearance="secondary"
                                                            onClick={regenerateDocumentation}
                                                        >
                                                            <Codicon name="refresh" />
                                                        </VSCodeButton>
                                                    </div>
                                                );
                                            } else if (
                                                "buttonType" in segment &&
                                                segment.buttonType === "documentation_saved"
                                            ) {
                                                return (
                                                    <VSCodeButton key={`btn-saved-${i}`} title="Documentation has been saved" disabled>
                                                        {"Saved"}
                                                    </VSCodeButton>
                                                );
                                            }
                                        } else {
                                            if (message.type === "Error") {
                                                return <ErrorBox key={`error-${i}`}>{segment.text}</ErrorBox>;
                                            }
                                            return <MarkdownRenderer key={`markdown-${i}`} markdownContent={segment.text} />;
                                        }
                                    })}
                                    {agentMode === AgentMode.Plan && isAssistantMessage && isLatestAssistantMessage && executionStream.length > 0 && (
                                        <PlanStepper executionStream={executionStream} isLoading={isLoading} rpcClient={rpcClient} />
                                    )}
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
                        })}
                        <div ref={messagesEndRef} />
                    </main>
                    {/* Review Actions Component - positioned at bottom above input */}
                    {showReviewActions && (
                        <div style={{ padding: "10px 20px 0", borderTop: "1px solid var(--vscode-panel-border)" }}>
                            <ReviewActions
                                rpcClient={rpcClient}
                                onReviewActionsChange={setShowReviewActions}
                            />
                        </div>
                    )}
                    {approvalRequest ? (
                        <ApprovalFooter
                            approvalType={approvalRequest.approvalType}
                            onApprove={handleApprovalApprove}
                            onReject={handleApprovalReject}
                            isSubmitting={false}
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
                            onRemoveCodeContext={() => setCodeContext(undefined)}
                            agentMode={agentMode}
                            onChangeAgentMode={isPlanModeFeatureEnabled ? handleChangeAgentMode : undefined}
                            isAutoApproveEnabled={isAutoApproveEnabled}
                            onDisableAutoApprove={handleToggleAutoApprove}
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


