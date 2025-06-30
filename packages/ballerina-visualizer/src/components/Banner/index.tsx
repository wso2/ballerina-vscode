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

import React, { ReactNode } from 'react';
import styled from '@emotion/styled';
import { Typography, ThemeColors } from '@wso2/ui-toolkit';

const BannerContainer = styled.div<{ variant?: 'info' | 'warning' | 'success' | 'error' }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-radius: 6px;
    background-color: ${({ variant }: { variant?: 'info' | 'warning' | 'success' | 'error' }) => {
        switch (variant) {
            case 'warning':
                return 'var(--vscode-inputValidation-warningBackground)';
            case 'error':
                return 'var(--vscode-inputValidation-errorBackground)';
            case 'success':
                return 'var(--vscode-testing-iconPassed)';
            case 'info':
            default:
                return ThemeColors.SURFACE_DIM;
        }
    }};
`;

const ContentWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
`;

const Message = styled(Typography)`
    color: var(--vscode-foreground);
    margin: 0;
`;

const ActionContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

interface BannerProps {
    message: string | ReactNode;
    variant?: 'info' | 'warning' | 'success' | 'error';
    actions?: ReactNode;
}

export function Banner({ message, variant = 'info', actions }: BannerProps) {
    return (
        <BannerContainer variant={variant}>
            <ContentWrapper>
                <Message variant="body2">{message}</Message>
            </ContentWrapper>
            {actions && <ActionContainer>{actions}</ActionContainer>}
        </BannerContainer>
    );
} 
