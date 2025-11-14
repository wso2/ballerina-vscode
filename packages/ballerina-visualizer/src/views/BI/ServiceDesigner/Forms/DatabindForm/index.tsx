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
import { ConfigProperties, FunctionModel, ParameterModel, MessageQueuePayloadContext, Type } from "@wso2/ballerina-core";
import {
    ActionButtons,
    CheckBox,
    CheckBoxGroup,
    Codicon,
    Divider,
    LinkButton,
    ProgressIndicator,
    SidePanelBody,
    TextField,
    ThemeColors,
    Tooltip,
    Typography,
} from "@wso2/ui-toolkit";
import { useEffect, useState } from "react";
import { ParamEditor } from "./Parameters/ParamEditor";
import { Parameters } from "./Parameters/Parameters";
import { EntryPointTypeCreator } from "../../../../../components/EntryPointTypeCreator";
import { hasEditableParameters } from "../../utils";

const OptionalConfigRow = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: 8px;
    margin-top: 10px;
    padding-top: 10px;
`;

const OptionalConfigButtonContainer = styled.div`
    display: flex;
    flex-direction: row;
    flex-grow: 1;
    justify-content: flex-end;
`;

const OptionalConfigContent = styled.div`
    padding-left: 24px;
    margin-bottom: 12px;
`;

const MessageConfigContainer = styled.div`
    margin-bottom: 0;
`;

const MessageConfigTitle = styled.div`
    margin-bottom: 12px;
`;

const MessageConfigSection = styled.div`
    padding: 0;
`;

const MessageConfigContent = styled.div`
    margin-top: 0;
    padding-left: 0;
`;

const MessageTypeNameFieldContainer = styled.div`
    margin-top: 12px;
`;

const PayloadSection = styled.div`
    // padding-top: 12px;
`;

const AddButtonWrapper = styled.div`
    margin: 8px 0;
`;

export const EditorContentColumn = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding-bottom: 20px;
    gap: 10px;
`;

export interface DatabindFormProps {
    model: FunctionModel;
    isSaving?: boolean;
    onSave: (functionModel: FunctionModel, openDiagram?: boolean) => void;
    onClose: () => void;
    isNew?: boolean;
    payloadContext?: MessageQueuePayloadContext;
    serviceProperties?: ConfigProperties;
    serviceModuleName?: string;
}

