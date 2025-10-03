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

import { Codicon, Divider, LinkButton, Typography, CheckBox, CheckBoxGroup, ThemeColors } from '@wso2/ui-toolkit';
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

const OptionalConfigRow = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: 8px;
`;

const OptionalConfigButtonContainer = styled.div`
    display: flex;
    flex-direction: row;
    flex-grow: 1;
    justify-content: flex-end;
`;

const OptionalConfigContent = styled.div`
    margin-top: 16px;
    padding-left: 24px;
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
    const advancedAllParameters = parameters.filter(param => !param.httpParamType).sort((a, b) => b.metadata.label.localeCompare(a.metadata.label));

    const [showOptionalConfigurations, setShowOptionalConfigurations] = useState(advancedEnabledParameters.length > 0);

    const handleShowOptionalConfigurations = () => {
        setShowOptionalConfigurations(true);
    };

    const handleHideOptionalConfigurations = () => {
        setShowOptionalConfigurations(false);
    };


    const [editModel, setEditModel] = useState<ParameterModel>(undefined);
    const [isNew, setIsNew] = useState<boolean>(false);
    const [editingIndex, setEditingIndex] = useState<number>(-1);

    const [showAdvanced, setShowAdvanced] = useState<boolean>(advancedEnabledParameters.length > 0);


    const handleAdvanceParamToggle = () => {
        setShowAdvanced(!showAdvanced);
    };

    const onEdit = (parameter: ParameterModel) => {
        setIsNew(false);
        setEditModel(parameter);
        // Find and store the index of the parameter being edited
        const index = parameters.findIndex(p =>
            p.metadata?.label === parameter.metadata?.label &&
            p.name?.value === parameter.name?.value &&
            p.httpParamType === parameter.httpParamType
        );
        setEditingIndex(index);
    };

    const onAddParamClick = () => {
        queryModel.name.value = "";
        queryModel.type.value = "";
        setIsNew(true);
        setEditModel(queryModel);
        setEditingIndex(-1);
    };

    const onAddPayloadClick = () => {
        payloadModel.name.value = "payload";
        payloadModel.type.value = "";
        setIsNew(true);
        setEditModel(payloadModel);
        setEditingIndex(-1);
    };

    const onDelete = (param: ParameterModel) => {
        const updatedParameters = parameters.filter(p => p.metadata.label !== param.metadata.label || p.name.value !== param.name.value);
        onChange(updatedParameters);
        setEditModel(undefined);
        setEditingIndex(-1);
    };

    const onAdvanceDelete = (param: ParameterModel) => {
        parameters.forEach(p => {
            if (p.metadata.label === param.metadata.label) {
                param.enabled = false;
            }
        })
        onChange([...parameters]);
        setEditModel(undefined);
        setEditingIndex(-1);
    };

    const onAdvanceSaveParam = (param: ParameterModel) => {
        param.enabled = true;
        onChange(parameters.map(p => p.metadata.label === param.metadata.label ? param : p));
        setEditModel(undefined);
        setEditingIndex(-1);
    };

    const onAdvancedChecked = (param: ParameterModel, checked: boolean) => {
        param.enabled = checked;
        param.name.value = param.metadata.label.toLowerCase().replace(/ /g, "_");
        onChange(parameters.map(p => p.metadata.label === param.metadata.label ? param : p));
        setEditModel(undefined);
        setEditingIndex(-1);
    };

    const onChangeParam = (param: ParameterModel) => {
        setEditModel(param);
        // Update the parameters array in real-time for existing parameters
        if (!isNew && editingIndex >= 0) {
            const updatedParameters = [...parameters];
            updatedParameters[editingIndex] = param;
            onChange(updatedParameters);
        }
    };

    const onSaveParam = (param: ParameterModel) => {
        param.enabled = true;
        if (isNew) {
            onChange([...parameters, param]);
            setIsNew(false);
        } else {
            // Use the editingIndex for more reliable updates
            if (editingIndex >= 0) {
                const updatedParameters = [...parameters];
                updatedParameters[editingIndex] = param;
                onChange(updatedParameters);
            } else {
                // Fallback to the original logic if index is not available
                onChange(parameters.map(p => p.metadata.label === param.metadata.label && p.name.value === param.name.value ? param : p));
            }
        }
        setEditModel(undefined);
        setEditingIndex(-1);
    };

    const onParamEditCancel = () => {
        setEditModel(undefined);
        setEditingIndex(-1);
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

            {/* TODO: REMOVE THE OLD ADVANCED PARAMETERS */}
            {/* <AdvancedParamTitleWrapper>
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
            <Divider /> */}
            {/* <-------------------- Advanced Parameters End --------------------> */}

            {/* <-------------------- Advanced Parameters Checkbox Start --------------------> */}
            <>
                <OptionalConfigRow>
                    Advanced Parameters
                    <OptionalConfigButtonContainer>
                        {!showOptionalConfigurations && (
                            <LinkButton
                                onClick={handleShowOptionalConfigurations}
                                sx={{ fontSize: 12, padding: 8, color: ThemeColors.PRIMARY, gap: 4, userSelect: "none" }}
                            >
                                <Codicon name={"chevron-down"} iconSx={{ fontSize: 12 }} sx={{ height: 12 }} />
                                Expand
                            </LinkButton>
                        )}
                        {showOptionalConfigurations && (
                            <LinkButton
                                onClick={handleHideOptionalConfigurations}
                                sx={{ fontSize: 12, padding: 8, color: ThemeColors.PRIMARY, gap: 4, userSelect: "none" }}
                            >
                                <Codicon name={"chevron-up"} iconSx={{ fontSize: 12 }} sx={{ height: 12 }} />
                                Collapse
                            </LinkButton>
                        )}
                    </OptionalConfigButtonContainer>
                </OptionalConfigRow>
                {showOptionalConfigurations && (
                    <OptionalConfigContent>
                        <CheckBoxGroup direction="vertical">
                            {
                                advancedAllParameters.map((param: ParameterModel, index) => (
                                    <CheckBox
                                        key={index}
                                        label={param.metadata.label.charAt(0).toUpperCase() + param.metadata.label.slice(1)}
                                        checked={param.enabled}
                                        onChange={(checked) => onAdvancedChecked(param, checked)}
                                    />
                                ))
                            }
                        </CheckBoxGroup>
                    </OptionalConfigContent>
                )}
                <Divider />
            </>
            {/* <-------------------- Advanced Parameters Checkbox End --------------------> */}

        </div >
    );
}
