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

import styled from "@emotion/styled";
import { Button, Codicon, TruncatedLabel } from "@wso2/ui-toolkit";

import { DataMapperInputParam } from "./types";

interface InputParamItemProps {
    index: number;
    inputParam: DataMapperInputParam;
    onDelete?: (index: number, inputParam: DataMapperInputParam) => void;
    onEditClick?: (index: number, inputParam: DataMapperInputParam) => void;
}

export function InputParamItem(props: InputParamItemProps) {
    const { index, inputParam, onDelete, onEditClick } = props;

    const label = (
        <TruncatedLabel style={{ marginRight: "auto" }}>
            <TypeName isInvalid={inputParam.isUnsupported}>{inputParam.isArray ? `${inputParam.type}[]` : inputParam.type}</TypeName>
            <span>{" " + inputParam.name}</span>
        </TruncatedLabel>
    );

    const handleDelete = () => {
        onDelete(index, inputParam);
    };

    const handleEdit = () => {
        if (!inputParam.isUnsupported) {
            onEditClick(index, inputParam);
        }
    };

    return (
        <InputParamContainer >
            <ClickToEditContainer isInvalid={inputParam.isUnsupported} onClick={handleEdit}>
                {label}
            </ClickToEditContainer>
            <Box>
                {!inputParam.isUnsupported && (
                    <EditButton
                        onClick={handleEdit}
                        appearance="icon"
                        data-testid={`data-mapper-config-edit-input-${index}`}
                    >
                        <Codicon name="edit" iconSx={{ color: "var(--vscode-input-placeholderForeground)" }} />
                    </EditButton>
                )}
                <DeleteButton
                    onClick={handleDelete}
                    appearance="icon"
                    data-testid={`data-mapper-config-delete-input-${index}`}
                >
                    <Codicon name="trash" iconSx={{ color: "var(--vscode-errorForeground)" }} />
                </DeleteButton>
            </Box>
        </InputParamContainer>
    );
}

const ClickToEditContainer = styled.div(({ isInvalid }: { isInvalid?: boolean }) => ({
    cursor: isInvalid ? 'auto' : 'pointer',
    width: '100%'
}));

const DeleteButton = styled(Button)`
    padding: 0;
    color: var(--vscode-errorForeground);
`;

const EditButton = styled(Button)`
    padding: 0;
    margin-right: 5px;
    color: #36B475;
`;

const InputParamContainer = styled.div(() => ({
    background: 'var(--vscode-sideBar-background)',
    color: 'inherit',
    padding: 10,
    margin: '1rem 0 0.25rem',
    justifyContent: 'space-between',
    display: 'flex',
    width: '100%',
    alignItems: 'center'
}));

const TypeName = styled.span(({ isInvalid }: { isInvalid?: boolean }) => ({
    fontWeight: 500,
    color: `${isInvalid ? 'var(--vscode-errorForeground)' : 'inherit'}`,
}));

const Box = styled.div`
    display: flex;
`;

