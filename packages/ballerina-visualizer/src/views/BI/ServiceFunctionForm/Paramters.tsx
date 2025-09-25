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

import React, { useState, useEffect } from 'react';
import { Typography, Codicon, LinkButton } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { ParameterModel } from '@wso2/ballerina-core';

const FormContainer = styled.div`
    margin-bottom: 16px;
`;

const ParameterItem = styled.div`
    display: flex;
    align-items: center;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    margin-bottom: 8px;
    overflow: hidden;
`;

const ParameterName = styled.div`
    flex: 1;
    background: var(--vscode-input-background);
    color: #FFFFFF;
    padding: 8px 12px;
    font-weight: 500;
    min-width: 60px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: left;
`;

const ParameterType = styled.div`
    padding: 8px 12px;
    color: var(--vscode-foreground);
    background: var(--vscode-inputValidation-infoBackground);
`;

const ActionIcons = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
`;

const IconButton = styled.button`
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 2px;
    color: var(--vscode-foreground);

    &:hover {
        background: var(--vscode-toolbar-hoverBackground);
    }
`;

const AddButtonWrapper = styled.div`
    margin: 8px 0;
`;

export interface ParametersProps {
    functionNode?: {
        parameters?: ParameterModel[];
    };
}

interface ParameterDisplay {
    type: string;
    name: string;
}

export function Parameters(props: ParametersProps) {
    const { functionNode } = props;
    const [parameters, setParameters] = useState<ParameterDisplay[]>([]);

    useEffect(() => {
        if (functionNode?.parameters) {
            const parameterData = functionNode.parameters.map(param => ({
                type: param.type?.value || 'unknown',
                name: param.name?.value || 'unnamed'
            }));
            setParameters(parameterData);
        }
    }, [functionNode]);

    const handleEdit = (param: ParameterDisplay) => {
        console.log('Edit parameter:', param);
    };

    const handleDelete = (param: ParameterDisplay) => {
        console.log('Delete parameter:', param);
    };

    const handleAddParameter = () => {
        console.log('Add new parameter');
    };

    return (
        <FormContainer>
            <Typography variant="h4" sx={{ marginBottom: '10px' }}>
                Parameters
            </Typography>

            {parameters.length === 0 ? (
                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'var(--vscode-descriptionForeground)', marginBottom: '16px' }}>
                    No parameters defined
                </Typography>
            ) : (
                <div>
                    {parameters.map((param, index) => (
                        <ParameterItem key={index}>
                            <ParameterType>
                                {param.type}
                            </ParameterType>
                            <ParameterName>
                                {param.name}
                            </ParameterName>
                            <ActionIcons>
                                <IconButton onClick={() => handleEdit(param)}>
                                    <Codicon name="edit" />
                                </IconButton>
                                <IconButton onClick={() => handleDelete(param)}>
                                    <Codicon name="trash" />
                                </IconButton>
                            </ActionIcons>
                        </ParameterItem>
                    ))}
                </div>
            )}

            <AddButtonWrapper>
                <LinkButton onClick={handleAddParameter}>
                    <Codicon name="add" />
                    Add Parameter
                </LinkButton>
            </AddButtonWrapper>
        </FormContainer>
    );
}