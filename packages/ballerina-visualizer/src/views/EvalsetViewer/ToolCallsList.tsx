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

import React, { useState } from 'react';
import styled from '@emotion/styled';
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
import { EvalFunctionCall, EvalToolSchema } from '@wso2/ballerina-core';
import { Codicon, Icon } from '@wso2/ui-toolkit';

// --- STYLES ---

const TimelineContainer = styled.div`
    max-width: 600px;
    margin: 4px 0 2px;
    position: relative;
    padding-left: 0;
`;

const TimelineTrack = styled.div<{ $isVisible: boolean }>`
    position: absolute;
    left: 15px;
    top: 24px;
    bottom: -2px;
    width: 2px;
    background-color: var(--vscode-button-background);
    opacity: ${(props: { $isVisible: any; }) => props.$isVisible ? 0.3 : 0};
    z-index: 0;
    transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
`;

const TimelineHeader = styled.button`
    display: flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: none;
    padding: 0 0 8px 4px;
    cursor: pointer;
    margin-bottom: 0;
`;

const HeaderTitle = styled.div`
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
`;

const ToggleIcon = styled.span<{ $isOpen: boolean }>`
    color: var(--vscode-descriptionForeground);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    transform: ${(props: { $isOpen: any; }) => props.$isOpen ? "rotate(90deg)" : "rotate(0deg)"};
`;

const TimelineList = styled.div<{ $isCollapsed: boolean }>`
    display: flex;
    flex-direction: column;
    max-height: ${(props: { $isCollapsed: any; }) => props.$isCollapsed ? '0px' : '2000px'};
    opacity: ${(props: { $isCollapsed: any; }) => props.$isCollapsed ? 0 : 1};
    overflow: hidden;
    transition: max-height 0.6s cubic-bezier(0.4, 0, 0.2, 1),
                opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
`;

const ToolCard = styled.div<{ $isDragging?: boolean; $isEditMode: boolean }>`
    background-color: var(--vscode-textBlockQuote-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 8px 6px;
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
    z-index: 1;
    margin-bottom: 8px;

    opacity: ${(props: { $isDragging: any; }) => props.$isDragging ? 0.5 : 1};
    transition: border-color 0.2s, background-color 0.2s;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
        border-color: ${(props: { $isEditMode: any; }) => props.$isEditMode ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)'};
    }
`;

const IconBadgeWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 50%;
    color: var(--vscode-terminal-ansiBrightMagenta);
    flex-shrink: 0;
    z-index: 2;
`;

const DragHandle = styled.div`
    cursor: grab;
    color: var(--vscode-descriptionForeground);
    display: flex;
    align-items: center;
    opacity: 0.5;

    &:hover {
        opacity: 1;
    }

    &:active {
        cursor: grabbing;
    }
`;

const ToolInfo = styled.div<{ $isClickable: boolean }>`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-top: 2px;
    cursor: ${(props: { $isClickable: any; }) => props.$isClickable ? 'pointer' : 'default'};
`;

const ToolName = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
`;

const ArgumentsPreview = styled.code`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-editor-font-family);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0.8;
    display: block;
`;

const Actions = styled.div`
    display: flex;
    align-items: center;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.2s;

    .tool-card-row:hover & {
        opacity: 1;
    }
`;

const ActionButton = styled.button<{ $danger?: boolean }>`
    background: transparent;
    border: none;
    padding: 6px;
    cursor: pointer;
    border-radius: 4px;
    color: ${(props: { $danger: any; }) => props.$danger ? 'var(--vscode-errorForeground)' : 'var(--vscode-icon-foreground)'};
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
        color: ${(props: { $danger: any; }) => props.$danger ? 'var(--vscode-testing-iconFailed)' : 'var(--vscode-foreground)'};
    }
`;

// --- HELPER ---

