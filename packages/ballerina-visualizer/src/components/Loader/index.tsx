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
import { ProgressRing, ThemeColors } from "@wso2/ui-toolkit";
import { Typography } from "@wso2/ui-toolkit";
interface LoadingRingProps {
    message?: string;
}

export const LoadingRing = ({ message }: LoadingRingProps) => {
    const ProgressContainer = styled.div`
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 16px;
    `;

    const LoadingText = styled(Typography)`
        margin-top: 16px;
        color: var(--vscode-descriptionForeground);
        font-size: 14px;
    `;

    return (
        <ProgressContainer>
            <ProgressRing color={ThemeColors.PRIMARY} />
            {message && (
                <LoadingText variant="body2">
                    {message}
                </LoadingText>
            )}
        </ProgressContainer>
    );
};
