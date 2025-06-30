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
import { Button, SidePanel, SidePanelTitleContainer, ThemeColors } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { BackIcon, CloseIcon } from "../../resources";

export interface PanelContainerProps {
    children?: React.ReactNode;
    title?: string;
    width?: number;
    show: boolean;
    subPanel?: React.ReactNode;
    subPanelWidth?: number;
    onClose: () => void;
    onBack?: () => void;
}

namespace S {
    export const StyledButton = styled(Button)`
        border-radius: 5px;
    `;

    export const TitleContainer = styled.div`
        display: flex;
        align-items: center;
        gap: 10px;
    `;
}

export function PanelContainer(props: PanelContainerProps) {
    const { children, title, show, onClose, onBack, width, subPanel, subPanelWidth } = props;

    return (
        <SidePanel
            isOpen={show}
            alignment="right"
            overlay={false}
            width={width || 400}
            sx={{
                fontFamily: "GilmerRegular",
                backgroundColor: ThemeColors.SURFACE_DIM,
                boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.1)",
            }}
            subPanel={subPanel}
            subPanelWidth={subPanelWidth}
        >
            {title && (
                <SidePanelTitleContainer>
                    <S.TitleContainer>
                        {onBack && (
                            <S.StyledButton appearance="icon" onClick={onBack}>
                                <BackIcon />
                            </S.StyledButton>
                        )}
                    {title}
                    </S.TitleContainer>
                    <S.StyledButton appearance="icon" onClick={onClose}>
                        <CloseIcon />
                    </S.StyledButton>
                </SidePanelTitleContainer>
            )}
            {children}
        </SidePanel>
    );
}

export default PanelContainer;
