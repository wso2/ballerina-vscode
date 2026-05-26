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

import { Codicon, Divider, LinkButton, Typography } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { ParamEditor } from './ParamEditor';
import { ParamItem } from './ParamItem';
import { ConfigProperties, ParameterModel } from '@wso2/ballerina-core';

export interface ParametersProps {
    parameters: ParameterModel[];
    onChange?: (parameters: ParameterModel[]) => void,
    readonly?: boolean;
    canAddParameters?: boolean;
}

const AddButtonWrapper = styled.div`
	margin: 8px 0;
`;


export function Parameters(props: ParametersProps) {
    const { parameters, readonly, onChange, canAddParameters = true } = props;

    const enabledParameters = parameters.filter(param => param.enabled);

    const [editModel, setEditModel] = useState<ParameterModel>(undefined);
    const [isNew, setIsNew] = useState<boolean>(false);

    const onEdit = (parameter: ParameterModel) => {
        // Handle parameter edit
    };

    const onAddParamClick = () => {
        // Handle adding new parameter
    };

    const onDelete = (param: ParameterModel) => {
        // Handle deleting parameter
    };

    const onChangeParam = (param: ParameterModel) => {
        setEditModel(param);
    };

    const onSaveParam = (param: ParameterModel) => {
        // Handle saving parameter
    };

    const onParamEditCancel = () => {
        // Handle parameter edit cancel
    };

    return (
        <div>
            <Typography sx={{ marginBlockEnd: 10 }} variant="h4">Parameters</Typography>
            {enabledParameters.map((param: ParameterModel, index) => (
                <ParamItem
                    key={index}
                    readonly={!canAddParameters}
                    param={param}
                    onDelete={onDelete}
                    onEditClick={onEdit}
                />
            ))}
            {!readonly && editModel &&
                <ParamEditor
                    param={editModel}
                    onChange={onChangeParam}
                    onSave={onSaveParam}
                    onCancel={onParamEditCancel}
                />
            }
            {canAddParameters &&
                <AddButtonWrapper >
                    <LinkButton sx={readonly && { color: "var(--vscode-badge-background)" } || editModel && { opacity: 0.5, pointerEvents: 'none' }} onClick={editModel ? undefined : (!readonly && onAddParamClick)}>
                        <Codicon name="add" />
                        <>Add Parameter</>
                    </LinkButton>
                </AddButtonWrapper>
            }
        </div >
    );
}
