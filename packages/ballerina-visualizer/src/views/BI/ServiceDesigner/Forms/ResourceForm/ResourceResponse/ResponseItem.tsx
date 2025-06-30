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

import { Codicon, Icon } from "@wso2/ui-toolkit";
import { ActionIconWrapper, ContentSection, DeleteIconWrapper, EditIconWrapper, HeaderLabel, IconTextWrapper, IconWrapper, OptionLabel, disabledHeaderLabel, headerLabelStyles } from "../../../styles";
import { StatusCodeResponse } from "@wso2/ballerina-core";
import { getDefaultResponse, HTTP_METHOD } from "../../../utils";

interface ParamItemProps {
    method: HTTP_METHOD;
    response: StatusCodeResponse;
    readonly: boolean;
    hideCode?: boolean;
    onDelete?: () => void;
    onEditClick?: (param: StatusCodeResponse) => void;
}

export function ResponseItem(props: ParamItemProps) {
    const { response, readonly, hideCode, onDelete, onEditClick, method } = props;

    const handleDelete = () => {
        onDelete();
    };
    const handleEdit = () => {
        if (!readonly && !hideCode) {
            onEditClick(response);
        }
    };

    const getFormattedResponse = (response: StatusCodeResponse, method: HTTP_METHOD) => {
        if (response.statusCode.value && (Number(response.statusCode.value) === 200 || Number(response.statusCode.value) === 201)) {
            return getDefaultResponse(method);
        } else {
            return response.statusCode.value || getDefaultResponse(method);
        }
    };

    return (
        <HeaderLabel data-testid={`${response.statusCode.value}-item`}>
            {!hideCode &&
                <IconTextWrapper onClick={handleEdit}>
                    <IconWrapper>
                        <Icon name="header" />
                    </IconWrapper>
                    <OptionLabel>
                        {getFormattedResponse(response, method)}
                    </OptionLabel>
                </IconTextWrapper>
            }
            <ContentSection justifyEnd={hideCode}>
                <div
                    data-test-id={`${response.body.value}-resp`}
                    className={readonly ? disabledHeaderLabel : headerLabelStyles}
                    onClick={handleEdit}
                >
                    {response.body.value || response.type.value}
                </div>
                {!readonly && (
                    <ActionIconWrapper>
                        {!hideCode &&
                            <EditIconWrapper>
                                <Codicon name="edit" onClick={handleEdit} />
                            </EditIconWrapper>
                        }
                        <DeleteIconWrapper>
                            <Codicon name="trash" onClick={handleDelete} />
                        </DeleteIconWrapper>
                    </ActionIconWrapper>
                )}
            </ContentSection>
        </HeaderLabel>
    );
}
