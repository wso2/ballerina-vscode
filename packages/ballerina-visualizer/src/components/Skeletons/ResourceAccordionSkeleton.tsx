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
import { SkeletonBase } from "./styles";

const SkeletonContainer = styled.div`
    margin-top: 10px;
    overflow: hidden;
    background-color: var(--vscode-editorHoverWidget-background);
    pointer-events: none;
`;

const SkeletonHeader = styled.div`
    padding: 10px;
    cursor: default;
    display: grid;
    grid-template-columns: 3fr 1fr;
`;

const MethodSection = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
`;

const ButtonSection = styled.div`
    display: flex;
    align-items: center;
    margin-left: auto;
    gap: 6px;
`;

const MethodBoxSkeleton = styled(SkeletonBase)`
    height: 25px;
    min-width: 70px;
    width: auto;
`;

const MethodPathSkeleton = styled(SkeletonBase)`
    height: 16px;
    width: 150px;
    margin-left: 10px;
`;

const ButtonSkeleton = styled(SkeletonBase)`
    width: 33px;
    height: 25px;
    border-radius: 4px;
`;

export const ResourceAccordionSkeleton = () => {
    return (
        <SkeletonContainer data-testid="service-agent-view-resource-skeleton">
            <SkeletonHeader>
                <MethodSection>
                    <MethodBoxSkeleton />
                    <MethodPathSkeleton />
                </MethodSection>
                <ButtonSection>
                    <ButtonSkeleton />
                    <ButtonSkeleton />
                </ButtonSection>
            </SkeletonHeader>
        </SkeletonContainer>
    );
};

export default ResourceAccordionSkeleton;
