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
    ProjectSource,
    SourceFile,
    MappingParameters,
    DataMappingRecord,
    TestGenerationTarget,
    LLMDiagnostics,
    ImportStatement,
    DiagnosticEntry,
    ExistingFunction,
    AIPanelPrompt,
    Command,
    TemplateId,
    ChatNotify,
    GenerateCodeRequest,
    TestPlanGenerationRequest,
    TestGeneratorIntermediaryState,
    DocumentationGeneratorIntermediaryState,
    SourceFiles,
    ChatEntry,
    OperationType,
    GENERATE_TEST_AGAINST_THE_REQUIREMENT,
    GENERATE_CODE_AGAINST_THE_REQUIREMENT,
    ComponentInfo,
    ImportInfo,
    MetadataWithAttachments,
    ExtendedDataMapperMetadata,
    DocGenerationRequest,
    DocGenerationType,
    FileChanges,
    AIChatMachineEventType,
    AIChatMachineStateValue,
    UIChatHistoryMessage,
} from "@wso2/ballerina-core";

import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Icon, Codicon, Typography } from "@wso2/ui-toolkit";

import { AIChatInputRef } from "../AIChatInput";
import ProgressTextSegment from "../ProgressTextSegment";
import ToolCallSegment from "../ToolCallSegment";
import TodoSection from "../TodoSection";
import RoleContainer from "../RoleContainter";
import { Attachment, AttachmentStatus, TaskApprovalRequest } from "@wso2/ballerina-core";
import { formatWithProperIndentation } from "../../../../utils/utils";

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
import { abortFetchWithAuth, fetchWithAuth } from "../../utils/networkUtils";
import { SYSTEM_ERROR_SECRET } from "../AIChatInput/constants";
import { CodeSegment } from "../CodeSegment";
import AttachmentBox, { AttachmentsContainer } from "../AttachmentBox";
import Footer from "./Footer";
import ApprovalFooter from "./Footer/ApprovalFooter";
import { useFooterLogic } from "./Footer/useFooterLogic";
import { SettingsPanel } from "../../SettingsPanel";
import WelcomeMessage from "./Welcome";
import { getOnboardingOpens, incrementOnboardingOpens } from "./utils/utils";

import FeedbackBar from "./../FeedbackBar";
import { useFeedback } from "./utils/useFeedback";

interface ChatIndexes {
    integratedChatIndex: number;
    previouslyIntegratedChatIndex: number;
}

// Helper function to convert chat history messages to UI format
const convertToUIMessages = (messages: UIChatHistoryMessage[]) => {
    return messages.map((msg) => {
        let role, type;
        if (msg.role === "user") {
            role = "User";
            type = "user_message";
        } else if (msg.role === "assistant") {
            role = "Copilot";
            type = "assistant_message";
        }
        return {
            role: role,
            type: type,
            content: msg.content,
        };
    });
};

// Helper function to load chat history from localStorage
const loadFromLocalStorage = (projectUuid: string, setMessages: React.Dispatch<React.SetStateAction<any[]>>, chatArray: ChatEntry[]) => {
    const localStorageFile = `chatArray-AIGenerationChat-${projectUuid}`;
    const storedChatArray = localStorage.getItem(localStorageFile);
    if (storedChatArray) {
        const chatArrayFromStorage = JSON.parse(storedChatArray);
        chatArray.length = 0;
        chatArray.push(...chatArrayFromStorage);
        // Add the messages from the chat array to the view
        setMessages((prevMessages) => [
            ...prevMessages,
            ...chatArray.map((entry: ChatEntry) => {
                let role, type;
                if (entry.actor === "user") {
                    role = "User";
                    type = "user_message";
                } else if (entry.actor === "assistant") {
                    role = "Copilot";
                    type = "assistant_message";
                }
                return {
                    role: role,
                    type: type,
                    content: entry.message,
                };
            }),
        ]);
    }
};

enum CodeGenerationType {
    CODE_FOR_USER_REQUIREMENT = "CODE_FOR_USER_REQUIREMENT",
    TESTS_FOR_USER_REQUIREMENT = "TESTS_FOR_USER_REQUIREMENT",
    CODE_GENERATION = "CODE_GENERATION",
}

var chatArray: ChatEntry[] = [];
var integratedChatIndex = 0;
var previouslyIntegratedChatIndex = 0;
var previousDevelopmentDocumentContent = "";

// A string array to store all code blocks
const codeBlocks: string[] = [];
var projectUuid = "";
var backendRootUri = "";
var chatLocation = "";

var remainingTokenPercentage: string | number;
var remaingTokenLessThanOne: boolean = false;

var timeToReset: number;
const INVALID_RECORD_REFERENCE: Error = new Error(
    "Invalid record reference. Follow <org-name>/<package-name>:<record-name> format when referencing to record in another package."
);
const NO_DRIFT_FOUND = "No drift identified between the code and the documentation.";
const DRIFT_CHECK_ERROR = "Failed to check drift between the code and the documentation. Please try again.";
const RATE_LIMIT_ERROR = ` Cause: Your usage limit has been exceeded. This should reset in the beggining of the next month.`;
const UPDATE_CHAT_SUMMARY_FAILED = `Failed to update the chat summary.`;

const CHECK_DRIFT_BETWEEN_CODE_AND_DOCUMENTATION = "Check drift between code and documentation";
const GENERATE_CODE_AGAINST_THE_PROVIDED_REQUIREMENTS = "Generate code based on the following requirements: ";
const GENERATE_CODE_AGAINST_THE_PROVIDED_REQUIREMENTS_TRIMMED = GENERATE_CODE_AGAINST_THE_PROVIDED_REQUIREMENTS.trim();

//TODO: Add better error handling from backend. stream error type and non 200 status codes

