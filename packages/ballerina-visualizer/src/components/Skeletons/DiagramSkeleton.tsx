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

import React from "react";
import styled from "@emotion/styled";
import { ThemeColors } from "@wso2/ui-toolkit";
import { SkeletonBase, skeletonPulse } from "./styles";

// Diagram container with dotted background
const DiagramSkeletonContainer = styled.div`
    height: 100%;
    width: 100%;
    background-image: radial-gradient(${ThemeColors.SURFACE_CONTAINER} 10%, transparent 0px);
    background-size: 16px 16px;
    background-color: ${ThemeColors.SURFACE_BRIGHT};
    font-family: "GilmerRegular";
    position: relative;
    overflow: hidden;
`;

// Start node skeleton (oval shape)
const StartNodeSkeleton = styled(SkeletonBase)`
    width: 93.33px;
    height: 33.33px;
    border-radius: 40px;
    position: absolute;
    top: 200px;
    left: 50%;
    transform: translateX(-50%);
`;

// AI Agent node skeleton (large rectangle with rounded corners)
const MiddleNodeSkeleton = styled(SkeletonBase)`
    width: 280px;
    height: 50px;
    border-radius: 10px;
    position: absolute;
    top: 285px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    padding: 16px;
    gap: 12px;
`;

const ErrorNodeSkeleton = styled(SkeletonBase)`
    width: 52px;
    height: 52px;
    border-radius: 8px;
    position: absolute;
    top: 435px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    padding: 16px;
    gap: 12px;
`;

// Return node skeleton (rectangle with rounded corners)
const ReturnNodeSkeleton = styled(SkeletonBase)`
    width: 20px;
    height: 20px;
    border-radius: 100px;
    position: absolute;
    top: 542px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    padding: 12px;
    gap: 8px;
`;

// Arrow connector skeleton
const ArrowSkeleton = styled(SkeletonBase)`
    width: 4px;
    border-radius: 2px;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
`;

// Arrow head skeleton
const ArrowHeadSkeleton = styled.div`
    position: absolute;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 8px solid var(--vscode-editor-inactiveSelectionBackground);
    left: 50%;
    transform: translateX(-50%);
    animation: ${skeletonPulse} 1.5s ease-in-out infinite;
`;

export const DiagramSkeleton = () => {
    return (
        <DiagramSkeletonContainer>
            {/* Start Node */}
            <StartNodeSkeleton />

            {/* Arrow from Start to middle node */}
            <ArrowSkeleton top={233} height={48}>
                <ArrowHeadSkeleton style={{ top: "45px" }} />
            </ArrowSkeleton>

            {/* Middle Node */}
            <MiddleNodeSkeleton />

            {/* Arrow from middle node to error node */}
            <ArrowSkeleton top={337} height={98} />

            {/* Error Node */}
            <ErrorNodeSkeleton />

            {/* Arrow from error node to return node */}
            <ArrowSkeleton top={488} height={48}>
                <ArrowHeadSkeleton style={{ top: "45px" }} />
            </ArrowSkeleton>

            {/* Return Node */}
            <ReturnNodeSkeleton />
        </DiagramSkeletonContainer>
    );
};

export default DiagramSkeleton;
