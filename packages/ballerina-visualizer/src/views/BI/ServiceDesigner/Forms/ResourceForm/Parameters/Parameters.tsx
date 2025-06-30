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
    onChange: (parameters: ParameterModel[]) => void,
    schemas: ConfigProperties;
    readonly?: boolean;
    showPayload: boolean;
}

const AddButtonWrapper = styled.div`
	margin: 8px 0;
`;

const AdvancedParamTitleWrapper = styled.div`
	display: flex;
	flex-direction: row;
`;

export function Parameters(props: ParametersProps) {
    const { parameters, readonly, onChange, schemas, showPayload } = props;

    const queryModel = schemas["query"] as ParameterModel;
    const headerModel = schemas["header"] as ParameterModel;
    const payloadModel = schemas["payload"] as ParameterModel;

    const normalParameters = parameters.filter(param => param.httpParamType && param.httpParamType !== "PAYLOAD");
    const payloadParameters = parameters.filter(param => param.httpParamType && param.httpParamType === "PAYLOAD");
    const advancedDisabledParameters = parameters.filter(param => !param.httpParamType && !param.enabled);
    const advancedEnabledParameters = parameters.filter(param => !param.httpParamType && param.enabled);


    const [editModel, setEditModel] = useState<ParameterModel>(undefined);
    const [isNew, setIsNew] = useState<boolean>(false);

    const [showAdvanced, setShowAdvanced] = useState<boolean>(advancedEnabledParameters.length > 0);


    const handleAdvanceParamToggle = () => {
        setShowAdvanced(!showAdvanced);
    };

    const onEdit = (parameter: ParameterModel) => {
        setIsNew(false);
        setEditModel(parameter);
    };

    const onAddParamClick = () => {
        queryModel.name.value = "";
        queryModel.type.value = "";
        setIsNew(true);
        setEditModel(queryModel);
    };

    const onAddPayloadClick = () => {
        payloadModel.name.value = "payload";
        payloadModel.type.value = "";
        setIsNew(true);
        setEditModel(payloadModel);
    };

    const onDelete = (param: ParameterModel) => {
        const updatedParameters = parameters.filter(p => p.metadata.label !== param.metadata.label || p.name.value !== param.name.value);
        onChange(updatedParameters);
        setEditModel(undefined);
    };

    const onAdvanceDelete = (param: ParameterModel) => {
        parameters.forEach(p => {
            if (p.metadata.label === param.metadata.label) {
                param.enabled = false;
            }
        })
        onChange([...parameters]);
        setEditModel(undefined);
    };

    const onAdvanceSaveParam = (param: ParameterModel) => {
        param.enabled = true;
        onChange(parameters.map(p => p.metadata.label === param.metadata.label ? param : p));
        setEditModel(undefined);
    };

    const onChangeParam = (param: ParameterModel) => {
        setEditModel(param);
    };

    const onSaveParam = (param: ParameterModel) => {
        param.enabled = true;
        if (isNew) {
            onChange([...parameters, param]);
            setIsNew(false);
        } else {
            onChange(parameters.map(p => p.metadata.label === param.metadata.label && p.name.value === param.name.value ? param : p));
        }
        setEditModel(undefined);
    };

    const onParamEditCancel = () => {
        setEditModel(undefined);
    };

    return (
        <div>
            {/* <---------------- Normal Parameters Start Query|Header ----------------> */}
            <Typography sx={{ marginBlockEnd: 10 }} variant="h4">Parameters</Typography>
            {normalParameters.map((param: ParameterModel, index) => (
                <ParamItem
                    key={index}
                    param={param}
                    onDelete={onDelete}
                    onEditClick={onEdit}
                />
            ))}
            {editModel && (editModel.httpParamType === "QUERY" || editModel.httpParamType === "Header") &&
                <ParamEditor
                    param={editModel}
                    onChange={onChangeParam}
                    onSave={onSaveParam}
                    onCancel={onParamEditCancel}
                />
            }

            <AddButtonWrapper >
                <LinkButton sx={readonly && { color: "var(--vscode-badge-background)" } || editModel && { opacity: 0.5, pointerEvents: 'none' }} onClick={editModel ? undefined : (!readonly && onAddParamClick)}>
                    <Codicon name="add" />
                    <>Add Parameter</>
                </LinkButton>
            </AddButtonWrapper>

            {/* <---------------- Normal Parameters End Query|Header ----------------> */}

            {/* <-------------------- Payload Parameters Start --------------------> */}
            {showPayload && (
                <>
                    <Typography sx={{ marginBlockEnd: 10 }} variant="h4">Payload</Typography>
                    {payloadParameters.map((param: ParameterModel, index) => (
                        <ParamItem
                            key={index}
                            param={param}
                            onDelete={onDelete}
                            onEditClick={onEdit}
                        />
                    ))}
                </>
            )}

            {editModel && editModel.httpParamType === "PAYLOAD" &&
                <ParamEditor
                    param={editModel}
                    onChange={onChangeParam}
                    onSave={onSaveParam}
                    onCancel={onParamEditCancel}
                />
            }

            {showPayload && payloadParameters.length === 0 &&
                <AddButtonWrapper >
                    <LinkButton sx={readonly && { color: "var(--vscode-badge-background)" } || editModel && { opacity: 0.5, pointerEvents: 'none' }} onClick={editModel ? undefined : (!readonly && onAddPayloadClick)}>
                        <Codicon name="add" />
                        <>Add Payload</>
                    </LinkButton>
                </AddButtonWrapper>
            }
            {/* <-------------------- Payload Parameters End --------------------> */}

            {/* <-------------------- Advanced Parameters Start --------------------> */}

            <AdvancedParamTitleWrapper>
                <Typography sx={{ marginBlockEnd: 10 }} variant="h4">Advanced Parameters</Typography>
                <LinkButton sx={{ marginTop: 12, marginLeft: 8 }} onClick={handleAdvanceParamToggle}> {showAdvanced ? "Hide" : "Show"} </LinkButton>
            </AdvancedParamTitleWrapper>
            {showAdvanced &&
                advancedDisabledParameters.map((param: ParameterModel, index) => (
                    <AddButtonWrapper >
                        <LinkButton sx={readonly && { color: "var(--vscode-badge-background)" } || editModel && { opacity: 0.5, pointerEvents: 'none' }} onClick={() => onEdit(param)}>
                            <Codicon name="add" />
                            <>{param.metadata.label}</>
                        </LinkButton>
                    </AddButtonWrapper>
                ))
            }
            {showAdvanced &&
                advancedEnabledParameters.map((param: ParameterModel, index) => (
                    <ParamItem
                        key={index}
                        param={param}
                        onDelete={onAdvanceDelete}
                        onEditClick={onEdit}
                    />
                ))
            }
            {editModel && !editModel.httpParamType &&
                <ParamEditor
                    param={editModel}
                    hideType={true}
                    onChange={onChangeParam}
                    onSave={onAdvanceSaveParam}
                    onCancel={onParamEditCancel}
                />
            }
            <Divider />
            {/* <-------------------- Advanced Parameters End --------------------> */}

        </div >
    );
}