const AIChat: React.FC = () => {
    const { rpcClient } = useRpcContext();
    const [messages, setMessages] = useState<Array<{ role: string; content: string; type: string }>>([]);
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

    const [approvalRequest, setApprovalRequest] = useState<Omit<TaskApprovalRequest, "type"> | null>(null);


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
        rpcClient
            .getAiPanelRpcClient()
            .getDefaultPrompt()
            .then((defaultPrompt: AIPanelPrompt) => {
                if (defaultPrompt) {
                    aiChatInputRef.current?.setInputContent(defaultPrompt);
                }
            });
    }, []);

    /**
     * Effect: Update onboarding state
     */
    useEffect(function updateOnboardingState() {
        incrementOnboardingOpens();
    }, []);
    /* REFACTORED CODE END [2] */

    let codeSegmentRendered = false;
    const [tempStorage, setTempStorage] = useState<{ [filePath: string]: string }>({});
    const [initialFiles, setInitialFiles] = useState<Set<string>>(new Set<string>());
    const [emptyFiles, setEmptyFiles] = useState<Set<string>>(new Set<string>());

    async function fetchBackendUrl() {
        try {
            backendRootUri = await rpcClient.getAiPanelRpcClient().getBackendUrl();
            chatLocation = (await rpcClient.getVisualizerLocation()).projectUri;
            setIsReqFileExists(
                chatLocation != null &&
                chatLocation != undefined &&
                (await rpcClient.getAiPanelRpcClient().isRequirementsSpecificationFileExist(chatLocation))
            );

            generateNaturalProgrammingTemplate(isReqFileExists);
            // Do something with backendRootUri
        } catch (error) {
            console.error("Failed to fetch backend URL:", error);
        }
    }
    useEffect(() => {
        fetchBackendUrl();
    }, []);

    useEffect(() => {
        rpcClient
            ?.getAiPanelRpcClient()
            .getProjectUuid()
            .then((response) => {
                projectUuid = response;

                const localStorageIndexFile = `chatArray-AIGenerationChat-${projectUuid}-developer-index`;
                const storedIndexes = localStorage.getItem(localStorageIndexFile);
                if (storedIndexes) {
                    const indexes: ChatIndexes = JSON.parse(storedIndexes);
                    integratedChatIndex = indexes.integratedChatIndex;
                    previouslyIntegratedChatIndex = indexes.previouslyIntegratedChatIndex;
                }

                // TODO: Enable state machine-based chat history loading once fully tested
                // Try to get chat history from state machine first
                rpcClient
                    .getAIChatUIHistory()
                    .then((uiMessages: UIChatHistoryMessage[]) => {
                        if (uiMessages && uiMessages.length > 0) {
                            // Convert and set messages from state machine
                            setMessages((prevMessages) => [
                                ...prevMessages,
                                ...convertToUIMessages(uiMessages)
                            ]);
                        } else {
                            // Fallback to localStorage if state machine has no messages
                            loadFromLocalStorage(projectUuid, setMessages, chatArray);
                        }
                    })
                    .catch((error: any) => {
                        // Fallback to localStorage if state machine call fails
                        console.warn('[AIChat] Failed to get chat history from state machine, falling back to localStorage:', error);
                        loadFromLocalStorage(projectUuid, setMessages, chatArray);
                    });
            });
    }, []);

    useEffect(() => {
        const initializeAutoApproveState = async () => {
            try {
                const context = await rpcClient.getAIChatContext();
                if (context && context.autoApproveEnabled !== undefined) {
                    setIsAutoApproveEnabled(context.autoApproveEnabled);
                }
            } catch (error) {
                console.error("[AIChat] Failed to initialize auto-approve state:", error);
            }
        };

        initializeAutoApproveState();
    }, [rpcClient]);

    rpcClient?.onAIChatStateChanged((newState: AIChatMachineStateValue) => {
        setAiChatStateMachineState(newState);
    });

    rpcClient?.onChatNotify((response: ChatNotify) => {
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
            } else if (response.toolName === "task_write") {
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        newMessages[newMessages.length - 1].content += `\n\n<toolcall>Planning...</toolcall>`;
                    }
                    return newMessages;
                });
            } else if (["file_write", "file_edit", "file_batch_edit", "file_read"].includes(response.toolName)) {
                const fileName = response.toolInput?.fileName || "file";
                const message = response.toolName === "file_read"
                    ? `Reading ${fileName}...`
                    : `Generating code for ${fileName}...`;

                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        newMessages[newMessages.length - 1].content += `\n\n<toolcall>${message}</toolcall>`;
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
                                `<toolcall>No relevant libraries found.</toolcall>`
                            );
                        } else {
                            newMessages[newMessages.length - 1].content = newMessages[
                                newMessages.length - 1
                            ].content.replace(
                                `<toolcall>Analyzing request & selecting libraries...</toolcall>`,
                                `<toolcall>Fetched libraries: [${libraryNames.join(", ")}]</toolcall>`
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
            } else if (["file_write", "file_edit", "file_batch_edit", "file_read"].includes(response.toolName)) {
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        const lastMessageContent = newMessages[newMessages.length - 1].content;
                        const generatingPattern = /<toolcall>Generating code for (.+?)\.\.\.<\/toolcall>/;
                        const readingPattern = /<toolcall>Reading (.+?)\.\.\.<\/toolcall>/;

                        let updatedContent = lastMessageContent;

                        if (response.toolName === "file_read") {
                            updatedContent = lastMessageContent.replace(
                                readingPattern,
                                (_match, fileName) => `<toolcall>Read ${fileName}</toolcall>`
                            );
                        } else {
                            updatedContent = lastMessageContent.replace(
                                generatingPattern,
                                (_match, fileName) => `<toolcall>Generated ${fileName}</toolcall>`
                            );
                        }

                        newMessages[newMessages.length - 1].content = updatedContent;
                    }
                    return newMessages;
                });
            }
        } else if (type === "task_approval_request") {
            setApprovalRequest({
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
            }
        } else if (type === "intermediary_state") {
            const state = response.state;
            // Check if it's a documentation state by looking for specific properties
            if ("serviceName" in state && "documentation" in state) {
                setDocGenIntermediaryState(state as DocumentationGeneratorIntermediaryState);
            } else {
                setTestGenIntermediaryState(state as TestGeneratorIntermediaryState);
            }
        } else if (type === "diagnostics") {
            const content = response.diagnostics;
            currentDiagnosticsRef.current = content;
        } else if (type === "messages") {
            const messages = response.messages;
            messagesRef.current = messages;
        } else if (type === "stop") {
            console.log("Received stop signal");
            setIsCodeLoading(false);
            setIsLoading(false);
            const command = response.command;
            addChatEntry(
                "user",
                messages[messages.length - 2].content,
                command != undefined && command == Command.Code
            ); // Handle this in input layer?
            addChatEntry("assistant", messages[messages.length - 1].content);
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
            const command = response.command;
            const assistantMessageId = response.assistantMessageId;

            // Save chat entries
            addChatEntry(
                "user",
                messages[messages.length - 2].content,
                command != undefined && command == Command.Code
            );
            addChatEntry("assistant", messages[messages.length - 1].content);

            // Update assistant message in state machine with UI message
            rpcClient.sendAIChatStateEvent({
                type: AIChatMachineEventType.UPDATE_ASSISTANT_MESSAGE,
                payload: {
                    id: assistantMessageId,
                    uiResponse: messages[messages.length - 1].content
                }
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

    function addChatEntry(role: string, content: string, isCodeGeneration: boolean = false): void {
        chatArray.push({
            actor: role,
            message: content,
            isCodeGeneration,
        });

        localStorage.setItem(`chatArray-AIGenerationChat-${projectUuid}`, JSON.stringify(chatArray));
    }

    function updateChatEntry(chatIdx: number, newEntry: ChatEntry): void {
        if (chatIdx >= 0 && chatIdx < chatArray.length) {
            newEntry.isCodeGeneration = chatArray[chatIdx].isCodeGeneration;
            chatArray[chatIdx] = newEntry;

            localStorage.setItem(`chatArray-AIGenerationChat-${projectUuid}`, JSON.stringify(chatArray));
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
        // Clear previous generation refs
        currentDiagnosticsRef.current = [];
        functionsRef.current = [];
        lastAttatchmentsRef.current = null;

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
            await processCodeGeneration([parsedInput.text, attachments, CodeGenerationType.CODE_GENERATION], inputText);
        } else if ("command" in parsedInput) {
            switch (parsedInput.command) {
                case Command.NaturalProgramming: {
                    let useCase = "";
                    switch (parsedInput.templateId) {
                        case "code-doc-drift-check":
                            await processLLMDiagnostics(attachments, inputText);
                            break;
                        case "generate-code-from-following-requirements":
                            await rpcClient.getAiPanelRpcClient().updateRequirementSpecification({
                                filepath: chatLocation,
                                content: parsedInput.placeholderValues.requirements,
                            });
                            setIsReqFileExists(true);

                            useCase = parsedInput.placeholderValues.requirements;
                            await processCodeGeneration(
                                [useCase, attachments, CodeGenerationType.CODE_FOR_USER_REQUIREMENT],
                                inputText
                            );
                            break;
                        case "generate-test-from-requirements":
                            rpcClient.getAiPanelRpcClient().createTestDirecoryIfNotExists(chatLocation);

                            useCase = getTemplateTextById(
                                commandTemplates,
                                Command.NaturalProgramming,
                                "generate-test-from-requirements"
                            );
                            await processCodeGeneration(
                                [useCase, attachments, CodeGenerationType.TESTS_FOR_USER_REQUIREMENT],
                                inputText
                            );
                            break;
                        case "generate-code-from-requirements":
                            useCase = getTemplateTextById(
                                commandTemplates,
                                Command.NaturalProgramming,
                                "generate-code-from-requirements"
                            );
                            await processCodeGeneration(
                                [useCase, attachments, CodeGenerationType.CODE_FOR_USER_REQUIREMENT],
                                inputText
                            );
                            break;
                    }
                    break;
                }
                case Command.Code: {
                    let useCase = "";
                    switch (parsedInput.templateId) {
                        case TemplateId.Wildcard:
                            useCase = parsedInput.text;
                            break;
                        case "generate-code":
                            useCase = parsedInput.placeholderValues.usecase;
                            break;
                        case "generate-from-readme":
                            useCase = getTemplateTextById(
                                commandTemplates,
                                parsedInput.command,
                                "generate-from-readme"
                            );
                            break;
                    }
                    await processCodeGeneration([useCase, attachments, CodeGenerationType.CODE_GENERATION], inputText);
                    break;
                }
                case Command.Tests: {
                    switch (parsedInput.templateId) {
                        case "tests-for-service":
                            await processTestGeneration(
                                [inputText, attachments],
                                "service",
                                parsedInput.placeholderValues.servicename
                            );
                            break;
                        case "tests-for-function":
                            await processTestGeneration(
                                [inputText, attachments],
                                "function",
                                parsedInput.placeholderValues.methodPath
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
                                inputText,
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
                                inputText,
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
                                inputText,
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
                                await processContextTypeCreation(inputText, attachments);
                                break;
                            } else {
                                throw new Error("Error: Missing Attach context");
                            }
                    }
                    break;
                }
                case Command.Healthcare: {
                    switch (parsedInput.templateId) {
                        case TemplateId.Wildcard:
                            await processHealthcareCodeGeneration(parsedInput.text, inputText);
                            break;
                    }
                    break;
                }
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
                case Command.Design: {
                    switch (parsedInput.templateId) {
                        case TemplateId.Wildcard:
                            await processDesignGeneration(parsedInput.text, inputText);
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

    async function processLLMDiagnostics(attachments: Attachment[], message: string) {
        let response: LLMDiagnostics =
            rpcClient == null
                ? { statusCode: 500, diags: DRIFT_CHECK_ERROR }
                : await rpcClient.getAiPanelRpcClient().getDriftDiagnosticContents(chatLocation);

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

        const userMessage = getUserMessage([message, attachments]);
        setMessages((prevMessages) => {
            const newMessage = [...prevMessages];
            newMessage[newMessage.length - 1].content = response.diags;
            return newMessage;
        });
        addChatEntry("user", userMessage);
        addChatEntry("assistant", response.diags);
        setIsSyntaxError(false);
    }

    async function processCodeGeneration(content: [string, Attachment[], OperationType], message: string) {
        const [useCase, attachments, operationType] = content;
        const fileAttatchments = attachments.map((file) => ({
            fileName: file.name,
            content: file.content,
        }));

        const requestBody: GenerateCodeRequest = {
            usecase: useCase,
            chatHistory: chatArray,
            operationType,
            fileAttachmentContents: fileAttatchments,
        };

        await rpcClient.getAiPanelRpcClient().generateCode(requestBody);
    }

    // Helper function to escape regex special characters in a string
    function escapeRegexString(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    // Function to create regex for finding a function without error type
    function createFunctionWithoutErrorTypeRegex(functionName: string, returnType: string): RegExp {
        const escapedReturnType = escapeRegexString(returnType);
        return new RegExp(
            `function\\s+${functionName}\\s*\\([^)]+\\)\\s*returns\\s+${escapedReturnType}(?!\\|error)\\s*(?:=>|\\{)`,
            "s"
        );
    }

    // Function to create regex for adding error type to a function signature
    function createAddErrorTypeRegex(functionName: string, returnType: string): RegExp {
        const escapedReturnType = escapeRegexString(returnType);
        return new RegExp(
            `(function\\s+${functionName}\\s*\\([^)]+\\)\\s*returns\\s+${escapedReturnType})\\s*(=>|\\{)`,
            "s"
        );
    }

    // Function to create regex for arrow function signatures
    function createArrowFunctionSignatureRegex(functionName: string, returnType: string): RegExp {
        const escapedReturnType = escapeRegexString(returnType);
        return new RegExp(
            `(function\\s+${functionName}\\s*\\([^)]+\\)\\s*returns\\s+${escapedReturnType}(?:\\|error)?)\\s*=>\\s*\\{[^}]*\\}`,
            "s"
        );
    }

    // Function to create regex for regular function signatures
    function createRegularFunctionSignatureRegex(functionName: string, returnType: string): RegExp {
        const escapedReturnType = escapeRegexString(returnType);
        return new RegExp(
            `(function\\s+${functionName}\\s*\\([^)]+\\)\\s*returns\\s+${escapedReturnType}(?:\\|error)?)\\s*\\{[^}]*\\}`,
            "s"
        );
    }

    // Fucntion to create regex to match function signatures without capturing the function body.
    function createExistingFunctionSignatureRegex(functionName: string) {
        return new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)\\s*returns\\s+[^=]+\\s*=>\\s*(?:\\{|)`, "s");
    }

    // Function to remove the body of a specified function while keeping the rest of the code unchanged.
    function removeFunctionBody(content: string, functionName: string) {
        // Regular expression to match the function signature and body
        const functionRegex = new RegExp(
            `(function\\s+${functionName}\\s*\\([^)]*\\)\\s*returns\\s+[^=]+\\s*=>)\\s*(?:\\{[^]*?\\}|[^;]*);`,
            "s"
        );

        // Replace the matched function body with an empty function body `{}` while keeping the signature
        return content.replace(functionRegex, `$1 {};`);
    }

    const handleAddAllCodeSegmentsToWorkspace = async (
        codeSegments: any,
        setIsCodeAdded: React.Dispatch<React.SetStateAction<boolean>>,
        command: string
    ) => {
        console.log("Add to integration called. Command: ", command);
        setIsAddingToWorkspace(true);

        try {
            const fileChanges: FileChanges[] = [];
            for (let { segmentText, filePath } of codeSegments) {
                let originalContent = "";
                if (!tempStorage[filePath]) {
                    try {
                        originalContent = await rpcClient.getAiPanelRpcClient().getFromFile({ filePath: filePath });
                        setTempStorage((prev) => ({ ...prev, [filePath]: originalContent }));
                        if (originalContent === "") {
                            setEmptyFiles((prev) => new Set([...prev, filePath]));
                        } else {
                            setInitialFiles((prev) => new Set([...prev, filePath]));
                        }
                    } catch (error) {
                        setTempStorage((prev) => ({ ...prev, [filePath]: "" }));
                    }
                }

                if (command === "ai_map") {
                    const importRegex = /import\s+[^;]+;/g;
                    const commentRegex = /^(?:(\/\/.*|#.*)\n)+/; // Matches both `//` and `#` comment blocks at the top
                    const functionRegex =
                        /function\s+(\w+)\s*\(([^)]*)\)\s*returns\s+([^={|]+)(?:\|error)?\s*=>\s*(?:\{([\s\S]*?)\}|([\s\S]*?));/;

                    let existingFunctionRegex;

                    // Check if we're dealing with a function that should be merged
                    const functionMatch = segmentText.match(functionRegex);
                    let shouldMergeFunction = false;
                    let functionName = "";
                    let functionBody = "";
                    let returnType = "";
                    let hasErrorType = false;
                    let updatedContent = "";

                    if (functionMatch) {
                        functionName = functionMatch[1];
                        const params = functionMatch[2];
                        returnType = functionMatch[3].trim();
                        functionBody = functionMatch[4] ? functionMatch[4].trim() : functionMatch[5]?.trim();

                        // Check if new function has error return type
                        hasErrorType = segmentText.includes(`returns ${returnType}|error`);
                        existingFunctionRegex = createExistingFunctionSignatureRegex(functionName);
                        const existingFunctionMatch = originalContent.match(existingFunctionRegex);

                        if (existingFunctionMatch) {
                            shouldMergeFunction = true;
                        }
                    }

                    const imports = segmentText.match(importRegex) || [];
                    const codeWithoutImports = segmentText.replace(importRegex, "").trim();

                    updatedContent = removeFunctionBody(originalContent, functionName);

                    // Extract existing comments at the top
                    const commentMatch = updatedContent.match(commentRegex);
                    const existingComments = commentMatch ? commentMatch[0].trim() + "\n\n" : "";
                    updatedContent = updatedContent.replace(commentRegex, "").trim();

                    // Find any additional `#` comments that may exist before imports
                    const additionalCommentMatch = updatedContent.match(commentRegex);
                    const additionalComments = additionalCommentMatch ? additionalCommentMatch[0].trim() + "\n\n" : "";
                    updatedContent = updatedContent.replace(commentRegex, "").trim();

                    // Ensure new imports are added after all comments
                    let updatedImports = "";
                    imports.forEach((imp: string) => {
                        if (!updatedContent.includes(imp)) {
                            updatedImports += `${imp}\n`;
                        }
                    });

                    if (shouldMergeFunction) {
                        const existingFunctionWithoutErrorRegex = createFunctionWithoutErrorTypeRegex(
                            functionName,
                            returnType
                        );
                        const missingErrorType = existingFunctionWithoutErrorRegex.test(updatedContent) && hasErrorType;

                        if (missingErrorType) {
                            const addErrorTypeRegex = createAddErrorTypeRegex(functionName, returnType);
                            updatedContent = updatedContent.replace(addErrorTypeRegex, `$1|error $2`);
                        }

                        const arrowFunctionSignatureRegex = createArrowFunctionSignatureRegex(functionName, returnType);
                        const regularFunctionSignatureRegex = createRegularFunctionSignatureRegex(
                            functionName,
                            returnType
                        );
                        const isExpressionBody = /^\s*from\b/.test(functionBody);

                        if (arrowFunctionSignatureRegex.test(updatedContent)) {
                            updatedContent = updatedContent.replace(arrowFunctionSignatureRegex, (match, signature) => {
                                return isExpressionBody
                                    ? `${signature} => ${functionBody}`
                                    : `${signature} => {\n    ${functionBody}\n}`;
                            });
                        } else if (regularFunctionSignatureRegex.test(updatedContent)) {
                            updatedContent = updatedContent.replace(
                                regularFunctionSignatureRegex,
                                (match, signature) => {
                                    return `${signature} {\n    ${functionBody}\n}`;
                                }
                            );
                        }

                        updatedContent = `${existingComments}${additionalComments}${updatedImports}${updatedContent}`;
                    } else {
                        updatedContent = `${existingComments}${additionalComments}${updatedImports}${updatedContent}\n${codeWithoutImports}`;
                    }

                    segmentText = updatedContent.trim();
                } else if (command === "ai_map_inline") {
                    rpcClient.getAiPanelRpcClient().addInlineCodeSegmentToWorkspace({
                        segmentText,
                        filePath,
                    });
                    continue;
                } else if (command === "test") {
                    segmentText = `${originalContent}\n\n${segmentText}`;
                } else {
                    segmentText = `${segmentText}`;
                }

                let isTestCode = false;
                if (command === "test") {
                    isTestCode = true;
                }

                fileChanges.push({ filePath, content: segmentText });
            }

            if (fileChanges.length > 0) {
                await rpcClient.getAiPanelRpcClient().addFilesToProject({ fileChanges });
            }

            const developerMdContent = await rpcClient.getAiPanelRpcClient().readDeveloperMdFile(chatLocation);
            const updatedChatHistory = generateChatHistoryForSummarize(chatArray);
            setIsCodeAdded(true);
            setIsAddingToWorkspace(false);

            if (await rpcClient.getAiPanelRpcClient().isNaturalProgrammingDirectoryExists(chatLocation)) {
                fetchWithAuth({
                    url: backendRootUri + "/prompt/summarize",
                    method: "POST",
                    body: { chats: updatedChatHistory, existingChatSummary: developerMdContent },
                    rpcClient: rpcClient,
                })
                    .then(async (response) => {
                        const chatSummaryResponseStr = await streamToString(response.body);
                        await rpcClient
                            .getAiPanelRpcClient()
                            .addChatSummary({ summary: chatSummaryResponseStr, filepath: chatLocation })
                            .then(() => {
                                previouslyIntegratedChatIndex = integratedChatIndex;
                                integratedChatIndex = chatArray.length;
                                localStorage.setItem(
                                    `chatArray-AIGenerationChat-${projectUuid}-developer-index`,
                                    JSON.stringify({ integratedChatIndex, previouslyIntegratedChatIndex })
                                );
                                previousDevelopmentDocumentContent = developerMdContent;
                            })
                            .catch((error: any) => {
                                rpcClient.getAiPanelRpcClient().handleChatSummaryError(UPDATE_CHAT_SUMMARY_FAILED);
                            });
                    })
                    .catch((error: any) => {
                        rpcClient.getAiPanelRpcClient().handleChatSummaryError(UPDATE_CHAT_SUMMARY_FAILED);
                    });
            }
        } catch (error) {
            console.error("Error in handleAddAllCodeSegmentsToWorkspace:", error);
            setIsAddingToWorkspace(false);
            throw error;
        }
    };

    async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
        const reader = stream.getReader();
        const decoder = new TextDecoder("utf-8");
        let result = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            result += decoder.decode(value, { stream: true });
        }

        return result;
    }

    const handleRevertChanges = async (
        codeSegments: any,
        setIsCodeAdded: React.Dispatch<React.SetStateAction<boolean>>,
        command: string
    ) => {
        console.log("Revert gration called. Command: ", command);
        setIsAddingToWorkspace(true);

        try {
            const fileChanges: FileChanges[] = [];
            for (const { filePath } of codeSegments) {
                let originalContent = tempStorage[filePath];
                if (originalContent === "" && !initialFiles.has(filePath) && !emptyFiles.has(filePath)) {
                    // Delete the file if it didn't initially exist in the workspace
                    try {
                        await rpcClient.getAiPanelRpcClient().deleteFromProject({ filePath: filePath });
                    } catch (error) {
                        console.error(`Error deleting file ${filePath}:`, error);
                    }
                } else {
                    let isTestCode = false;
                    if (command === "test") {
                        isTestCode = true;
                    }
                    const revertContent = emptyFiles.has(filePath) ? "" : originalContent;
                    fileChanges.push({ filePath, content: revertContent });
                }
            }
            if (fileChanges.length > 0) {
                await rpcClient.getAiPanelRpcClient().addFilesToProject({ fileChanges });
            }
            rpcClient.getAiPanelRpcClient().updateDevelopmentDocument({
                content: previousDevelopmentDocumentContent,
                filepath: chatLocation,
            });
            integratedChatIndex = previouslyIntegratedChatIndex;
            localStorage.setItem(
                `chatArray-AIGenerationChat-${projectUuid}-developer-index`,
                JSON.stringify({ integratedChatIndex, previouslyIntegratedChatIndex })
            );
            setTempStorage({});
            setInitialFiles(new Set<string>());
            setEmptyFiles(new Set<string>());
            setIsCodeAdded(false);
            setIsAddingToWorkspace(false);
        } catch (error) {
            console.error("Error in handleRevertChanges:", error);
            setIsAddingToWorkspace(false);
            throw error;
        }
    };

    async function processTestGeneration(
        content: [string, Attachment[]],
        targetType: string, // service or function
        target: string // <servicename> or <resourcemethod resourcepath>
    ) {
        let assistantResponse = "";
        try {
            const targetSource =
                targetType === "service"
                    ? await rpcClient.getAiPanelRpcClient().getServiceSourceForName(target)
                    : await rpcClient.getAiPanelRpcClient().getResourceSourceForMethodAndPath(target);
            const requestBody: TestPlanGenerationRequest = {
                targetType: targetType === "service" ? TestGenerationTarget.Service : TestGenerationTarget.Function,
                targetSource: targetSource,
                target: target,
            };

            await rpcClient.getAiPanelRpcClient().generateTestPlan(requestBody);
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

    // Process records from another package
    function processRecordReference(
        recordName: string,
        recordMap: Map<string, any>,
        allImports: Array<ImportInfo>,
        importsMap: Map<string, ImportInfo>
    ): DataMappingRecord | Error {
        const isArray = recordName.endsWith("[]");
        const cleanedRecordName = recordName.replace(/\[\]$/, "");

        // Check for primitive types
        const primitiveTypes = ["string", "int", "boolean", "float", "decimal"];
        if (primitiveTypes.includes(cleanedRecordName)) {
            return { type: `${cleanedRecordName}`, isArray, filePath: null };
        }
        const rec = recordMap.get(cleanedRecordName);

        if (!rec) {
            if (cleanedRecordName.includes(":")) {
                if (!cleanedRecordName.includes("/")) {
                    const [moduleName, recordName] = cleanedRecordName.split(":");
                    const matchedImport = allImports.find((imp) => {
                        if (imp.alias) {
                            return cleanedRecordName.startsWith(imp.alias);
                        }
                        const moduleNameParts = imp.moduleName.split(/[./]/);
                        const inferredAlias = moduleNameParts[moduleNameParts.length - 1];
                        return cleanedRecordName.startsWith(inferredAlias);
                    });

                    if (!matchedImport) {
                        return INVALID_RECORD_REFERENCE;
                    }
                    importsMap.set(cleanedRecordName, {
                        moduleName: matchedImport.moduleName,
                        alias: matchedImport.alias,
                        recordName: recordName,
                    });
                } else {
                    const [moduleName, recordName] = cleanedRecordName.split(":");
                    importsMap.set(cleanedRecordName, {
                        moduleName: moduleName,
                        recordName: recordName,
                    });
                }
                return { type: `${cleanedRecordName}`, isArray, filePath: null };
            } else {
                throw new Error(`${cleanedRecordName} is not defined.`);
            }
        }
        return { ...rec, isArray };
    }

    // Processes existing functions to find a matching function by name
    async function processExistingFunctions(
        existingFunctions: ExistingFunction[],
        functionName: string
    ): Promise<{
        match: RegExpMatchArray | null;
        functionNameMatch: boolean;
        matchingFunctionFile: string | null;
    }> {
        for (const func of existingFunctions) {
            const functionContent = await rpcClient.getAiPanelRpcClient().getContentFromFile({
                filePath: func.filePath,
            });

            const fileName = func.filePath.split("/").pop();
            const contentLines = functionContent.split("\n");
            // Filter out commented lines (both // and # style comments)
            const nonCommentedLines = contentLines.filter((line) => {
                const trimmedLine = line.trim();
                return !(trimmedLine.startsWith("//") || trimmedLine.startsWith("#"));
            });
            const cleanContent = nonCommentedLines.join("\n");

            const signatureRegex = /function\s+(\w+)\s*\(([^)]*)\)\s*returns\s+([^{=]+)(?:\s*=>\s*)?/g;

            // Use matchAll to find all function signatures in the content
            const matches = [...cleanContent.matchAll(signatureRegex)];

            // Check if any of the function signatures match the target function name
            for (const match of matches) {
                const funcName = match[1];
                if (funcName === functionName) {
                    return {
                        match,
                        functionNameMatch: true,
                        matchingFunctionFile: fileName,
                    };
                }
            }
        }

        // If no match is found
        return {
            match: null,
            functionNameMatch: false,
            matchingFunctionFile: null,
        };
    }

    // Process input parameters
    function processInputs(
        inputParams: string[],
        recordMap: Map<any, any>,
        allImports: ImportStatement[],
        importsMap: Map<any, any>
    ) {
        let results = inputParams.map((param: string) =>
            processRecordReference(param, recordMap, allImports, importsMap)
        );
        return results.filter((result): result is DataMappingRecord => {
            if (result instanceof Error) {
                throw INVALID_RECORD_REFERENCE;
            }
            return true;
        });
    }

    // Process Output parameters
    function processOutput(
        outputParam: string,
        recordMap: Map<any, any>,
        allImports: ImportInfo[],
        importsMap: Map<any, any>
    ) {
        const parts = outputParam.split("|");
        const validParts = parts.filter((name: string) => name !== "error");
        if (validParts.length > 1) {
            throw new Error(
                `Invalid output parameter: "${outputParam}". Union types are not supported. Please provide a single valid record name.`
            );
        }
        const cleanedOutputRecordName = validParts.length > 0 ? validParts[0] : "error";
        const outputResult = processRecordReference(cleanedOutputRecordName, recordMap, allImports, importsMap);
        if (outputResult instanceof Error) {
            throw INVALID_RECORD_REFERENCE;
        }
        return outputResult;
    }

    async function processMappingParameters(
        message: string,
        parameters: MappingParameters,
        metadata?: ExtendedDataMapperMetadata,
        attachments?: Attachment[]
    ) {
        let assistant_response = "";
        let newImports;
        const recordMap = new Map();
        const importsMap = new Map();
        let inputs: DataMappingRecord[];
        let output;
        let inputParams;
        let outputParam;
        let inputNames: string[] = [];
        let result;
        let finalContent: string = "";
        setIsLoading(true);

        const functionName = parameters.functionName;

        const projectImports = await rpcClient.getBIDiagramRpcClient().getAllImports();
        const activeFile = await rpcClient.getAiPanelRpcClient().getActiveFile();
        const projectComponents = await rpcClient.getBIDiagramRpcClient().getProjectComponents();

        const allImports: ImportStatement[] = [];
        projectImports.imports.forEach((file) => {
            if (file.statements && file.statements.length > 0) {
                file.statements.forEach((statement) => {
                    allImports.push(statement);
                });
            }
        });

        const existingFunctions: ComponentInfo[] = [];

        for (const pkg of projectComponents.components.packages || []) {
            for (const mod of pkg.modules || []) {
                let filepath = pkg.filePath;
                if (mod.name !== undefined) {
                    const modDir = await rpcClient.getAiPanelRpcClient().getModuleDirectory({
                        moduleName: mod.name,
                        filePath: filepath,
                    });
                    filepath += `${modDir}/${mod.name}/`;
                }
                mod.records.forEach((rec) => {
                    const recFilePath = filepath + rec.filePath;
                    recordMap.set(rec.name, { type: rec.name, isArray: false, filePath: recFilePath });
                });

                // Collect functions
                mod.functions?.forEach((func) => {
                    existingFunctions.push({
                        name: func.name,
                        filePath: filepath + func.filePath,
                        startLine: func.startLine,
                        startColumn: func.startColumn,
                        endLine: func.endLine,
                        endColumn: func.endColumn,
                    });
                });
            }
        }

        if (parameters.inputRecord.length > 0 || parameters.outputRecord !== "") {
            result = await processExistingFunctions(existingFunctions, functionName);
            if (result.functionNameMatch) {
                throw new Error(
                    `A function named "${functionName}" exists in '${result.matchingFunctionFile}'. Please provide a valid function name.`
                );
            }
            inputParams = parameters.inputRecord;
            outputParam = parameters.outputRecord;
        } else {
            if (existingFunctions.length === 0) {
                throw new Error(
                    `A function named "${functionName}" was not found in the project. Please provide a valid function name.`
                );
            }
            result = await processExistingFunctions(existingFunctions, functionName);
            if (!result.functionNameMatch) {
                throw new Error(
                    `A function named "${functionName}" was not found in the project. Please provide a valid function name.`
                );
            }

            if (result.match[2] === "") {
                throw new Error(
                    `A function named "${functionName}" is not a valid datamapper function.`
                );
            }
            const params = result.match[2].split(/,\s*/).map((param) => param.trim().split(/\s+/));
            inputParams = params.map((parts) => parts[0]);
            inputNames = params.map((parts) => parts[1]);
            outputParam = result.match[3].trim();
        }

        inputs = processInputs(inputParams, recordMap, allImports, importsMap);
        output = processOutput(outputParam, recordMap, allImports, importsMap);

        const requestPayload: any = {
            inputRecordTypes: inputs,
            outputRecordType: output,
            functionName,
            imports: Array.from(importsMap.values()),
            inputNames: inputNames,
            model: metadata,
        };
        if (attachments && attachments.length > 0) {
            requestPayload.attachment = attachments;
        }

        let allMappingsRequest;
        const tempFileMetadata = await rpcClient.getAiPanelRpcClient().createTempFileAndGenerateMetadata({
            inputs,
            output,
            functionName,
            inputNames,
            imports: Array.from(importsMap.values()),
        });
        allMappingsRequest = await rpcClient.getAiPanelRpcClient().generateMappings({
            metadata: tempFileMetadata,
            attachments,
            useTemporaryFile: true,
        });

        const response = await rpcClient.getDataMapperRpcClient().getAllDataMapperSource(allMappingsRequest);
        finalContent = response.textEdits[allMappingsRequest.filePath]?.[0]?.newText;

        await rpcClient.getAiPanelRpcClient().addCodeSegmentToWorkspace({
            segmentText: finalContent,
            filePath: tempFileMetadata.codeData.lineRange.fileName,
            metadata: tempFileMetadata,
            textEdit: response,
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
        finalContent = await rpcClient.getAiPanelRpcClient().getContentFromFile({
            filePath: tempFileMetadata.codeData.lineRange.fileName,
        });

        setIsLoading(false);

        let filePath;
        if (result.functionNameMatch) {
            filePath = result.matchingFunctionFile;
        } else if (activeFile && activeFile.endsWith(".bal")) {
            filePath = activeFile;
        } else {
            filePath = "data_mappings.bal";
        }
        const needsImports = Array.from(importsMap.values()).length > 0;

        if (needsImports) {
            let fileContent = await rpcClient.getAiPanelRpcClient().getFromFile({ filePath: filePath });
            const existingImports = new Set(
                fileContent.match(/import\s+([a-zA-Z0-9._]+)/g)?.map((imp) => imp.split(" ")[1]) || []
            );

            newImports = Array.from(importsMap.values())
                .filter((imp) => !existingImports.has(imp.moduleName))
                .map((imp) => {
                    const moduleName = imp.moduleName.trim();
                    return imp.alias ? `import ${moduleName} as ${imp.alias};` : `import ${moduleName};`;
                })
                .join("\n");

            finalContent = `${newImports}\n${finalContent}`;
        }

        assistant_response = `Mappings consist of the following:\n`;
        if (inputParams.length === 1) {
            assistant_response += `- **Input Record**: ${inputParams[0]}\n`;
        } else {
            assistant_response += `- **Input Records**: ${inputParams.join(", ")}\n`;
        }
        assistant_response += `- **Output Record**: ${outputParam}\n`;
        assistant_response += `- **Function Name**: ${functionName}\n`;

        if (result.functionNameMatch) {
            assistant_response += `\n**Note**: When you click **Add to Integration**, it will override your existing mappings.\n`;
        }
        assistant_response += `<code filename="${filePath}" type="ai_map">\n\`\`\`ballerina\n${finalContent}\n\`\`\`\n</code>`;

        setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            newMessages[newMessages.length - 1].content = assistant_response;
            return newMessages;
        });
        addChatEntry("user", message);
        addChatEntry("assistant", assistant_response);
    }

    async function processInlineMappingParameters(
        message: string,
        metadata?: ExtendedDataMapperMetadata,
        attachments?: Attachment[]
    ) {
        let assistant_response = "";
        let finalContent = "";

        if (!metadata || Object.keys(metadata).length === 0) {
            throw new Error(`Please make sure variables are initialized, and then try again.`);
        }

        let fileName = metadata.codeData.lineRange.fileName;
        const variableName = metadata.name;
        const typeName = metadata.mappingsModel.output.typeName;

        setIsLoading(true);

        try {
            const requestPayload: MetadataWithAttachments = {
                metadata,
                useTemporaryFile: false,
            };
            if (attachments && attachments.length > 0) {
                requestPayload.attachments = attachments;
            }
            const allMappingsRequest = await rpcClient.getAiPanelRpcClient().generateMappings(requestPayload);
            const sourceResponse = await rpcClient.getDataMapperRpcClient().getAllDataMapperSource(allMappingsRequest);

            setIsLoading(false);

            finalContent = sourceResponse.textEdits[allMappingsRequest.filePath]?.[0]?.newText;

            assistant_response = `Here are the data mappings:\n\n`;
            assistant_response += `\n**Note**: When you click **Add to Integration**, it will override your existing mappings.\n`;

            const moduleInfo = metadata.mappingsModel.output.typeInfo;
            const hasModuleInfo = moduleInfo && moduleInfo.moduleName;

            const typePrefix = hasModuleInfo ? `${moduleInfo.moduleName.split(".").pop()}:${typeName}` : typeName;

            const formattedContent = `${typePrefix} ${variableName} = {\n${formatWithProperIndentation(
                finalContent
            )}\n};`;

            assistant_response += `<code filename="${fileName}" type="ai_map_inline">\n\`\`\`ballerina\n${formattedContent}\n\`\`\`\n</code>`;

            setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                newMessages[newMessages.length - 1].content = assistant_response;
                return newMessages;
            });
            addChatEntry("user", message);
            addChatEntry("assistant", assistant_response);

            return { success: true, response: assistant_response };
        } catch (error) {
            setIsLoading(false);
            return { error: error instanceof Error ? error.message : "An unexpected error occurred" };
        }
    }

    async function processContextTypeCreation(message: string, attachments: Attachment[]) {
        let assistant_response = "";
        const recordMap = new Map();
        setIsLoading(true);
        let filePath = "types.bal";

        const projectComponents = await rpcClient.getBIDiagramRpcClient().getProjectComponents();

        projectComponents.components.packages?.forEach((pkg) => {
            pkg.modules?.forEach((mod) => {
                let filepath = pkg.filePath;
                if (mod.name !== undefined) {
                    filepath += `modules/${mod.name}/`;
                }
                mod.records.forEach((rec) => {
                    const recFilePath = filepath + rec.filePath;
                    recordMap.set(rec.name, { type: rec.name, isArray: false, filePath: recFilePath });
                });
            });
        });

        if (!attachments || attachments.length === 0) {
            throw new Error(`Missing attachment`);
        }

        const requestPayload: any = {
            backendUri: "",
            attachment: attachments,
        };

        const response = await rpcClient.getAiPanelRpcClient().getTypesFromRecord(requestPayload);
        let typeContent = response.typesCode;
        const newRecords = extractRecordTypes(typeContent);

        let fileContent = "";
        let fileExists = await rpcClient.getAiPanelRpcClient().getFileExists({ filePath: filePath });
        if (fileExists) {
            fileContent = await rpcClient.getAiPanelRpcClient().getFromFile({ filePath: filePath });
            typeContent = `${fileContent}\n${response.typesCode}`;
        }

        for (const record of newRecords) {
            if (recordMap.has(record.name)) {
                throw new Error(`Record "${record.name}" already exists in the workspace.`);
            }
        }

        assistant_response = `Record types generated from the ${attachments[0].name} file shown below.\n`;
        assistant_response += `<code filename="${filePath}" type="ai_map">\n\`\`\`ballerina\n${response.typesCode}\n\`\`\`\n</code>`;

        setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            newMessages[newMessages.length - 1].content = assistant_response;
            return newMessages;
        });
        setIsLoading(false);
        addChatEntry("user", message);
        addChatEntry("assistant", assistant_response);
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
        addChatEntry("user", message);
        addChatEntry("assistant", formatted_response);
    }

    async function processHealthcareCodeGeneration(useCase: string, message: string) {
        const requestBody: GenerateCodeRequest = {
            usecase: useCase,
            chatHistory: chatArray,
            fileAttachmentContents: [],
            operationType: CodeGenerationType.CODE_GENERATION,
        };
        await rpcClient.getAiPanelRpcClient().generateHealthcareCode(requestBody);
    }

    async function processOpenAPICodeGeneration(useCase: string, message: string) {
        const requestBody: any = {
            query: useCase,
            chatHistory: chatArray,
        };

        await rpcClient.getAiPanelRpcClient().generateOpenAPI(requestBody);
    }

    async function processDesignGeneration(useCase: string, message: string) {
        rpcClient.sendAIChatStateEvent({
            type: AIChatMachineEventType.SUBMIT_PROMPT,
            payload: { prompt: useCase }
        });
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

    function handleClearChat(): void {
        codeBlocks.length = 0;
        chatArray.length = 0;
        integratedChatIndex = 0;
        previouslyIntegratedChatIndex = 0;
        localStorage.setItem(
            `chatArray-AIGenerationChat-${projectUuid}-developer-index`,
            JSON.stringify({ integratedChatIndex, previouslyIntegratedChatIndex })
        );

        setMessages((prevMessages) => []);
        setApprovalRequest(null);

        localStorage.removeItem(`chatArray-AIGenerationChat-${projectUuid}`);

        rpcClient.sendAIChatStateEvent(AIChatMachineEventType.RESET);
    }

    const handleToggleAutoApprove = () => {
        const newValue = !isAutoApproveEnabled;
        setIsAutoApproveEnabled(newValue);
        if (newValue) {
            rpcClient.sendAIChatStateEvent(AIChatMachineEventType.ENABLE_AUTO_APPROVE);
        } else {
            rpcClient.sendAIChatStateEvent(AIChatMachineEventType.DISABLE_AUTO_APPROVE);
        }
    };

    const questionMessages = messages.filter((message) => message.type === "question");
    if (questionMessages.length > 0) {
        localStorage.setItem(
            `Question-AIGenerationChat-${projectUuid}`,
            questionMessages[questionMessages.length - 1].content
        );
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

            // Update the memory as well
            updateChatEntry(chatArray.length - 1, {
                actor: "assistant",
                message: newMessages[newMessages.length - 1].content,
            });

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

                updateChatEntry(chatArray.length - 1, {
                    actor: "assistant",
                    message: newContent,
                });
            }

            updateChatEntry(chatArray.length - 1, {
                actor: "assistant",
                message: newMessages[newMessages.length - 1].content,
            });

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

            // Update the memory as well
            updateChatEntry(chatArray.length - 1, {
                actor: "assistant",
                message: newMessages[newMessages.length - 1].content,
            });

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
                    addChatEntry("assistant", messages[messages.length - 1].content);
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
            assistantResponse: messages[messages.length - 1].content,
            previousMessages: messagesRef.current,
        });
    };

    const handleApprovalApprove = (enableAutoApprove: boolean) => {
        if (!approvalRequest) return;

        if (enableAutoApprove && !isAutoApproveEnabled) {
            setIsAutoApproveEnabled(true);
            rpcClient.sendAIChatStateEvent(AIChatMachineEventType.ENABLE_AUTO_APPROVE);
        } else if (!enableAutoApprove && isAutoApproveEnabled) {
            setIsAutoApproveEnabled(false);
            rpcClient.sendAIChatStateEvent(AIChatMachineEventType.DISABLE_AUTO_APPROVE);
        }

        if (approvalRequest.approvalType === "plan") {
            rpcClient.sendAIChatStateEvent({
                type: AIChatMachineEventType.APPROVE_PLAN,
                payload: {}
            });
        } else if (approvalRequest.approvalType === "completion") {
            const reviewTasks = approvalRequest.tasks.filter(t => t.status === "review");
            const lastReviewTask = reviewTasks[reviewTasks.length - 1];
            const lastApprovedTaskIndex = approvalRequest.tasks.findIndex(t => t.description === lastReviewTask?.description);

            rpcClient.sendAIChatStateEvent({
                type: AIChatMachineEventType.APPROVE_TASK,
                payload: {
                    lastApprovedTaskIndex: lastApprovedTaskIndex >= 0 ? lastApprovedTaskIndex : undefined
                }
            });
        }

        setApprovalRequest(null);
    };

    const handleApprovalReject = (comment: string) => {
        if (!approvalRequest) return;

        if (approvalRequest.approvalType === "plan") {
            rpcClient.sendAIChatStateEvent({
                type: AIChatMachineEventType.REJECT_PLAN,
                payload: { comment }
            });
        } else if (approvalRequest.approvalType === "completion") {
            rpcClient.sendAIChatStateEvent({
                type: AIChatMachineEventType.REJECT_TASK,
                payload: { comment }
            });
        }

        setApprovalRequest(null);
    };


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
                        <div>State: {aiChatStateMachineState}</div>
                        <HeaderButtons>
                            <Button
                                appearance="icon"
                                onClick={handleToggleAutoApprove}
                                tooltip={isAutoApproveEnabled ? "Disable auto-approval for tasks" : "Enable auto-approval for tasks"}
                            >
                                <Codicon name={isAutoApproveEnabled ? "check-all" : "inspect"} />
                                &nbsp;&nbsp;{isAutoApproveEnabled ? "Auto-Approve: On" : "Auto-Approve: Off"}
                            </Button>
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
                            const showGeneratingFiles = !codeSegmentRendered && index === currentGeneratingPromptIndex;
                            const isLastResponse = index === currentGeneratingPromptIndex;
                            const isAssistantMessage = message.role === "Copilot";
                            const lastAssistantIndex = otherMessages.map((m) => m.role).lastIndexOf("Copilot");
                            const isLatestAssistantMessage = isAssistantMessage && index === lastAssistantIndex;
                            codeSegmentRendered = false;

                            const segmentedContent = splitContent(message.content);
                            const areTestsGenerated = segmentedContent.some(
                                (segment) => segment.type === SegmentType.Progress
                            );
                            return (
                                <ChatMessage key={index}>
                                    {message.type !== "question" && message.type !== "label" && (
                                        <RoleContainer
                                            icon={message.role === "User" ? "bi-user" : "bi-ai-chat"}
                                            title={message.role}
                                            showPreview={false}
                                            isLoading={
                                                isLoading && !isSuggestionLoading && index === otherMessages.length - 1
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
                                                        key={i}
                                                        codeSegments={codeSegments}
                                                        loading={isLoading && showGeneratingFiles}
                                                        handleAddAllCodeSegmentsToWorkspace={
                                                            handleAddAllCodeSegmentsToWorkspace
                                                        }
                                                        handleRevertChanges={handleRevertChanges}
                                                        isReady={!isCodeLoading}
                                                        message={message}
                                                        buttonsActive={showGeneratingFiles}
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
                                                    />
                                                );
                                            }
                                        } else if (segment.type === SegmentType.Progress) {
                                            return (
                                                <ProgressTextSegment
                                                    text={segment.text}
                                                    loading={segment.loading}
                                                    failed={segment.failed}
                                                />
                                            );
                                        } else if (segment.type === SegmentType.ToolCall) {
                                            return (
                                                <ToolCallSegment
                                                    text={segment.text}
                                                    loading={segment.loading}
                                                    failed={segment.failed}
                                                />
                                            );
                                        } else if (segment.type === SegmentType.Todo) {
                                            const isLastMessage = index === otherMessages.length - 1;
                                            return (
                                                <TodoSection
                                                    tasks={segment.tasks || []}
                                                    message={segment.message}
                                                    isLoading={isLoading && isLastMessage}
                                                />
                                            );
                                        } else if (segment.type === SegmentType.Attachment) {
                                            return (
                                                <AttachmentsContainer>
                                                    {segment.text.split(",").map((fileName, index) => (
                                                        <AttachmentBox
                                                            key={index}
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
                                                    source={segment.text}
                                                    fileName={"Ballerina"}
                                                    language={"ballerina"}
                                                    collapsible={false}
                                                    showCopyButton={true}
                                                />
                                            );
                                        } else if (segment.type === SegmentType.References) {
                                            return <ReferenceDropdown key={i} links={JSON.parse(segment.text)} />;
                                        } else if (segment.type === SegmentType.TestScenario) {
                                            return (
                                                <AccordionItem
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
                                                    <div style={{ display: "flex", gap: "10px" }}>
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
                                                    <div style={{ display: "flex", gap: "10px" }}>
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
                                                    <VSCodeButton title="Documentation has been saved" disabled>
                                                        {"Saved"}
                                                    </VSCodeButton>
                                                );
                                            }
                                        } else {
                                            if (message.type === "Error") {
                                                return <ErrorBox key={i}>{segment.text}</ErrorBox>;
                                            }
                                            return <MarkdownRenderer key={i} markdownContent={segment.text} />;
                                        }
                                    })}
                                    {/* Show feedback bar only for the latest assistant message and when loading is complete */}
                                    {isAssistantMessage && isLatestAssistantMessage && !isLoading && !isCodeLoading && (
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
                        />
                    )}
                </AIChatView>
            )}
            {showSettings && <SettingsPanel onClose={() => setShowSettings(false)}></SettingsPanel>}
        </>
    );
};