export function DatabindForm(props: DatabindFormProps) {
    const { model, isSaving = false, onSave, onClose, isNew = false, payloadContext, serviceProperties, serviceModuleName } = props;

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [functionModel, setFunctionModel] = useState<FunctionModel>(model);
    const [showAdvancedParameters, setShowAdvancedParameters] = useState<boolean>(false);
    const [showMessageTypeConfig, setShowMessageTypeConfig] = useState<boolean>(false);

    // State for payload editor
    const [editModel, setEditModel] = useState<ParameterModel | undefined>(undefined);
    const [editingIndex, setEditingIndex] = useState<number>(-1);

    // State for type editor modal
    const [isTypeEditorOpen, setIsTypeEditorOpen] = useState<boolean>(false);

    // Reset form state when model prop changes
    useEffect(() => {
        setFunctionModel(model);
    }, [model]);

    // TODO: Should come from BE
    const parameterDescriptionMap: Record<string, string> = {
        "rabbitmq-caller": "Enable this to manually acknowledge or reject received messages in your RabbitMQ service.",
        "kafka-caller": "Enable this to access the Kafka caller in your service for manual offset management and partition operations.",
    };

    /**
     * Gets the description of a parameter by its name and module
     * @param parameterName - The name of the parameter to find
     * @returns The parameter description or empty string if not found
     */
    const getParameterDescription = (parameterName: string): string => {
        const moduleName = functionModel?.codedata?.moduleName || "";
        const key = `${moduleName}-${parameterName}`.toLowerCase();
        return parameterDescriptionMap[key] || "";
    };

    /**
     * Gets the queue name description string based on module name
     * @param moduleName - The module name (e.g., "rabbitmq", "kafka")
     * @returns Description string about where the payload comes from
     */
    const getQueueDescriptionByModule = (moduleName: string): string => {
        if (!moduleName) {
            return "";
        }
        const lowerModuleName = moduleName.toLowerCase();
        if (lowerModuleName === "rabbitmq") {
            return serviceProperties.stringLiteral?.value;
        }
        const metaValue = serviceProperties?.readOnlyMetadata?.value;
        if (metaValue && typeof metaValue === "object") {
            for (const [key, val] of Object.entries(metaValue as Record<string, any>)) {
                const valueStr = String(val).toLowerCase();
                if (valueStr.length > 0) {
                    return valueStr;
                }
            }
        }
        return "";
    };

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
            // Create a new array to avoid mutating the original
            const updatedParams = functionModel.parameters.map((p) => {
                if (p.kind === "DATA_BINDING") {
                    return { ...p, enabled: false };
                }
                if (p.kind === "REQUIRED" && !isInNewParams) {
                    return { ...p, enabled: true };
                }
                return p;
            });

            handleParamChange(updatedParams);
        } else {
            // Normal parameter change
            handleParamChange(params);
        }
    };

    const handleSave = () => {
        // For new handlers, always open diagram after save
        onSave(functionModel, isNew);
    };

    const handleCancel = () => {
        onClose();
    };

    const handleShowAdvancedParameters = () => {
        setShowAdvancedParameters(true);
    };

    const handleHideAdvancedParameters = () => {
        setShowAdvancedParameters(false);
    };

    const handleShowMessageTypeConfig = () => {
        setShowMessageTypeConfig(true);
    };

    const handleHideMessageTypeConfig = () => {
        setShowMessageTypeConfig(false);
    };

    const handleMessageTypeNameChange = (value: string) => {
        const updatedFunctionModel = {
            ...functionModel,
            properties: {
                ...functionModel.properties,
                wrapperTypeName: {
                    ...functionModel.properties?.wrapperTypeName,
                    value,
                },
            },
        };
        setFunctionModel(updatedFunctionModel);
    };

    const generatePayloadTypeName = (): string => {
        const rawPayloadFieldName = functionModel.properties?.payloadFieldName?.value || "Payload";
        const capitalizedName = rawPayloadFieldName.charAt(0).toUpperCase() + rawPayloadFieldName.slice(1);
        return `${capitalizedName}Schema`;
    };

    const handleTypeCreated = (type: Type | string) => {
        // When a type is created, set it as the payload type
        const payloadParam = functionModel.parameters?.find(param => param.kind === "DATA_BINDING");
        if (payloadParam) {
            const updatedPayloadModel = { ...payloadParam };
            updatedPayloadModel.name.value = "payload";
            updatedPayloadModel.type.value = typeof type === 'string' ? type : (type as Type).name;
            updatedPayloadModel.enabled = true;

            // Find the index of the payload parameter
            const index = functionModel.parameters.findIndex(param => param.kind === "DATA_BINDING");
            if (index >= 0) {
                const updatedParameters = [...functionModel.parameters];
                updatedParameters[index] = updatedPayloadModel;
                handleParamChange(updatedParameters);
            }
        }
        // Close the modal
        setIsTypeEditorOpen(false);
    };

    const handleTypeEditorClose = () => {
        setIsTypeEditorOpen(false);
    };

    // Payload editor handlers
    const onAddPayloadClick = () => {
        // Open FormTypeEditor modal instead of ParamEditor
        setIsTypeEditorOpen(true);
    };

    const onEditPayloadClick = (param: ParameterModel) => {
        // Find the index of the parameter being edited
        const index = functionModel.parameters.findIndex(
            p => p.metadata.label === param.metadata.label && p.name.value === param.name.value
        );
        setEditingIndex(index);
        setEditModel(param);
    };

    const onChangeParam = (param: ParameterModel) => {
        setEditModel(param);
        // Update the parameters array in real-time for existing parameters
        if (editingIndex >= 0) {
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
        setEditModel(undefined);
        setEditingIndex(-1);
    };

    const onParamEditCancel = () => {
        setEditModel(undefined);
        setEditingIndex(-1);
    };

    const payloadParameter = functionModel.parameters?.find((param) => param.kind === "DATA_BINDING" && param.enabled);

    const advancedParameters = functionModel.parameters?.filter((param) => param.kind !== "DATA_BINDING" && param.optional) || [];

    // Get payload field name from properties, default to "Payload", and capitalize it
    const rawPayloadFieldName = functionModel.properties?.payloadFieldName?.value || "Payload";
    const payloadFieldName = rawPayloadFieldName.charAt(0).toUpperCase() + rawPayloadFieldName.slice(1);

    // Get message type name value from properties
    const messageTypeNameValue = functionModel.properties?.wrapperTypeName?.value || "";

    return (
        <>
            {(isLoading || isSaving) && <ProgressIndicator id="remote-loading-bar" />}
            <SidePanelBody>
                <EditorContentColumn>
                    {/* Message Configuration Section */}
                    <MessageConfigContainer>
                        <MessageConfigTitle>
                            <Typography sx={{ marginBlockEnd: 0 }} variant="h4">
                                Message Configuration
                            </Typography>
                            <Divider />
                        </MessageConfigTitle>
                        <MessageConfigSection>
                            <MessageConfigContent>
                                <PayloadSection>
                                    {/* Payload Section */}
                                    {!payloadParameter && !editModel && (
                                        <AddButtonWrapper>
                                            <Tooltip content={`Define ${payloadFieldName} for easier access in the flow diagram`} position="bottom">
                                                <LinkButton onClick={onAddPayloadClick}>
                                                    <Codicon name="add" />
                                                    Define {payloadFieldName}
                                                </LinkButton>
                                            </Tooltip>
                                        </AddButtonWrapper>
                                    )}
                                    {payloadParameter && (
                                        <>
                                            <Typography sx={{ marginBlockEnd: 8 }} variant="body2">
                                                {payloadFieldName}
                                            </Typography>
                                            <Parameters
                                                parameters={[payloadParameter]}
                                                onChange={handlePayloadParamChange}
                                                onEditClick={onEditPayloadClick}
                                                showPayload={true}
                                            />
                                        </>
                                    )}

                                    {/* Payload Editor */}
                                    {editModel && editModel.kind === "DATA_BINDING" && (
                                        <ParamEditor
                                            param={editModel}
                                            onChange={onChangeParam}
                                            onSave={onSaveParam}
                                            onCancel={onParamEditCancel}
                                            payloadFieldName={payloadFieldName}
                                        />
                                    )}
                                </PayloadSection>

                                {/* Advanced Message Configurations Collapsible Section */}
                                {/* <OptionalConfigRow>
                                    <span>Advanced Message Configurations</span>
                                    <OptionalConfigButtonContainer>
                                        {!showMessageTypeConfig && (
                                            <LinkButton
                                                onClick={handleShowMessageTypeConfig}
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
                                        {showMessageTypeConfig && (
                                            <LinkButton
                                                onClick={handleHideMessageTypeConfig}
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
                                {showMessageTypeConfig && (
                                    <OptionalConfigContent>
                                        <MessageTypeNameFieldContainer>
                                            <TextField
                                                label="Message Schema Name"
                                                value={messageTypeNameValue}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleMessageTypeNameChange(e.target.value)}
                                                placeholder="Enter message schema name"
                                                errorMsg=""
                                            />
                                        </MessageTypeNameFieldContainer>
                                    </OptionalConfigContent>
                                )} */}
                            </MessageConfigContent>
                        </MessageConfigSection>
                    </MessageConfigContainer>


                    {/* Advanced Parameters Section - Only show if there are additional parameters beyond the first */}
                    {hasEditableParameters(advancedParameters) && (
                        <>
                            <Divider sx={{ margin: 0 }} />
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
                                                    // Create a new array with updated parameters to avoid mutating parent state
                                                    const updatedParameters = functionModel.parameters.map((p) => {
                                                        if (p.metadata.label === param.metadata.label && p.name.value === param.name.value) {
                                                            return {
                                                                ...p,
                                                                enabled: checked,
                                                                name: {
                                                                    ...p.name,
                                                                    value: param.metadata.label
                                                                        .toLowerCase()
                                                                        .replace(/ /g, "_")
                                                                }
                                                            };
                                                        }
                                                        return p;
                                                    });
                                                    handleParamChange(updatedParameters);
                                                }}
                                                sx={{ description: getParameterDescription(param.name.value), marginTop: 0 }}
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
                        onClick: handleCancel,
                        tooltip: "Cancel",
                        disabled: isSaving,
                    }}
                    sx={{ justifyContent: "flex-end" }}
                />
            </SidePanelBody>

            {/* FormTypeEditor Modal for Add Payload */}
            <EntryPointTypeCreator
                isOpen={isTypeEditorOpen}
                onClose={handleTypeEditorClose}
                onTypeCreate={handleTypeCreated}
                initialTypeName={generatePayloadTypeName()}
                modalTitle={"Define " + payloadFieldName}
                payloadContext={{
                    ...payloadContext,
                    queueOrTopic: getQueueDescriptionByModule(serviceModuleName)
                }}
                modalWidth={650}
                modalHeight={600}
            />
        </>
    );
}
