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

import styled from "@emotion/styled";
import { FunctionModel, ParameterModel } from "@wso2/ballerina-core";
import {
    ActionButtons,
    CheckBox,
    CheckBoxGroup,
    Codicon,
    LinkButton,
    ProgressIndicator,
    SidePanelBody,
    ThemeColors,
    Typography,
} from "@wso2/ui-toolkit";
import { useEffect, useState } from "react";
import { EditorContentColumn } from "../../styles";
import { ParamEditor } from "./Parameters/ParamEditor";
import { Parameters } from "./Parameters/Parameters";

const OptionalConfigRow = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: 8px;
    margin-top: 12px;
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

const AddButtonWrapper = styled.div`
    margin: 8px 0;
`;

export interface RemoteFormProps {
    model: FunctionModel;
    isSaving?: boolean;
    onSave: (functionModel: FunctionModel) => void;
    onClose: () => void;
}

export function RemoteForm(props: RemoteFormProps) {
    const { model, isSaving = false, onSave, onClose } = props;

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [functionModel, setFunctionModel] = useState<FunctionModel>(model);
    const [showAdvancedParameters, setShowAdvancedParameters] = useState<boolean>(false);

    // State for payload editor
    const [editModel, setEditModel] = useState<ParameterModel | undefined>(undefined);
    const [isNew, setIsNew] = useState<boolean>(false);
    const [editingIndex, setEditingIndex] = useState<number>(-1);

    useEffect(() => {
        // Get advanced parameters (excluding DATA_BINDING which is shown in Payload section)
        // IMPORTANT: Use the same filtering logic as in the render section
        const advancedParams = model.parameters?.filter((param) => param.kind !== "DATA_BINDING") || [];
        const additionalAdvancedParams = advancedParams.slice(1); // Skip first parameter (REQUIRED)

        // Check if any additional advanced parameters are enabled
        const hasEnabledAdvanced = additionalAdvancedParams.some((param) => param.enabled);
        setShowAdvancedParameters(hasEnabledAdvanced);
    }, []);

    const handleParamChange = (params: ParameterModel[]) => {
        const updatedFunctionModel = {
            ...functionModel,
            parameters: params,
        };
        setFunctionModel(updatedFunctionModel);
    };

    const handlePayloadParamChange = (params: ParameterModel[]) => {
        // Check if a DATA_BINDING parameter was removed
        const dataBindingParam = functionModel.parameters?.find((p) => p.kind === "DATA_BINDING");
        const isInNewParams = params.some((p) => p.kind === "DATA_BINDING");

        if (dataBindingParam && !isInNewParams) {
            // Instead of deleting, disable the DATA_BINDING parameter and enable the first parameter
            dataBindingParam.enabled = false;

            // Enable the first parameter (the REQUIRED one)
            if (functionModel.parameters && functionModel.parameters.length > 0) {
                const firstParam = functionModel.parameters[0];
                if (firstParam.kind === "REQUIRED") {
                    firstParam.enabled = true;
                }
            }

            handleParamChange([...functionModel.parameters]);
        } else {
            // Normal parameter change
            handleParamChange(params);
        }
    };

    const handleSave = () => {
        onSave(functionModel);
    };

    const handleShowAdvancedParameters = () => {
        setShowAdvancedParameters(true);
    };

    const handleHideAdvancedParameters = () => {
        setShowAdvancedParameters(false);
    };

    // Payload editor handlers
    const onAddPayloadClick = () => {
        // Find the DATA_BINDING parameter in the parameter list
        const payloadParam = functionModel.parameters?.find(param => param.kind === "DATA_BINDING");
        if (payloadParam) {
            // Find its index
            const index = functionModel.parameters.findIndex(param => param.kind === "DATA_BINDING");
            setEditingIndex(index);
            setIsNew(false);
            setEditModel(payloadParam);
        }
    };

    const onEditPayloadClick = (param: ParameterModel) => {
        // Find the index of the parameter being edited
        const index = functionModel.parameters.findIndex(
            p => p.metadata.label === param.metadata.label && p.name.value === param.name.value
        );
        setEditingIndex(index);
        setIsNew(false);
        setEditModel(param);
    };

    const onChangeParam = (param: ParameterModel) => {
        setEditModel(param);
        // Update the parameters array in real-time for existing parameters
        if (!isNew && editingIndex >= 0) {
            const updatedParameters = [...functionModel.parameters];
            updatedParameters[editingIndex] = param;
            handleParamChange(updatedParameters);
        }
    };

    const onSaveParam = (param: ParameterModel) => {
        param.enabled = true;

        // If this is a DATA_BINDING parameter, disable the first parameter
        if (param.kind === "DATA_BINDING" && functionModel.parameters && functionModel.parameters.length > 0) {
            const firstParam = functionModel.parameters[0];
            if (firstParam.kind === "REQUIRED") {
                firstParam.enabled = false;
            }
        }

        if (isNew) {
            handleParamChange([...functionModel.parameters, param]);
            setIsNew(false);
        } else {
            // Use the editingIndex for more reliable updates
            if (editingIndex >= 0) {
                const updatedParameters = [...functionModel.parameters];
                updatedParameters[editingIndex] = param;
                handleParamChange(updatedParameters);
            } else {
                // Fallback to the original logic if index is not available
                handleParamChange(
                    functionModel.parameters.map((p) =>
                        p.metadata.label === param.metadata.label && p.name.value === param.name.value ? param : p
                    )
                );
            }
        }
        setEditModel(undefined);
        setEditingIndex(-1);
    };

    const onParamEditCancel = () => {
        setEditModel(undefined);
        setEditingIndex(-1);
    };

    const payloadParameter = functionModel.parameters?.find((param) => param.kind === "DATA_BINDING" && param.enabled);

    const advancedParameters = functionModel.parameters?.filter((param) => param.kind !== "DATA_BINDING" && param.kind !== "REQUIRED") || [];

    return (
        <>
            {(isLoading || isSaving) && <ProgressIndicator id="remote-loading-bar" />}
            <SidePanelBody>
                <EditorContentColumn>
                    {/* Payload Section */}
                    <Typography sx={{ marginBlockEnd: 10 }} variant="h4">
                        Payload
                    </Typography>
                    {!payloadParameter && !editModel && (
                        <AddButtonWrapper>
                            <LinkButton onClick={onAddPayloadClick}>
                                <Codicon name="add" />
                                Payload
                            </LinkButton>
                        </AddButtonWrapper>
                    )}
                    {payloadParameter && (
                        <Parameters
                            parameters={[payloadParameter]}
                            onChange={handlePayloadParamChange}
                            onEditClick={onEditPayloadClick}
                            showPayload={true}
                        />
                    )}

                    {/* Payload Editor */}
                    {editModel && editModel.kind === "DATA_BINDING" && (
                        <ParamEditor
                            param={editModel}
                            onChange={onChangeParam}
                            onSave={onSaveParam}
                            onCancel={onParamEditCancel}
                        />
                    )}

                    {/* Advanced Parameters Section - Only show if there are additional parameters beyond the first */}
                    {advancedParameters.length > 0 && (
                        <>
                            <OptionalConfigRow>
                                Advanced Parameters
                                <OptionalConfigButtonContainer>
                                    {!showAdvancedParameters && (
                                        <LinkButton
                                            onClick={handleShowAdvancedParameters}
                                            sx={{
                                                fontSize: 12,
                                                padding: 8,
                                                color: ThemeColors.PRIMARY,
                                                gap: 4,
                                                userSelect: "none",
                                            }}
                                        >
                                            <Codicon
                                                name={"chevron-down"}
                                                iconSx={{ fontSize: 12 }}
                                                sx={{ height: 12 }}
                                            />
                                            Expand
                                        </LinkButton>
                                    )}
                                    {showAdvancedParameters && (
                                        <LinkButton
                                            onClick={handleHideAdvancedParameters}
                                            sx={{
                                                fontSize: 12,
                                                padding: 8,
                                                color: ThemeColors.PRIMARY,
                                                gap: 4,
                                                userSelect: "none",
                                            }}
                                        >
                                            <Codicon
                                                name={"chevron-up"}
                                                iconSx={{ fontSize: 12 }}
                                                sx={{ height: 12 }}
                                            />
                                            Collapse
                                        </LinkButton>
                                    )}
                                </OptionalConfigButtonContainer>
                            </OptionalConfigRow>
                            {showAdvancedParameters && (
                                <OptionalConfigContent>
                                    <CheckBoxGroup direction="vertical">
                                        {advancedParameters.map((param: ParameterModel, index) => (
                                            <CheckBox
                                                key={index}
                                                label={
                                                    param.metadata.label.charAt(0).toUpperCase() +
                                                    param.metadata.label.slice(1)
                                                }
                                                checked={param.enabled}
                                                onChange={(checked) => {
                                                    param.enabled = checked;
                                                    param.name.value = param.metadata.label
                                                        .toLowerCase()
                                                        .replace(/ /g, "_");
                                                    handleParamChange([...functionModel.parameters]);
                                                }}
                                            />
                                        ))}
                                    </CheckBoxGroup>
                                </OptionalConfigContent>
                            )}
                        </>
                    )}
                </EditorContentColumn>
                <ActionButtons
                    primaryButton={{
                        text: isSaving ? "Saving..." : "Save",
                        onClick: handleSave,
                        tooltip: isSaving ? "Saving..." : "Save",
                        disabled: isSaving,
                        loading: isSaving,
                    }}
                    secondaryButton={{
                        text: "Cancel",
                        onClick: onClose,
                        tooltip: "Cancel",
                        disabled: isSaving,
                    }}
                    sx={{ justifyContent: "flex-end" }}
                />
            </SidePanelBody>
        </>
    );
}
