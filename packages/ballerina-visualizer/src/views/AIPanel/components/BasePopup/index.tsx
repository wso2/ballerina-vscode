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
import { Button, Codicon, Overlay, ThemeColors, Typography } from "@wso2/ui-toolkit";

const PopupOverlay = styled(Overlay)`
    z-index: 1999;
`;

const PopupContainer = styled.div<{ width?: string; maxWidth?: string; height?: string }>`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: ${(props: { width?: string }) => props.width || "80%"};
    max-width: ${(props: { maxWidth?: string }) => props.maxWidth || "800px"};
    height: ${(props: { height?: string }) => props.height || "auto"};
    max-height: 80vh;
    min-height: 200px;
    z-index: 2000;
    background-color: ${ThemeColors.SURFACE_BRIGHT};
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const PopupHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    gap: 16px;
    border-bottom: 1px solid ${ThemeColors.OUTLINE_VARIANT};
`;

const BackButton = styled(Button)`
    min-width: auto;
    padding: 4px;
`;

const HeaderTitleContainer = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const PopupTitle = styled(Typography)`
    font-size: 20px;
    font-weight: 600;
    color: ${ThemeColors.ON_SURFACE};
    margin: 0;
`;

const PopupSubtitle = styled(Typography)`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin: 0;
`;

const CloseButton = styled(Button)`
    min-width: auto;
    padding: 4px;
`;

const PopupContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const PopupFooter = styled.div`
    padding: 16px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    border-top: 1px solid ${ThemeColors.OUTLINE_VARIANT};
`;

export interface BasePopupProps {
    isOpen: boolean;
    title: string;
    subtitle?: string;
    onClose: () => void;
    onBack?: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
    width?: string;
    maxWidth?: string;
    height?: string;
}

export const BasePopup: React.FC<BasePopupProps> = ({
    isOpen,
    title,
    subtitle,
    onClose,
    onBack,
    children,
    footer,
    width,
    maxWidth,
    height,
}) => {
    if (!isOpen) {
        return null;
    }

    return (
        <>
            <PopupOverlay sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.5` }} />
            <PopupContainer width={width} maxWidth={maxWidth} height={height}>
                <PopupHeader>
                    {onBack && (
                        <BackButton appearance="icon" onClick={onBack}>
                            <Codicon name="chevron-left" />
                        </BackButton>
                    )}
                    <HeaderTitleContainer>
                        <PopupTitle variant="h2">{title}</PopupTitle>
                        {subtitle && <PopupSubtitle variant="body2">{subtitle}</PopupSubtitle>}
                    </HeaderTitleContainer>
                    <CloseButton appearance="icon" onClick={onClose}>
                        <Codicon name="close" />
                    </CloseButton>
                </PopupHeader>
                <PopupContent>{children}</PopupContent>
                {footer && <PopupFooter>{footer}</PopupFooter>}
            </PopupContainer>
        </>
    );
};

export default BasePopup;
