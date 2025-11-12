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
// tslint:disable: jsx-no-multiline-js
import styled from "@emotion/styled";
import { Codicon, Icon } from "@wso2/ui-toolkit";

import HeaderSearchBox from "./HeaderSearchBox";
import HeaderBreadcrumb from "./HeaderBreadcrumb";
import { View } from "../Views/DataMapperView";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import AutoMapButton from "./AutoMapButton";
import ExpressionBarWrapper from "./ExpressionBar";
import EditButton from "./EditButton";
import { ActionIconButton } from "./ActionIconButton";

export interface DataMapperHeaderProps {
    views: View[];
    reusable?: boolean;
    switchView: (index: number) => void;
    hasEditDisabled: boolean;
    onClose: () => void;
    onBack: () => void;
    onEdit?: () => void;
    onRefresh: () => Promise<void>;
    onReset: () => Promise<void>;
    autoMapWithAI: () => Promise<void>;
    undoRedoGroup: () => JSX.Element;
}

export function DataMapperHeader(props: DataMapperHeaderProps) {
    const { views, reusable, switchView, hasEditDisabled, onClose, onBack, onRefresh, onReset, onEdit, autoMapWithAI, undoRedoGroup } = props;

    const handleAutoMap = async () => {
        await autoMapWithAI();
    };

    return (
        <HeaderContainer>
            <HeaderContent>
                <IconButton onClick={onBack}>
                    <Icon name="bi-arrow-back" iconSx={{ fontSize: "24px", color: "var(--vscode-foreground)" }} />
                </IconButton>
                <BreadCrumb>
                    <Title>Data Mapper</Title>
                    {!hasEditDisabled && (
                        <HeaderBreadcrumb
                            views={views}
                            reusable={reusable}
                            switchView={switchView}
                        />
                    )}
                </BreadCrumb>
                <RightContainer isClickable={!hasEditDisabled}>
                    <ActionGroupContaner>
                        {undoRedoGroup && undoRedoGroup()}
                        <ActionIconButton
                            onClick={onReset}
                            iconName="clear-all"
                            tooltip="Clear all mappings"
                        />
                    </ActionGroupContaner>
                    <FilterBar>
                        <HeaderSearchBox />
                    </FilterBar>
                    <AutoMapButton onClick={handleAutoMap} disabled={false} />
                    {onEdit && <EditButton onClick={onEdit} disabled={hasEditDisabled} />}
                </RightContainer>
                <VSCodeButton
                    appearance="icon"
                    onClick={onClose}
                    style={{ marginLeft: "15px" }}
                >
                    <Codicon name="chrome-close" />
                </VSCodeButton>
            </HeaderContent>
            <ExpressionBarWrapper views={views} />
        </HeaderContainer>
    );
}

const HeaderContainer = styled.div`
    display: flex;
    flex-direction: column;
`;

const HeaderContent = styled.div`
    height: 56px;
    display: flex;
    padding: 15px;
    background-color: var(--vscode-editorWidget-background);
    justify-content: space-between;
    align-items: center;
    gap: 4px;
    border-bottom: 1px solid rgba(102,103,133,0.15);
`;

const Title = styled.h2`
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--vscode-foreground);
`;

const VerticalDivider = styled.div`
    height: 20px;
    width: 1px;
    background-color: var(--dropdown-border);
`;

const RightContainer = styled.div<{ isClickable: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    pointer-events: ${({ isClickable }) => (isClickable ? "auto" : "none")};
    opacity: ${({ isClickable }) => (isClickable ? 1 : 0.5)};
`;

const ActionGroupContaner = styled.div`
    display: flex;
`;

const BreadCrumb = styled.div`
    width: 60%;
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-left: 12px;
`;

const FilterBar = styled.div`
    flex: 3;
    display: flex;
    align-items: center;
    justify-content: flex-end;
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
