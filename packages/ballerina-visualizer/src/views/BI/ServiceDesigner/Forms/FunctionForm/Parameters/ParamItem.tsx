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

import { ParamIcon } from "./ParamIcon";
import { CheckBox, Codicon } from "@wso2/ui-toolkit";
import { ActionIconWrapper, ContentSection, DeleteIconWrapper, EditIconWrapper, HeaderLabel, IconTextWrapper, IconWrapper, OptionLabel, disabledHeaderLabel, headerLabelStyles } from "../../../styles";
import { ParameterModel } from "@wso2/ballerina-core";

interface ParamItemProps {
    param: ParameterModel;
    readonly?: boolean;
    onDelete: (param: ParameterModel) => void;
    onEditClick: (param: ParameterModel) => void;
}

export function ParamItem(props: ParamItemProps) {
    const { param, readonly, onDelete, onEditClick } = props;

    const label = param?.type.value ? `${param.type.value} ${param.name.value}${param.defaultValue?.value ? ` = ${param.defaultValue.value}` : ""}`
        : `${param.name.value}`;

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
            <IconTextWrapper onClick={handleEdit}>
                <IconWrapper>
                    <ParamIcon option={param?.httpParamType?.toLowerCase()} />
                </IconWrapper>
                <OptionLabel>
                    {param?.httpParamType ? param?.httpParamType.toUpperCase() : param?.metadata?.label.toUpperCase()}
                </OptionLabel>
            </IconTextWrapper>
            <ContentSection>
                <div
                    data-test-id={`${label}-param`}
                    className={readonly ? disabledHeaderLabel : headerLabelStyles}
                    onClick={handleEdit}
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
} ``
