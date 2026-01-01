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
    TestGenerationTarget,
    LLMDiagnostics,
    DiagnosticEntry,
    AIPanelPrompt,
    Command,
    TemplateId,
    ChatNotify,
    GenerateCodeRequest,
    TestPlanGenerationRequest,
    TestGeneratorIntermediaryState,
    DocumentationGeneratorIntermediaryState,
    ChatEntry,
    OperationType,
    GENERATE_TEST_AGAINST_THE_REQUIREMENT,
    GENERATE_CODE_AGAINST_THE_REQUIREMENT,
    ExtendedDataMapperMetadata,
    DocGenerationRequest,
    DocGenerationType,
    FileChanges,
    CodeContext,
    AIChatMachineEventType,
    AIChatMachineStateValue,
    UIChatHistoryMessage,
} from "@wso2/ballerina-core";

import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Codicon } from "@wso2/ui-toolkit";

import { AIChatInputRef } from "../AIChatInput";
import ProgressTextSegment from "../ProgressTextSegment";
import ToolCallSegment from "../ToolCallSegment";
import TodoSection from "../TodoSection";
import { ConnectorGeneratorSegment } from "../ConnectorGeneratorSegment";
import RoleContainer from "../RoleContainter";
import CheckpointButton from "../CheckpointButton";
import { Attachment, AttachmentStatus, TaskApprovalRequest } from "@wso2/ballerina-core";

import { AIChatView, Header, HeaderButtons, ChatMessage, Badge } from "../../styles";
import ReferenceDropdown from "../ReferenceDropdown";
import AccordionItem from "../TestScenarioSegment";
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
import { fetchWithAuth, streamToString } from "../../utils/networkUtils";
import { SYSTEM_ERROR_SECRET } from "../AIChatInput/constants";
import { CodeSegment } from "../CodeSegment";
import AttachmentBox, { AttachmentsContainer } from "../AttachmentBox";
import Footer from "./Footer";
import ApprovalFooter from "./Footer/ApprovalFooter";
import { useFooterLogic } from "./Footer/useFooterLogic";
import { SettingsPanel } from "../../SettingsPanel";
import WelcomeMessage from "./Welcome";
import { getOnboardingOpens, incrementOnboardingOpens, convertToUIMessages, isContainsSyntaxError, ChatIndexes } from "./utils/utils";

import FeedbackBar from "./../FeedbackBar";
import { useFeedback } from "./utils/useFeedback";
import { SegmentType, splitContent } from "./segment";
import ReviewActions from "../ReviewActions";

// var projectUuid = "";
// var chatLocation = "";

const NO_DRIFT_FOUND = "No drift identified between the code and the documentation.";
const DRIFT_CHECK_ERROR = "Failed to check drift between the code and the documentation. Please try again.";
const UPDATE_CHAT_SUMMARY_FAILED = `Failed to update the chat summary.`;

const GENERATE_CODE_AGAINST_THE_PROVIDED_REQUIREMENTS = "Generate code based on the following requirements: ";
const GENERATE_CODE_AGAINST_THE_PROVIDED_REQUIREMENTS_TRIMMED = GENERATE_CODE_AGAINST_THE_PROVIDED_REQUIREMENTS.trim();

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

