/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
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
import { EvalThread, EvalSet, EvalFunctionCall, EvalsetTrace } from "@wso2/ballerina-core";
import { MessageContainer, ProfilePic } from "../AgentChatPanel/Components/ChatInterface";
import { ToolCallsTimeline } from "./ToolCallsTimeline";
import { Button, Icon } from "@wso2/ui-toolkit";
import { TopNavigationBar } from "../../components/TopNavigationBar";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { EditableTraceMessage } from "./EditableTraceMessage";
import { EditableToolCallsList } from "./EditableToolCallsList";
import { ToolEditorModal } from "./ToolEditorModal";
import { ConfirmationModal } from "./ConfirmationModal";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    cloneEvalThread,
    updateTraceUserMessage,
    updateTraceAgentOutput,
    updateToolCallsInTrace,
    getContentType,
    deserializeContent,
    generateToolCallId,
    createNewTrace
} from "./utils/traceAdapters";

// --- LAYOUT COMPONENTS ---

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
        box-sizing: content-box; /* Fixed: standard box-sizing prevents width math errors */
    }
`;

const Header = styled.div`
    top: 0;
    padding: 16px 24px;
    position: sticky;
    background-color: var(--vscode-editorWidget-background);
    border-top: 1px solid var(--vscode-panel-border);
    border-bottom: 1px solid var(--vscode-panel-border);
    z-index: 10;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
`;

const EditModeBanner = styled.div<{ $isVisible: boolean }>`
    background-color: var(--vscode-textBlockQuote-background);
    border-left: 3px solid var(--vscode-editorInfo-foreground);
    display: flex;
    align-items: flex-start;
    gap: 12px;
    
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    max-height: ${(props: { $isVisible: any; }) => (props.$isVisible ? '100px' : '0px')};
    opacity: ${(props: { $isVisible: any; }) => (props.$isVisible ? 1 : 0)};
    padding: ${(props: { $isVisible: any; }) => (props.$isVisible ? '12px 24px' : '0px 24px')};
    border-bottom: 1px solid ${(props: { $isVisible: any; }) => (props.$isVisible ? 'var(--vscode-panel-border)' : 'transparent')};
    margin-bottom: ${(props: { $isVisible: any; }) => (props.$isVisible ? '0px' : '-1px')}; /* Compensate for border */
`;

const BannerContent = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
`;

const BannerDescription = styled.div`
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
`;

const HeaderLeft = styled.div`
    flex: 1;
`;

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const UnsavedIndicator = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
    margin-right: 8px;
`;

const Dot = styled.span`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--vscode-notificationsWarningIcon-foreground);
`;

const Title = styled.h2`
    font-size: 1.3em;
    font-weight: 600;
    margin: 0 0 6px 0;
    color: var(--vscode-foreground);
    letter-spacing: -0.01em;
`;

const Subtitle = styled.p`
    font-size: 14px;
    font-weight: 500;
    color: var(--vscode-descriptionForeground);
    margin: 0;
`;

export const Messages = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow-y: auto;
    gap: 0;
    position: relative;
    z-index: 1;
    padding: 22px 20px 60px;

    @media (min-width: 800px) {
        padding-left: 10%;
        padding-right: 10%;
    }

    @media (min-width: 1200px) {
        padding-left: 15%;
        padding-right: 15%;
    }
`;

const TimelineContainer = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
`;

// --- SEAMLESS TRANSITION COMPONENTS ---

// TraceWrapper: Always has a border width (transparent in view mode) to prevent layout shifting
const TraceWrapper = styled.div<{ $isEditMode: boolean; $isDragging?: boolean }>`
    display: flex;
    flex-direction: row;
    align-items: stretch; 

    border: 1px solid ${(props: { $isEditMode: any; }) => props.$isEditMode ? 'var(--vscode-panel-border)' : 'transparent'};
    border-radius: 8px;
    
    position: relative;
    background-color: ${(props: { $isEditMode: any; }) => props.$isEditMode ? 'var(--vscode-editor-background)' : 'transparent'};
    margin: 4px 0;
    z-index: 2;
    opacity: ${(props: { $isDragging: any; }) => props.$isDragging ? 0.5 : 1};

    transition: border-color 0.3s ease, background-color 0.3s ease, transform 0.2s ease;

    &:hover {
        border-color: ${(props: { $isEditMode: any; }) => props.$isEditMode ? 'var(--vscode-focusBorder)' : 'transparent'};
    }
`;

// TraceHeader: Fixed width container. Icons fade in/out via opacity.
const TraceHeader = styled.div<{ $isEditMode: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    
    width: 32px;
    padding: 0 12px;
    flex-shrink: 0;
    padding-top: 8px;

    border-right: 1px solid ${(props: { $isEditMode: any; }) => props.$isEditMode ? 'var(--vscode-panel-border)' : 'transparent'};
    transition: border-color 0.3s ease;
`;

