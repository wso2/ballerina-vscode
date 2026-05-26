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

export type ExperimentalTagSize = "sm" | "md";

interface Props {
    label?: string;
    tooltip?: string;
    size?: ExperimentalTagSize;
}

const Badge = styled.span<{ size: ExperimentalTagSize }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    height: ${(p: { size: ExperimentalTagSize }) => (p.size === "md" ? "18px" : "16px")};
    padding: 0 ${(p: { size: ExperimentalTagSize }) => (p.size === "md" ? "6px" : "5px")};
    font-family: var(--vscode-font-family);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    font-size: ${(p: { size: ExperimentalTagSize }) => (p.size === "md" ? "10px" : "9px")};
    line-height: 1;
    border-radius: 4px;
    color: var(--vscode-descriptionForeground);
    background: transparent;
    border: 1px solid var(--vscode-descriptionForeground);
    opacity: 0.85;
    flex-shrink: 0;
    user-select: none;
`;

/**
 * Small inline badge marking a UI surface as experimental. Pre-GA features
 * should render this next to their title so users register that the feature
 * may change. Drop-in component — no extra global tokens needed.
 */
export const ExperimentalTag: React.FC<Props> = ({ label = "Experimental", tooltip, size = "sm" }) => (
    <Badge size={size} title={tooltip}>{label}</Badge>
);

export default ExperimentalTag;
