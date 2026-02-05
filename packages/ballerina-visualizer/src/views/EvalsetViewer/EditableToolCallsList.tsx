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

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 8px 0;
    z-index: 2000;
`;

const ToolCallItem = styled.div<{ isDragging?: boolean }>`
    background-color: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-widget-border);
    border-radius: 6px;
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    opacity: ${(props: { isDragging: boolean; }) => props.isDragging ? 0.5 : 1};
    transition: opacity 0.2s;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
`;

const IconBadge = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--vscode-terminal-ansiBrightMagenta);
    flex-shrink: 0;
`;

const DragHandle = styled.div`
    cursor: grab;
    color: var(--vscode-descriptionForeground);
    display: flex;
    align-items: center;

    &:active {
        cursor: grabbing;
    }
`;

const ToolInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const ToolName = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
    margin-bottom: 4px;
`;

const ToolArgs = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const Actions = styled.div`
    display: flex;
    gap: 4px;
`;

const ActionButton = styled.button`
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: var(--vscode-foreground);
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }
`;

const AddButton = styled.button`
    background-color: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    border-radius: 4px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
    align-self: flex-start;

    &:hover {
        background-color: var(--vscode-button-secondaryHoverBackground);
    }
`;

interface SortableToolCallItemProps {
    toolCall: EvalFunctionCall;
    onEdit: () => void;
    onDelete: () => void;
}

const SortableToolCallItem: React.FC<SortableToolCallItemProps> = ({
    toolCall,
    onEdit,
    onDelete,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: toolCall.id || toolCall.name });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const argsPreview = toolCall.arguments
        ? Object.entries(toolCall.arguments)
            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
            .join(', ')
        : 'No arguments';

    return (
        <div ref={setNodeRef} style={style}>
            <ToolCallItem isDragging={isDragging}>
                <DragHandle {...attributes} {...listeners}>
                    <Icon
                        name="bi-drag"
                        iconSx={{
                            fontSize: "16px",
                        }}
                    />
                </DragHandle>
                <IconBadge>
                    <Icon
                        name="bi-wrench"
                        sx={{
                            fontSize: '16px',
                            width: '16px',
                            height: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        iconSx={{
                            fontSize: "16px",
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    />
                </IconBadge>
                <ToolInfo>
                    <ToolName>{toolCall.name}</ToolName>
                    <ToolArgs>{argsPreview}</ToolArgs>
                </ToolInfo>
                <Actions>
                    <ActionButton onClick={onEdit}>
                        <Icon
                            name="bi-edit"
                            iconSx={{
                                fontSize: "16px",
                            }}
                        />
                    </ActionButton>
                    <ActionButton onClick={onDelete}>
                        <Icon
                            name="bi-delete"
                            iconSx={{
                                fontSize: "16px",
                            }}
                        />
                    </ActionButton>
                </Actions>
            </ToolCallItem>
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
            const oldIndex = toolCalls.findIndex(
                tc => (tc.id || tc.name) === active.id
            );
            const newIndex = toolCalls.findIndex(
                tc => (tc.id || tc.name) === over.id
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

    const handleAdd = () => {
        onEditToolCall(traceId, -1); // -1 indicates new tool call
    };

    if (toolCalls.length === 0) {
        return (
            <Container>
                <AddButton onClick={handleAdd}>
                    <Icon
                        name="bi-plus"
                        iconSx={{
                            fontSize: "16px",
                        }}
                    />
                    Add Tool Execution
                </AddButton>
            </Container>
        );
    }

    return (
        <Container>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={toolCalls.map(tc => tc.id || tc.name)}
                    strategy={verticalListSortingStrategy}
                >
                    {toolCalls.map((toolCall, index) => (
                        <SortableToolCallItem
                            key={toolCall.id || `${toolCall.name}-${index}`}
                            toolCall={toolCall}
                            onEdit={() => onEditToolCall(traceId, index)}
                            onDelete={() => handleDeleteRequest(index)}
                        />
                    ))}
                </SortableContext>
            </DndContext>
            <AddButton onClick={handleAdd}>
                <Icon
                    name="bi-plus"
                    iconSx={{
                        fontSize: "16px",
                    }}
                />
                Add Tool Execution
            </AddButton>
            {deleteIndex !== null && (
                <ConfirmationModal
                    title="Delete Tool Call"
                    message="Are you sure you want to delete this tool call? This action cannot be undone."
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    onConfirm={handleDeleteConfirm}
                    onCancel={handleDeleteCancel}
                />
            )}
        </Container>
    );
};