export default AIChat;

export function replaceCodeBlocks(originalResp: string, newResp: string): string {
    // Create a map to store new code blocks by filename
    const newCodeBlocks = new Map<string, string>();

    // Extract code blocks from newResp
    const newCodeRegex = /<code filename="(.+?)">\s*```ballerina\s*([\s\S]*?)```\s*<\/code>/g;
    let match;
    while ((match = newCodeRegex.exec(newResp)) !== null) {
        newCodeBlocks.set(match[1], match[2].trim());
    }

    // Replace code blocks in originalResp
    const updatedResp = originalResp.replace(
        /<code filename="(.+?)">\s*```ballerina\s*([\s\S]*?)```\s*<\/code>/g,
        (match, filename, content) => {
            const newContent = newCodeBlocks.get(filename);
            if (newContent !== undefined) {
                return `<code filename="${filename}">\n\`\`\`ballerina\n${newContent}\n\`\`\`\n</code>`;
            }
            return match; // If no new content, keep the original
        }
    );

    // Remove replaced code blocks from newCodeBlocks
    const originalCodeRegex = /<code filename="(.+?)">/g;
    while ((match = originalCodeRegex.exec(originalResp)) !== null) {
        newCodeBlocks.delete(match[1]);
    }

    // Append any remaining new code blocks
    let finalResp = updatedResp;
    newCodeBlocks.forEach((content, filename) => {
        finalResp += `\n\n<code filename="${filename}">\n\`\`\`ballerina\n${content}\n\`\`\`\n</code>`;
    });

    return finalResp;
}

