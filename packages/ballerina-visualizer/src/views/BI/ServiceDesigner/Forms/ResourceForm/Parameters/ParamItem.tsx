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

import { ParamIcon } from "./ParamIcon";
import { Codicon } from "@wso2/ui-toolkit";
import { ActionIconWrapper, ContentSection, DeleteIconWrapper, EditIconWrapper, HeaderLabel, IconTextWrapper, IconWrapper, OptionLabel, disabledHeaderLabel, headerLabelStyles } from "../../../styles";
import { ParameterModel, PropertyModel } from "@wso2/ballerina-core";
import styled from "@emotion/styled";

interface ParamItemProps {
    param: ParameterModel;
    readonly?: boolean;
    onDelete: (param: ParameterModel) => void;
    onEditClick: (param: ParameterModel) => void;
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
`;

const ParamDefault = styled.span`
    font-size: 13px;
    color: var(--vscode-editorHint-foreground, #b0b0b0);
    margin-left: 8px;
    font-style: italic;
`;

export function ParamItem(props: ParamItemProps) {
    const { param, readonly, onDelete, onEditClick } = props;



    const label = (
        <ParamLabelContainer>
            <ParamType>
                {param.type.value}
            </ParamType>
            {param?.type?.value ? (
                <>
                    {param.httpParamType === "HEADER" && param.headerName.value && (
                        <ParamName>{param.headerName.value.replace(/(^")|("$)/g, '')}</ParamName>
                    )}
                    {param.httpParamType !== "HEADER" && param.name?.value && (
                        <ParamName>{param.name.value}</ParamName>
                    )}
                    {(param.defaultValue as PropertyModel)?.value && (
                        <ParamDefault>
                            = {(param.defaultValue as PropertyModel).value}
                        </ParamDefault>
                    )}
                </>
            ) : (
                <ParamName>
                    {param.name.value}
                </ParamName>
            )}
        </ParamLabelContainer>
    );

    const handleDelete = () => {
        onDelete(param);
    };
    const handleEdit = () => {
        if (!readonly) {
            onEditClick(param);
        }
    };

    const haveErrors = () => {
        // Handle errors
    }

    return (
        <HeaderLabel haveErrors={haveErrors()} data-testid={`${label}-item`}>
            {/* <IconTextWrapper onClick={handleEdit}>
                <IconWrapper>
                    <ParamIcon option={param?.httpParamType?.toLowerCase()} />
                </IconWrapper>
                <OptionLabel>
                    {param?.httpParamType ? param?.httpParamType.toUpperCase() : param?.metadata?.label.toUpperCase()}
                </OptionLabel>
            </IconTextWrapper> */}
            <ContentSection>
                <div
                    data-test-id={`${label}-param`}
                    className={readonly ? disabledHeaderLabel : headerLabelStyles}
                    onClick={!readonly ? handleEdit : undefined}
                >
                    {label}
                </div>
                {!readonly && (
                    <ActionIconWrapper>
                        <EditIconWrapper>
                            <Codicon name="edit" onClick={handleEdit} />
                        </EditIconWrapper>
                        <DeleteIconWrapper>
                            <Codicon name="trash" onClick={handleDelete} />
                        </DeleteIconWrapper>
                    </ActionIconWrapper>
                )}
            </ContentSection>
        </HeaderLabel>
    );
} 