const formatArgs = (args: any) => {
    if (!args) return "()";
    if (typeof args === 'string') return args;
    try {
        return JSON.stringify(args).replace(/"/g, '').replace(/:/g, ': ').replace(/,/g, ', ');
    } catch (e) {
        return "Invalid arguments";
    }
};

// --- COMPONENTS ---

interface SortableToolCallItemProps {
    toolCall: EvalFunctionCall;
    index: number;
    isEditMode: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
}

const SortableToolCallItem: React.FC<SortableToolCallItemProps> = ({
    toolCall,
    index,
    isEditMode,
    onEdit,
    onDelete,
}) => {
    const sortableId = `${toolCall.id ?? toolCall.name}-${index}`;
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: sortableId, disabled: !isEditMode });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <ToolCard $isDragging={isDragging} $isEditMode={isEditMode} className="tool-card-row">
                {isEditMode && (
                    <DragHandle {...attributes} {...listeners}>
                        <Icon name="bi-drag" iconSx={{ fontSize: "16px" }} />
                    </DragHandle>
                )}

                <IconBadgeWrapper>
                    <Icon name="bi-wrench" sx={{ display: "flex", justifyContent: "center", alignItems: "center" }} iconSx={{ display: "flex", fontSize: "16px" }} />
                </IconBadgeWrapper>

                <ToolInfo
                    $isClickable={isEditMode && !!onEdit}
                    onClick={isEditMode && onEdit ? onEdit : undefined}
                >
                    <ToolName>{toolCall.name}</ToolName>
                    <ArgumentsPreview>
                        {formatArgs(toolCall.arguments)}
                    </ArgumentsPreview>
                </ToolInfo>

                {isEditMode && onDelete && (
                    <Actions>
                        <ActionButton $danger onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">
                            <Icon name="bi-delete" iconSx={{ fontSize: "16px" }} />
                        </ActionButton>
                    </Actions>
                )}
            </ToolCard>
        </div>
    );
};

interface ToolCallsListProps {
    traceId?: string;
    toolCalls: EvalFunctionCall[];
    availableTools?: EvalToolSchema[];
    isEditMode: boolean;
    onUpdate?: (traceId: string, toolCalls: EvalFunctionCall[]) => void;
    onEditToolCall?: (traceId: string, toolCallIndex: number) => void;
    onDeleteRequest?: (traceId: string, toolCallIndex: number) => void;
}

export const ToolCallsList: React.FC<ToolCallsListProps> = ({
    traceId = '',
    toolCalls,
    isEditMode,
    onUpdate,
    onEditToolCall,
    onDeleteRequest,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        if (!isEditMode || !onUpdate) return;

        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = toolCalls.findIndex(
                (tc, idx) => `${tc.id ?? tc.name}-${idx}` === active.id
            );
            const newIndex = toolCalls.findIndex(
                (tc, idx) => `${tc.id ?? tc.name}-${idx}` === over.id
            );

            const reorderedToolCalls = arrayMove(toolCalls, oldIndex, newIndex);
            onUpdate(traceId, reorderedToolCalls);
        }
    };

    if (toolCalls.length === 0) {
        return null;
    }

    const headerTitle = isEditMode ? "Tool Execution Chain" : `Tool Executions (${toolCalls.length})`;
    const showHeader = !isEditMode || toolCalls.length > 0;
    const isCollapsed = !isEditMode && !isOpen;

    return (
        <TimelineContainer>
            {showHeader && (
                <>
                    {!isEditMode ? (
                        <TimelineHeader onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen}>
                            <HeaderTitle>{headerTitle}</HeaderTitle>
                            <ToggleIcon $isOpen={isOpen}>
                                <Codicon name="chevron-right" sx={{ fontSize: "14px", width: "14px", height: "14px", display: "flex", alignItems: "center", justifyContent: "center" }} iconSx={{ display: "flex" }} />
                            </ToggleIcon>
                        </TimelineHeader>
                    ) : (
                        <HeaderTitle style={{ paddingBottom: '8px', paddingLeft: '4px' }}>{headerTitle}</HeaderTitle>
                    )}
                </>
            )}

            <TimelineTrack $isVisible={isEditMode || isOpen} />

            <TimelineList $isCollapsed={isCollapsed}>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={toolCalls.map((tc, idx) => `${tc.id ?? tc.name}-${idx}`)}
                        strategy={verticalListSortingStrategy}
                    >
                        {toolCalls.map((toolCall, index) => {
                            const sortableId = `${toolCall.id ?? toolCall.name}-${index}`;
                            return (
                                <SortableToolCallItem
                                    key={sortableId}
                                    toolCall={toolCall}
                                    index={index}
                                    isEditMode={isEditMode}
                                    onEdit={isEditMode && onEditToolCall ? () => onEditToolCall(traceId, index) : undefined}
                                    onDelete={isEditMode && onDeleteRequest ? () => onDeleteRequest(traceId, index) : undefined}
                                />
                            );
                        })}
                    </SortableContext>
                </DndContext>
            </TimelineList>
        </TimelineContainer>
    );
};
