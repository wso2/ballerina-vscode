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

import React, { useState, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { EvalFunctionCall, EvalToolSchema } from '@wso2/ballerina-core';
import { Button, Icon } from '@wso2/ui-toolkit';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.4);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
`;

const ModalContainer = styled(motion.div)`
    background-color: var(--vscode-editorWidget-background);
    border-radius: 6px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 600px;
    overflow: hidden;
    border: 1px solid var(--vscode-widget-border);
`;

const ModalHeader = styled.div`
    padding: 16px 20px;
    border-bottom: 1px solid var(--vscode-widget-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: var(--vscode-editorWidget-background);
`;

const HeaderTitle = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Title = styled.h2`
    font-size: 14px;
    font-weight: 600;
    margin: 0;
    color: var(--vscode-foreground);
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: var(--vscode-foreground);
    opacity: 0.7;
    border-radius: 3px;

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
        opacity: 1;
    }
`;

const ModalBody = styled.div`
    padding: 20px;
    max-height: 60vh;
    overflow-y: auto;
`;

const FormSection = styled.div`
    margin-bottom: 20px;

    &:last-child {
        margin-bottom: 0;
    }
`;

const Label = styled.label`
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 8px;
`;

const Select = styled.select`
    width: 100%;
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    padding: 8px 12px;
    font-size: 13px;
    outline: none;

    &:focus {
        border-color: var(--vscode-focusBorder);
    }
`;

const ArgumentsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const ArgumentField = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const FieldLabel = styled.label`
    font-size: 13px;
    color: var(--vscode-foreground);
    min-width: 100px;
`;

const Input = styled.input`
    flex: 1;
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    padding: 8px 12px;
    font-size: 13px;
    outline: none;

    &:focus {
        border-color: var(--vscode-focusBorder);
    }
`;

const Textarea = styled.textarea`
    flex: 1;
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    padding: 8px 12px;
    font-size: 13px;
    min-height: 80px;
    resize: vertical;
    outline: none;

    &:focus {
        border-color: var(--vscode-focusBorder);
    }
`;

const ModalFooter = styled.div`
    padding: 16px 20px;
    background-color: var(--vscode-editorWidget-background);
    border-top: 1px solid var(--vscode-widget-border);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
`;

interface ToolEditorModalProps {
    toolCall: EvalFunctionCall;
    availableTools: EvalToolSchema[];
    onClose: () => void;
    onSave: (updates: Partial<EvalFunctionCall>) => void;
}

export const ToolEditorModal: React.FC<ToolEditorModalProps> = ({
    toolCall,
    availableTools,
    onClose,
    onSave,
}) => {
    const [name, setName] = useState(toolCall.name);
    const [argumentsValue, setArgumentsValue] = useState<Record<string, any>>(
        toolCall.arguments || {}
    );
    const isInitialMount = useRef(true);

    const selectedTool = availableTools.find(t => t.name === name);
    const parametersSchema = selectedTool?.parametersSchema;

    // Reset arguments when the selected tool changes (but not on initial mount)
    useEffect(() => {
        // Skip reset on initial mount to preserve existing argument values
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        // When tool changes, initialize with defaults from schema
        const newArguments: Record<string, any> = {};

        if (parametersSchema?.properties) {
            Object.entries(parametersSchema.properties).forEach(([fieldName, fieldSchema]: [string, any]) => {
                if (fieldSchema.default !== undefined) {
                    newArguments[fieldName] = fieldSchema.default;
                }
            });
        }

        setArgumentsValue(newArguments);
    }, [name, selectedTool, parametersSchema]);

    const handleArgumentChange = (fieldName: string, value: any) => {
        setArgumentsValue(prev => ({ ...prev, [fieldName]: value }));
    };

    const renderField = (
        fieldName: string,
        fieldSchema: any,
        value: any,
        onChange: (val: any) => void
    ) => {
        const fieldType = fieldSchema?.type || 'string';

        // Handle complex objects as JSON textarea
        if (fieldType === 'object' || fieldType === 'array') {
            return (
                <ArgumentField key={fieldName}>
                    <FieldLabel>{fieldName}:</FieldLabel>
                    <Textarea
                        value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                onChange(parsed);
                            } catch {
                                onChange(e.target.value);
                            }
                        }}
                        placeholder={`Enter ${fieldType} as JSON`}
                    />
                </ArgumentField>
            );
        }

        const inputType =
            fieldType === 'integer' || fieldType === 'number' ? 'number' : 'text';

        return (
            <ArgumentField key={fieldName}>
                <FieldLabel>{fieldName}:</FieldLabel>
                <Input
                    type={inputType}
                    value={value ?? ''}
                    onChange={(e) => {
                        const val =
                            inputType === 'number'
                                ? e.target.value === ''
                                    ? ''
                                    : Number(e.target.value)
                                : e.target.value;
                        onChange(val);
                    }}
                />
            </ArgumentField>
        );
    };

    const handleSave = () => {
        onSave({
            name,
            arguments: Object.keys(argumentsValue).length > 0 ? argumentsValue : undefined,
        });
    };

    return (
        <Overlay onClick={onClose}>
            <ModalContainer
                onClick={(e: { stopPropagation: () => any; }) => e.stopPropagation()}
            >
                <ModalHeader>
                    <HeaderTitle>
                        <Icon
                            name="bi-wrench"
                            iconSx={{
                                fontSize: "16px",
                                color: "var(--vscode-terminal-ansiBrightMagenta)",
                            }}
                        />
                        <Title>Edit Tool Call</Title>
                    </HeaderTitle>
                    <CloseButton onClick={onClose}>
                        <Icon
                            name="bi-close"
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            iconSx={{
                                fontSize: "16px",
                                display: 'flex'
                            }}
                        />
                    </CloseButton>
                </ModalHeader>

                <ModalBody>
                    <FormSection>
                        <Label>Tool Name</Label>
                        <Select value={name} onChange={(e) => setName(e.target.value)}>
                            {availableTools.map((tool) => (
                                <option key={tool.name} value={tool.name}>
                                    {tool.name}
                                </option>
                            ))}
                        </Select>
                    </FormSection>

                    {parametersSchema && parametersSchema.properties && (
                        <FormSection>
                            <Label>Input Arguments</Label>
                            <ArgumentsContainer>
                                {Object.entries(parametersSchema.properties).map(
                                    ([fieldName, fieldSchema]) =>
                                        renderField(
                                            fieldName,
                                            fieldSchema,
                                            argumentsValue[fieldName],
                                            (val) => handleArgumentChange(fieldName, val)
                                        )
                                )}
                            </ArgumentsContainer>
                        </FormSection>
                    )}
                </ModalBody>

                <ModalFooter>
                    <Button appearance="secondary" onClick={onClose}>Cancel</Button>
                    <Button appearance="primary" onClick={handleSave}>Save Changes</Button>
                </ModalFooter>
            </ModalContainer>
        </Overlay>
    );
};
