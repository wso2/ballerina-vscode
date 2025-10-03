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
import { Icon } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { SkeletonBase } from "./styles";

// TitleBar skeleton container - matches TitleBarContainer
const TitleBarSkeletonContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px;
    min-height: 56px;
    background-color: var(--vscode-editorWidget-background);
    z-index: 1000;
`;

// Left container - matches LeftContainer
const LeftContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    width: 100%;
`;

// Right container - matches RightContainer
const RightContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

// Title section - matches TitleSection
const TitleSection = styled.div`
    display: flex;
    align-items: baseline;
    gap: 12px;
`;

// Back button skeleton - matches IconButton

// Title skeleton - matches Title styling
const TitleSkeleton = styled(SkeletonBase)`
    width: 180px;
    height: 24px;
    border-radius: 4px;
    margin: 0;
`;

// Actions container - matches ActionsContainer
const ActionsContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

// Action button skeleton - matches Button styling
const ActionButtonSkeleton = styled(SkeletonBase)`
    border-radius: 4px;
    padding: 8px 16px;
`;

// Subtitle element skeleton for complex subtitle structures
const SubtitleElementSkeleton = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    width: 100%;
`;

const LeftElementsWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const AccessorTypeSkeleton = styled(SkeletonBase)`
    width: 160px;
    height: 20px;
    border-radius: 4px;
`;

const IconButton = styled.div`
    padding: 4px;
    cursor: pointer;
    border-radius: 4px;

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }

    & > div:first-child {
        width: 20px;
        height: 20px;
        font-size: 20px;
    }
`;


interface TitleBarSkeletonProps {
}

export const TitleBarSkeleton: React.FC<TitleBarSkeletonProps> = ({ }) => {

    const { rpcClient } = useRpcContext();
    const handleBackButtonClick = () => {
        rpcClient.getVisualizerRpcClient().goBack();
    };
    return (
        <TitleBarSkeletonContainer>
            <LeftContainer>
                <IconButton onClick={handleBackButtonClick}>
                    <Icon name="bi-arrow-back" iconSx={{ fontSize: "20px", color: "var(--vscode-foreground)" }} />
                </IconButton>
                <TitleSection>
                    <TitleSkeleton />
                    <SubtitleElementSkeleton>
                        <LeftElementsWrapper>
                            <AccessorTypeSkeleton />
                        </LeftElementsWrapper>
                    </SubtitleElementSkeleton>
                </TitleSection>
            </LeftContainer>
            <RightContainer>
                <ActionsContainer>
                    <ActionButtonSkeleton width={68.88} height={26} />
                </ActionsContainer>
            </RightContainer>
        </TitleBarSkeletonContainer>
    );
};

export default TitleBarSkeleton;
