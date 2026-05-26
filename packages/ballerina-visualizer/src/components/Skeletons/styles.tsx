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

import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";

// Skeleton pulse animation
export const skeletonPulse = keyframes`
    0% {
        opacity: 0.3;
    }
    50% {
        opacity: 0.9;
    }
    100% {
        opacity: 0.3;
    }
`;

// Base skeleton element
export const SkeletonBase = styled.div<{
    width?: string | number;
    height?: string | number;
    borderRadius?: string | number;
    margin?: string;
    position?: string;
    top?: string | number;
    left?: string | number;
}>`
    background-color: var(--vscode-editor-inactiveSelectionBackground);
    border-radius: ${({ borderRadius = "4px" }) =>
        typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius};
    animation: ${skeletonPulse} 1.5s ease-in-out infinite;
    width: ${({ width = "100%" }) =>
        typeof width === "number" ? `${width}px` : width};
    height: ${({ height = "16px" }) =>
        typeof height === "number" ? `${height}px` : height};
    margin: ${({ margin = "0" }) => margin};
    position: ${({ position = "static" }) => position};
    top: ${({ top }: { top?: string | number }) =>
        typeof top === "number" ? `${top}px` : top};
    left: ${({ left }: { left?: string | number }) =>
        typeof left === "number" ? `${left}px` : left};
`;
