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
import { Icon } from '@wso2/ui-toolkit';
import { ConfirmationModal } from './ConfirmationModal';

// --- STYLES ---

const TimelineContainer = styled.div`
    max-width: 600px;
    margin: 4px 0 2px;
    position: relative;
    padding-left: 0;
`;

const TimelineTrack = styled.div`
    position: absolute;
    left: 15px; 
    top: 24px;
    bottom: -2px;
    width: 2px;
    background-color: var(--vscode-button-background);
    opacity: 0.3;
    z-index: 0;
`;

const HeaderTitle = styled.div`
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 8px;
    padding-left: 4px;
`;

const ToolCard = styled.div<{ $isDragging?: boolean }>`
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
        border-color: var(--vscode-focusBorder);
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

const ToolInfo = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-top: 2px;
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

    /* Fixed interpolation: Target the parent class name */
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
        // Create a compact representation: { a: 1, b: 2 }
        return JSON.stringify(args).replace(/"/g, '').replace(/:/g, ': ').replace(/,/g, ', ');
    } catch (e) {
        return "Invalid arguments";
    }
};

// --- COMPONENTS ---

interface SortableToolCallItemProps {
    toolCall: EvalFunctionCall;
    index: number;
    onEdit: () => void;
    onDelete: () => void;
}

const SortableToolCallItem: React.FC<SortableToolCallItemProps> = ({
    toolCall,
    index,
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
    } = useSortable({ id: sortableId });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style}>
            {/* Added className for the CSS selector in Actions */}
            <ToolCard $isDragging={isDragging} className="tool-card-row">
                <DragHandle {...attributes} {...listeners}>
                    <Icon name="bi-drag" iconSx={{ fontSize: "16px" }} />
                </DragHandle>

                <IconBadgeWrapper>
                    <Icon name="bi-wrench" sx={{ display: "flex", justifyContent: "center", alignItems: "center" }} iconSx={{ display: "flex", fontSize: "16px" }} />
                </IconBadgeWrapper>

                <ToolInfo onClick={onEdit} style={{ cursor: 'pointer' }}>
                    <ToolName>{toolCall.name}</ToolName>
                    <ArgumentsPreview>
                        {formatArgs(toolCall.arguments)}
                    </ArgumentsPreview>
                </ToolInfo>

                <Actions>
                    <ActionButton $danger onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">
                        <Icon name="bi-delete" iconSx={{ fontSize: "16px" }} />
                    </ActionButton>
                </Actions>
            </ToolCard>
        </div>
    );
};

interface EditableToolCallsListProps {
    traceId: string;
    toolCalls: EvalFunctionCall[];
    availableTools: EvalToolSchema[];
    onUpdate: (traceId: string, toolCalls: EvalFunctionCall[]) => void;
    onEditToolCall: (traceId: string, toolCallIndex: number) => void;
}

export const EditableToolCallsList: React.FC<EditableToolCallsListProps> = ({
    traceId,
    toolCalls,
    availableTools,
    onUpdate,
    onEditToolCall,
}) => {
    const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            // Extract index from composite ID: "id-index" or "name-index"
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

    const handleDeleteRequest = (index: number) => {
        setDeleteIndex(index);
    };

    const handleDeleteConfirm = () => {
        if (deleteIndex !== null) {
            const updatedToolCalls = toolCalls.filter((_, i) => i !== deleteIndex);
            onUpdate(traceId, updatedToolCalls);
            setDeleteIndex(null);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteIndex(null);
    };

    if (toolCalls.length === 0) {
        return null;
    }

    return (
        <TimelineContainer>
            <HeaderTitle>Tool Execution Chain</HeaderTitle>

            {/* Visual Line connecting the tools */}
            <TimelineTrack />

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
                                onEdit={() => onEditToolCall(traceId, index)}
                                onDelete={() => handleDeleteRequest(index)}
                            />
                        );
                    })}
                </SortableContext>
            </DndContext>

            {deleteIndex !== null && (
                <ConfirmationModal
                    title="Delete Tool Execution"
                    message="Are you sure you want to delete this tool call? This action cannot be undone."
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    onConfirm={handleDeleteConfirm}
                    onCancel={handleDeleteCancel}
                />
            )}
        </TimelineContainer>
    );
};
