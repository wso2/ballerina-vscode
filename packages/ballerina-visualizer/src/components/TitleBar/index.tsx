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

import { ReactNode } from "react";
import styled from "@emotion/styled";
import { Icon } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { BetaSVG } from "../../views/Connectors/Marketplace/BetaSVG";

const TitleBarContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px;
    min-height: 56px;
    background-color: var(--vscode-editorWidget-background);
    z-index: 1000;
`;

const LeftContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    width: 100%;
`;

const RightContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const TitleSection = styled.div`
    display: flex;
    align-items: baseline;
    gap: 12px;
`;

const Title = styled.h2`
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--vscode-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: fit-content;
`;

const SubTitle = styled.span`
    font-size: 14px;
    color: var(--vscode-descriptionForeground);
`;

const ActionsContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const IconButton = styled.div`
    padding: 4px;
    cursor: pointer;
    border-radius: 4px;

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }

    & > div:first-child {
        width: 24px;
        height: 24px;
        font-size: 24px;
    }
`;

const BetaSVGWrapper = styled.span`
    display: inline-flex;
    align-items: center;
    margin-top: 2px;
`;

interface TitleBarProps {
    title: string;
    subtitle?: string;
    subtitleElement?: ReactNode;
    actions?: ReactNode;
    hideBack?: boolean;
    onBack?: () => void; // Override back functionality
    isBetaFeature?: boolean;
}

export function TitleBar(props: TitleBarProps) {
    const { title, subtitle, subtitleElement, actions, hideBack, onBack, isBetaFeature } = props;
    const { rpcClient } = useRpcContext();

    const handleBackButtonClick = () => {
        if (onBack) {
            onBack();
        } else {
            rpcClient.getVisualizerRpcClient().goBack();
        }
    };

    return (
        <TitleBarContainer>
            <LeftContainer>
                {!hideBack && (
                    <IconButton onClick={handleBackButtonClick}>
                        <Icon name="bi-arrow-back" iconSx={{ fontSize: "24px", color: "var(--vscode-foreground)" }} />
                    </IconButton>
                )}
                <TitleSection>
                    <Title>{title}</Title>
                    {subtitle && <SubTitle>{subtitle}</SubTitle>}
                    {subtitleElement && subtitleElement}
                </TitleSection>
                {isBetaFeature && (
                    <BetaSVGWrapper>
                        <BetaSVG width={45} height={18} />
                    </BetaSVGWrapper>
                )}
            </LeftContainer>
            <RightContainer>{actions && <ActionsContainer>{actions}</ActionsContainer>}</RightContainer>
        </TitleBarContainer>
    );
}
