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

import styled, { CSSObject } from "@emotion/styled";
import { ParameterModel } from "@wso2/ballerina-core";
import { Codicon } from "@wso2/ui-toolkit";
import {
    ActionIconWrapper,
    ContentSection,
    DeleteIconWrapper,
    EditIconWrapper,
    disabledHeaderLabel,
    headerLabelStyles,
} from "../../../styles";

export interface ParametersProps {
    parameters: ParameterModel[];
    onChange: (parameters: ParameterModel[]) => void;
    onEditClick?: (param: ParameterModel) => void;
    showPayload: boolean;
}

const ParamLabelContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--vscode-font-family);
`;

const ParamName = styled.span`
    color: var(--vscode-editor-foreground, #222);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--vscode-font-family);
`;

const ParamType = styled.span`
    font-size: 13px;
    color: var(--vscode-descriptionForeground, #888);
    background: var(--vscode-editorWidget-background, #f5f5f5);
    border-radius: 4px;
    padding: 2px 8px;
    letter-spacing: 0.1px;
    width: 60px;
`;

const HeaderLabel = styled.div<CSSObject>`
    display: flex;
    background: var(--vscode-editor-background);
    border: 1px solid ${(props: { haveErrors: boolean; }) => props.haveErrors ? "red" : "var(--vscode-dropdown-border)"};
    margin: 8px 0;
    display: flex;
    width: 100%;
    height: 32px;
    align-items: center;
`;

const ParamDefault = styled.span`
    font-size: 13px;
    color: var(--vscode-editorHint-foreground, #b0b0b0);
    margin-left: 8px;
    font-style: italic;
`;

export function Parameters(props: ParametersProps) {
    const { parameters, onChange, onEditClick, showPayload } = props;

    const onDelete = (param: ParameterModel) => {
        const updatedParameters = parameters.filter(
            (p) => p.metadata.label !== param.metadata.label || p.name.value !== param.name.value
        );
        onChange(updatedParameters);
    };

    return (
        <div>
            {showPayload && (
                <>
                    {parameters.map((param: ParameterModel, index) => {
                        const label = (
                            <ParamLabelContainer>
                                <ParamType>{param.type.value}</ParamType>
                            </ParamLabelContainer>
                        );
                        const readonly = param.editable === false;

                        return (
                            <HeaderLabel key={index} data-testid={`${param.name.value}-item`}>
                                <ContentSection>
                                    <div
                                        data-test-id={`${param.name.value}-param`}
                                        className={readonly ? disabledHeaderLabel : headerLabelStyles}
                                        onClick={() => !readonly && onEditClick(param)}
                                    >
                                        {label}
                                    </div>
                                    <ActionIconWrapper>
                                        {!readonly && (
                                            <EditIconWrapper>
                                                <Codicon name="edit" onClick={() => onEditClick(param)} />
                                            </EditIconWrapper>
                                        )}
                                        <DeleteIconWrapper>
                                            <Codicon name="trash" onClick={() => onDelete(param)} />
                                        </DeleteIconWrapper>
                                    </ActionIconWrapper>
                                </ContentSection>
                            </HeaderLabel>
                        );
                    })}
                </>
            )}
        </div>
    );
}
