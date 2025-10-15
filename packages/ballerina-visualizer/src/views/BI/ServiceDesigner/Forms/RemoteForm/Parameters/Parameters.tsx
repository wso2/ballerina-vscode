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

import React, { useState } from "react";
import { Codicon, LinkButton, Typography } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { ParameterModel } from "@wso2/ballerina-core";

export interface ParametersProps {
    parameters: ParameterModel[];
    onChange: (parameters: ParameterModel[]) => void;
    readonly?: boolean;
    showPayload: boolean;
}

const AddButtonWrapper = styled.div`
    margin: 8px 0;
`;

const ParamItemContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 8px;
    margin-bottom: 4px;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 4px;
`;

const ParamInfo = styled.div`
    flex-grow: 1;
`;

const ParamName = styled.span`
    font-weight: 500;
    color: var(--vscode-input-foreground);
`;

const ParamType = styled.span`
    margin-left: 8px;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
`;

export function Parameters(props: ParametersProps) {
    const { parameters, readonly, onChange, showPayload } = props;

    const payloadParameters = parameters.filter(
        (param) => (param.httpParamType && param.httpParamType === "PAYLOAD") || param.kind === "DATA_BINDING"
    );

    const onAddPayloadClick = () => {
        console.log("Add payload clicked");
        // This would typically open a schema editor or parameter editor
    };

    const onDelete = (param: ParameterModel) => {
        const updatedParameters = parameters.filter(
            (p) => p.metadata.label !== param.metadata.label || p.name.value !== param.name.value
        );
        onChange(updatedParameters);
    };

    return (
        <div>
            {/* Payload Parameters */}
            {showPayload && (
                <>
                    {payloadParameters.map((param: ParameterModel, index) => (
                        <ParamItemContainer key={index}>
                            <ParamInfo>
                                <ParamName>{param.name.value}</ParamName>
                                <ParamType>{param.type.value || param.type.valueTypeConstraint}</ParamType>
                            </ParamInfo>
                            {!readonly && (
                                <LinkButton onClick={() => onDelete(param)}>
                                    <Codicon name="trash" />
                                </LinkButton>
                            )}
                        </ParamItemContainer>
                    ))}
                </>
            )}

            {showPayload && payloadParameters.length === 0 && (
                <AddButtonWrapper>
                    <LinkButton
                        sx={readonly && { color: "var(--vscode-badge-background)" }}
                        onClick={!readonly ? onAddPayloadClick : undefined}
                    >
                        <Codicon name="add" />
                        Add Payload Schema
                    </LinkButton>
                </AddButtonWrapper>
            )}
        </div>
    );
}
