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

import React, { useState } from 'react';
import _ from 'lodash';
import { Codicon, LinkButton, Typography } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { ResponseItem } from './ResponseItem';
import { ResponseEditor } from './ResponseEditor';
import { getDefaultResponse, HTTP_METHOD } from '../../../utils';
import { ReturnTypeModel, StatusCodeResponse } from '@wso2/ballerina-core';

export interface ResourceParamProps {
    method: HTTP_METHOD;
    response: ReturnTypeModel;
    onChange?: (response: ReturnTypeModel) => void;
    readonly?: boolean;
}

const ResourceResponseContainer = styled.div`
`;

const AddButtonWrapper = styled.div`
	margin: 8px 0;
`;

const AdvancedParamTitleWrapper = styled.div`
	display: flex;
	flex-direction: row;
`;

export function ResourceResponse(props: ResourceParamProps) {
    const { method, response, readonly, onChange } = props;

    const [editingSegmentId, setEditingSegmentId] = useState<number>(-1);

    const [editModel, setEditModel] = useState<StatusCodeResponse>(undefined);

    const onEdit = (param: StatusCodeResponse, id: number) => {
        setEditingSegmentId(id);
        const schema = response.schema["statusCodeResponse"] as StatusCodeResponse;
        param.statusCode.metadata = schema.statusCode.metadata;
        param.body.metadata = schema.body.metadata;
        param.name.metadata = schema.name.metadata;
        param.headers.metadata = schema.headers.metadata;
        param.type.metadata = schema.type.metadata;
        if (param.mediaType) {
            param.mediaType.metadata = schema.mediaType.metadata;
        }
        setEditModel(param);
    };

    const onAddClick = () => {
        setEditingSegmentId(999);
        (response.schema["statusCodeResponse"] as StatusCodeResponse).statusCode.value = getDefaultResponse(method);
        setEditModel(_.cloneDeep(response.schema["statusCodeResponse"]) as StatusCodeResponse);
    };

    const onDelete = (indexToRemove: number) => {
        const updatedParameters = [...response.responses];
        updatedParameters.splice(indexToRemove, 1);
        onChange({ ...response, responses: updatedParameters });
    };

    const onSaveParam = (param: StatusCodeResponse, index: number) => {
        const updatedParameters: StatusCodeResponse[] = [...response.responses];
        if (updatedParameters.length > index) {
            updatedParameters[index] = param;
        } else {
            param.enabled = true;
            updatedParameters.push(param);
        }
        let enabled = false;
        if (updatedParameters.length > 0) {
            enabled = true;
        }
        onChange({ ...response, enabled, responses: updatedParameters });
        setEditingSegmentId(-1);
        setEditModel(undefined);
    };

    const onParamEditCancel = (id?: number) => {
        setEditModel(undefined);
        setEditingSegmentId(-1);
    };

    return (
        <ResourceResponseContainer>
            {!editModel && response.responses.map((response: StatusCodeResponse, index) => {
                return (
                    <ResponseItem
                        key={index}
                        method={method}
                        response={response}
                        readonly={editingSegmentId !== -1 || readonly}
                        onDelete={() => onDelete(index)}
                        onEditClick={() => onEdit(response, index)}
                    />
                )
            })}
            {!editModel && !readonly && (
                <AddButtonWrapper>
                    <LinkButton sx={readonly && { color: "var(--vscode-badge-background)" }} onClick={!readonly && onAddClick} >
                        <Codicon name="add" />
                        <>Response</>
                    </LinkButton>
                </AddButtonWrapper>
            )}
            {editModel &&
                <ResponseEditor
                    index={editingSegmentId}
                    method={method}
                    response={{ ...editModel }}
                    isEdit={editingSegmentId !== 999}
                    onSave={onSaveParam}
                    onCancel={onParamEditCancel}
                />
            }
        </ResourceResponseContainer>
    );
}
