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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionButtons, Divider, SidePanelBody, ProgressIndicator, Tooltip, CheckBoxGroup, CheckBox, Codicon, LinkButton, Dropdown, Typography, RadioButtonGroup } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { Diagnostic, FunctionModel, ParameterModel, GeneralPayloadContext, Type, ServiceModel, Protocol, Imports, PropertyModel } from '@wso2/ballerina-core';
import { cloneDeep } from 'lodash';
import { EntryPointTypeCreator } from '../../../../../components/EntryPointTypeCreator';
import { Parameters } from './Parameters/Parameters';
import { TextExpressionField } from './TextExpressionField';

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
 * Pluralizes when the model signals pluralize:true (e.g. CSV row arrays).
 */
const typeNameToParamName = (typeName: string, pluralize: boolean = false): string => {
    if (!typeName) return "content";

    let baseName = typeName.trim();
    if (!baseName) return "content";

    if (baseName.includes(":")) {
        baseName = baseName.split(":").pop() || baseName;
    }
    if (baseName.endsWith("[]")) {
        baseName = baseName.slice(0, -2);
    }
    baseName = baseName.replace(/[^A-Za-z0-9_]/g, "");
    if (!baseName || /^\d/.test(baseName)) return "content";

    const camelCase = baseName.charAt(0).toLowerCase() + baseName.slice(1);

    if (!pluralize) return camelCase;

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

export interface FileIntegrationFormProps {
    functionModel?: FunctionModel;
    model: ServiceModel;
    isSaving: boolean;
    onSave: (functionModel: FunctionModel, openDiagram?: boolean) => void;
    onClose: () => void;
    isNew?: boolean;
    filePath?: string;
    selectedHandler?: string;
}

type MoveToValidationState = {
    isValidating: boolean;
};

export function FileIntegrationForm(props: FileIntegrationFormProps) {
    const { model, isSaving, onSave, onClose, isNew, selectedHandler } = props;

    const [serviceModel, setServiceModel] = useState<ServiceModel>(model);
    const [functionModel, setFunctionModel] = useState<FunctionModel | null>(props.functionModel || null);

    const payloadContext = {
        protocol: Protocol.FTP,
        filterType: functionModel?.name?.metadata?.label || "",
    } as GeneralPayloadContext;

    const [isTypeEditorOpen, setIsTypeEditorOpen] = useState<boolean>(false);

    // Derive the event-category label from model (e.g. "onCreate", "onError")
    const currentCategory = functionModel?.metadata?.label || selectedHandler;

    // Non-enabled functions in the same category — used to populate the file format dropdown
    const nonEnabledFunctions = useMemo(() => {
        if (!currentCategory) return [];
        return serviceModel.functions?.filter(fn =>
            !fn.enabled && fn.metadata?.label === currentCategory
        ) || [];
    }, [serviceModel.functions, currentCategory]);

    // Show file format group section when this category has multiple variants (e.g. onCreate has CSV/JSON/XML/TEXT/RAW)
    const hasFileFormatGroup = useMemo(() => {
        if (!currentCategory) return false;
        const categoryFunctions = serviceModel.functions?.filter(fn => fn.metadata?.label === currentCategory) || [];
        return categoryFunctions.length > 1;
    }, [currentCategory, serviceModel.functions]);

    // Info banner text comes from metadata.notice (shown in both add and edit modes)
    const infoBannerText = functionModel?.metadata?.notice;

    useEffect(() => {
        setServiceModel(model);
    }, [model]);

    // Initialize add-handler state from the first available variant in the category
    useEffect(() => {
        if (!isNew || nonEnabledFunctions.length === 0) {
            return;
        }
        const initialFunction = nonEnabledFunctions[0];
        setFunctionModel(cloneDeep(initialFunction));
    }, [isNew, nonEnabledFunctions]);

    // Initialize edit state from the passed function model
    useEffect(() => {
        if (isNew) {
            return;
        }
        setFunctionModel(props.functionModel ? cloneDeep(props.functionModel) : null);
    }, [isNew, props.functionModel]);

    const handleParamChange = (params: ParameterModel[]) => {
        if (functionModel) {
            setFunctionModel({ ...functionModel, parameters: params });
        }
    };

    const handleSave = () => {
        if (functionModel) {
            onSave(functionModel, isNew);
        }
    };

    const handleCancel = () => {
        onClose();
    };

    // File format is derived from the current functionModel's name label — no separate state needed
    const selectedFileFormat = functionModel?.name?.metadata?.label || '';

    const handleFileFormatChange = (value: string) => {
        const selectedFunction = nonEnabledFunctions.find(fn => fn.name?.metadata?.label === value);
        if (selectedFunction) {
            setFunctionModel(cloneDeep(selectedFunction));
        }
    };

    const onAddContentSchemaClick = () => {
        setIsTypeEditorOpen(true);
    };

    // ----- Stream / type-wrapping helpers -----

    const dataBindingParam = functionModel?.parameters?.find(p => p.kind === 'DATA_BINDING');

    // Stream property from the model (present only on functions that support it, editable:true = user can toggle)
    const streamProperty = functionModel?.properties?.stream;
    const isStreamEditable = streamProperty?.editable === true;
    const shouldShowStream = isStreamEditable || streamProperty?.enabled === true;

    // isArray property — present only on handlers where content is always array-typed (e.g. CSV)
    const isArrayProp = functionModel?.properties?.isArray;
    const isHandlerArray = isArrayProp?.enabled === true;

    // The first parameter is always the content parameter (DATA_BINDING or REQUIRED raw bytes)
    const contentIsDataBinding = functionModel?.parameters?.[0]?.kind === 'DATA_BINDING';

    const handleStreamChange = (checked: boolean) => {
        if (!isStreamEditable) return;
        const updatedParameters = functionModel.parameters.map(param => {
            if (param.kind === 'DATA_BINDING' && param.enabled && param.type?.value) {
                return { ...param, type: { ...param.type, value: selectType(param.type.value, checked) } };
            }
            if (!contentIsDataBinding && param.kind === 'REQUIRED' && param.name.value === 'content' && param.enabled && param.type?.value) {
                return { ...param, type: { ...param.type, value: selectType(param.type.value, checked) } };
            }
            return param;
        });
        setFunctionModel({
            ...functionModel,
            properties: { ...functionModel.properties, stream: { ...functionModel.properties.stream, enabled: checked } },
            parameters: updatedParameters
        });
    };

    /**
     * Wraps or unwraps a type value based on stream toggle state.
     * Branches on parameter kind (DATA_BINDING vs REQUIRED) rather than file format name.
     */
    const selectType = (typeValue: string, isStreamEnabled: boolean): string => {
        if (!typeValue) return "";
        if (!isStreamEditable) return typeValue;

        let baseType = typeValue;

        if (!contentIsDataBinding) {
            // REQUIRED content param (RAW bytes): toggle byte[] <-> stream<byte[], error?>
            return isStreamEnabled ? `stream<byte[], error?>` : `byte[]`;
        }

        // DATA_BINDING param: toggle T[] <-> stream<T, error?>
        if (baseType.endsWith("[]") && baseType !== "string[]") {
            baseType = baseType.slice(0, -2);
        } else if (baseType.startsWith("stream<")) {
            if (baseType.endsWith(", error?>")) {
                baseType = baseType.slice(7, -9);
            } else if (baseType.endsWith(", error>")) {
                baseType = baseType.slice(7, -8);
            } else if (baseType.endsWith(">")) {
                baseType = baseType.slice(7, -1);
            }
        }

        return isStreamEnabled ? `stream<${baseType}, error?>` : `${baseType}[]`;
    };

    const withoutStreamType = (typeValue: string): string => {
        if (!typeValue) return "";
        if (!isStreamEditable) return typeValue;

        let baseType = typeValue;

        if (!contentIsDataBinding) {
            // RAW: strip stream/array wrapper to get base byte type
            if (baseType === "stream<byte[], error?>") return "byte[]";
            return baseType;
        }

        if (baseType.endsWith("[]") && baseType !== "string[]") {
            baseType = baseType.slice(0, -2);
        } else if (baseType.startsWith("stream<")) {
            if (baseType.endsWith(", error?>")) {
                baseType = baseType.slice(7, -9);
            } else if (baseType.endsWith(", error>")) {
                baseType = baseType.slice(7, -8);
            } else if (baseType.endsWith(">")) {
                baseType = baseType.slice(7, -1);
            }
        }

        return baseType;
    };

    const handleTypeCreated = (type: Type | string, imports?: Imports) => {
        const payloadParam = functionModel.parameters?.find(p => p.kind === 'DATA_BINDING');
        if (payloadParam) {
            const typeValue = typeof type === 'string' ? type : type.name;
            const shouldPluralize = isHandlerArray;
            const paramName = typeNameToParamName(typeValue, shouldPluralize);

            const updatedParameters = functionModel.parameters.map(param => {
                if (param.kind === 'DATA_BINDING') {
                    const updatedType = {
                        ...param.type,
                        value: selectType(typeValue, functionModel.properties?.stream?.enabled)
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
                if (param.kind === 'REQUIRED' && param.name.value === 'content') {
                    return { ...param, enabled: false };
                }
                return param;
            });

            setFunctionModel({ ...functionModel, parameters: updatedParameters });
        }
        setIsTypeEditorOpen(false);
    };

    const handleTypeEditorClose = () => {
        setIsTypeEditorOpen(false);
    };

    const handleDeleteContentSchema = () => {
        const updatedParameters = functionModel.parameters.map(p => {
            if (p.kind === 'DATA_BINDING') {
                const resetValue = isStreamEditable && functionModel.properties?.stream?.enabled
                    ? selectType(p.type.placeholder, functionModel.properties.stream.enabled)
                    : p.type.placeholder;
                return { ...p, type: { ...p.type, value: resetValue }, enabled: true };
            }
            return p;
        });
        setFunctionModel({ ...functionModel, parameters: updatedParameters });
    };

    // ----- canDataBind / Content Schema -----

    const canDataBindProp = functionModel?.properties?.canDataBind;
    const isContentSchemaEditable = canDataBindProp?.editable === true;
    const contentSchemaLabel = canDataBindProp?.metadata?.label || 'Content Schema';

    const contentParameter = functionModel?.parameters?.find(p => p.kind === 'DATA_BINDING');

    // ----- Advanced parameters — fully driven by param.advanced flag -----

    const advancedParameters = functionModel?.parameters?.filter(p => p.advanced === true) || [];
    const [isAdvancedConfigsExpanded, setIsAdvancedConfigsExpanded] = useState<boolean>(false);

    // ----- Post-process actions — iterate model properties generically -----

    const postProcessAction = functionModel?.properties?.annotations?.properties?.postProcessAction as PropertyModel | undefined;
    const postProcessSubActions: [string, PropertyModel][] =
        Object.entries(postProcessAction?.properties || {}) as [string, PropertyModel][];
    const hasPostProcessActions = postProcessSubActions.length > 0;

    const shouldShowAdvancedConfigsDivider = hasFileFormatGroup || hasPostProcessActions;

    // ----- Validation state -----

    const [moveToDiagnosticsByAction, setMoveToDiagnosticsByAction] = useState<Record<string, Diagnostic[]>>({});
    const [moveToValidationStateByAction, setMoveToValidationStateByAction] = useState<Record<string, MoveToValidationState>>({});

    useEffect(() => {
        setMoveToDiagnosticsByAction({});
        setMoveToValidationStateByAction({});
    }, [functionModel?.name?.value]);

    const handleMoveToDiagnosticsChange = useCallback((key: string, diagnostics: Diagnostic[]) => {
        setMoveToDiagnosticsByAction(prev => ({ ...prev, [key]: diagnostics }));
    }, []);

    const hasMoveToErrorDiagnostics = useMemo(() => {
        return Object.values(moveToDiagnosticsByAction).some(diags => diags?.some(d => d.severity === 1));
    }, [moveToDiagnosticsByAction]);

    const handleMoveToValidationStateChange = useCallback((key: string, state: MoveToValidationState) => {
        setMoveToValidationStateByAction(prev => ({ ...prev, [key]: state }));
    }, []);

    const hasPendingMoveToValidation = useMemo(() => {
        return Object.values(moveToValidationStateByAction).some(s => s?.isValidating);
    }, [moveToValidationStateByAction]);

    // ----- Choice helpers — model-driven, no 'MOVE' string hardcoding -----

    const getSelectedActionValue = (action: PropertyModel | undefined): string => {
        if (!action?.choices || action.choices.length === 0) return '';
        const enabledChoice = action.choices.find((c: PropertyModel) => c.enabled);
        return enabledChoice?.value || action.choices[0]?.value || '';
    };

    const getActiveChoice = (action: PropertyModel | undefined): PropertyModel | undefined => {
        if (!action?.choices || action.choices.length === 0) return undefined;
        return action.choices.find((c: PropertyModel) => c.enabled) || action.choices[0];
    };

    /**
     * Returns true if the active choice for an action has a required nested property that is empty.
     */
    const isRequiredNestedPropertyEmpty = (action: PropertyModel | undefined): boolean => {
        if (!action?.choices) return false;
        const isActionEnabled = action.enabled ?? true;
        if (!isActionEnabled) return false;
        const activeChoice = getActiveChoice(action);
        if (!activeChoice?.properties) return false;
        return Object.values(activeChoice.properties).some((prop: any) => {
            if ((prop as PropertyModel).optional) return false;
            const val = ((prop as PropertyModel).value || "").trim();
            if (!val || val === '""' || val === "''") return true;
            const match = val.match(/^string\s*`([\s\S]*)`$/);
            return !!match && match[1].trim() === "";
        });
    };

    const hasInvalidMoveTo = useMemo(() => {
        return postProcessSubActions.some(([, action]) => isRequiredNestedPropertyEmpty(action));
    }, [postProcessSubActions]);

    const isSaveDisabled = hasInvalidMoveTo || hasMoveToErrorDiagnostics || hasPendingMoveToValidation;

    const saveTooltip = useMemo(() => {
        if (isSaving) return "Saving...";
        if (hasPendingMoveToValidation) return "Waiting for expression diagnostics...";
        if (isSaveDisabled) return "Fix validation errors";
        return "Save";
    }, [isSaveDisabled, isSaving, hasPendingMoveToValidation]);

    // ----- Post-process action handlers -----

    const handleActionChange = (subActionKey: string, _action: PropertyModel | undefined, value: string) => {
        setFunctionModel(prev => {
            if (!prev) return prev;
            const prevAnnotations = prev.properties?.annotations as PropertyModel | undefined;
            const prevPostProcess = prevAnnotations?.properties?.postProcessAction as PropertyModel | undefined;
            const prevSubAction = prevPostProcess?.properties?.[subActionKey] as PropertyModel | undefined;
            if (!prevAnnotations || !prevPostProcess || !prevSubAction?.choices) return prev;

            const updatedChoices = prevSubAction.choices.map((c: PropertyModel) => ({ ...c, enabled: c.value === value }));
            return {
                ...prev,
                properties: {
                    ...prev.properties,
                    annotations: {
                        ...prevAnnotations,
                        properties: {
                            ...prevAnnotations.properties,
                            postProcessAction: {
                                ...prevPostProcess,
                                properties: {
                                    ...prevPostProcess.properties,
                                    [subActionKey]: { ...prevSubAction, enabled: true, choices: updatedChoices }
                                }
                            }
                        }
                    }
                }
            };
        });
    };

    const handleActionToggle = (subActionKey: string, _action: PropertyModel | undefined, checked: boolean) => {
        setFunctionModel(prev => {
            if (!prev) return prev;
            const prevAnnotations = prev.properties?.annotations as PropertyModel | undefined;
            const prevPostProcess = prevAnnotations?.properties?.postProcessAction as PropertyModel | undefined;
            const prevSubAction = prevPostProcess?.properties?.[subActionKey] as PropertyModel | undefined;
            if (!prevAnnotations || !prevPostProcess || !prevSubAction?.choices) return prev;

            let updatedChoices = prevSubAction.choices;
            if (checked) {
                const existingEnabledIndex = prevSubAction.choices.findIndex((c: PropertyModel) => c.enabled);
                const indexToEnable = existingEnabledIndex !== -1 ? existingEnabledIndex : 0;
                updatedChoices = prevSubAction.choices.map((c: PropertyModel, i: number) => ({ ...c, enabled: i === indexToEnable }));
            }

            return {
                ...prev,
                properties: {
                    ...prev.properties,
                    annotations: {
                        ...prevAnnotations,
                        properties: {
                            ...prevAnnotations.properties,
                            postProcessAction: {
                                ...prevPostProcess,
                                properties: {
                                    ...prevPostProcess.properties,
                                    [subActionKey]: { ...prevSubAction, enabled: checked, choices: updatedChoices }
                                }
                            }
                        }
                    }
                }
            };
        });
    };

    const handleNestedPropertyChange = (subActionKey: string, propKey: string, value: string) => {
        setFunctionModel(prev => {
            if (!prev) return prev;
            const prevAnnotations = prev.properties?.annotations as PropertyModel | undefined;
            const prevPostProcess = prevAnnotations?.properties?.postProcessAction as PropertyModel | undefined;
            const prevSubAction = prevPostProcess?.properties?.[subActionKey] as PropertyModel | undefined;
            if (!prevAnnotations || !prevPostProcess || !prevSubAction?.choices) return prev;

            const activeChoiceIndex = prevSubAction.choices.findIndex((c: PropertyModel) => c.enabled);
            if (activeChoiceIndex === -1) return prev;

            const updatedChoices = [...prevSubAction.choices];
            const existingChoice = updatedChoices[activeChoiceIndex];
            if (!existingChoice) return prev;

            updatedChoices[activeChoiceIndex] = {
                ...existingChoice,
                properties: {
                    ...existingChoice.properties,
                    [propKey]: {
                        ...(existingChoice.properties?.[propKey] as PropertyModel),
                        value
                    }
                }
            };

            return {
                ...prev,
                properties: {
                    ...prev.properties,
                    annotations: {
                        ...prevAnnotations,
                        properties: {
                            ...prevAnnotations.properties,
                            postProcessAction: {
                                ...prevPostProcess,
                                properties: {
                                    ...prevPostProcess.properties,
                                    [subActionKey]: { ...prevSubAction, choices: updatedChoices }
                                }
                            }
                        }
                    }
                }
            };
        });
    };

    // ----- Render a post-process sub-action section -----

    const renderPostProcessActionSection = (
        subtitle: string,
        subActionKey: string,
        action: PropertyModel | undefined,
        selectedValue: string
    ) => {
        if (!action?.choices) return null;

        const isActionEnabled = action.enabled ?? true;
        const activeChoice = getActiveChoice(action);
        const nestedEntries = Object.entries(activeChoice?.properties || {}) as [string, PropertyModel][];

        return (
            <PostProcessSection key={subActionKey}>
                <CheckBoxGroup direction="vertical">
                    <CheckBox
                        label={subtitle}
                        checked={isActionEnabled}
                        onChange={(checked) => handleActionToggle(subActionKey, action, checked)}
                        sx={{ marginTop: 0, description: action.metadata?.description || '' }}
                    />
                </CheckBoxGroup>
                {isActionEnabled && (
                    <PostProcessChoiceContainer>
                        <RadioButtonGroup
                            id={`post-process-action-${subActionKey}`}
                            label=""
                            value={selectedValue}
                            sx={POST_PROCESS_RADIO_GROUP_SX}
                            options={action.choices.map((choice: PropertyModel, index: number) => ({
                                id: `${subActionKey}-${index}`,
                                value: choice.value,
                                content: choice.metadata?.label || choice.value
                            }))}
                            onChange={(e) => handleActionChange(subActionKey, action, e.target.value)}
                        />
                    </PostProcessChoiceContainer>
                )}

                {/* Render nested properties of the active choice generically */}
                {isActionEnabled && nestedEntries.length > 0 && (
                    <NestedFields>
                        {nestedEntries.map(([propKey, prop]) => {
                            const hasText = prop.types?.some(t => t.fieldType === 'TEXT');
                            const hasExpression = prop.types?.some(t => t.fieldType === 'EXPRESSION');
                            if (hasText && hasExpression) {
                                const stateKey = `${subActionKey}-${propKey}`;
                                return (
                                    <TextExpressionField
                                        key={stateKey}
                                        id={`ftp-${functionModel?.name?.value ?? 'handler'}-${stateKey}`}
                                        value={prop.value || ''}
                                        property={prop}
                                        filePath={props.filePath}
                                        targetLineRange={functionModel?.codedata?.lineRange}
                                        required={!prop.optional}
                                        disabled={isSaving}
                                        onChange={(value) => handleNestedPropertyChange(subActionKey, propKey, value)}
                                        onDiagnosticsChange={(diags) => handleMoveToDiagnosticsChange(stateKey, diags)}
                                        onValidationStateChange={(state) => handleMoveToValidationStateChange(stateKey, state)}
                                    />
                                );
                            }
                            return null;
                        })}
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
                    {/* Info banner — driven by metadata.notice on the function */}
                    {infoBannerText && (
                        <InfoBanner>
                            <Codicon name="info" sx={{ marginTop: 2 }} />
                            <Typography variant="body3" sx={{ color: "var(--vscode-foreground)" }}>
                                {infoBannerText}
                            </Typography>
                        </InfoBanner>
                    )}

                    {/* File Configuration Section — shown for multi-variant event categories (e.g. onCreate) */}
                    {hasFileFormatGroup && (
                        <FileConfigContainer>
                            <FileConfigSection>
                                <FileConfigContent>
                                    {/* File Format Dropdown */}
                                    <Dropdown
                                        id="ftp-file-format"
                                        label="File Format"
                                        items={isNew
                                            ? nonEnabledFunctions.map(fn => ({ value: fn.name?.metadata?.label || '' }))
                                            : [{ value: selectedFileFormat }]}
                                        value={selectedFileFormat}
                                        onValueChange={handleFileFormatChange}
                                        disabled={!isNew}
                                    />

                                    {/* Array indicator — shown when the handler always produces array-typed content (e.g. CSV) */}
                                    {isHandlerArray && (
                                        <div style={{ marginTop: 12 }}>
                                            <CheckBoxGroup direction="vertical">
                                                <CheckBox
                                                    label={isArrayProp?.metadata?.label ?? 'Rows'}
                                                    checked={true}
                                                    disabled={true}
                                                    onChange={() => {}}
                                                    sx={{ description: isArrayProp?.metadata?.description ?? 'Each record represents a row in the CSV file' }}
                                                />
                                            </CheckBoxGroup>
                                        </div>
                                    )}

                                    {/* Stream toggle — shown when stream is editable or currently enabled */}
                                    {shouldShowStream && (
                                        <div style={{ marginTop: 12 }}>
                                            <CheckBoxGroup direction="vertical">
                                                <CheckBox
                                                    label={streamProperty?.metadata?.label}
                                                    checked={functionModel.properties.stream.enabled}
                                                    disabled={!isStreamEditable}
                                                    onChange={handleStreamChange}
                                                    sx={{ description: streamProperty?.metadata?.description || '' }}
                                                />
                                            </CheckBoxGroup>
                                        </div>
                                    )}

                                    {/* Content Schema — shown when the function has a DATA_BINDING param and canDataBind.editable */}
                                    {dataBindingParam && isContentSchemaEditable && (
                                        (withoutStreamType(dataBindingParam.type?.value) === withoutStreamType(dataBindingParam.type?.placeholder)) ? (
                                            <AddButtonWrapper style={{ marginTop: '16px' }}>
                                                <Tooltip content={`Define ${contentSchemaLabel} for easier access in the flow diagram`} position="bottom">
                                                    <LinkButton onClick={onAddContentSchemaClick}>
                                                        <Codicon name="add" />
                                                        Define {contentSchemaLabel}
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
                                                        if (params.length === 0) {
                                                            handleDeleteContentSchema();
                                                        } else {
                                                            handleParamChange(params);
                                                        }
                                                    }}
                                                    showPayload={true}
                                                    typeLabel={contentSchemaLabel}
                                                />
                                            </div>
                                        )
                                    )}
                                </FileConfigContent>
                            </FileConfigSection>
                        </FileConfigContainer>
                    )}

                    {/* After File Processing — model-driven iteration over postProcessAction.properties */}
                    {hasPostProcessActions && (
                        <>
                            {hasFileFormatGroup && <Divider />}
                            <SectionHeader>
                                <Typography variant="body2">{postProcessAction?.metadata?.label}</Typography>
                            </SectionHeader>
                            <PostProcessContent>
                                {postProcessSubActions.map(([key, action]) =>
                                    renderPostProcessActionSection(
                                        action.metadata?.label,
                                        key,
                                        action,
                                        getSelectedActionValue(action)
                                    )
                                )}
                            </PostProcessContent>
                        </>
                    )}

                    {/* Advanced Parameters — all params with advanced:true rendered as toggleable checkboxes */}
                    {advancedParameters.length > 0 && (
                        <>
                            {shouldShowAdvancedConfigsDivider && <Divider />}
                            <AdvancedConfigsHeader onClick={() => setIsAdvancedConfigsExpanded(!isAdvancedConfigsExpanded)}>
                                <Codicon name={isAdvancedConfigsExpanded ? "chevron-down" : "chevron-right"} sx={{ marginRight: 4 }} />
                                <Typography variant="body2">Advanced Parameters</Typography>
                            </AdvancedConfigsHeader>
                            <AdvancedConfigsContent isExpanded={isAdvancedConfigsExpanded}>
                                {advancedParameters.map((param, idx) => (
                                    <CheckBoxGroup key={param.name.value || idx} direction="vertical">
                                        <CheckBox
                                            label={param.metadata?.label}
                                            checked={param.enabled}
                                            onChange={(checked) => {
                                                const updatedParameters = functionModel.parameters.map(p =>
                                                    p === param ? { ...p, enabled: checked } : p
                                                );
                                                handleParamChange(updatedParameters);
                                            }}
                                            sx={{ marginTop: idx === 0 ? 0 : 8, description: param.metadata?.description }}
                                        />
                                    </CheckBoxGroup>
                                ))}
                            </AdvancedConfigsContent>
                        </>
                    )}
                </EditorContentColumn>
                <ActionButtons
                    primaryButton={{
                        text: isSaving ? "Saving..." : "Save",
                        onClick: handleSave,
                        tooltip: saveTooltip,
                        disabled: isSaving || isSaveDisabled,
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
                modalTitle={`Define ${contentSchemaLabel}`}
                payloadContext={payloadContext}
                defaultTab="create-from-scratch"
                modalWidth={650}
                modalHeight={600}
            />
        </>
    );
}
