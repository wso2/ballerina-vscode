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

import { useEffect, useMemo, useState } from 'react';
import { ActionButtons, Divider, SidePanelBody, ProgressIndicator, Tooltip, CheckBoxGroup, CheckBox, Codicon, LinkButton, Dropdown, Typography, RadioButtonGroup, HeaderExpressionEditor } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { FunctionModel, ParameterModel, GeneralPayloadContext, Type, ServiceModel, Protocol, Imports, PropertyModel } from '@wso2/ballerina-core';
import { EntryPointTypeCreator } from '../../../../../components/EntryPointTypeCreator';
import { Parameters } from './Parameters/Parameters';

const FileConfigContainer = styled.div`
    margin-bottom: 0;
`;

const FileConfigSection = styled.div`
    padding: 0;
`;

const FileConfigContent = styled.div`
    margin-top: 12px;
    padding-left: 0;
`;

const AddButtonWrapper = styled.div`
    margin: 8px 0;
`;

const PostProcessSection = styled.div`
    margin: 0;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    padding: 8px 0;
`;

const SectionContent = styled.div`
    padding-left: 8px;
    margin-top: 8px;
`;

const PostProcessContent = styled(SectionContent)`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const PostProcessChoiceContainer = styled.div`
    margin-top: 4px;
    margin-left: 16px;
`;

const NestedFields = styled.div`
    margin-left: 24px;
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const AdvancedConfigsHeader = styled(SectionHeader)`
    cursor: pointer;
    user-select: none;
    &:hover {
        opacity: 0.8;
    }
`;

const AdvancedConfigsContent = styled(SectionContent)<{ isExpanded: boolean }>`
    display: ${({ isExpanded }: { isExpanded: boolean }) => (isExpanded ? 'block' : 'none')};
`;

const InfoBanner = styled.div`
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    border-left: 3px solid var(--vscode-focusBorder);
    background: var(--vscode-inputValidation-infoBackground);
    border-radius: 4px;
    align-items: flex-start;
`;

const POST_PROCESS_RADIO_GROUP_SX = {
    "& vscode-radio-group": {
        display: "flex",
        flexDirection: "column",
        gap: "2px"
    },
    "& vscode-radio": {
        margin: 0
    }
};
/**
 * Converts a PascalCase or camelCase type name to a camelCase parameter name.
 * For CSV format, pluralizes the name since it represents an array of rows.
 */
const typeNameToParamName = (typeName: string, pluralize: boolean = false): string => {
    if (!typeName) return "content";

    let baseName = typeName.trim();
    if (!baseName) return "content";

    // Remove module qualifier and array suffix
    if (baseName.includes(":")) {
        baseName = baseName.split(":").pop() || baseName;
    }
    if (baseName.endsWith("[]")) {
        baseName = baseName.slice(0, -2);
    }
    // Remove non-identifier characters
    baseName = baseName.replace(/[^A-Za-z0-9_]/g, "");
    if (!baseName || /^\d/.test(baseName)) return "content";

    // Convert to camelCase (lowercase first letter)
    const camelCase = baseName.charAt(0).toLowerCase() + baseName.slice(1);

    if (!pluralize) return camelCase;

    // Simple pluralization rules
    const lastChar = camelCase.slice(-1);
    const lastTwoChars = camelCase.slice(-2);

    if (lastTwoChars === 'ss' || lastTwoChars === 'sh' || lastTwoChars === 'ch' || lastChar === 'x' || lastChar === 'z') {
        return camelCase + 'es';
    }
    if (lastChar === 'y' && !['a', 'e', 'i', 'o', 'u'].includes(camelCase.slice(-2, -1))) {
        return camelCase.slice(0, -1) + 'ies';
    }
    if (lastChar === 's') {
        return camelCase;
    }
    return camelCase + 's';
};
export const EditorContentColumn = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding-bottom: 20px;
    gap: 10px;