function extractRecordTypes(typesCode: string): { name: string; code: string }[] {
    const recordPattern = /\b(?:public|private)?\s*type\s+(\w+)\s+record\s+(?:{[|]?|[|]?{)[\s\S]*?;?\s*[}|]?;/g;
    const matches = [...typesCode.matchAll(recordPattern)];
    return matches.map((match) => ({
        name: match[1],
        code: match[0].trim(),
    }));
}
interface ContentBlock {
    delta: ContentBlockDeltaBody;
}

// Define the different event body types
interface ContentBlockDeltaBody {
    text: string;
}

interface OtherEventBody {
    // Define properties for other event types as needed
    [key: string]: any;
}

// Define the SSEEvent type with a discriminated union for the body
type SSEEvent = { event: "content_block_delta"; body: ContentBlock } | { event: string; body: OtherEventBody };

/**
 * Parses a chunk of text to extract the SSE event and body.
 * @param chunk - The chunk of text from the SSE stream.
 * @returns The parsed SSE event containing the event name and body (if present).
 * @throws Will throw an error if the data field is not valid JSON.
 */
export function parseSSEEvent(chunk: string): SSEEvent {
    let event: string | undefined;
    let body: any;

    chunk.split("\n").forEach((line) => {
        if (line.startsWith("event: ")) {
            event = line.slice(7);
        } else if (line.startsWith("data: ")) {
            try {
                body = JSON.parse(line.slice(6));
            } catch (e) {
                throw new Error("Invalid JSON data in SSE event");
            }
        }
    });

    if (!event) {
        throw new Error("Event field is missing in SSE event");
    }

    if (event === "content_block_delta") {
        return { event, body: body as ContentBlockDeltaBody };
    } else if (event === "functions") {
        return { event, body: body };
    } else {
        return { event, body: body as OtherEventBody };
    }
}

export function getProjectFromResponse(req: string): ProjectSource {
    const sourceFiles: SourceFile[] = [];
    const regex = /<code filename="([^"]+)">\s*```ballerina([\s\S]*?)```\s*<\/code>/g;
    let match;

    while ((match = regex.exec(req)) !== null) {
        const filePath = match[1];
        const fileContent = match[2].trim();
        sourceFiles.push({ filePath, content: fileContent });
    }

    return { sourceFiles, projectName: "" };
}

