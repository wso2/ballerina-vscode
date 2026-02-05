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

import React, { useState } from "react";
import styled from "@emotion/styled";
import { EvalCase, EvalSet, EvalFunctionCall, EvalsetTrace } from "@wso2/ballerina-core";
import { MessageContainer, ProfilePic } from "../AgentChatPanel/Components/ChatInterface";
import { ToolCallsTimeline } from "./ToolCallsTimeline";
import { Icon } from "@wso2/ui-toolkit";
import { TopNavigationBar } from "../../components/TopNavigationBar";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { EditableTraceMessage } from "./EditableTraceMessage";
import { EditFooter } from "./EditFooter";
import { EditableToolCallsList } from "./EditableToolCallsList";
import { ToolEditorModal } from "./ToolEditorModal";
import { ConfirmationModal } from "./ConfirmationModal";
import {
    cloneEvalCase,
    updateTraceUserMessage,
    updateTraceAgentOutput,
    updateToolCallsInTrace,
    getContentType,
    deserializeContent,
    generateToolCallId,
    createNewTrace
} from "./utils/traceAdapters";

const PageWrapper = styled.div`
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
`;

const Container = styled.div`
    flex: 1;
    width: 100%;
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    display: flex;
    flex-direction: column;
    overflow: hidden;

    *, *::before, *::after {
        box-sizing: content-box;
    }
`;

const Header = styled.div`
    top: 0;
    padding: 12px 20px;
    position: sticky;
    background-color: var(--vscode-editorWidget-background);
    z-index: 2;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
`;

const HeaderLeft = styled.div`
    flex: 1;
`;

const EditButton = styled.button`
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;

    &:hover {
        background-color: var(--vscode-button-hoverBackground);
    }
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

export const Messages = styled.div<{ hasEditFooter?: boolean }>`
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow-y: auto;
    gap: 8px;
    position: relative;
    z-index: 1;
    padding: 16px 20px;
    padding-bottom: ${(props: { hasEditFooter: boolean; }) => props.hasEditFooter ? '80px' : '48px'};

    @media (min-width: 1000px) {
        padding-left: 15%;
        padding-right: 15%;
    }

    @media (min-width: 1600px) {
        padding-left: 20%;
        padding-right: 20%;
    }

    @media (min-width: 2000px) {
        padding-left: 25%;
        padding-right: 25%;
    }
`;

const AddTurnButton = styled.button`
    background-color: transparent;
    color: var(--vscode-textLink-foreground);
    border: 1px dashed var(--vscode-textLink-foreground);
    border-radius: 4px;
    padding: 12px 16px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin: 16px 0;
    transition: all 0.2s ease;

    &:hover {
        background-color: var(--vscode-textLink-foreground);
        color: var(--vscode-editor-background);
        opacity: 0.9;
    }

    &:active {
        transform: scale(0.98);
    }
`;

const TraceWrapper = styled.div`
    position: relative;