`;

export interface FTPFormProps {
    functionModel?: FunctionModel;
    model: ServiceModel;
    isSaving: boolean;
    onSave: (functionModel: FunctionModel, openDiagram?: boolean) => void;
    onClose: () => void;
    isNew?: boolean;
    filePath?: string;
    selectedHandler?: string;
}

export function FTPForm(props: FTPFormProps) {
    const { model, isSaving, onSave, onClose, isNew, selectedHandler } = props;

    const [serviceModel, setServiceModel] = useState<ServiceModel>(model);
    const [functionModel, setFunctionModel] = useState<FunctionModel | null>(props.functionModel || null);
    const [selectedFileFormat, setSelectedFileFormat] = useState<string>('');

    const payloadContext = {
        protocol: Protocol.FTP,
        filterType: functionModel?.name.metadata.label || "JSON",
    } as GeneralPayloadContext;

    // State for type editor modal
    const [isTypeEditorOpen, setIsTypeEditorOpen] = useState<boolean>(false);

    // Filter non-enabled functions for dropdown options based on selected handler
    const nonEnabledFunctions = useMemo(() => {
        return serviceModel.functions?.filter(fn => {
            if (!fn.enabled && selectedHandler && fn.metadata?.label === selectedHandler) {
                return true;
            }
            // If no selectedHandler is provided, default to onCreate for backward compatibility
            if (!fn.enabled && !selectedHandler && fn.metadata?.label === "onCreate") {
                return true;
            }
            return false;
        }) || [];
    }, [serviceModel.functions, selectedHandler]);

    useEffect(() => {
        setServiceModel(model);
    }, [model]);

    // Initialize add-handler state from currently available FTP handler templates.
    useEffect(() => {
        if (!isNew || nonEnabledFunctions.length === 0) {
            return;
        }
        const initialFunction = nonEnabledFunctions[0];
        setFunctionModel(initialFunction);
        setSelectedFileFormat(initialFunction.name?.metadata?.label || '');
    }, [isNew, nonEnabledFunctions]);

    // Initialize edit state from the selected function model only.
    useEffect(() => {
        if (isNew) {
            return;
        }
        setFunctionModel(props.functionModel || null);
        setSelectedFileFormat(props.functionModel?.name?.metadata?.label || '');
    }, [isNew, props.functionModel]);

    const handleParamChange = (params: ParameterModel[]) => {
        if (functionModel) {
            const updatedFunctionModel = {
                ...functionModel,
                parameters: params,
            };
            setFunctionModel(updatedFunctionModel);
        }
    };

    const handleSave = () => {
        // For new handlers, always open diagram after save
        if (functionModel) {
            onSave(functionModel, isNew);
        }
    };

    const handleCancel = () => {
        onClose();
    };


    const handleFileFormatChange = (value: string) => {
        // Find the function from non-enabled functions where function.name.metadata.label matches the selected format
        const selectedFunction = nonEnabledFunctions.find(fn => fn.name?.metadata?.label === value);

        if (selectedFunction) {
            setFunctionModel(selectedFunction);
            setSelectedFileFormat(value);
        }
    };

    const onAddContentSchemaClick = () => {
        // Open EntryPointTypeCreator modal
        setIsTypeEditorOpen(true);
    };

    const selectType = (typeValue: string, isStreamEnabled: boolean): string =>{
        if (!typeValue) {
            return "";
        }

        if(!hasStreamProperty){
            return typeValue;
        }
        // Extract the base type by removing all wrappers
        let baseType = typeValue;

        if ( selectedFileFormat === 'RAW'){
            if (isStreamEnabled){
                return `stream<byte[], error?>`;
            } else {
                return `byte[]`;
            }
        }

        // Remove array suffix if present
        if (baseType.endsWith("[]") && baseType!== "string[]") {
            baseType = baseType.slice(0, -2);
        }
        else if (baseType.startsWith("stream<")) {
            if (baseType.endsWith(", error?>")) {
                baseType = baseType.slice(7, -9);
            } else if (baseType.endsWith(", error>")) {
                baseType = baseType.slice(7, -8);
            } else if (baseType.endsWith(">")) {
                baseType = baseType.slice(7, -1);
            }
        }

        // Apply the correct wrapper based on stream state
        if (isStreamEnabled) {
            return `stream<${baseType}, error?>`;
        } else {
            return `${baseType}[]`;
        }
    }

    const withoutStreamType = (typeValue: string): string => {

        if (!typeValue) {
            return "";
        }
        if (!hasStreamProperty) {
            return typeValue;
        }

        let baseType = typeValue;
        
        if (baseType.endsWith("[]") && baseType!== "string[]") {
            baseType = baseType.slice(0, -2);
        }
        else if (baseType.startsWith("stream<")) {
            if (baseType.endsWith(", error?>")) {
                baseType = baseType.slice(7, -9);
            } else if (baseType.endsWith(", error>")) {
                baseType = baseType.slice(7, -8);
            } else if (baseType.endsWith(">")) {
                baseType = baseType.slice(7, -1);
            }
        }

        return baseType;
    }

    const handleTypeCreated = (type: Type | string, imports?: Imports) => {
        // When a type is created, set it as the payload type for the DATA_BINDING parameter
        const payloadParam = functionModel.parameters?.find(param => param.kind === "DATA_BINDING");
        if (payloadParam) {
            const typeValue = typeof type === 'string' ? type : type.name;

            // Derive param name from type name (pluralize for CSV since it's an array of rows)
            const shouldPluralize = selectedFileFormat === 'CSV';
            const paramName = typeNameToParamName(typeValue, shouldPluralize);

            // Update all parameters in one pass
            const updatedParameters = functionModel.parameters.map(param => {
                // Enable DATA_BINDING parameter with new type
                if (param.kind === "DATA_BINDING") {
                    const updatedType = {
                        ...param.type,
                        value: selectType(typeValue, functionModel.properties.stream?.enabled)
                    };
                    if (imports) {
                        updatedType.imports = imports;
                    }
                    return {
                        ...param,
                        name: { ...param.name, value: paramName },
                        type: updatedType,
                        enabled: true
                    };
                }
                // Disable default REQUIRED content parameter
                if (param.kind === "REQUIRED" && param.name.value === "content") {
                    return { ...param, enabled: false };
                }
                return param;
            });

            setFunctionModel({
                ...functionModel,
                parameters: updatedParameters
            });
        }

        // Close the modal
        setIsTypeEditorOpen(false);
    };

    const handleTypeEditorClose = () => {
        setIsTypeEditorOpen(false);
    };

    const handleDeleteContentSchema = () => {
        // Disable the DATA_BINDING parameter and reset to placeholder
        const updatedParameters = functionModel.parameters.map((p) => {
            if (p.kind === "DATA_BINDING") {
                // If stream property exists and is enabled, use selectType to apply proper wrapper
                const resetValue = hasStreamProperty && functionModel.properties.stream.enabled
                    ? selectType(p.type.placeholder, functionModel.properties.stream.enabled)
                    : p.type.placeholder;

                return {
                    ...p,
                    type: {
                        ...p.type,
                        value: resetValue
                    },
                    enabled: true
                };
            }
            return p;
        });

        // Update canDataBind property to disabled
        const updatedFunctionModel = {
            ...functionModel,
            parameters: updatedParameters
        };
        setFunctionModel(updatedFunctionModel);
    };


    // Define parameter configuration from frontend
    const parameterConfig = {
        stream: {
            label: "Stream (Large Files)",
            description: "Process the file content in chunks",
            parameterName: "stream"
        },
        fileInfo: {
            label: "File Metadata (fileInfo)",
            description: "Additional file properties",
            parameterName: "fileInfo"
        },
        caller: {
            label: "FTP Connection (caller)",
            description: "FTP connection for further actions if needed",
            parameterName: "caller"
        }
    };

    const fileInfoParameter = functionModel?.parameters?.find((param) =>
        param.name.value === parameterConfig.fileInfo.parameterName ||
        param.metadata.label === parameterConfig.fileInfo.label ||
        param.metadata.label === "fileInfo"
    );
    const callerParameter = functionModel?.parameters?.find((param) =>
        param.name.value === parameterConfig.caller.parameterName ||
        param.metadata.label === parameterConfig.caller.label ||
        param.metadata.label === "caller"
    );
    const contentParameter = functionModel?.parameters?.find((param) => param.kind === "DATA_BINDING" );
    const payloadFieldName = "Content Schema";

    const dataBindingParam = functionModel?.parameters?.find((param) =>
        param.kind === "DATA_BINDING"
    );
    // Check if properties exist for conditional rendering
    const hasStreamProperty = functionModel?.properties?.stream !== undefined;
    const isOnCreateHandler = selectedHandler === 'onCreate' || functionModel?.metadata?.label === 'onCreate';
    const isOnErrorHandler = selectedHandler === 'onError' || functionModel?.metadata?.label === 'onError';
    const showOnErrorInfo = !!isNew && isOnErrorHandler;

    // Post-processing action handling - nested structure under postProcessAction
    const postProcessAction = functionModel?.properties?.postProcessAction as PropertyModel | undefined;
    const postProcessActionOnSuccess = postProcessAction?.properties?.onSuccess as PropertyModel | undefined;
    const postProcessActionOnError = postProcessAction?.properties?.onError as PropertyModel | undefined;

    // Check if we have the two-action format
    const hasSuccessAction = postProcessActionOnSuccess !== undefined && postProcessActionOnSuccess.choices !== undefined;
    const hasErrorAction = postProcessActionOnError !== undefined && postProcessActionOnError.choices !== undefined;

    const shouldShowAdvancedConfigsDivider = isOnCreateHandler || hasSuccessAction || hasErrorAction;

    // State for Advanced Configs section
    const [isAdvancedConfigsExpanded, setIsAdvancedConfigsExpanded] = useState<boolean>(false);

    const getSelectedActionValue = (action: PropertyModel | undefined): string => {
        if (!action?.choices || action.choices.length === 0) {
            return '';
        }
        const enabledChoice = action.choices.find((choice: PropertyModel) => choice.enabled);
        if (enabledChoice?.value) {
            return enabledChoice.value;
        }
        const moveChoice = action.choices.find((choice: PropertyModel) => choice.value === 'MOVE');
        return (moveChoice?.value || action.choices[0]?.value || '');
    };

    const getSelectedChoice = (action: PropertyModel | undefined, selectedValue?: string): PropertyModel | undefined => {
        if (!action?.choices || action.choices.length === 0) {
            return undefined;
        }
        const enabledChoice = action.choices.find((choice: PropertyModel) => choice.enabled);
        if (enabledChoice) {
            return enabledChoice;
        }
        if (selectedValue) {
            const selectedChoice = action.choices.find((choice: PropertyModel) => choice.value === selectedValue);
            if (selectedChoice) {
                return selectedChoice;
            }
        }
        return action.choices.find((choice: PropertyModel) => choice.value === 'MOVE') || action.choices[0];
    };

    const isMoveToRequiredAndEmpty = (action: PropertyModel | undefined, selectedValue?: string): boolean => {
        if (!action?.choices) {
            return false;
        }
        const isActionEnabled = action.enabled ?? true;
        if (!isActionEnabled) {
            return false;
        }
        const selectedChoice = getSelectedChoice(action, selectedValue);
        if (!selectedChoice || selectedChoice.value !== 'MOVE') {
            return false;
        }
        const moveToValue = selectedChoice.properties?.moveTo?.value || "";
        const trimmedMoveTo = moveToValue.trim();
        return !trimmedMoveTo || trimmedMoveTo === '""' || trimmedMoveTo === "''";
    };

    const selectedSuccessAction = getSelectedActionValue(postProcessActionOnSuccess);
    const selectedErrorAction = getSelectedActionValue(postProcessActionOnError);
    const hasInvalidMoveTo =
        isMoveToRequiredAndEmpty(postProcessActionOnSuccess, selectedSuccessAction) ||
        isMoveToRequiredAndEmpty(postProcessActionOnError, selectedErrorAction);

    // Generic handler for post-process action change (nested under postProcessAction)
    const handleActionChange = (propertyKey: string, action: PropertyModel | undefined, value: string) => {
        if (!functionModel || !action?.choices || !postProcessAction) return;

        const updatedChoices = action.choices.map((choice: PropertyModel) => ({
            ...choice,
            enabled: choice.value === value
        }));

        setFunctionModel({
            ...functionModel,
            properties: {
                ...functionModel.properties,
                postProcessAction: {
                    ...postProcessAction,
                    properties: {
                        ...postProcessAction.properties,
                        [propertyKey]: {
                            ...action,
                            enabled: true,
                            choices: updatedChoices
                        }
                    }
                }
            }
        });
    };

    const handleActionToggle = (
        propertyKey: string,
        action: PropertyModel | undefined,
        checked: boolean,
        selectedValue?: string
    ) => {
        if (!functionModel || !action?.choices || !postProcessAction) return;

        let updatedChoices = action.choices;
        if (checked) {
            const selectedIndex = selectedValue
                ? action.choices.findIndex((choice: PropertyModel) => choice.value === selectedValue)
                : -1;
            const moveIndex = action.choices.findIndex((choice: PropertyModel) => choice.value === 'MOVE');
            const existingEnabledIndex = action.choices.findIndex((choice: PropertyModel) => choice.enabled);
            const indexToEnable = existingEnabledIndex !== -1
                ? existingEnabledIndex
                : (selectedIndex >= 0 && selectedIndex < action.choices.length)
                    ? selectedIndex
                    : (moveIndex !== -1 ? moveIndex : 0);

            updatedChoices = action.choices.map((choice: PropertyModel, index: number) => ({
                ...choice,
                enabled: index === indexToEnable
            }));
        }

        setFunctionModel({
            ...functionModel,
            properties: {
                ...functionModel.properties,
                postProcessAction: {
                    ...postProcessAction,
                    properties: {
                        ...postProcessAction.properties,
                        [propertyKey]: {
                            ...action,
                            enabled: checked,
                            choices: updatedChoices
                        }
                    }
                }
            }
        });
    };

    // Generic handler for Move To change (nested under postProcessAction)
    const handleMoveToChangeGeneric = (propertyKey: string, action: PropertyModel | undefined, value: string) => {
        if (!functionModel || !action?.choices || !postProcessAction) return;

        const moveChoiceIndex = action.choices.findIndex((choice: PropertyModel) => choice.value === 'MOVE');
        if (moveChoiceIndex === -1) return;

        const updatedChoices = [...action.choices];
        updatedChoices[moveChoiceIndex] = {
            ...updatedChoices[moveChoiceIndex],
            properties: {
                ...updatedChoices[moveChoiceIndex].properties,
                moveTo: {
                    ...updatedChoices[moveChoiceIndex].properties?.moveTo,
                    value: value
                }
            }
        };

        setFunctionModel({
            ...functionModel,
            properties: {
                ...functionModel.properties,
                postProcessAction: {
                    ...postProcessAction,
                    properties: {
                        ...postProcessAction.properties,
                        [propertyKey]: {
                            ...action,
                            choices: updatedChoices
                        }
                    }
                }
            }
        });
    };

    // Get the current MOVE choice properties for any action
    const getMoveChoicePropertiesGeneric = (action: PropertyModel | undefined) => {
        if (!action?.choices) return { moveTo: "" };
        const moveChoice = action.choices.find((choice: PropertyModel) => choice.value === 'MOVE');
        if (!moveChoice?.properties) return { moveTo: "" };

        const moveToValue = moveChoice.properties.moveTo?.value || "";

        return {
            moveTo: moveToValue
        };
    };

    // Render a post-processing action section
    const renderPostProcessActionSection = (
        subtitle: string,
        propertyKey: string,
        action: PropertyModel | undefined,
        selectedValue: string
    ) => {
        if (!action?.choices) return null;

        const isActionEnabled = action.enabled ?? true;
        const moveProperties = getMoveChoicePropertiesGeneric(action);
        const trimmedMoveTo = moveProperties.moveTo?.trim();
        const isMoveToEmpty = !trimmedMoveTo || trimmedMoveTo === '""' || trimmedMoveTo === "''";

        return (
            <PostProcessSection>
                <CheckBoxGroup direction="vertical">
                    <CheckBox
                        label={subtitle}
                        checked={isActionEnabled}
                        onChange={(checked) => handleActionToggle(propertyKey, action, checked, selectedValue)}
                        sx={{
                            marginTop: 0,
                            description: action.metadata?.description || ''
                        }}
                    />
                </CheckBoxGroup>
                {isActionEnabled && (
                    <PostProcessChoiceContainer>
                        <RadioButtonGroup
                            id={`post-process-action-${propertyKey}`}
                            label=""
                            value={selectedValue}
                            sx={POST_PROCESS_RADIO_GROUP_SX}
                            options={action.choices?.map((choice: PropertyModel, index: number) => ({
                                id: `${propertyKey}-${index}`,
                                value: choice.value,
                                content: choice.metadata?.label || choice.value
                            })) || []}
                            onChange={(e) => {
                                handleActionChange(propertyKey, action, e.target.value);
                            }}
                        />
                    </PostProcessChoiceContainer>
                )}

                {/* Show nested fields for MOVE action */}
                {isActionEnabled && selectedValue === 'MOVE' && (
                    <NestedFields>
                        <div>
                            <Typography variant="body3" sx={{ marginBottom: 4 }}>
                                Move To
                            </Typography>
                            <HeaderExpressionEditor
                                value={moveProperties.moveTo}
                                placeholder='"/path/to/dir"'
                                ariaLabel="Move To"
                                completions={[]}
                                onChange={(value) => handleMoveToChangeGeneric(propertyKey, action, value)}
                                onSave={() => {}}
                                onCancel={() => {}}
                            />
                            <Typography variant="body3" sx={{ marginTop: 4, color: 'var(--vscode-descriptionForeground)' }}>
                                Destination path expression to move the file
                            </Typography>
                            {isMoveToEmpty && (
                                <Typography variant="body3" sx={{ marginTop: 4, color: 'var(--vscode-errorForeground)' }}>
                                    Move To is required
                                </Typography>
                            )}
                        </div>
                    </NestedFields>
                )}
            </PostProcessSection>
        );
    };

    return (
        <>
            {isSaving && <ProgressIndicator id="ftp-form-loading-bar" />}
            <SidePanelBody>
                <EditorContentColumn>
                    {showOnErrorInfo && (
                        <InfoBanner>
                            <Codicon name="info" sx={{ marginTop: 2 }} />
                            <Typography variant="body3" sx={{ color: "var(--vscode-foreground)" }}>
                                On Error runs only for errors when file content cannot be mapped to the Content Schema.
                            </Typography>
                        </InfoBanner>
                    )}

                    {/* File Configuration Section - Only show for onCreate handler */}
                    {isOnCreateHandler && (
                        <FileConfigContainer>
                            <FileConfigSection>
                                <FileConfigContent>
                                    {/* File Format Dropdown */}
                                    <Dropdown
                                        id="ftp-file-format"
                                        label="File Format"
                                        items={isNew? nonEnabledFunctions.map(fn => ({
                                            value: fn.name?.metadata?.label || ''
                                        })): [selectedFileFormat].map(label => ({ value: label }))}
                                        value={selectedFileFormat}
                                        onValueChange={handleFileFormatChange}
                                        disabled={!isNew}
                                    />

                                    {/* Define Content Schema Button or Display - only show if canDataBind property exists */}
                                    {dataBindingParam && (
                                        (withoutStreamType(dataBindingParam.type?.value)===withoutStreamType(dataBindingParam.type?.placeholder)) ? (
                                            <AddButtonWrapper style={{ marginTop: '16px' }}>
                                                <Tooltip content={`Define ${payloadFieldName} for easier access in the flow diagram`} position="bottom">
                                                    <LinkButton onClick={onAddContentSchemaClick}>
                                                        <Codicon name="add" />
                                                        Define {payloadFieldName}
                                                    </LinkButton>
                                                </Tooltip>
                                            </AddButtonWrapper>
                                        ) : (
                                            <div style={{ marginTop: '16px' }}>
                                                <Typography variant="body2" sx={{ marginBottom: 8 }}>
                                                    Content Schema
                                                </Typography>
                                                <Parameters
                                                    parameters={[contentParameter]}
                                                    onChange={(params) => {
                                                        // If the parameter was deleted, disable it instead
                                                        if (params.length === 0) {
                                                            handleDeleteContentSchema();
                                                        } else {
                                                            handleParamChange(params);
                                                        }
                                                    }}
                                                    showPayload={true}
                                                    streamEnabled={hasStreamProperty ? functionModel.properties.stream.enabled : undefined}
                                                />
                                            </div>
                                        )
                                    )}

                                    {/* Stream Parameter Checkbox - only show if stream property exists */}
                                    {hasStreamProperty  && (
                                        <Tooltip content={parameterConfig.stream.description} position="right">
                                            <CheckBoxGroup direction="vertical">
                                                <CheckBox
                                                    label={parameterConfig.stream.label}
                                                    checked={functionModel.properties.stream.enabled}
                                                    onChange={(checked) => {
                                                        // Update the DATA_BINDING parameter type value when stream changes
                                                        const updatedParameters = functionModel.parameters.map((param) => {
                                                            if (param.kind === "DATA_BINDING" && param.enabled && param.type?.value) {
                                                                return {
                                                                    ...param,
                                                                    type: {
                                                                        ...param.type,
                                                                        value: selectType(param.type.value, checked)
                                                                    }
                                                                };
                                                            }
                                                            if (selectedFileFormat === 'RAW' && param.kind === "REQUIRED" && param.name.value === "content" && param.enabled && param.type?.value) {
                                                                return {
                                                                    ...param,
                                                                    type: {
                                                                        ...param.type,
                                                                        value: selectType(param.type.value, checked)
                                                                    }
                                                                };
                                                            }
                                                            return param;
                                                        });

                                                        setFunctionModel({
                                                            ...functionModel,
                                                            properties: {
                                                                ...functionModel.properties,
                                                                stream: {
                                                                    ...functionModel.properties.stream,
                                                                    enabled: checked,
                                                                },
                                                            },
                                                            parameters: updatedParameters
                                                        });

                                                    }}
                                                    sx={{ marginTop: 8 }}
                                                />
                                            </CheckBoxGroup>
                                        </Tooltip>
                                    )}
                                </FileConfigContent>
                            </FileConfigSection>
                        </FileConfigContainer>
                    )}
                    {/* Post-Processing Actions Section - Show two actions for all handlers */}
                    {(hasSuccessAction || hasErrorAction) && (
                        <>
                            {isOnCreateHandler && <Divider />}
                            <SectionHeader>
                                <Typography variant="body2">After File Processing</Typography>
                            </SectionHeader>
                            <PostProcessContent>
                                {hasSuccessAction && renderPostProcessActionSection(
                                    "Success",
                                    "onSuccess",
                                    postProcessActionOnSuccess,
                                    selectedSuccessAction
                                )}
                                {hasErrorAction && renderPostProcessActionSection(
                                    "Error",
                                    "onError",
                                    postProcessActionOnError,
                                    selectedErrorAction
                                )}
                            </PostProcessContent>
                        </>
                    )}

                    {/* Advanced Configs Section - Contains File Metadata and FTP Connection */}
                    {(fileInfoParameter || callerParameter) && (
                        <>
                            {shouldShowAdvancedConfigsDivider && <Divider />}
                            <AdvancedConfigsHeader onClick={() => setIsAdvancedConfigsExpanded(!isAdvancedConfigsExpanded)}>
                                <Codicon name={isAdvancedConfigsExpanded ? "chevron-down" : "chevron-right"} sx={{ marginRight: 4 }} />
                                <Typography variant="body2">Advanced Parameters</Typography>
                            </AdvancedConfigsHeader>
                            <AdvancedConfigsContent isExpanded={isAdvancedConfigsExpanded}>
                                {/* File Metadata Section */}
                                {fileInfoParameter && (
                                    <CheckBoxGroup direction="vertical">
                                        <CheckBox
                                            label={parameterConfig.fileInfo.label}
                                            checked={fileInfoParameter.enabled}
                                            onChange={(checked) => {
                                                const updatedParameters = functionModel.parameters.map((p) => {
                                                    if (p === fileInfoParameter) {
                                                        return { ...p, enabled: checked };
                                                    }
                                                    return p;
                                                });
                                                handleParamChange(updatedParameters);
                                            }}
                                            sx={{ marginTop: 0, description: parameterConfig.fileInfo.description}}
                                        />
                                    </CheckBoxGroup>
                                )}

                                {/* FTP Connection Section */}
                                {callerParameter && (
                                    <CheckBoxGroup direction="vertical">
                                        <CheckBox
                                            label={parameterConfig.caller.label}
                                            checked={callerParameter.enabled}
                                            onChange={(checked) => {
                                                const updatedParameters = functionModel.parameters.map((p) => {
                                                    if (p === callerParameter) {
                                                        return { ...p, enabled: checked };
                                                    }
                                                    return p;
                                                });
                                                handleParamChange(updatedParameters);
                                            }}
                                            sx={{ marginTop: 8, description: parameterConfig.caller.description }}
                                        />
                                    </CheckBoxGroup>
                                )}
                            </AdvancedConfigsContent>
                        </>
                    )}
                </EditorContentColumn>
                <ActionButtons
                    primaryButton={{
                        text: isSaving ? "Saving..." : "Save",
                        onClick: handleSave,
                        tooltip: isSaving ? "Saving..." : hasInvalidMoveTo ? "Move To is required" : "Save",
                        disabled: isSaving || hasInvalidMoveTo,
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

            {/* EntryPointTypeCreator Modal for Define Content Schema */}
            <EntryPointTypeCreator
                isOpen={isTypeEditorOpen}
                onClose={handleTypeEditorClose}
                onTypeCreate={handleTypeCreated}
                initialTypeName={"Content"}
                modalTitle={"Define Content Schema"}
                payloadContext={payloadContext}
                defaultTab="create-from-scratch"
                modalWidth={650}
                modalHeight={600}
                note={selectedFileFormat === 'CSV'
                    ? "Define schema for one row -- file content will be array of row schema."
                    : undefined}
            />
        </>
    );
}
