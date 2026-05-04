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

import React from "react";
import styled from "@emotion/styled";

const Chip = styled.button`
    display: flex;
    align-items: center;
    gap: 4px;
    height: 20px;
    padding: 0 8px;
    border-radius: 10px;
    border: 1px solid var(--vscode-button-background);
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    font-size: 11px;
    cursor: pointer;
    margin-right: 4px;
    white-space: nowrap;

    &:hover {
        background-color: var(--vscode-button-hoverBackground);
        border-color: var(--vscode-button-hoverBackground);
    }
`;

export interface AutoApproveChipProps {
    onToggle: () => void;
}

const AutoApproveChip: React.FC<AutoApproveChipProps> = ({ onToggle }) => (
    <Chip onClick={onToggle} title="Auto Approve is on — click to disable">
        <span className="codicon codicon-check-all" style={{ fontSize: 11 }} />
        Auto Approve
    </Chip>
);

export default AutoApproveChip;