// Helper to fade icons
const TraceHeaderIcons = styled.div<{ $visible: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    opacity: ${(props: { $visible: any; }) => props.$visible ? 1 : 0};
    transition: opacity 0.3s ease;
    pointer-events: ${(props: { $visible: any; }) => props.$visible ? 'auto' : 'none'};
`;

const TraceContent = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0; 
    padding: 12px 16px;
`;

const TraceDragHandle = styled.div`
    cursor: grab;
    color: var(--vscode-descriptionForeground);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border-radius: 4px;

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }
`;

const TraceDeleteButton = styled.button`
    background: none;
    border: none;
    padding: 6px;
    cursor: pointer;
    color: var(--vscode-foreground);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
        color: var(--vscode-errorForeground);
    }
`;

// HoverAddTurnContainer: Animates height from 0 to 32px when entering edit mode
const HoverAddTurnContainer = styled.div<{ $visible: boolean }>`
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 5;
    
    /* Animation Logic */
    height: ${(props: { $visible: any; }) => props.$visible ? '32px' : '0px'};
    margin: ${(props: { $visible: any; }) => props.$visible ? '-16px 0' : '0px'}; /* Overlap traces slightly in edit mode */
    opacity: ${(props: { $visible: any; }) => props.$visible ? 0 : 0}; /* Default hidden, show on hover */
    pointer-events: ${(props: { $visible: any; }) => props.$visible ? 'auto' : 'none'};
    
    transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin 0.3s ease, opacity 0.2s ease;
    overflow: hidden;

    &:hover {
        opacity: ${(props: { $visible: any; }) => props.$visible ? 1 : 0};
    }
`;

const AddMessageButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 26px;
    padding: 0 12px;
    border-radius: 8px;
    background-color: var(--vscode-editor-background);
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-panel-border);
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;

    &:hover {
        border-color: var(--vscode-focusBorder);
    }
    
    .icon-wrapper {
        margin-right: 4px;
        display: flex;
        align-items: center;
    }
`;

const StyledMessageContainer = styled(MessageContainer)`
    &:last-child {
        margin-bottom: 0;
    }

    &:hover .add-tool-button {
        opacity: 1;
        transform: translateY(0);
        max-height: 32px;
        padding-top: 4px;
        padding-bottom: 4px;
        margin-bottom: 8px;
        border-width: 1px;
    }
    
    &:hover .edit-button {
        opacity: 1;
        transform: translate(0, 0);
    }
`;

const AgentContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
`;

const AddToolButton = styled.button`
    background-color: var(--vscode-editorWidget-background);
    color: var(--vscode-descriptionForeground);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 0 12px;
    padding-top: 0;
    padding-bottom: 0;
    margin-bottom: 0;
    border-width: 0;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
    align-self: flex-start;
    opacity: 0;
    transform: translateY(-4px);
    max-height: 0;
    overflow: hidden;
    transition: all 0.2s ease;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-focusBorder);
        color: var(--vscode-foreground);
    }
`;

interface SortableTraceWrapperProps {
    trace: EvalsetTrace;
    isEditMode: boolean;
    children: React.ReactNode;
    onDelete: () => void;
}

const SortableTraceWrapper: React.FC<SortableTraceWrapperProps> = ({
    trace,
    isEditMode,
    children,
    onDelete,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: trace.id, disabled: !isEditMode });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <TraceWrapper $isEditMode={isEditMode} $isDragging={isDragging}>
                <TraceHeader $isEditMode={isEditMode}>
                    <TraceHeaderIcons $visible={isEditMode}>
                        <TraceDragHandle {...attributes} {...listeners}>
                            <Icon name="bi-drag" iconSx={{ fontSize: "16px" }} />
                        </TraceDragHandle>
                        <TraceDeleteButton onClick={onDelete}>
                            <Icon name="bi-delete" iconSx={{ fontSize: "16px" }} />
                        </TraceDeleteButton>
                    </TraceHeaderIcons>
                </TraceHeader>
                <TraceContent>
                    {children}
                </TraceContent>
            </TraceWrapper>
        </div>
    );
};

interface EvalThreadViewerProps {
    projectPath: string;
    filePath: string;
    evalSet: EvalSet;
    evalThread: EvalThread;
}

