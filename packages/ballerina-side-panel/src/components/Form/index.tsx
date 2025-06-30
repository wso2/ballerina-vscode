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

import React, { forwardRef, useMemo, useEffect, useImperativeHandle, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import ReactMarkdown from "react-markdown";
import {
    Button,
    Codicon,
    LinkButton,
    ThemeColors,
    SidePanelBody,
    CheckBox,
    Typography,
} from "@wso2/ui-toolkit";
import styled from "@emotion/styled";

import { ExpressionFormField, FormExpressionEditorProps, FormField, FormImports, FormValues } from "./types";
import { EditorFactory } from "../editors/EditorFactory";
import { getValueForDropdown, isDropdownField } from "../editors/utils";
import {
    Diagnostic,
    LineRange,
    NodeKind,
    NodePosition,
    SubPanel,
    SubPanelView,
    FormDiagnostics,
    FlowNode,
    LinePosition,
    ExpressionProperty,
    RecordTypeField,
} from "@wso2/ballerina-core";
import { FormContext, Provider } from "../../context";
import {
    formatJSONLikeString,
    stripHtmlTags,
    updateFormFieldWithImports,
    isPrioritizedField,
    hasRequiredParameters,
    hasOptionalParameters,
} from "./utils";
import FormDescription from "./FormDescription";
import TypeHelperText from "./TypeHelperText";

namespace S {
    export const Container = styled(SidePanelBody)<{ nestedForm?: boolean; compact?: boolean }>`
        display: flex;
        flex-direction: column;
        gap: ${({ compact }) => (compact ? "8px" : "20px")};
        height: ${({ nestedForm }) => (nestedForm ? "unset" : "calc(100vh - 100px)")};
        overflow-y: ${({ nestedForm }) => (nestedForm ? "visible" : "auto")};
        & > :last-child {
            margin-top: ${({ compact }) => (compact ? "12px" : "0")};
        }
    `;

    export const Row = styled.div<{}>`
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: 100%;
    `;

    export const CategoryRow = styled.div<{ bottomBorder?: boolean; topBorder?: boolean }>`
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: flex-start;
        gap: 20px;
        width: 100%;
        margin-top: 8px;
        padding-bottom: ${({ bottomBorder }) => (bottomBorder ? "14px" : "0")};
        border-bottom: ${({ bottomBorder }) => (bottomBorder ? `1px solid ${ThemeColors.OUTLINE_VARIANT}` : "none")};
        padding-top: ${({ topBorder }) => (topBorder ? "14px" : "0")};
        border-top: ${({ topBorder }) => (topBorder ? `1px solid ${ThemeColors.OUTLINE_VARIANT}` : "none")};
    `;

    export const CheckboxRow = styled.div<{}>`
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        width: 100%;
    `;

    export const Footer = styled.div<{}>`
        display: flex;
        gap: 8px;
        flex-direction: row;
        justify-content: flex-end;
        align-items: center;
        margin-top: 8px;
        width: 100%;
    `;

    export const TitleContainer = styled.div<{}>`
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 100%;
        margin-bottom: 8px;
    `;

    export const Title = styled.div<{}>`
        font-size: 14px;
        font-family: GilmerBold;
        text-wrap: nowrap;
        &:first {
            margin-top: 0;
        }
    `;

    export const PrimaryButton = styled(Button)`
        appearance: "primary";
        display: flex;
    `;

    export const BodyText = styled.div<{}>`
        font-size: 11px;
        opacity: 0.5;
    `;

    export const DrawerContainer = styled.div<{}>`
        width: 400px;
    `;

    export const ButtonContainer = styled.div<{}>`
        display: flex;
        flex-direction: row;
        flex-grow: 1;
        justify-content: flex-end;
    `;

    export const DataMapperRow = styled.div`
        display: flex;
        justify-content: center;
        width: 100%;
        margin: 10px 0;
    `;

    export type EditorContainerStyleProp = {
        color: string;
    };
    export const EditorContainer = styled.div<EditorContainerStyleProp>`
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 8px;
        border-radius: 4px;
        /* border: 1px solid ${(props: EditorContainerStyleProp) => props.color}; */
        position: relative;
        z-index: 1;

        &::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: ${(props: EditorContainerStyleProp) => props.color};
            opacity: 0.1;
            z-index: -1;
            border-radius: inherit;
        }
    `;

    export const UseDataMapperButton = styled(Button)`
        & > vscode-button {
            width: 250px;
            height: 30px;
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-welcomePage-tileBorder);
        }
        align-self: center;
    `;

    export const InfoLabel = styled.div`
        font-size: var(--vscode-font-size);
        color: ${ThemeColors.ON_SURFACE_VARIANT};
    `;

    export const ActionButtonContainer = styled.div`
        display: flex;
        justify-content: flex-start;
    `;

    export const MarkdownWrapper = styled.div`
        position: relative;
        width: 100%;
    `;

    export const MarkdownContainer = styled.div<{ isExpanded: boolean }>`
        width: 100%;
        ${({ isExpanded }) =>
            !isExpanded &&
            `
            max-height: 200px;
            mask-image: linear-gradient(to bottom, black 160px, transparent 200px);
        `}
        font-size: 13px;
        font-family: var(--vscode-font-family);
        color: ${ThemeColors.ON_SURFACE_VARIANT};
        border-radius: 4px;
        transition: max-height 0.3s ease-in-out;

        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
            margin: 16px 0 8px 0;
            font-family: var(--vscode-font-family);
            font-weight: normal;
            font-size: 13px;
            color: var(--vscode-editor-foreground);
        }

        p {
            font-size: 13px;
            margin: 0;
            line-height: 1.5;
            margin-bottom: 8px;
            font-family: var(--vscode-font-family);
        }

        code {
            // hide code blocks
            display: none;
        }

        pre {
            // hide code blocks
            display: none;
        }

        ul,
        ol {
            margin: 8px 0;
            padding-left: 24px;
            font-size: 13px;
            font-family: var(--vscode-font-family);
        }

        li {
            margin: 4px 0;
            font-size: 13px;
            font-family: var(--vscode-font-family);
        }

        blockquote {
            margin: 8px 0;
            padding-left: 8px;
            border-left: 4px solid ${ThemeColors.PRIMARY};
            font-size: 13px;
            font-family: var(--vscode-font-family);
        }

        table {
            border-collapse: collapse;
            width: 100%;
            margin: 8px 0;
            font-size: 13px;
            font-family: var(--vscode-font-family);
        }

        th,
        td {
            border: 1px solid var(--vscode-editor-inactiveSelectionBackground);
            padding: 8px;
            text-align: left;
            font-size: 13px;
            font-family: var(--vscode-font-family);
        }

        th {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
        }
    `;

    export const ConcertContainer = styled.div`
        display: flex;
        align-items: center;
        gap: 4px;
        width: 100%;
        border-radius: 4px;
    `;

    export const ConcertMessage = styled.div`
        font-size: 13px;
        color: ${ThemeColors.ON_SURFACE_VARIANT};
    `;
}
export interface FormProps {
    infoLabel?: string;
    formFields: FormField[];
    submitText?: string;
    cancelText?: string;
    actionButton?: React.ReactNode; // Action button to display at the top
    targetLineRange?: LineRange; // TODO: make them required after connector wizard is fixed
    fileName?: string; // TODO: make them required after connector wizard is fixed
    projectPath?: string;
    selectedNode?: NodeKind;
    onSubmit?: (data: FormValues, dirtyFields?: any) => void;
    isSaving?: boolean;
    openRecordEditor?: (isOpen: boolean, fields: FormValues, editingField?: FormField) => void;
    openView?: (filePath: string, position: NodePosition) => void;
    openSubPanel?: (subPanel: SubPanel) => void;
    subPanelView?: SubPanelView;
    onCancelForm?: () => void;
    oneTimeForm?: boolean;
    expressionEditor?: FormExpressionEditorProps;
    updatedExpressionField?: ExpressionFormField;
    resetUpdatedExpressionField?: () => void;
    mergeFormDataWithFlowNode?: (data: FormValues, targetLineRange: LineRange) => FlowNode;
    handleVisualizableFields?: (filePath: string, flowNode: FlowNode, position: LinePosition) => void;
    visualizableFields?: string[];
    recordTypeFields?: RecordTypeField[];
    nestedForm?: boolean;
    isInferredReturnType?: boolean;
    disableSaveButton?: boolean;
    compact?: boolean;
    concertRequired?: boolean;
    concertMessage?: string;
    formImports?: FormImports;
}

export const Form = forwardRef((props: FormProps, ref) => {
    const {
        infoLabel,
        formFields,
        projectPath,
        selectedNode,
        submitText,
        cancelText,
        actionButton,
        onSubmit,
        isSaving,
        onCancelForm,
        oneTimeForm,
        openRecordEditor,
        openView,
        openSubPanel,
        subPanelView,
        expressionEditor,
        targetLineRange,
        fileName,
        updatedExpressionField,
        resetUpdatedExpressionField,
        mergeFormDataWithFlowNode,
        handleVisualizableFields,
        visualizableFields,
        recordTypeFields,
        nestedForm,
        compact = false,
        isInferredReturnType,
        concertRequired = true,
        concertMessage,
        formImports,
    } = props;

    const {
        control,
        getValues,
        register,
        unregister,
        handleSubmit,
        reset,
        watch,
        setValue,
        setError,
        clearErrors,
        formState: { isValidating, errors, isDirty, isValid: isFormValid, dirtyFields },
    } = useForm<FormValues>();

    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [activeFormField, setActiveFormField] = useState<string | undefined>(undefined);
    const [diagnosticsInfo, setDiagnosticsInfo] = useState<FormDiagnostics[] | undefined>(undefined);
    const [isMarkdownExpanded, setIsMarkdownExpanded] = useState(false);
    const [isIdentifierEditing, setIsIdentifierEditing] = useState(false);
    const markdownRef = useRef<HTMLDivElement>(null);

    const [isUserConcert, setIsUserConcert] = useState(false);

    useEffect(() => {
        // Check if the form is a onetime usage or not. This is checked due to reset issue with nested forms in param manager
        if (!oneTimeForm) {
            // Reset form with new values when formFields change
            const defaultValues: FormValues = {};
            const diagnosticsMap: FormDiagnostics[] = [];
            const formValues = getValues();
            console.log("Existing form values: ", formValues);
            formFields.forEach((field) => {
                if (isDropdownField(field)) {
                    defaultValues[field.key] = getValueForDropdown(field) ?? "";
                } else if (typeof field.value === "string") {
                    defaultValues[field.key] = formatJSONLikeString(field.value) ?? "";
                } else {
                    defaultValues[field.key] = field.value ?? "";
                }

                if (field.key === "type") {
                    // Handle the case where the type is changed via 'Add Type'
                    const existingType = formValues[field.key];
                    const newType = field.value;

                    if (existingType !== newType) {
                        setValue(field.key, newType);
                        mergeFormDataWithFlowNode && getVisualiableFields();
                    }
                }

                // Handle choice fields and their properties
                if (field?.choices && field.choices.length > 0) {
                    // Get the selected choice index (default to 0 if not set)
                    const selectedChoiceIndex = formValues[field.key] !== undefined ? Number(formValues[field.key]) : 0;

                    const selectedChoice = field.choices[selectedChoiceIndex];

                    if (selectedChoice && selectedChoice?.properties) {
                        Object.entries(selectedChoice.properties).forEach(([propKey, propValue]) => {
                            if (propValue?.value !== undefined) {
                                defaultValues[propKey] = propValue.value;
                            }

                            diagnosticsMap.push({ key: propKey, diagnostics: [] });
                        });
                    }
                }

                if (formValues[field.key] !== undefined && formValues[field.key] !== "" && !field.value) {
                    defaultValues[field.key] = formValues[field.key];
                }
                diagnosticsMap.push({ key: field.key, diagnostics: [] });
            });
            setDiagnosticsInfo(diagnosticsMap);
            reset(defaultValues);
        }
    }, [formFields, reset]);

    useEffect(() => {
        if (updatedExpressionField) {
            if (subPanelView === SubPanelView.INLINE_DATA_MAPPER) {
                const { key, value } = updatedExpressionField;
                // Update the form field value
                setValue(key, value);
                resetUpdatedExpressionField && resetUpdatedExpressionField();
                // Update the inline data mapper view
                handleOpenSubPanel({
                    view: SubPanelView.INLINE_DATA_MAPPER,
                    props: {
                        inlineDataMapper: {
                            filePath: fileName,
                            flowNode: undefined,
                            position: {
                                line: updatedExpressionField.cursorPosition.line,
                                offset: updatedExpressionField.cursorPosition.offset,
                            },
                            propertyKey: updatedExpressionField.key,
                            editorKey: updatedExpressionField.key,
                        },
                    },
                });
            }
        }
    }, [updatedExpressionField]);

    const handleOnSave = (data: FormValues) => {
        console.log(">>> saved form fields", { data });
        onSubmit && onSubmit(data, dirtyFields);
    };

    // Expose a method to trigger the save
    useImperativeHandle(ref, () => ({
        triggerSave: () => handleSubmit(handleOnSave)(), // Call handleSubmit with the save function
    }));

    const handleOpenRecordEditor = (open: boolean, typeField?: FormField) => {
        openRecordEditor?.(open, getValues(), typeField);
    };

    const handleOnShowAdvancedOptions = () => {
        setShowAdvancedOptions(true);
    };

    const handleOnHideAdvancedOptions = () => {
        setShowAdvancedOptions(false);
    };

    const handleOnFieldFocus = (key: string) => {
        const isActiveSubPanel = subPanelView !== SubPanelView.UNDEFINED;

        if (isActiveSubPanel && activeFormField !== key) {
            openSubPanel && openSubPanel({ view: SubPanelView.UNDEFINED });
        }
        setActiveFormField(key);
    };

    const handleSetDiagnosticsInfo = (diagnostics: FormDiagnostics) => {
        const otherDiagnostics = diagnosticsInfo?.filter((item) => item.key !== diagnostics.key) || [];
        setDiagnosticsInfo([...otherDiagnostics, diagnostics]);
    };

    const handleOpenSubPanel = (subPanel: SubPanel) => {
        let updatedSubPanel = subPanel;
        if (subPanel.view === SubPanelView.INLINE_DATA_MAPPER) {
            const flowNode = mergeFormDataWithFlowNode(getValues(), targetLineRange);
            const inlineDMProps = {
                ...subPanel.props.inlineDataMapper,
                flowNode: flowNode,
            };
            updatedSubPanel = {
                ...subPanel,
                props: {
                    ...subPanel.props,
                    inlineDataMapper: inlineDMProps,
                },
            };
        }
        openSubPanel(updatedSubPanel);
    };

    const handleOnTypeChange = () => {
        if (mergeFormDataWithFlowNode) {
            getVisualiableFields();
        }
    };

    const getVisualiableFields = () => {
        if (mergeFormDataWithFlowNode) {
            const flowNode = mergeFormDataWithFlowNode(getValues(), targetLineRange);
            handleVisualizableFields && handleVisualizableFields(fileName, flowNode, targetLineRange.startLine);
        }
    };

    const handleGetExpressionDiagnostics = async (
        showDiagnostics: boolean,
        expression: string,
        key: string,
        property: ExpressionProperty
    ) => {
        // HACK: For variable nodes, update the type value in the node
        const isVariableNode = selectedNode === "VARIABLE";
        await expressionEditor?.getExpressionFormDiagnostics?.(
            showDiagnostics,
            expression,
            key,
            property,
            handleSetDiagnosticsInfo,
            isVariableNode,
            watch("type")
        );
    };

    // has advance fields
    const hasAdvanceFields = formFields.some((field) => field.advanced && field.enabled && !field.hidden);
    const variableField = formFields.find((field) => field.key === "variable");
    const typeField = formFields.find((field) => field.key === "type");
    const targetTypeField = formFields.find((field) => field.codedata?.kind === "PARAM_FOR_TYPE_INFER");
    const dataMapperField = formFields.find((field) => field.label.includes("Data mapper"));
    const prioritizedNodes = ["VARIABLE", "CONFIG_VARIABLE"]; // these node type form fields will rearrange based on priority
    const formHasPriorityFields = (variableField || typeField || targetTypeField) && !dataMapperField && (prioritizedNodes.includes(selectedNode));
    const hasParameters = hasRequiredParameters(formFields, selectedNode) || hasOptionalParameters(formFields);
    const regularNodes = ["PARAM_FOR_TYPE_INFER"]; // these node type form fields won't rearrange based on priority
    const isRegularNode = regularNodes.includes(selectedNode);

    const contextValue: FormContext = {
        form: {
            control,
            getValues,
            setValue,
            watch,
            register,
            unregister,
            setError,
            clearErrors,
            formState: { isValidating, errors },
        },
        expressionEditor: {
            ...expressionEditor,
            getExpressionEditorDiagnostics: handleGetExpressionDiagnostics,
        },
        targetLineRange,
        fileName,
    };

    // Find the first editable field
    const firstEditableFieldIndex = formFields.findIndex((field) => field.editable !== false);

    const isValid = useMemo(() => {
        if (!diagnosticsInfo) {
            return true;
        }

        let hasDiagnostics: boolean = true;
        for (const diagnosticsInfoItem of diagnosticsInfo) {
            const key = diagnosticsInfoItem.key;
            if (!key) {
                continue;
            }

            let diagnostics: Diagnostic[] = diagnosticsInfoItem.diagnostics || [];
            if (diagnostics.length === 0) {
                clearErrors(key);
                continue;
            } else {
                // Filter the BCE2066 diagnostics
                diagnostics = diagnostics.filter(
                    (d) => d.code !== "BCE2066" || d.message !== "incompatible types: expected 'any', found 'error'"
                );

                const diagnosticsMessage = diagnostics.map((d) => d.message).join("\n");
                setError(key, { type: "validate", message: diagnosticsMessage });

                // If the severity is not ERROR, don't invalidate
                const hasErrorDiagnostics = diagnostics.some((d) => d.severity === 1);
                if (hasErrorDiagnostics) {
                    hasDiagnostics = false;
                } else {
                    continue;
                }
            }
        }

        return hasDiagnostics;
    }, [diagnosticsInfo]);

    const handleIdentifierEditingStateChange = (isEditing: boolean) => {
        setIsIdentifierEditing(isEditing);
    };

    const handleConcertChange = (checked: boolean) => {
        setIsUserConcert(checked);
    };

    const disableSaveButton =
        !isValid || isValidating || props.disableSaveButton || (concertMessage && concertRequired && !isUserConcert) ||
        isIdentifierEditing || Object.keys(errors).length > 0;

    const handleShowMoreClick = () => {
        setIsMarkdownExpanded(!isMarkdownExpanded);
        // If collapsing, scroll to top of container with smooth animation
        if (isMarkdownExpanded) {
            const container = document.querySelector(".side-panel-body");
            container?.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    return (
        <Provider {...contextValue}>
            <S.Container nestedForm={nestedForm} compact={compact} className="side-panel-body">
                {actionButton && <S.ActionButtonContainer>{actionButton}</S.ActionButtonContainer>}
                {infoLabel && (
                    <S.MarkdownWrapper>
                        <S.MarkdownContainer ref={markdownRef} isExpanded={isMarkdownExpanded}>
                            <ReactMarkdown>{stripHtmlTags(infoLabel)}</ReactMarkdown>
                        </S.MarkdownContainer>
                        {markdownRef.current && markdownRef.current.scrollHeight > 200 && (
                            <S.ButtonContainer>
                                <LinkButton
                                    onClick={handleShowMoreClick}
                                    sx={{ fontSize: 12, padding: 8, color: ThemeColors.PRIMARY, gap: 4 }}
                                >
                                    <Codicon
                                        name={isMarkdownExpanded ? "chevron-up" : "chevron-down"}
                                        iconSx={{ fontSize: 12 }}
                                        sx={{ height: 12 }}
                                    />
                                    {isMarkdownExpanded ? "Show Less" : "Show More"}
                                </LinkButton>
                            </S.ButtonContainer>
                        )}
                    </S.MarkdownWrapper>
                )}
                <FormDescription formFields={formFields} selectedNode={selectedNode} />
                {formHasPriorityFields && (variableField || typeField) && (
                    <S.CategoryRow bottomBorder={!compact}>
                        {variableField && (
                            <EditorFactory
                                field={variableField}
                                handleOnFieldFocus={handleOnFieldFocus}
                                autoFocus={firstEditableFieldIndex === formFields.indexOf(variableField)}
                                visualizableFields={visualizableFields}
                                recordTypeFields={recordTypeFields}
                                onIdentifierEditingStateChange={handleIdentifierEditingStateChange}
                            />
                        )}
                        {typeField && !isInferredReturnType && (
                            <EditorFactory
                                field={typeField}
                                openRecordEditor={
                                    openRecordEditor && ((open: boolean) => handleOpenRecordEditor(open, typeField))
                                }
                                openSubPanel={handleOpenSubPanel}
                                handleOnFieldFocus={handleOnFieldFocus}
                                handleOnTypeChange={handleOnTypeChange}
                                visualizableFields={visualizableFields}
                                recordTypeFields={recordTypeFields}
                                onIdentifierEditingStateChange={handleIdentifierEditingStateChange}
                            />
                        )}
                    </S.CategoryRow>
                )}
                {hasParameters && (
                    <S.CategoryRow bottomBorder={false}>
                        {formFields
                            .sort((a, b) => b.groupNo - a.groupNo)
                            .filter((field) => field.type !== "VIEW")
                            .map((field) => {
                                if (!isRegularNode && (isPrioritizedField(field) || field.advanced || field.hidden)) {
                                    return;
                                }
                                const updatedField = updateFormFieldWithImports(field, formImports);
                                return (
                                    <S.Row key={updatedField.key}>
                                        <EditorFactory
                                            field={updatedField}
                                            selectedNode={selectedNode}
                                            openRecordEditor={
                                                openRecordEditor &&
                                                ((open: boolean) => handleOpenRecordEditor(open, updatedField))
                                            }
                                            openSubPanel={handleOpenSubPanel}
                                            subPanelView={subPanelView}
                                            handleOnFieldFocus={handleOnFieldFocus}
                                            autoFocus={firstEditableFieldIndex === formFields.indexOf(updatedField)}
                                            visualizableFields={visualizableFields}
                                            recordTypeFields={recordTypeFields}
                                            onIdentifierEditingStateChange={handleIdentifierEditingStateChange}
                                        />
                                    </S.Row>
                                );
                            })}
                        {hasAdvanceFields && (
                            <S.Row>
                                Optional Configurations
                                <S.ButtonContainer>
                                    {!showAdvancedOptions && (
                                        <LinkButton
                                            onClick={handleOnShowAdvancedOptions}
                                            sx={{ fontSize: 12, padding: 8, color: ThemeColors.PRIMARY, gap: 4 }}
                                        >
                                            <Codicon
                                                name={"chevron-down"}
                                                iconSx={{ fontSize: 12 }}
                                                sx={{ height: 12 }}
                                            />
                                            Expand
                                        </LinkButton>
                                    )}
                                    {showAdvancedOptions && (
                                        <LinkButton
                                            onClick={handleOnHideAdvancedOptions}
                                            sx={{ fontSize: 12, padding: 8, color: ThemeColors.PRIMARY, gap: 4 }}
                                        >
                                            <Codicon
                                                name={"chevron-up"}
                                                iconSx={{ fontSize: 12 }}
                                                sx={{ height: 12 }}
                                            />
                                            Collapsed
                                        </LinkButton>
                                    )}
                                </S.ButtonContainer>
                            </S.Row>
                        )}
                        {hasAdvanceFields &&
                            showAdvancedOptions &&
                            formFields.map((field) => {
                                if (field.advanced) {
                                    const updatedField = updateFormFieldWithImports(field, formImports);
                                    return (
                                        <S.Row key={updatedField.key}>
                                            <EditorFactory
                                                field={updatedField}
                                                openRecordEditor={
                                                    openRecordEditor &&
                                                    ((open: boolean) => handleOpenRecordEditor(open, updatedField))
                                                }
                                                openSubPanel={handleOpenSubPanel}
                                                subPanelView={subPanelView}
                                                handleOnFieldFocus={handleOnFieldFocus}
                                                visualizableFields={visualizableFields}
                                                recordTypeFields={recordTypeFields}
                                                onIdentifierEditingStateChange={handleIdentifierEditingStateChange}
                                            />
                                        </S.Row>
                                    );
                                }
                            })}
                    </S.CategoryRow>
                )}
                {!formHasPriorityFields && (variableField || typeField) && (
                    <S.CategoryRow topBorder={!compact && hasParameters}>
                        {variableField && (
                            <EditorFactory
                                field={variableField}
                                handleOnFieldFocus={handleOnFieldFocus}
                                visualizableFields={visualizableFields}
                                recordTypeFields={recordTypeFields}
                                onIdentifierEditingStateChange={handleIdentifierEditingStateChange}
                            />
                        )}
                        {typeField && !isInferredReturnType && (
                            <EditorFactory
                                field={typeField}
                                openRecordEditor={
                                    openRecordEditor && ((open: boolean) => handleOpenRecordEditor(open, typeField))
                                }
                                openSubPanel={handleOpenSubPanel}
                                handleOnFieldFocus={handleOnFieldFocus}
                                handleOnTypeChange={handleOnTypeChange}
                                visualizableFields={visualizableFields}
                                recordTypeFields={recordTypeFields}
                                onIdentifierEditingStateChange={handleIdentifierEditingStateChange}
                            />
                        )}
                        {targetTypeField && (
                            <>
                                <EditorFactory
                                    field={targetTypeField}
                                    handleOnFieldFocus={handleOnFieldFocus}
                                    visualizableFields={visualizableFields}
                                    recordTypeFields={recordTypeFields}
                                    onIdentifierEditingStateChange={handleIdentifierEditingStateChange}
                                />
                                {typeField && (
                                    <TypeHelperText
                                        targetTypeField={targetTypeField}
                                        typeField={typeField}
                                    />
                                )}
                            </>
                        )}
                    </S.CategoryRow>
                )}

                {concertMessage && (
                    <S.ConcertContainer>
                        <CheckBox checked={isUserConcert} onChange={handleConcertChange} label={concertMessage} />
                    </S.ConcertContainer>
                )}

                {onSubmit && (
                    <S.Footer>
                        {onCancelForm && (
                            <Button appearance="secondary" onClick={onCancelForm}>
                                {" "}
                                {cancelText || "Cancel"}{" "}
                            </Button>
                        )}
                        <S.PrimaryButton onClick={handleSubmit(handleOnSave)} disabled={disableSaveButton || isSaving}>
                            {isSaving ? <Typography variant="progress">{submitText || "Saving..."}</Typography> : submitText || "Save"}
                        </S.PrimaryButton>
                    </S.Footer>
                )}
            </S.Container>
        </Provider>
    );
});

export default Form;
