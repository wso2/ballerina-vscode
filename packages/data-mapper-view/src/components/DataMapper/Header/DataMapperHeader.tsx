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
import React from "react";

import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import styled from "@emotion/styled";
import { Codicon, Icon } from "@wso2/ui-toolkit";

import { SelectionState, ViewOption } from "../DataMapper";
import AutoMapButton from "./AutoMapButton";
import HeaderBreadcrumb from "./HeaderBreadcrumb";
import HeaderSearchBox from "./HeaderSearchBox";
import EditButton from "./EditButton";

export interface DataMapperHeaderProps {
    selection: SelectionState;
    hasEditDisabled: boolean;
    changeSelection: (mode: ViewOption, selection?: SelectionState, navIndex?: number) => void;
    onEdit: () => void;
    onClose?: () => void;
    autoMapWithAI: () => Promise<void>;
    onBack?: () => void;
}

export function DataMapperHeader(props: DataMapperHeaderProps) {
    const {
        selection,
        hasEditDisabled,
        changeSelection,
        onEdit,
        onClose,
        autoMapWithAI,
        onBack
    } = props;

    const handleAutoMap = async () => {
        await autoMapWithAI();
    };

    return (
        <HeaderContainer>
            <IconButton onClick={onBack}>
                <Icon name="bi-arrow-back" iconSx={{ fontSize: "24px", color: "var(--vscode-foreground)" }} />
            </IconButton>
            <BreadCrumb>
                <Title>Data Mapper</Title>
                {!hasEditDisabled && (
                    <HeaderBreadcrumb
                        selection={selection}
                        changeSelection={changeSelection}
                    />
                )}
            </BreadCrumb>
            {!onClose && (
                <RightContainer isClickable={!hasEditDisabled}>
                    <FilterBar>
                        <HeaderSearchBox selection={selection} />
                    </FilterBar>
                    <AutoMapButton onClick={handleAutoMap} disabled={hasEditDisabled} />
                    {<EditButton onClick={onEdit} disabled={hasEditDisabled} />}
                </RightContainer>
            )}
            {onClose && (
                <VSCodeButton 
                    appearance="icon"
                    onClick={onClose}
                    style={{ marginLeft: "15px" }}
                >
                    <Codicon name="chrome-close" />
                </VSCodeButton>
            )}
        </HeaderContainer>
    );
}

const HeaderContainer = styled.div`
    height: 56px;
    display: flex;
    padding: 15px;
    background-color: var(--vscode-editorWidget-background);
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid rgba(102,103,133,0.15);
`;

const Title = styled.h2`
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--vscode-foreground);
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

const LeftContainer = styled.div`
    gap: 12px;
`;

const RightContainer = styled.div<{ isClickable: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    pointer-events: ${({ isClickable }) => (isClickable ? 'auto' : 'none')};
    opacity: ${({ isClickable }) => (isClickable ? 1 : 0.5)};
`;