`;

interface EvalCaseViewerProps {
    projectPath: string;
    filePath: string;
    evalSet: EvalSet;
    evalCase: EvalCase;
}

export const EvalCaseViewer: React.FC<EvalCaseViewerProps> = ({ projectPath, filePath, evalSet, evalCase }) => {
    const { rpcClient } = useRpcContext();
    const [isEditMode, setIsEditMode] = useState(false);
    const [originalEvalCase, setOriginalEvalCase] = useState<EvalCase>(evalCase);
    const [workingEvalCase, setWorkingEvalCase] = useState<EvalCase>(evalCase);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedToolCall, setSelectedToolCall] = useState<{
        traceId: string;
        toolCallIndex: number;
    } | null>(null);
    const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);

    const extractToolCalls = (trace: EvalsetTrace): EvalFunctionCall[] => {
        const toolCalls: EvalFunctionCall[] = [];
        if (trace.output?.toolCalls) {
            return trace.output.toolCalls as EvalFunctionCall[];
        }
        return toolCalls;
    };

    const handleEnterEditMode = () => {
        setOriginalEvalCase(cloneEvalCase(evalCase));
        setWorkingEvalCase(cloneEvalCase(evalCase));
        setHasUnsavedChanges(false);
        setIsEditMode(true);
    };

    const handleExitEditMode = () => {
        setIsEditMode(false);
        setHasUnsavedChanges(false);
    };

    const handleSaveUserMessage = (traceId: string, content: string) => {
        setWorkingEvalCase(prev => {
            const updatedTraces = prev.traces.map(trace => {
                if (trace.id === traceId) {
                    const originalType = getContentType(trace.userMessage.content);
                    const deserializedContent = deserializeContent(content, originalType);
                    return updateTraceUserMessage(trace, deserializedContent);
                }
                return trace;
            });
            return { ...prev, traces: updatedTraces };
        });
        setHasUnsavedChanges(true);
    };

    const handleSaveAgentOutput = (traceId: string, content: string) => {
        setWorkingEvalCase(prev => {
            const updatedTraces = prev.traces.map(trace => {
                if (trace.id === traceId) {
                    const originalType = getContentType(trace.output?.content);
                    const deserializedContent = deserializeContent(content, originalType);
                    return updateTraceAgentOutput(trace, deserializedContent);
                }
                return trace;
            });
            return { ...prev, traces: updatedTraces };
        });
        setHasUnsavedChanges(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Update the evalSet with the modified case
            const updatedEvalSet: EvalSet = {
                ...evalSet,
                cases: evalSet.cases.map(c =>
                    c.id === workingEvalCase.id ? workingEvalCase : c
                )
            };

            // Call the RPC to save
            const response = await rpcClient.getVisualizerRpcClient().saveEvalCase({
                filePath,
                updatedEvalSet
            });

            if (response.success) {
                setHasUnsavedChanges(false);
                handleExitEditMode();
            } else {
                console.error('Failed to save:', response.error);
            }
        } catch (error) {
            console.error('Error saving evalCase:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscard = () => {
        setWorkingEvalCase(cloneEvalCase(originalEvalCase));
        setHasUnsavedChanges(false);
        setSelectedToolCall(null);
        setIsEditMode(false);
        setShowDiscardConfirmation(false);
    };

    const handleRequestDiscardConfirmation = () => {
        setShowDiscardConfirmation(true);
    };

    const handleCancelDiscard = () => {
        setShowDiscardConfirmation(false);
    };

    const handleUpdateToolCalls = (traceId: string, toolCalls: EvalFunctionCall[]) => {
        setWorkingEvalCase(prev => {
            const updatedTraces = prev.traces.map(trace => {
                if (trace.id === traceId) {
                    return updateToolCallsInTrace(trace, toolCalls);
                }
                return trace;
            });
            return { ...prev, traces: updatedTraces };
        });
        setHasUnsavedChanges(true);
    };

    const handleEditToolCall = (traceId: string, toolCallIndex: number) => {
        setSelectedToolCall({ traceId, toolCallIndex });
    };

    const handleSaveToolCall = (updates: Partial<EvalFunctionCall>) => {
        if (!selectedToolCall) return;

        const { traceId, toolCallIndex } = selectedToolCall;
        const trace = workingEvalCase.traces.find(t => t.id === traceId);
        if (!trace) return;

        const currentToolCalls = extractToolCalls(trace);

        let updatedToolCalls: EvalFunctionCall[];
        if (toolCallIndex === -1) {
            // Adding new tool call
            const newToolCall: EvalFunctionCall = {
                id: generateToolCallId(),
                name: updates.name || trace.tools[0]?.name || '',
                arguments: updates.arguments,
            };
            updatedToolCalls = [...currentToolCalls, newToolCall];
        } else {
            // Editing existing tool call
            updatedToolCalls = currentToolCalls.map((tc, idx) =>
                idx === toolCallIndex ? { ...tc, ...updates } : tc
            );
        }

        handleUpdateToolCalls(traceId, updatedToolCalls);
        setSelectedToolCall(null);
    };

    const handleAddTurn = () => {
        setWorkingEvalCase(prev => ({
            ...prev,
            traces: [...prev.traces, createNewTrace()]
        }));
        setHasUnsavedChanges(true);
    };

    const displayCase = isEditMode ? workingEvalCase : evalCase;

    return (
        <PageWrapper>
            <TopNavigationBar projectPath={projectPath} />
            <Container>
                <Header>
                    <HeaderLeft>
                        <Title>{evalSet.name}</Title>
                        <Subtitle>{displayCase.name}</Subtitle>
                    </HeaderLeft>
                    {!isEditMode && (
                        <EditButton onClick={handleEnterEditMode}>
                            <Icon
                                name="bi-edit"
                                iconSx={{
                                    fontSize: "14px",
                                }}
                            />
                            Edit
                        </EditButton>
                    )}
                </Header>
                <Messages hasEditFooter={isEditMode}>
                    {displayCase.traces.map((trace, traceIdx) => {
                        const toolCalls = extractToolCalls(trace);

                        return (
                            <TraceWrapper key={traceIdx}>
                                {isEditMode && (
                                    <Icon
                                        name="bi-x"
                                        iconSx={{
                                            fontSize: "16px",
                                        }}
                                    />
                                )}
                                {/* Render user's initial message */}
                                <MessageContainer isUser={true}>
                                    <EditableTraceMessage
                                        traceId={trace.id}
                                        isUser={true}
                                        content={trace.userMessage.content}
                                        isEditMode={isEditMode}
                                        onSave={handleSaveUserMessage}
                                    />
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
                                        {isEditMode ? (
                                            <EditableToolCallsList
                                                traceId={trace.id}
                                                toolCalls={toolCalls}
                                                availableTools={trace.tools}
                                                onUpdate={handleUpdateToolCalls}
                                                onEditToolCall={handleEditToolCall}
                                            />
                                        ) : (
                                            <ToolCallsTimeline toolCalls={toolCalls} />
                                        )}
                                        <EditableTraceMessage
                                            traceId={trace.id}
                                            isUser={false}
                                            content={trace.output?.content || ''}
                                            isEditMode={isEditMode}
                                            onSave={handleSaveAgentOutput}
                                        />
                                    </div>
                                </MessageContainer>
                            </TraceWrapper>
                        );
                    })}
                    {isEditMode && (
                        <AddTurnButton onClick={handleAddTurn}>
                            <Icon
                                name="bi-plus"
                                iconSx={{
                                    fontSize: "16px",
                                }}
                            />
                            Add Message Turn
                        </AddTurnButton>
                    )}
                </Messages>
                {isEditMode && (
                    <EditFooter
                        hasUnsavedChanges={hasUnsavedChanges}
                        isSaving={isSaving}
                        onSave={handleSave}
                        onDiscard={handleDiscard}
                        onRequestDiscardConfirmation={handleRequestDiscardConfirmation}
                    />
                )}
            </Container>
            {selectedToolCall && (() => {
                const trace = workingEvalCase.traces.find(
                    t => t.id === selectedToolCall.traceId
                );
                if (!trace) return null;

                const toolCalls = extractToolCalls(trace);
                const toolCall =
                    selectedToolCall.toolCallIndex === -1
                        ? { name: trace.tools[0]?.name || '', arguments: {} }
                        : toolCalls[selectedToolCall.toolCallIndex];

                if (!toolCall) return null;

                return (
                    <ToolEditorModal
                        toolCall={toolCall as EvalFunctionCall}
                        availableTools={trace.tools}
                        onClose={() => setSelectedToolCall(null)}
                        onSave={handleSaveToolCall}
                    />
                );
            })()}
            {showDiscardConfirmation && (
                <ConfirmationModal
                    title="Discard Changes"
                    message="Are you sure you want to discard all changes? This action cannot be undone."
                    confirmLabel="Discard"
                    cancelLabel="Cancel"
                    onConfirm={handleDiscard}
                    onCancel={handleCancelDiscard}
                />
            )}
        </PageWrapper>
    );
};