export enum SegmentType {
    Code = "Code",
    Text = "Text",
    Progress = "Progress",
    ToolCall = "ToolCall",
    Todo = "Todo",
    Attachment = "Attachment",
    InlineCode = "InlineCode",
    References = "References",
    TestScenario = "TestScenario",
    Button = "Button",
}

interface Segment {
    type: SegmentType;
    language?: string;
    loading: boolean;
    text: string;
    fileName?: string;
    command?: string;
    failed?: boolean;
    [key: string]: any;
}

function getCommand(command: string) {
    if (!command) {
        return "code";
    } else {
        return command.replaceAll(/"/g, "");
    }
}

function splitHalfGeneratedCode(content: string): Segment[] {
    const segments: Segment[] = [];
    // Regex to capture filename and optional test attribute
    const regex = /<code\s+filename="([^"]+)"(?:\s+type=("test"|"ai_map"|"ai_map_inline"))?>\s*```(\w+)\s*([\s\S]*?)$/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(content)) !== null) {
        const [fullMatch, fileName, type, language, code] = match;
        if (match.index > lastIndex) {
            // Non-code segment before the current code block
            segments.push({
                type: SegmentType.Text,
                loading: false,
                text: content.slice(lastIndex, match.index),
                command: getCommand(type),
            });
        }

        // Code segment
        segments.push({
            type: SegmentType.Code,
            language: language,
            loading: true,
            text: code,
            fileName: fileName,
            command: getCommand(type),
        });

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
        // Remaining non-code segment after the last code block
        segments.push({
            type: SegmentType.Text,
            loading: false,
            text: content.slice(lastIndex),
        });
    }

    return segments;
}