const AIChat: React.FC = () => {
    const { rpcClient } = useRpcContext();
    const [messages, setMessages] = useState<Array<{ role: string; content: string; type: string; checkpointId?: string; messageId?: string }>>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastQuestionIndex, setLastQuestionIndex] = useState(-1);
    const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
    const [isCodeLoading, setIsCodeLoading] = useState(false);
    const [currentGeneratingPromptIndex, setCurrentGeneratingPromptIndex] = useState(-1);
    const [isSyntaxError, setIsSyntaxError] = useState(false);
    const [isReqFileExists, setIsReqFileExists] = useState(false);
    const [isPromptExecutedInCurrentWindow, setIsPromptExecutedInCurrentWindow] = useState(false);
    const [testGenIntermediaryState, setTestGenIntermediaryState] = useState<TestGeneratorIntermediaryState | null>(
        null
    );
    const [docGenIntermediaryState, setDocGenIntermediaryState] =
        useState<DocumentationGeneratorIntermediaryState | null>(null);
    const [isAddingToWorkspace, setIsAddingToWorkspace] = useState(false);

    const [showSettings, setShowSettings] = useState(false);
    const [aiChatStateMachineState, setAiChatStateMachineState] = useState<AIChatMachineStateValue>("Idle");
    const [isAutoApproveEnabled, setIsAutoApproveEnabled] = useState(false);
    const [isPlanModeEnabled, setIsPlanModeEnabled] = useState(false);
    const [isPlanModeFeatureEnabled, setIsPlanModeFeatureEnabled] = useState(false);
    const [showReviewActions, setShowReviewActions] = useState(false);
    const [availableCheckpointIds, setAvailableCheckpointIds] = useState<Set<string>>(new Set());

    const [approvalRequest, setApprovalRequest] = useState<TaskApprovalRequest | null>(null);

    const [currentFileArray, setCurrentFileArray] = useState<SourceFile[]>([]);
    const [codeContext, setCodeContext] = useState<CodeContext | undefined>(undefined);

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
                            setIsPlanModeEnabled(defaultPrompt.planMode);
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

    const handleCheckpointRestore = async (checkpointId: string) => {
        try {
            // Call backend to restore checkpoint (files + chat history)
            await rpcClient.getAiPanelRpcClient().restoreCheckpoint({ checkpointId });

            // Fetch updated messages from backend
            const updatedMessages = await rpcClient.getAIChatUIHistory();
            const uiMessages = convertToUIMessages(updatedMessages);
            setMessages(uiMessages);

            // Update available checkpoint IDs after restore (checkpoints are trimmed during restore)
            const context = await rpcClient.getAIChatContext();
            if (context && context.checkpoints) {
                const checkpointIds = context.checkpoints.map(cp => cp.id);
                setAvailableCheckpointIds(new Set(checkpointIds));
            }

            // Reset UI state
            setIsLoading(false);
            setIsCodeLoading(false);
            setTestGenIntermediaryState(null);
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
        const initializeAutoApproveState = async () => {
            try {
                const context = await rpcClient.getAIChatContext();
                if (context && context.autoApproveEnabled !== undefined) {
                    setIsAutoApproveEnabled(context.autoApproveEnabled);
                }
                // Update available checkpoint IDs
                if (context && context.checkpoints) {
                    const checkpointIds = context.checkpoints.map(cp => cp.id);
                    setAvailableCheckpointIds(new Set(checkpointIds));
                }
            } catch (error) {
                console.error("[AIChat] Failed to initialize auto-approve state:", error);
            }
        };

        initializeAutoApproveState();
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

    /**
     * Effect: Load initial chat history from aiChatMachine context
     */
    useEffect(function loadInitialChatHistory() {
        const loadHistory = async () => {
            try {
                const historyMessages = await rpcClient.getAIChatUIHistory();
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

    rpcClient?.onAIChatStateChanged(async (newState: AIChatMachineStateValue) => {
        setAiChatStateMachineState(newState);

        // Update context when state changes
        try {
            const context = await rpcClient.getAIChatContext();
            // Update available checkpoint IDs
            if (context && context.checkpoints) {
                const checkpointIds = context.checkpoints.map(cp => cp.id);
                setAvailableCheckpointIds(new Set(checkpointIds));
            }
        } catch (error) {
            console.error("[AIChat] Failed to update review actions state:", error);
        }
    });

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
            const context = await rpcClient.getAIChatContext();
            if (context && context.checkpoints) {
                const checkpointIds = context.checkpoints.map(cp => cp.id);
                setAvailableCheckpointIds(new Set(checkpointIds));
            }
        } catch (error) {
            console.error("[AIChat] Failed to update available checkpoint IDs:", error);
        }
    });

    rpcClient?.onChatNotify(async (response: ChatNotify) => {
        // TODO: Need to handle the content as step blocks
        const type = response.type;
        if (type === "content_block") {
            const content = response.content;
            setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                newMessages[newMessages.length - 1].content += content;
                return newMessages;
            });
        } else if (type === "content_replace") {
            const content = response.content;
            setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                newMessages[newMessages.length - 1].content = content;
                return newMessages;
            });
        } else if (type === "tool_call") {
            if (response.toolName == "LibraryProviderTool") {
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        newMessages[newMessages.length - 1].content += `\n\n<toolcall>Analyzing request & selecting libraries...</toolcall>`;
                    }
                    return newMessages;
                });
            } else if (response.toolName == "HealthcareLibraryProviderTool") {
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        newMessages[newMessages.length - 1].content += `\n\n<toolcall>Analyzing request & selecting healthcare libraries...</toolcall>`;
                    }
                    return newMessages;
                });
            } else if (response.toolName === "task_write") {
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        newMessages[newMessages.length - 1].content += `\n\n<toolcall>Planning...</toolcall>`;
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
                        newMessages[newMessages.length - 1].content += `\n\n<toolcall>${message}</toolcall>`;
                    }
                    return newMessages;
                });
            } else if (response.toolName === "getCompilationErrors") {
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        newMessages[newMessages.length - 1].content += `\n\n<toolcall>Checking for errors...</toolcall>`;
                    }
                    return newMessages;
                });
            }
        } else if (type === "tool_result") {
            if (response.toolName == "LibraryProviderTool") {
                const libraryNames = response.toolOutput;
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        if (libraryNames.length === 0) {
                            newMessages[newMessages.length - 1].content = newMessages[
                                newMessages.length - 1
                            ].content.replace(
                                `<toolcall>Analyzing request & selecting libraries...</toolcall>`,
                                `<toolresult>No relevant libraries found.</toolresult>`
                            );
                        } else {
                            newMessages[newMessages.length - 1].content = newMessages[
                                newMessages.length - 1
                            ].content.replace(
                                `<toolcall>Analyzing request & selecting libraries...</toolcall>`,
                                `<toolresult>Fetched libraries: [${libraryNames.join(", ")}]</toolresult>`
                            );
                        }
                    }
                    return newMessages;
                });
            } else if (response.toolName == "HealthcareLibraryProviderTool") {
                const libraryNames = response.toolOutput;
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        if (libraryNames.length === 0) {
                            newMessages[newMessages.length - 1].content = newMessages[
                                newMessages.length - 1
                            ].content.replace(
                                `<toolcall>Analyzing request & selecting healthcare libraries...</toolcall>`,
                                `<toolresult>No relevant healthcare libraries found.</toolresult>`
                            );
                        } else {
                            newMessages[newMessages.length - 1].content = newMessages[
                                newMessages.length - 1
                            ].content.replace(
                                `<toolcall>Analyzing request & selecting healthcare libraries...</toolcall>`,
                                `<toolresult>Fetched healthcare libraries: [${libraryNames.join(", ")}]</toolresult>`
                            );
                        }
                    }
                    return newMessages;
                });
            } else if (response.toolName == "TaskWrite") {
                const taskOutput = response.toolOutput;

                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        if (!taskOutput.success || !taskOutput.allTasks || taskOutput.allTasks.length === 0) {
                            const isInternalError = taskOutput.message &&
                                taskOutput.message.includes("ERROR: Missing");

                            const indicatorPattern = /<toolcall>Planning\.\.\.<\/toolcall>/;
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
                                ].content.replace(indicatorPattern, `<toolcall>${simplifiedMessage}</toolcall>`).replace(todoPattern, "");
                            }
                        } else {
                            const todoData = {
                                tasks: taskOutput.allTasks,
                                message: taskOutput.message
                            };
                            const todoJson = JSON.stringify(todoData);

                            const lastMessageContent = newMessages[newMessages.length - 1].content;
                            const todoPattern = /<todo>.*?<\/todo>/s;

                            if (todoPattern.test(lastMessageContent)) {
                                // Replace existing todo section
                                newMessages[newMessages.length - 1].content = lastMessageContent.replace(
                                    todoPattern,
                                    `<todo>${todoJson}</todo>`
                                );
                            } else {
                                // Add new todo section
                                newMessages[newMessages.length - 1].content += `\n\n<todo>${todoJson}</todo>`;
                            }
                        }
                    }
                    return newMessages;
                });
            } else if (["file_write", "file_edit", "file_batch_edit"].includes(response.toolName)) {
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        const lastMessageContent = newMessages[newMessages.length - 1].content;
                        const creatingPattern = /<toolcall>Creating (.+?)\.\.\.<\/toolcall>/;
                        const updatingPattern = /<toolcall>Updating (.+?)\.\.\.<\/toolcall>/;

                        let updatedContent = lastMessageContent;

                        if (creatingPattern.test(lastMessageContent)) {
                            // For file_write, check if it was an update or create
                            const action = response.toolOutput?.action;
                            const resultText = action === 'updated' ? 'Updated' : 'Created';
                            updatedContent = lastMessageContent.replace(
                                creatingPattern,
                                (_match, fileName) => `<toolresult>${resultText} ${fileName}</toolresult>`
                            );
                        } else if (updatingPattern.test(lastMessageContent)) {
                            updatedContent = lastMessageContent.replace(
                                updatingPattern,
                                (_match, fileName) => `<toolresult>Updated ${fileName}</toolresult>`
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
                        const checkingPattern = /<toolcall>Checking for errors\.\.\.<\/toolcall>/;

                        const message = errorCount === 0
                            ? "No errors found"
                            : `Found ${errorCount} error${errorCount > 1 ? 's' : ''}`;

                        const updatedContent = lastMessageContent.replace(
                            checkingPattern,
                            `<toolresult>${message}</toolresult>`
                        );

                        newMessages[newMessages.length - 1].content = updatedContent;
                    }
                    return newMessages;
                });
            }
        } else if (type === "task_approval_request") {
            setApprovalRequest({
                type: "task_approval_request",
                requestId: response.requestId,
                approvalType: response.approvalType,
                tasks: response.tasks,
                taskDescription: response.taskDescription,
                message: response.message,
            });
            if (response.approvalType === "plan") {
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        const todoData = {
                            tasks: response.tasks,
                            message: response.message
                        };
                        const todoJson = JSON.stringify(todoData);
                        let lastMessageContent = newMessages[newMessages.length - 1].content;

                        const planningPattern = /<toolcall>Planning\.\.\.<\/toolcall>/;
                        const todoPattern = /<todo>.*?<\/todo>/s;

                        lastMessageContent = lastMessageContent.replace(planningPattern, '');
                        lastMessageContent = lastMessageContent.replace(todoPattern, '');

                        newMessages[newMessages.length - 1].content = lastMessageContent + `\n\n<todo>${todoJson}</todo>`;
                    }
                    return newMessages;
                });
            } else if (response.approvalType === "completion") {
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        const todoData = {
                            tasks: response.tasks,
                            message: response.message
                        };
                        const todoJson = JSON.stringify(todoData);
                        let lastMessageContent = newMessages[newMessages.length - 1].content;

                        const todoPattern = /<todo>.*?<\/todo>/s;
                        lastMessageContent = lastMessageContent.replace(todoPattern, `<todo>${todoJson}</todo>`);

                        newMessages[newMessages.length - 1].content = lastMessageContent;
                    }
                    return newMessages;
                });
            }
        } else if (type === "intermediary_state") {
            const state = response.state;
            // Check if it's a documentation state by looking for specific properties
            if ("serviceName" in state && "documentation" in state) {
                setDocGenIntermediaryState(state as DocumentationGeneratorIntermediaryState);
            } else {
                setTestGenIntermediaryState(state as TestGeneratorIntermediaryState);
            }
        } else if (type === "generated_sources") {
            setCurrentFileArray(response.fileArray);
        } else if (type === "connector_generation_notification") {
            const connectorNotification = response as any;
            const connectorJson = JSON.stringify({
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
            });

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
        } else if (type === "abort") {
            console.log("Received abort signal");
            const interruptedMessage = "\n\n*[Request interrupted by user]*";
            setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                newMessages[newMessages.length - 1].content += interruptedMessage;
                return newMessages;
            });
            setIsCodeLoading(false);
            setIsLoading(false);
        } else if (type === "save_chat") {
            console.log("Received save_chat signal");
            const messageId = response.messageId;

            // Update chat message in state machine with UI message
            await rpcClient.getAiPanelRpcClient().updateChatMessage({
                messageId,
                content: messages[messages.length - 1].content
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
    }, [messages]);

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

        //TODO: Check why messageId is needed here
        const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        console.log("Submitting agent prompt:", { useCase, isPlanModeEnabled, codeContext, operationType, fileAttatchments });
        rpcClient.getAiPanelRpcClient().generateAgent({
            usecase: useCase, isPlanMode: isPlanModeEnabled, codeContext: codeContext, operationType, fileAttachmentContents: fileAttatchments, messageId
        })
        // rpcClient.sendAIChatStateEvent({
        //     type: AIChatMachineEventType.SUBMIT_AGENT_PROMPT,
        //     payload: { prompt: useCase, isPlanMode: isPlanModeEnabled, codeContext: codeContext, operationType, fileAttachments: fileAttatchments }
        // });
    }

    async function handleStop() {
        // Abort any ongoing requests
        // abortFetchWithAuth();
        // Abort test generation if running
        rpcClient.getAiPanelRpcClient().abortAIGeneration();

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

        await rpcClient.getAiPanelRpcClient().clearChat();
    }

    const handleToggleAutoApprove = () => {
        const newValue = !isAutoApproveEnabled;
        setIsAutoApproveEnabled(newValue);
    };

    const handleTogglePlanMode = () => {
        const newValue = !isPlanModeEnabled;
        setIsPlanModeEnabled(newValue);
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

    function onTestScenarioDelete(content: string) {
        setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            const lastMessageContent = newMessages[newMessages.length - 1].content;

            const escapedContent = content.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(`<scenario>\\s*${escapedContent}\\s*<\\/scenario>`, "g");

            const newContent = lastMessageContent.replace(regex, "");
            newMessages[newMessages.length - 1].content = newContent;

            // Update intermediary state
            setTestGenIntermediaryState((prevState) => ({
                ...prevState,
                testPlan: newContent,
            }));

            return newMessages;
        });
    }

    function onTestScenarioAdd() {
        setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            const lastMessageContent = newMessages[newMessages.length - 1].content;

            const regex = /<button type="add_scenario">(.*?)<\/button>/;
            const match = lastMessageContent.match(regex);

            if (match) {
                const buttonText = match[1];

                const scenarioText = `
<scenario>
    <title>(Edit This) Scenario Title</title>
    <description>(Edit This) Scenario Description</description>
</scenario>

<button type="add_scenario">${buttonText}</button>
`;

                const newContent = lastMessageContent.replace(regex, scenarioText);
                newMessages[newMessages.length - 1].content = newContent;

                // Update intermediary state
                setTestGenIntermediaryState((prevState) => ({
                    ...prevState,
                    testPlan: newContent,
                }));
            }

            return newMessages;
        });
    }

    const handleEdit = (oldContent: string, newContent: string) => {
        setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            const lastMessageContent = newMessages[newMessages.length - 1].content;

            const escapedContent = oldContent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(`<scenario>\\s*${escapedContent}\\s*<\\/scenario>`, "g");

            const scenarioText = `
<scenario>
    ${newContent}
</scenario>
`;
            const updatedContent = lastMessageContent.replace(regex, scenarioText);
            newMessages[newMessages.length - 1].content = updatedContent;

            // Update intermediary state
            setTestGenIntermediaryState((prevState) => ({
                ...prevState,
                testPlan: updatedContent,
            }));

            return newMessages;
        });
    };

    const regenerateScenarios = async () => {
        setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            newMessages[newMessages.length - 1].content = "";
            return newMessages;
        });

        // await handleSendQuery(testGenIntermediaryState.content);
    };

    const generateFunctionTests = async () => {
        setIsCodeLoading(true);
        await rpcClient.getAiPanelRpcClient().generateFunctionTests({
            testPlan: testGenIntermediaryState.testPlan,
            resourceFunction: testGenIntermediaryState.resourceFunction,
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
        const currentDiagnostics = currentDiagnosticsRef.current;
        if (currentDiagnostics.length === 0) return;

        setIsCodeLoading(true);
        setIsLoading(true);

        await rpcClient.getAiPanelRpcClient().repairGeneratedCode({
            diagnostics: currentDiagnostics,
            assistantResponse: messages[messages.length - 1].content, // XML format with code blocks
            updatedFileNames: [], // Will be determined from parsed XML
            previousMessages: messagesRef.current,
        });
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
                <AIChatView>
                    <Header>
                        <Badge>
                            Remaining Free Usage: {"Unlimited"}
                            <br />
                            {/* <ResetsInBadge>{`Resets in: 30 days`}</ResetsInBadge> */}
                        </Badge>
                        {isPlanModeFeatureEnabled && <div>State: {aiChatStateMachineState}</div>}
                        <HeaderButtons>
                            {isPlanModeFeatureEnabled && (
                                <Button
                                    appearance="icon"
                                    onClick={handleTogglePlanMode}
                                    tooltip={isPlanModeEnabled ? "Switch to Edit mode (direct edits)" : "Switch to Plan mode (review before applying)"}
                                >
                                    <Codicon name={isPlanModeEnabled ? "list-tree" : "edit"} />
                                    &nbsp;&nbsp;{isPlanModeEnabled ? "Mode: Plan" : "Mode: Edit"}
                                </Button>
                            )}
                            {isPlanModeFeatureEnabled && (
                                <Button
                                    appearance="icon"
                                    onClick={handleToggleAutoApprove}
                                    tooltip={isAutoApproveEnabled ? "Disable auto-approval for tasks" : "Enable auto-approval for tasks"}
                                >
                                    <Codicon name={isAutoApproveEnabled ? "check-all" : "inspect"} />
                                    &nbsp;&nbsp;{isAutoApproveEnabled ? "Auto-Approve: On" : "Auto-Approve: Off"}
                                </Button>
                            )}
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
                                    {message.type !== "question" && message.type !== "label" && (
                                        <RoleContainer
                                            icon={message.role === "User" ? "bi-user" : "bi-ai-chat"}
                                            title={message.role}
                                            checkpointButton={
                                                message.role === "User" && message.checkpointId ? (() => {
                                                    const isCheckpointAvailable = availableCheckpointIds.has(message.checkpointId);
                                                    const isDisabled = isLoading || !isCheckpointAvailable;
                                                    return (
                                                        <CheckpointButton
                                                            checkpointId={message.checkpointId}
                                                            onRestore={handleCheckpointRestore}
                                                            disabled={isDisabled}
                                                        />
                                                    );
                                                })() : undefined
                                            }
                                        />
                                    )}
                                    {segmentedContent.map((segment, i) => {
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
                                            return (
                                                <ToolCallSegment
                                                    key={`tool-call-${i}`}
                                                    text={segment.text}
                                                    loading={segment.loading}
                                                    failed={segment.failed}
                                                />
                                            );
                                        } else if (segment.type === SegmentType.Todo) {
                                            const isLastMessage = index === otherMessages.length - 1;
                                            return (
                                                <TodoSection
                                                    key={`todo-${i}`}
                                                    tasks={segment.tasks || []}
                                                    message={segment.message}
                                                    isLoading={isLoading && isLastMessage}
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
                                        } else if (segment.type === SegmentType.TestScenario) {
                                            return (
                                                <AccordionItem
                                                    key={`test-scenario-${i}`}
                                                    content={segment.text}
                                                    onDelete={onTestScenarioDelete}
                                                    isEnabled={
                                                        isLastResponse &&
                                                        !isCodeLoading &&
                                                        !areTestsGenerated &&
                                                        isLoading
                                                    }
                                                    onEdit={handleEdit}
                                                />
                                            );
                                        } else if (segment.type === SegmentType.Button) {
                                            if (
                                                "buttonType" in segment &&
                                                segment.buttonType === "add_scenario" &&
                                                !isCodeLoading &&
                                                isLastResponse &&
                                                !areTestsGenerated &&
                                                isLoading
                                            ) {
                                                return (
                                                    <VSCodeButton
                                                        key={`btn-${i}`}
                                                        title="Add a new test scenario"
                                                        appearance="secondary"
                                                        onClick={onTestScenarioAdd}
                                                    >
                                                        <span className={`codicon codicon-add`}></span>
                                                    </VSCodeButton>
                                                );
                                            } else if (
                                                "buttonType" in segment &&
                                                segment.buttonType === "generate_test_group" &&
                                                !isCodeLoading &&
                                                isLastResponse &&
                                                !areTestsGenerated &&
                                                isLoading
                                            ) {
                                                return (
                                                    <div key={`btn-group-${i}`} style={{ display: "flex", gap: "10px" }}>
                                                        <VSCodeButton
                                                            title="Generate Tests"
                                                            onClick={generateFunctionTests}
                                                        >
                                                            {"Generate Tests"}
                                                        </VSCodeButton>
                                                        <VSCodeButton
                                                            title="Regenerate test scenarios"
                                                            appearance="secondary"
                                                            onClick={regenerateScenarios}
                                                        >
                                                            <Codicon name="refresh" />
                                                        </VSCodeButton>
                                                    </div>
                                                );
                                            } else if (
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
                        />
                    )}
                </AIChatView>
            )}
            {showSettings && <SettingsPanel onClose={() => setShowSettings(false)}></SettingsPanel>}
        </>
    );
};

export default AIChat;


