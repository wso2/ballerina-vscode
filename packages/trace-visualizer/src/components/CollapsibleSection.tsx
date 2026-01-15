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

import { useState, useEffect, ReactNode } from "react";
import styled from "@emotion/styled";
import { Codicon, Icon } from "@wso2/ui-toolkit";

interface CollapsibleSectionProps {
    title: string;
    icon?: string;
    defaultOpen?: boolean;
    children: ReactNode;
    headerExtra?: ReactNode;
}

const Container = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background-color: var(--vscode-editor-background);
    overflow: hidden;
`;

const Header = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: var(--vscode-list-hoverBackground);
    border: none;
    cursor: pointer;
    color: var(--vscode-badge-foreground);

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
`;

const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const HeaderTitle = styled.span`
    font-size: 13px;
    font-weight: 500;
    color: var(--vscode-badge-foreground);
`;

const HeaderIcon = styled.span`
    display: flex;
    align-items: center;
    color: var(--vscode-badge-foreground);
`;

const ChevronIcon = styled.span`
    display: flex;
    align-items: center;
    color: var(--vscode-descriptionForeground);
`;

const Content = styled.div<{ isOpen: boolean }>`
    display: ${(props: { isOpen: boolean }) => props.isOpen ? 'block' : 'none'};
    border-top: 1px solid var(--vscode-panel-border);
    padding: 12px;
`;

export function CollapsibleSection({
    title,
    icon,
    defaultOpen = true,
    children,
    headerExtra
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    // Update state when defaultOpen prop changes
    useEffect(() => {
        setIsOpen(defaultOpen);
    }, [defaultOpen]);

    return (
        <Container>
            <Header onClick={() => setIsOpen(!isOpen)}>
                <HeaderLeft>
                    {icon && (
                        <HeaderIcon>
                            <Icon
                                name={icon}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px',
                                    width: '14px',
                                    height: '14px'
                                }}
                                iconSx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            />
                        </HeaderIcon>
                    )}
                    <HeaderTitle>{title}</HeaderTitle>
                </HeaderLeft>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {headerExtra}
                    <ChevronIcon>
                        <Codicon name={isOpen ? 'chevron-down' : 'chevron-right'} />
                    </ChevronIcon>
                </div>
            </Header>
            <Content isOpen={isOpen}>
                {children}
            </Content>
        </Container>
    );
}