export const EvalThreadViewer: React.FC<EvalThreadViewerProps> = ({ projectPath, filePath, evalSet, evalThread }) => {
    const { rpcClient } = useRpcContext();
    const [isEditMode, setIsEditMode] = useState(false);
    const [originalEvalThread, setOriginalEvalThread] = useState<EvalThread>(evalThread);
    const [workingEvalThread, setWorkingEvalThread] = useState<EvalThread>(evalThread);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedToolCall, setSelectedToolCall] = useState<{
        traceId: string;
        toolCallIndex: number;
    } | null>(null);
    const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);
    const [deleteTraceIndex, setDeleteTraceIndex] = useState<number | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const extractToolCalls = (trace: EvalsetTrace): EvalFunctionCall[] => {
        return (trace.toolCalls as EvalFunctionCall[]) || [];
    };

    const handleEnterEditMode = () => {
        setOriginalEvalThread(cloneEvalThread(evalThread));
        setWorkingEvalThread(cloneEvalThread(evalThread));
        setHasUnsavedChanges(false);
        setIsEditMode(true);
    };

    const handleExitEditMode = () => {
        setIsEditMode(false);
        setHasUnsavedChanges(false);
    };

    const handleSaveUserMessage = (traceId: string, content: string) => {
        setWorkingEvalThread(prev => {
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
        setWorkingEvalThread(prev => {
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
            const updatedEvalSet: EvalSet = {
                ...evalSet,
                threads: evalSet.threads.map(c =>
                    c.id === workingEvalThread.id ? workingEvalThread : c
                )
            };

            const response = await rpcClient.getVisualizerRpcClient().saveEvalThread({
                filePath,
                updatedEvalSet
            });

            if (response.success) {
                setHasUnsavedChanges(false);
                handleExitEditMode();
            }
        } catch (error) {
            console.error('Error saving evalThread:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscard = () => {
        setWorkingEvalThread(cloneEvalThread(originalEvalThread));
        setHasUnsavedChanges(false);
        setSelectedToolCall(null);
        setIsEditMode(false);
        setShowDiscardConfirmation(false);
    };

    const handleUpdateToolCalls = (traceId: string, toolCalls: EvalFunctionCall[]) => {
        setWorkingEvalThread(prev => {
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
        const trace = workingEvalThread.traces.find(t => t.id === traceId);
        if (!trace) return;

        const currentToolCalls = extractToolCalls(trace);
        let updatedToolCalls: EvalFunctionCall[];

        if (toolCallIndex === -1) {
            const newToolCall: EvalFunctionCall = {
                id: generateToolCallId(),
                name: updates.name || trace.tools[0]?.name || '',
                arguments: updates.arguments,
            };
            updatedToolCalls = [...currentToolCalls, newToolCall];
        } else {
            updatedToolCalls = currentToolCalls.map((tc, idx) =>
                idx === toolCallIndex ? { ...tc, ...updates } : tc
            );
        }

        handleUpdateToolCalls(traceId, updatedToolCalls);
        setSelectedToolCall(null);
    };

    const handleAddTurnAtIndex = (index: number) => {
        setWorkingEvalThread(prev => {
            const newTraces = [...prev.traces];
            newTraces.splice(index, 0, createNewTrace());
            return { ...prev, traces: newTraces };
        });
        setHasUnsavedChanges(true);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setWorkingEvalThread(prev => {
                const oldIndex = prev.traces.findIndex(trace => trace.id === active.id);
                const newIndex = prev.traces.findIndex(trace => trace.id === over.id);
                return { ...prev, traces: arrayMove(prev.traces, oldIndex, newIndex) };
            });
            setHasUnsavedChanges(true);
        }
    };

    const handleDeleteTraceConfirm = () => {
        if (deleteTraceIndex !== null) {
            setWorkingEvalThread(prev => ({
                ...prev,
                traces: prev.traces.filter((_, i) => i !== deleteTraceIndex)
            }));
            setHasUnsavedChanges(true);
            setDeleteTraceIndex(null);
        }
    };

    const displayCase = isEditMode ? workingEvalThread : evalThread;

    return (
        <PageWrapper>
            <TopNavigationBar projectPath={projectPath} />
            <Container>
                <Header>
                    <HeaderLeft>
                        <Title>{evalSet.name}</Title>
                        <Subtitle>{displayCase.name}</Subtitle>
                    </HeaderLeft>
                    <HeaderRight>
                        {isEditMode ? (
                            <>
                                {hasUnsavedChanges && (
                                    <UnsavedIndicator><Dot /><span>Unsaved changes</span></UnsavedIndicator>
                                )}
                                <Button appearance="secondary" onClick={() => setShowDiscardConfirmation(true)} disabled={isSaving}>
                                    <Icon name="bi-close" sx={{ marginRight: "4px" }} iconSx={{ fontSize: "16px" }} />
                                    Discard
                                </Button>
                                <Button appearance="primary" onClick={handleSave} disabled={isSaving}>
                                    <Icon name={isSaving ? "bi-spinner" : "bi-save"} sx={{ marginRight: "4px" }} iconSx={{ fontSize: "16px" }} />
                                    {isSaving ? "Saving..." : "Save Thread"}
                                </Button>
                            </>
                        ) : (
                            <Button appearance="primary" onClick={handleEnterEditMode}>
                                <Icon name="bi-edit" sx={{ marginRight: "4px" }} iconSx={{ fontSize: "16px" }} />
                                Edit
                            </Button>
                        )}
                    </HeaderRight>
                </Header>

                {/* Animated Banner - always rendered, visibility controlled by props */}
                <EditModeBanner $isVisible={isEditMode}>
                    <BannerContent>
                        <BannerDescription>
                            <span style={{ fontWeight: '600' }}>Edit Mode</span> - Hover over messages to edit, drag traces to reorder, hover between traces to add turns, or hover over agent messages to add tool executions.
                        </BannerDescription>
                    </BannerContent>
                </EditModeBanner>

                <Messages>
                    <TimelineContainer>
                        {/* Top Add Turn Button */}
                        <HoverAddTurnContainer $visible={isEditMode}>
                            <AddMessageButton onClick={() => handleAddTurnAtIndex(0)}>
                                <div className="icon-wrapper"><Icon name="bi-plus" iconSx={{ fontSize: "16px" }} /></div>
                                Add Message Turn
                            </AddMessageButton>
                        </HoverAddTurnContainer>

                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={displayCase.traces.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                {displayCase.traces.map((trace, traceIdx) => {
                                    const toolCalls = extractToolCalls(trace);
                                    return (
                                        <React.Fragment key={trace.id}>
                                            <SortableTraceWrapper
                                                trace={trace}
                                                isEditMode={isEditMode}
                                                onDelete={() => setDeleteTraceIndex(traceIdx)}
                                            >
                                                <StyledMessageContainer isUser={true}>
                                                    <EditableTraceMessage
                                                        traceId={trace.id}
                                                        isUser={true}
                                                        content={trace.userMessage.content}
                                                        isEditMode={isEditMode}
                                                        onSave={handleSaveUserMessage}
                                                    />
                                                    <ProfilePic>
                                                        <Icon name="bi-user" iconSx={{ fontSize: "18px", color: "var(--vscode-foreground)" }} />
                                                    </ProfilePic>
                                                </StyledMessageContainer>

                                                <StyledMessageContainer isUser={false}>
                                                    <ProfilePic>
                                                        <Icon name="bi-ai-agent" iconSx={{ fontSize: "18px", color: "var(--vscode-terminal-ansiBrightCyan)" }} />
                                                    </ProfilePic>
                                                    <AgentContentWrapper>
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
                                                        {isEditMode && (
                                                            <AddToolButton className="add-tool-button" onClick={() => handleEditToolCall(trace.id, -1)}>
                                                                <Icon name="bi-plus" iconSx={{ fontSize: "16px" }} />
                                                                Add Tool Execution
                                                            </AddToolButton>
                                                        )}
                                                        <EditableTraceMessage
                                                            traceId={trace.id}
                                                            isUser={false}
                                                            content={trace.output?.content || ''}
                                                            isEditMode={isEditMode}
                                                            onSave={handleSaveAgentOutput}
                                                        />
                                                    </AgentContentWrapper>
                                                </StyledMessageContainer>
                                            </SortableTraceWrapper>

                                            {/* Inter-trace Add Turn Button */}
                                            <HoverAddTurnContainer $visible={isEditMode}>
                                                <AddMessageButton onClick={() => handleAddTurnAtIndex(traceIdx + 1)}>
                                                    <div className="icon-wrapper"><Icon name="bi-plus" iconSx={{ fontSize: "16px" }} /></div>
                                                    Add Message Turn
                                                </AddMessageButton>
                                            </HoverAddTurnContainer>
                                        </React.Fragment>
                                    );
                                })}
                            </SortableContext>
                        </DndContext>
                    </TimelineContainer>
                </Messages>
            </Container>

            {selectedToolCall && (() => {
                const trace = workingEvalThread.traces.find(t => t.id === selectedToolCall.traceId);
                if (!trace) return null;
                const toolCall = selectedToolCall.toolCallIndex === -1
                    ? { name: trace.tools[0]?.name || '', arguments: {} }
                    : extractToolCalls(trace)[selectedToolCall.toolCallIndex];

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
                    onConfirm={handleDiscard}
                    onCancel={() => setShowDiscardConfirmation(false)}
                />
            )}

            {deleteTraceIndex !== null && (
                <ConfirmationModal
                    title="Delete Trace"
                    message="Are you sure you want to delete this trace? This action cannot be undone."
                    confirmLabel="Delete"
                    onConfirm={handleDeleteTraceConfirm}
                    onCancel={() => setDeleteTraceIndex(null)}
                />
            )}
        </PageWrapper>
    );
};
