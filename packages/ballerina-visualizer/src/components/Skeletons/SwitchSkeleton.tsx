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
import { SkeletonBase } from "./styles";

// Switch container skeleton - matches SwitchContainer
const SwitchSkeletonContainer = styled.div<{
    width?: string | number;
    height?: string | number;
    sx?: any;
}>`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: row;
    height: ${({ height = "30px" }) =>
        typeof height === "number" ? `${height}px` : height};
    width: ${({ width = "200px" }) =>
        typeof width === "number" ? `${width}px` : width};
    border: 1px solid var(--vscode-tree-indentGuidesStroke);
    border-radius: 4px;
    ${({ sx }: { sx?: any }) => sx};
`;

// Left inner container skeleton - matches LeftInnerContainer
const LeftInnerContainerSkeleton = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 50%;
    background-color: var(--vscode-tab-unfocusedInactiveBackground);
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
`;

// Right inner container skeleton - matches RightInnerContainer
const RightInnerContainerSkeleton = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 50%;
    background-color: var(--vscode-tab-unfocusedInactiveBackground);
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
`;

// Inner container skeleton - matches InnerContainer
const InnerContainerSkeleton = styled.div<{
    active?: boolean;
}>`
    display: flex;
    align-items: center;
    justify-content: center;
    height: calc(100% - 8px);
    width: calc(100% - 8px);
    font-weight: bold;
    color: ${({ active }: { active?: boolean }) =>
        active ? "var(--vscode-editor-foreground)" : "var(--vscode-editor-foreground)"};
    background-color: ${({ active }: { active?: boolean }) =>
        active ? "var(--vscode-editor-background)" : "var(--vscode-tab-unfocusedInactiveBackground)"};
    margin: 4px;
    border-radius: ${({ active }: { active?: boolean }) => active ? "4px" : 0};
`;

// Label skeleton - for text labels
const LabelSkeleton = styled(SkeletonBase)`
    width: 40px;
    height: 14px;
    border-radius: 2px;
`;

// Icon skeleton - for icons
const IconSkeleton = styled(SkeletonBase)`
    width: 16px;
    height: 16px;
    border-radius: 50%;
    margin-right: 4px;
`;

// Content skeleton - matches Content
const ContentSkeleton = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    user-select: none;
`;

interface SwitchSkeletonProps {
    width?: string | number;
    height?: string | number;
    showIcons?: boolean;
    leftLabel?: string;
    rightLabel?: string;
    checked?: boolean;
    sx?: any;
}

export const SwitchSkeleton: React.FC<SwitchSkeletonProps> = ({
    width = "200px",
    height = "30px",
    showIcons = false,
    leftLabel = "Flow",
    rightLabel = "Sequence",
    checked = false,
    sx,
}) => {
    const renderLabel = (label: string, isActive: boolean) => (
        <ContentSkeleton>
            {showIcons && <IconSkeleton />}
            <LabelSkeleton />
        </ContentSkeleton>
    );

    return (
        <SwitchSkeletonContainer width={width} height={height} sx={sx}>
            <LeftInnerContainerSkeleton>
                <InnerContainerSkeleton active={!checked}>
                    {renderLabel(leftLabel, !checked)}
                </InnerContainerSkeleton>
            </LeftInnerContainerSkeleton>
            <RightInnerContainerSkeleton>
                <InnerContainerSkeleton active={checked}>
                    {renderLabel(rightLabel, checked)}
                </InnerContainerSkeleton>
            </RightInnerContainerSkeleton>
        </SwitchSkeletonContainer>
    );
};

export default SwitchSkeleton;