export function splitContent(content: string): Segment[] {
    const segments: Segment[] = [];

    // Combined regex to capture either <code ...>```<language> code ```</code> or <progress>Text</progress>
    const regex =
        /<code\s+filename="([^"]+)"(?:\s+type=("test"|"ai_map"|"ai_map_inline"))?>\s*```(\w+)\s*([\s\S]*?)```\s*<\/code>|<progress>([\s\S]*?)<\/progress>|<toolcall>([\s\S]*?)<\/toolcall>|<todo>([\s\S]*?)<\/todo>|<attachment>([\s\S]*?)<\/attachment>|<scenario>([\s\S]*?)<\/scenario>|<button\s+type="([^"]+)">([\s\S]*?)<\/button>|<inlineCode>([\s\S]*?)<inlineCode>|<references>([\s\S]*?)<references>/g;
    let match;
    let lastIndex = 0;

    function updateLastProgressSegmentLoading(failed: boolean = false) {
        const lastSegment = segments[segments.length - 1];
        if (lastSegment && (lastSegment.type === SegmentType.Progress || lastSegment.type === SegmentType.ToolCall)) {
            lastSegment.loading = false;
            lastSegment.failed = failed;
        }
    }

    while ((match = regex.exec(content)) !== null) {
        // Handle text before the current match
        if (match.index > lastIndex) {
            updateLastProgressSegmentLoading();

            const textSegment = content.slice(lastIndex, match.index);
            segments.push(...splitHalfGeneratedCode(textSegment));
        }

        if (match[1]) {
            // <code> block matched
            const fileName = match[1];
            const type = match[2];
            const language = match[3];
            const code = match[4];
            updateLastProgressSegmentLoading();
            segments.push({
                type: SegmentType.Code,
                loading: false,
                text: code,
                fileName: fileName,
                language: language,
                command: getCommand(type),
            });
        } else if (match[5]) {
            // <progress> block matched
            const progressText = match[5];

            updateLastProgressSegmentLoading();
            segments.push({
                type: SegmentType.Progress,
                loading: true,
                text: progressText,
            });
        } else if (match[6]) {
            // <toolcall> block matched
            const toolcallText = match[6];

            updateLastProgressSegmentLoading();
            segments.push({
                type: SegmentType.ToolCall,
                loading: true,
                text: toolcallText,
            });
        } else if (match[7]) {
            // <todo> block matched
            const todoData = match[7];

            updateLastProgressSegmentLoading();
            try {
                const parsedData = JSON.parse(todoData);
                segments.push({
                    type: SegmentType.Todo,
                    loading: false,
                    text: "",
                    tasks: parsedData.tasks || [],
                    message: parsedData.message || ""
                });
            } catch (error) {
                // If parsing fails, show as text
                console.error("Failed to parse todo data:", error);
            }
        } else if (match[8]) {
            // <attachment> block matched
            const attachmentName = match[8].trim();

            updateLastProgressSegmentLoading();

            const existingAttachmentSegment = segments.find((segment) => segment.type === SegmentType.Attachment);

            if (existingAttachmentSegment) {
                existingAttachmentSegment.text += `, ${attachmentName}`;
            } else {
                segments.push({
                    type: SegmentType.Attachment,
                    loading: false,
                    text: attachmentName,
                });
            }
        } else if (match[9]) {
            // <scenario> block matched
            const scenarioContent = match[9].trim();

            updateLastProgressSegmentLoading(true);
            segments.push({
                type: SegmentType.TestScenario,
                loading: false,
                text: scenarioContent,
            });
        } else if (match[10]) {
            // <button> block matched
            const buttonType = match[10].trim();
            const buttonContent = match[11].trim();

            updateLastProgressSegmentLoading(true);
            segments.push({
                type: SegmentType.Button,
                loading: false,
                text: buttonContent,
                buttonType: buttonType,
            });
        } else if (match[12]) {
            segments.push({
                type: SegmentType.InlineCode,
                text: match[12].trim(),
                loading: false,
            });
        } else if (match[13]) {
            segments.push({
                type: SegmentType.References,
                text: match[13].trim(),
                loading: false,
            });
        }

        // Update lastIndex to the end of the current match
        lastIndex = regex.lastIndex;
    }

    // Handle any remaining text after the last match
    if (lastIndex < content.length) {
        updateLastProgressSegmentLoading();

        const remainingText = content.slice(lastIndex);
        segments.push(...splitHalfGeneratedCode(remainingText));
    }

    return segments;
}
function generateChatHistoryForSummarize(chatArray: ChatEntry[]): ChatEntry[] {
    return chatArray
        .slice(integratedChatIndex)
        .filter(
            (chatEntry) =>
                chatEntry.actor.toLowerCase() == "user" &&
                chatEntry.isCodeGeneration &&
                !chatEntry.message.includes(GENERATE_TEST_AGAINST_THE_REQUIREMENT) &&
                !chatEntry.message.includes(GENERATE_CODE_AGAINST_THE_REQUIREMENT) &&
                !chatEntry.message.includes(GENERATE_CODE_AGAINST_THE_PROVIDED_REQUIREMENTS_TRIMMED)
        );
}

function transformProjectSource(project: ProjectSource): SourceFiles[] {
    const sourceFiles: SourceFiles[] = [];
    project.sourceFiles.forEach((file) => {
        sourceFiles.push({
            filePath: file.filePath,
            content: file.content,
        });
    });
    project.projectModules?.forEach((module) => {
        let basePath = "";
        if (!module.isGenerated) {
            basePath += "modules/";
        } else {
            basePath += "generated/";
        }

        basePath += module.moduleName + "/";
        // const path =
        module.sourceFiles.forEach((file) => {
            sourceFiles.push({
                filePath: basePath + file.filePath,
                content: file.content,
            });
        });
    });
    return sourceFiles;
}

function isContainsSyntaxError(diagnostics: DiagnosticEntry[]): boolean {
    return diagnostics.some((diag) => {
        if (typeof diag.code === "string" && diag.code.startsWith("BCE")) {
            const match = diag.code.match(/^BCE(\d+)$/);
            if (match) {
                const codeNumber = Number(match[1]);
                if (codeNumber < 2000) {
                    return true;
                }
            }
        }
    });
}
