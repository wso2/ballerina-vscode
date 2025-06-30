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
import { Button, Icon, RequiredFormInput, Tooltip } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";

interface ReadonlyFieldProps {
    label: string;
    name: string;
}

const Container = styled.div`
    width: 100%;
    cursor: not-allowed;
`;

const Label = styled.div`
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    display: flex;
    flex-direction: row;
    margin-bottom: 4px;
`;

const Description = styled.div`
    font-family: var(--font-family);
    color: var(--vscode-list-deemphasizedForeground);
    margin-top: 4px;
    color: var(--vscode-list-deemphasizedForeground);
    margin-bottom: 4px;
    text-align: left;
`;

const InputContainer = styled.div`
    display: flex;
    align-items: center;
    color: var(--input-foreground);
    background: var(--input-background);
    border-radius: calc(var(--corner-radius)* 1px);
    border: calc(var(--border-width)* 1px) solid var(--dropdown-border);
    height: calc(var(--input-height)* 1px);
    min-width: var(--input-min-width);
    padding: 0 calc(var(--design-unit) * 2px + 1px);
    margin-top: 10px;
`;

const Value = styled.span`
    flex: 1;
`;

const StyledButton = styled(Button)`
    padding: 0;
    margin-right: -6px;
    cursor: not-allowed;

    :host([disabled]) {
        opacity: 1 !important;
    }

    &.ms-Button--disabled {
        opacity: 1 !important;
    }

    & .codicon {
        opacity: 1 !important;
        color: var(--vscode-input-foreground) !important;
    }
`;

export function ReadonlyField(props: ReadonlyFieldProps) {
    const { label, name } = props;

    return (
        <Container>
            <Label>
                <div style={{ color: "var(--vscode-editor-foreground)" }}>
                    <label>{label}</label>
                </div>
            </Label>
            <InputContainer>
                <Value>{name}</Value>
                <Tooltip content="Read only field">
                    <StyledButton appearance="icon" disabled>
                        <Icon name="bi-lock" sx={{ fontSize: 16, width: 16, height: 16 }} />
                    </StyledButton>
                </Tooltip>
            </InputContainer>
        </Container>
    );
}
