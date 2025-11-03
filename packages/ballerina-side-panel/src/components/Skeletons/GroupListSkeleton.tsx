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
import { SkeletonBase } from "./styles";

// Component skeleton
const ComponentSkeleton = styled.div`
    display: flex;
    flex-direction: row;
    gap: 5px;
    padding: 7px 5px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 5px;
    height: 44px;
    min-height: 44px;
    align-items: center;
`;

// Component icon skeleton
const ComponentIconSkeleton = styled(SkeletonBase)`
    width: 20px;
    height: 20px;
    border-radius: 4px;
    margin: 0 8px;
`;

// Component action skeleton
const ComponentActionSkeleton = styled(SkeletonBase)`
    width: 14px;
    height: 14px;
    border-radius: 4px;
    margin-right: 8px;
`;

// Component content skeleton
const ComponentContentSkeleton = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 280px;
`;

// Component title skeleton
const ComponentTitleSkeleton = styled(SkeletonBase)`
    width: 180px;
    height: 14px;
    border-radius: 2px;
`;

export const GroupListSkeleton = () => {
    return (
        <ComponentSkeleton>
            <ComponentIconSkeleton />
            <ComponentContentSkeleton>
                <ComponentTitleSkeleton />
            </ComponentContentSkeleton>
            <ComponentActionSkeleton />
        </ComponentSkeleton>
    );
};

export default GroupListSkeleton;
