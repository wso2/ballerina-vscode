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

import React from 'react';
import styled from '@emotion/styled';
import { Codicon } from '@wso2/ui-toolkit';

interface ExecutionStepsButtonProps {
    isExpanded: boolean;
    onToggle: () => void;
}

const ExecutionStepsButton: React.FC<ExecutionStepsButtonProps> = ({ isExpanded, onToggle }) => {
    return (
        <StepsToggle onClick={onToggle}>
            <Codicon name={isExpanded ? 'chevron-down' : 'chevron-right'} />
            <ToggleText>
                {isExpanded ? 'Hide' : 'View'} execution steps
            </ToggleText>
        </StepsToggle>
    );
};

const StepsToggle = styled.button`
    display: flex;
    align-items: center;
    gap: 2px;
    background: none;
    border: none;
    color: var(--vscode-textLink-foreground);
    font-size: 12px;
    padding: 4px 0;
    cursor: pointer;

    &:hover {
        text-decoration: underline;
        color: var(--vscode-textLink-activeForeground);
    }
`;

const ToggleText = styled.span`
    font-size: 12px;
`;

export default ExecutionStepsButton;
