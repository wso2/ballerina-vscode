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
    ComponentInfo,
    MetadataWithAttachments,
    ExtendedDataMapperMetadata,
    DocGenerationRequest,
    DocGenerationType,
    FileChanges,
} from "@wso2/ballerina-core";

import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Codicon } from "@wso2/ui-toolkit";

import { AIChatInputRef } from "../AIChatInput";
import ProgressTextSegment from "../ProgressTextSegment";
import ToolCallSegment from "../ToolCallSegment";
import RoleContainer from "../RoleContainter";
import { Attachment, AttachmentStatus } from "@wso2/ballerina-core";

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
import { fetchWithAuth } from "../../utils/networkUtils";
import { SYSTEM_ERROR_SECRET } from "../AIChatInput/constants";
import { CodeSegment } from "../CodeSegment";
import AttachmentBox, { AttachmentsContainer } from "../AttachmentBox";
import Footer from "./Footer";
import { useFooterLogic } from "./Footer/useFooterLogic";
import { SettingsPanel } from "../../SettingsPanel";
import WelcomeMessage from "./Welcome";
import { getOnboardingOpens, incrementOnboardingOpens } from "./utils/utils";

import FeedbackBar from "./../FeedbackBar";
import { useFeedback } from "./utils/useFeedback";
import { URI } from "vscode-uri";

interface ChatIndexes {
    integratedChatIndex: number;
    previouslyIntegratedChatIndex: number;
}

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
    const [currentFileArray, setCurrentFileArray] = useState<SourceFile[]>([]);

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
            chatLocation = (await rpcClient.getVisualizerLocation()).projectPath ;
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

                const localStorageFile = `chatArray-AIGenerationChat-${projectUuid}`;
                const storedChatArray = localStorage.getItem(localStorageFile);
                rpcClient
                    .getAiPanelRpcClient()
                    .getAIMachineSnapshot()
                    .then((snapshot) => {
                        if (storedChatArray) {
                            const chatArrayFromStorage = JSON.parse(storedChatArray);
                            chatArray = chatArrayFromStorage;
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

                            // Set initial messages only if chatArray's length is 0
                        } else {
                            if (chatArray.length === 0) {
                                setMessages((prevMessages) => [...prevMessages]);
                            }
                        }
                        // }
                    });
            });
    }, []);

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

            // Use functional update to access current state (avoid stale closure)
            setMessages((prevMessages) => {
                if (prevMessages.length >= 2) {
                    addChatEntry(
                        "user",
                        prevMessages[prevMessages.length - 2].content,
                        command != undefined && command == Command.Code
                    );
                    addChatEntry("assistant", prevMessages[prevMessages.length - 1].content);
                }
                return prevMessages;
            });
        } else if (type === "error") {
            console.log("Received error signal");
            const errorTemplate = `\n\n<error data-system="true" data-auth="${SYSTEM_ERROR_SECRET}">${response.content}</error>`;
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

    const handleAddAllCodeSegmentsToWorkspace = async (
        codeSegments: any,
        setIsCodeAdded: React.Dispatch<React.SetStateAction<boolean>>,
        command: string,
        filePaths?: SourceFile[]
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
                    const matchingFile = filePaths?.find(file => {
                        const filePathName = file.filePath.split('/').pop();
                        return filePathName === filePath;
                    });
                    segmentText = matchingFile.content
                } else if (command === "test" || command === "type_creator") {
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

        localStorage.removeItem(`chatArray-AIGenerationChat-${projectUuid}`);
    }

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
            assistantResponse: messages[messages.length - 1].content, // XML format with code blocks
            updatedFileNames: [], // Will be determined from parsed XML
            previousMessages: messagesRef.current,
        });
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
                                                        fileArray={currentFileArray}
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

export enum SegmentType {
    Code = "Code",
    Text = "Text",
    Progress = "Progress",
    ToolCall = "ToolCall",
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
    const regex = /<code\s+filename="([^"]+)"(?:\s+type=("test"|"ai_map"|"type_creator"))?>\s*```(\w+)\s*([\s\S]*?)$/g;
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
        /<code\s+filename="([^"]+)"(?:\s+type=("test"|"ai_map"|"type_creator"))?>\s*```(\w+)\s*([\s\S]*?)```\s*<\/code>|<progress>([\s\S]*?)<\/progress>|<toolcall>([\s\S]*?)<\/toolcall>|<attachment>([\s\S]*?)<\/attachment>|<scenario>([\s\S]*?)<\/scenario>|<button\s+type="([^"]+)">([\s\S]*?)<\/button>|<inlineCode>([\s\S]*?)<inlineCode>|<references>([\s\S]*?)<references>/g;
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
            // <attachment> block matched
            const attachmentName = match[7].trim();

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
        } else if (match[8]) {
            // <scenario> block matched
            const scenarioContent = match[8].trim();

            updateLastProgressSegmentLoading(true);
            segments.push({
                type: SegmentType.TestScenario,
                loading: false,
                text: scenarioContent,
            });
        } else if (match[9]) {
            // <button> block matched
            const buttonType = match[9].trim();
            const buttonContent = match[10].trim();

            updateLastProgressSegmentLoading(true);
            segments.push({
                type: SegmentType.Button,
                loading: false,
                text: buttonContent,
                buttonType: buttonType,
            });
        } else if (match[11]) {
            segments.push({
                type: SegmentType.InlineCode,
                text: match[11].trim(),
                loading: false,
            });
        } else if (match[12]) {
            segments.push({
                type: SegmentType.References,
                text: match[12].trim(),
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
