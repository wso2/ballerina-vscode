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

import React, { useEffect, useRef, useState } from 'react';
import { Control, Controller, FieldValues, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import styled from '@emotion/styled';
import {
    Button,
    CompletionItem,
    ErrorBanner,
    FormExpressionEditorRef,
    HelperPaneHeight,
    RequiredFormInput,
    ThemeColors
} from '@wso2/ui-toolkit';
import { getPropertyFromFormField, isExpandableMode, sanitizeType, toEditorMode } from './utils';
import { FormField, FormExpressionEditorProps, HelperpaneOnChangeOptions } from '../Form/types';
import { useFormContext } from '../../context';
import {
    ExpressionProperty,
    getPrimaryInputType,
    InputType,
    LineRange,
    RecordTypeField,
    SubPanel,
    SubPanelView,
    Type
} from '@wso2/ballerina-core';
import ReactMarkdown from 'react-markdown';
import { FieldProvider } from "./FieldContext";
import ModeSwitcher from '../ModeSwitcher';
import { ExpressionField } from './ExpressionField';
import WarningPopup from '../WarningPopup';
import { InputMode } from './MultiModeExpressionEditor/ChipExpressionEditor/types';
import { getInputModeFromTypes } from './MultiModeExpressionEditor/ChipExpressionEditor/utils';
import { ExpandedEditor } from './ExpandedEditor';

export type ContextAwareExpressionEditorProps = {
    id?: string;
    fieldKey?: string;
    inputTypes?: InputType[];
    placeholder?: string;
    required?: boolean;
    showHeader?: boolean;
    field: FormField;
    openSubPanel?: (subPanel: SubPanel) => void;
    subPanelView?: SubPanelView;
    handleOnFieldFocus?: (key: string) => void;
    onBlur?: () => void | Promise<void>;
    autoFocus?: boolean;
    recordTypeField?: RecordTypeField;
    helperPaneZIndex?: number;
    isInExpandedMode?: boolean;
};

type diagnosticsFetchContext = {
    fetchedInitialDiagnostics: boolean;
    //TargetLineRange which initial diagnostics fetched
    diagnosticsFetchedTargetLineRange: LineRange;
}

type ExpressionEditorProps = ContextAwareExpressionEditorProps &
    FormExpressionEditorProps & {
        control: Control<FieldValues, any>;
        watch: UseFormWatch<any>;
        setValue: UseFormSetValue<FieldValues>;
        targetLineRange?: LineRange;
        fileName: string;
    };

export namespace S {
    export const Container = styled.div({
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontFamily: 'var(--font-family)',
    });

    export const Ribbon = styled.div({
        backgroundColor: ThemeColors.PRIMARY,
        opacity: 0.6,
        width: '24px',
        height: `calc(100% - 6.5px)`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        borderTopLeftRadius: '2px',
        borderBottomLeftRadius: '2px',
        borderRight: 'none',
        marginTop: '3.75px',
        paddingTop: '6px',
        cursor: 'pointer'
    });

    export const TitleContainer = styled.div`
        display: flex;
        align-items: center;
        gap: 8px;
    `;

    export const LabelContainer = styled.div({
        display: 'flex',
        alignItems: 'center'
    });

    export const HeaderContainer = styled.div({
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        minHeight: '26px'
    });

    export const Header = styled.div({
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    });

    export const Type = styled.div<{ isVisible: boolean }>(({ isVisible }) => ({
        color: ThemeColors.PRIMARY,
        fontFamily: 'monospace',
        fontSize: '10px',
        border: `1px solid ${ThemeColors.PRIMARY}`,
        borderRadius: '999px',
        padding: '1px 6px',
        display: 'inline-block',
        userSelect: 'none',
        maxWidth: '120px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        opacity: 0,
        animation: `${isVisible ? 'fadeIn' : 'fadeOut'} 0.2s ease-${isVisible ? 'in' : 'out'} forwards`,
        '@keyframes fadeIn': {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 }
        },
        '@keyframes fadeOut': {
            '0%': { opacity: 1 },
            '100%': { opacity: 0 }
        }
    }));

    export const Label = styled.label({
        color: 'var(--vscode-editor-foreground)',
        textTransform: 'capitalize'
    });

    export const Description = styled.div({
        color: 'var(--vscode-list-deemphasizedForeground)'
    });

    export const DataMapperBtnTxt = styled.p`
        font-size: 10px;
        margin: 0;
        color: var(--vscode-button-background);
    `;

    export const AddNewButton = styled(Button)`
        & > vscode-button {
            color: var(--vscode-textLink-activeForeground);
            border-radius: 0px;
            padding: 3px 5px;
            margin-top: 4px;
        }
        & > vscode-button > * {
            margin-right: 6px;
        }
    `;

    export const DefaultValue = styled.span`
        color: var(--vscode-input-placeholderForeground);
        font-family: var(--vscode-editor-font-family);
        font-size: 12px;
    `;

    export const FieldInfoSection = styled.div({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '5px'
    });

    export const EditorMdContainer = styled.div`
        width: 100%;
        font-size: 13px;
        font-family: var(--vscode-font-family);
        color: var(--vscode-list-deemphasizedForeground);
        border-radius: 4px;
        margin-bottom: 0;

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
            color: var(--vscode-list-deemphasizedForeground);
        }

        p {
            font-size: 13px;
            margin: 0;
            line-height: 1.5;
            font-family: var(--vscode-font-family);
            color: var(--vscode-list-deemphasizedForeground);
        }

        code {
            background-color: var(--vscode-textPreformat-background);
            border-radius: 3px;
            padding: 2px 4px;
            color: var(--vscode-textPreformat-foreground);
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
        }

        pre {
            background-color: var(--vscode-textPreformat-background);
            color: var(--vscode-textPreformat-foreground);
            border-radius: 4px;
            padding: 12px;
            margin: 8px 0;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            line-height: 1.4;
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
}

export const ContextAwareExpressionEditor = (props: ContextAwareExpressionEditorProps) => {
    const { form, expressionEditor, targetLineRange, fileName } = useFormContext();

    return (
        <ExpressionEditor
            fileName={fileName}
            targetLineRange={targetLineRange}
            helperPaneZIndex={props.helperPaneZIndex}
            {...form}
            {...expressionEditor}
            {...props}
        />
    );
};

export const DataMapperJoinClauseRhsEditor = (props: ContextAwareExpressionEditorProps) => {
    const { form, expressionEditor, targetLineRange, fileName } = useFormContext();

    const modifiedExpressionEditor = {
        ...expressionEditor
    };

    modifiedExpressionEditor.retrieveCompletions = async (value: string, property: ExpressionProperty, offset: number, triggerCharacter?: string) => {
        const varName = form.watch('name');
        const expression = form.watch('expression');
        const prefixExpr = `from var ${varName} in ${expression} select `;
        return await expressionEditor.retrieveCompletions(prefixExpr + value, property, prefixExpr.length + offset, triggerCharacter);
    }

    return (
        <ExpressionEditor
            fileName={fileName}
            targetLineRange={targetLineRange}
            helperPaneZIndex={props.helperPaneZIndex}
            {...form}
            {...modifiedExpressionEditor}
            {...props}
        />
    );
};


export const ExpressionEditor = (props: ExpressionEditorProps) => {
    const {
        autoFocus,
        control,
        field,
        id,
        placeholder,
        required,
        showHeader = true,
        watch,
        setValue,
        fieldKey,
        completions,
        triggerCharacters,
        retrieveCompletions,
        extractArgsFromFunction,
        getExpressionEditorDiagnostics,
        getHelperPane,
        onFocus,
        onBlur,
        onCompletionItemSelect,
        onSave,
        onCancel,
        onRemove,
        handleOnFieldFocus,
        onOpenRecordConfigPage,
        targetLineRange,
        fileName,
        helperPaneHeight,
        recordTypeField,
        helperPaneZIndex,
        growRange = { start: 1, offset: 9 },
        rawExpression, // original expression
        sanitizedExpression // sanitized expression that will be rendered in the editor
    } = props as ExpressionEditorProps;

    const key = fieldKey ?? field.key;
    const [focused, setFocused] = useState<boolean>(false);
    const [inputMode, setInputMode] = useState<InputMode>(recordTypeField ? InputMode.RECORD : InputMode.EXP);
    const inputModeRef = useRef<InputMode>(inputMode);
    const [isExpressionEditorHovered, setIsExpressionEditorHovered] = useState<boolean>(false);
    const [showModeSwitchWarning, setShowModeSwitchWarning] = useState(false);
    const [formDiagnostics, setFormDiagnostics] = useState(field.diagnostics);
    const [isExpandedModalOpen, setIsExpandedModalOpen] = useState(false);
    const targetInputModeRef = useRef<InputMode>(null);

    // Update formDiagnostics when field.diagnostics changes
    useEffect(() => {
        setFormDiagnostics(field.diagnostics);
    }, [field.diagnostics]);

    // Keep inputModeRef in sync with inputMode state
    useEffect(() => {
        inputModeRef.current = inputMode;
    }, [inputMode]);


    // If Form directly  calls ExpressionEditor without setting targetLineRange and fileName through context
    const { targetLineRange: contextTargetLineRange, fileName: contextFileName } = useFormContext();
    const effectiveTargetLineRange = targetLineRange ?? contextTargetLineRange;
    const effectiveFileName = fileName ?? contextFileName;

    const initialFieldValue = useRef(field.value);

    const [isHelperPaneOpen, setIsHelperPaneOpen] = useState<boolean>(false);
    /* Define state to retrieve helper pane data */

    const exprRef = useRef<FormExpressionEditorRef>(null);
    const anchorRef = useRef<HTMLDivElement>(null);

    const { nodeInfo } = useFormContext();

    // Use to fetch initial diagnostics
    const previousDiagnosticsFetchContext = useRef<diagnosticsFetchContext>({
        fetchedInitialDiagnostics: false,
        diagnosticsFetchedTargetLineRange: undefined
    });
    const fieldValue = (inputModeRef.current === InputMode.PROMPT || inputModeRef.current === InputMode.TEMPLATE) && rawExpression ? rawExpression(watch(key)) : watch(key);

    // Initial render
    useEffect(() => {
        if (!targetLineRange) return;
        // Fetch initial diagnostics
        if (getExpressionEditorDiagnostics && fieldValue !== undefined
            && (inputMode === InputMode.EXP || inputMode === InputMode.PROMPT || inputMode === InputMode.TEMPLATE)
            && (previousDiagnosticsFetchContext.current.fetchedInitialDiagnostics === false
                || previousDiagnosticsFetchContext.current.diagnosticsFetchedTargetLineRange !== targetLineRange
            )) {
            previousDiagnosticsFetchContext.current = {
                fetchedInitialDiagnostics: true,
                diagnosticsFetchedTargetLineRange: targetLineRange
            };
            // Only validate on initial render if the field has a non-empty value
            getExpressionEditorDiagnostics(
                fieldValue !== '',
                fieldValue,
                key,
                getPropertyFromFormField(field)
            );
        }
    }, [fieldValue, targetLineRange]);

    useEffect(() => {
        // If recordTypeField is present, always use GUIDED mode
        if (recordTypeField) {
            setInputMode(InputMode.RECORD);
            return;
        }
        if (field.types.length === 0) return;
        let selectedInputType = field?.types.find(type => type.selected);
        if (!selectedInputType) {
            selectedInputType = field?.types[0];
        }
        const inputMode = getInputModeFromTypes(selectedInputType);
        setInputMode(inputMode)
    }, [field?.types, recordTypeField]);

    const handleFocus = async (controllerOnChange?: (value: string) => void) => {
        setFocused(true);

        // If in guided mode with recordTypeField, open ConfigureRecordPage directly
        if (inputMode === InputMode.RECORD && recordTypeField && onOpenRecordConfigPage) {
            const currentValue = watch(key) || '';
            // Create onChange callback that updates the form value
            const onChangeCallback = (value: string) => {
                if (controllerOnChange) {
                    controllerOnChange(value);
                } else {
                    setValue(key, value);
                }
            };
            onOpenRecordConfigPage(key, currentValue, recordTypeField, onChangeCallback);
            return;
        }

        // Trigger actions on focus
        await onFocus?.();
        handleOnFieldFocus?.(key);
    };

    const handleBlur = async () => {
        setFocused(false);
        await onBlur?.();
    };

    const handleCompletionSelect = async (value: string, item: CompletionItem) => {
        await onCompletionItemSelect?.(value, key, item.additionalTextEdits);
    };

    const handleChangeHelperPaneState = (isOpen: boolean) => {
        setIsHelperPaneOpen(isOpen);
    };

    const handleSave = async (value: string) => {
        let valueToBeSaved = value;
        if (inputMode === InputMode.TEXT) {
            valueToBeSaved = `\"${value}\"`;
        }
        onSave?.(valueToBeSaved);
    }

    const toggleHelperPaneState = () => {
        if (!isHelperPaneOpen) {
            exprRef.current?.focus();
        } else {
            handleChangeHelperPaneState(false);
        }
    };

    const handleGetHelperPane = (
        value: string,
        onChange: (value: string, options?: HelperpaneOnChangeOptions) => void,
        helperPaneHeight: HelperPaneHeight
    ) => {
        return getHelperPane?.(
            key,
            exprRef,
            anchorRef,
            field.placeholder,
            value,
            onChange,
            handleChangeHelperPaneState,
            helperPaneHeight,
            recordTypeField,
            field.type === "LV_EXPRESSION",
            field.types,
            inputModeRef.current,
        );
    };

    const handleExtractArgsFromFunction = async (value: string, cursorPosition: number) => {
        return await extractArgsFromFunction(value, getPropertyFromFormField(field), cursorPosition);
    };

    const isExpToBooleanSafe = (expValue: string) => {
        if (expValue === null || expValue === undefined) return true;
        return ["true", "false"].includes(expValue.trim().toLowerCase())
    }

    const isExpToTemplateSafe = (expValue: string) => {
        if (expValue === null || expValue === undefined) return true;
        const trimmed = expValue.trim();
        if (trimmed.startsWith('`') && trimmed.endsWith('`')) return true;
        const stringTaggedTemplateRegex = /^string\s*`.*`$/s;
        return stringTaggedTemplateRegex.test(trimmed);
    }

    const isExpToTextSafe = (expValue: string) => {
        if (expValue === null || expValue === undefined) return true;
        const trimmed = expValue.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            const content = trimmed.slice(1, -1);
            return !/(?<!\\)"/.test(content);
        }
        const stringTaggedTemplateRegex = /^string\s*`.*`$/s;
        return stringTaggedTemplateRegex.test(trimmed);
    }

    const handleModeChange = (value: InputMode) => {
        const raw = watch(key);
        const currentValue = raw && typeof raw === "string" ? raw.trim() : "";
        if (inputMode !== InputMode.EXP) {
            setInputMode(value);
            return;
        }
        const primaryInputType = getPrimaryInputType(field.types);
        const primaryInputMode = getInputModeFromTypes(primaryInputType);
        switch (primaryInputMode) {
            case (InputMode.BOOLEAN):
                if (!isExpToBooleanSafe(currentValue)) {
                    targetInputModeRef.current = value;
                    setShowModeSwitchWarning(true)
                    return;
                }
                break;
            case (InputMode.TEXT):
                if (!isExpToTextSafe(currentValue)) {
                    targetInputModeRef.current = value;
                    setShowModeSwitchWarning(true)
                    return;
                }
                break;
            case (InputMode.PROMPT):
            case (InputMode.TEMPLATE):
                if (currentValue && currentValue.trim() !== '') {
                    if (!isExpToTemplateSafe(currentValue)) {
                        targetInputModeRef.current = value;
                        setShowModeSwitchWarning(true)
                        return;
                    } else {
                        setInputMode(primaryInputMode);
                        return;
                    }
                }
                break;
        }
        setInputMode(value);
    };

    const handleModeSwitchWarningContinue = () => {
        if (targetInputModeRef.current !== null) {
            setInputMode(targetInputModeRef.current);
            const targetMode = targetInputModeRef.current;
            const shouldClearValue = [InputMode.PROMPT, InputMode.TEMPLATE, InputMode.TEXT].includes(targetMode) && inputMode === InputMode.EXP;
            if (shouldClearValue) {
                setValue(key, "");
            }
            targetInputModeRef.current = null;
        }
        setShowModeSwitchWarning(false);
    };

    const handleModeSwitchWarningCancel = () => {
        targetInputModeRef.current = null;
        setShowModeSwitchWarning(false);
    };

    const handleOpenExpandedMode = () => {
        setIsExpandedModalOpen(true);
    };

    const handleSaveExpandedMode = (value: string) => {
        setValue(key, value);
        if (field.onValueChange) {
            field.onValueChange(value);
        }
    };

    const onOpenExpandedMode = !props.isInExpandedMode && isExpandableMode(inputMode)
        ? handleOpenExpandedMode
        : undefined;

    const defaultValueText = field.defaultValue ?
        <S.DefaultValue>Defaults to {field.defaultValue}</S.DefaultValue> : null;

    const documentation = field.documentation
        ? field.documentation.endsWith('.')
            ? field.documentation
            : `${field.documentation}.`
        : '';

    const isModeSwitcherRestricted = () => {
        return !field.types || !(field.types.length > 1);
    };

    const isModeSwitcherAvailable = () => {
        if (recordTypeField) return true;
        if (isModeSwitcherRestricted()) return false;
        if (!(focused || isExpressionEditorHovered)) return false;
        if (!getInputModeFromTypes(getPrimaryInputType(field.types))) return false;
        return true;
    }

    return (
        <FieldProvider
            initialField={props.field}
            triggerCharacters={props.triggerCharacters}
        >
            <S.Container
                id={id}
                onMouseEnter={() => setIsExpressionEditorHovered(true)}
                onMouseLeave={() => setIsExpressionEditorHovered(false)}
            >
                {showHeader && (
                    <S.Header>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px' }}>
                            <div>
                                <S.HeaderContainer>
                                    <S.LabelContainer>
                                        <S.Label>{field.label}</S.Label>
                                        {(required ?? !field.optional) && <RequiredFormInput />}
                                        {getPrimaryInputType(field.types)?.ballerinaType && (
                                            <S.Type style={{ marginLeft: '5px' }} isVisible={focused} title={getPrimaryInputType(field.types)?.ballerinaType}>
                                                {sanitizeType(getPrimaryInputType(field.types)?.ballerinaType)}
                                            </S.Type>
                                        )}
                                    </S.LabelContainer>
                                </S.HeaderContainer>
                                <S.EditorMdContainer>
                                    {documentation && <ReactMarkdown>{documentation}</ReactMarkdown>}
                                    {defaultValueText}
                                </S.EditorMdContainer>
                            </div>
                            <S.FieldInfoSection>
                                {isModeSwitcherAvailable() && (
                                    <ModeSwitcher
                                        value={inputMode}
                                        isRecordTypeField={!!recordTypeField}
                                        onChange={handleModeChange}
                                        types={field.types}
                                    />
                                )}
                            </S.FieldInfoSection>
                        </div>
                    </S.Header>
                )}
                <Controller
                    control={control}
                    name={key}
                    rules={{ required: required ?? (!field.optional && !field.placeholder) }}
                    render={({ field: { name, value, onChange }, fieldState: { error } }) => (
                        <div>
                            <ExpressionField
                                field={field}
                                inputMode={inputMode}
                                primaryMode={getInputModeFromTypes(getPrimaryInputType(field.types))}
                                name={name}
                                value={value}
                                completions={completions}
                                fileName={effectiveFileName}
                                targetLineRange={effectiveTargetLineRange}
                                autoFocus={recordTypeField ? false : autoFocus}
                                sanitizedExpression={(inputMode === InputMode.PROMPT || inputMode === InputMode.TEMPLATE) ? sanitizedExpression : undefined}
                                rawExpression={(inputMode === InputMode.PROMPT || inputMode === InputMode.TEMPLATE) ? rawExpression : undefined}
                                ariaLabel={field.label}
                                placeholder={placeholder}
                                onChange={async (updatedValue: string, updatedCursorPosition: number) => {

                                    // clear field diagnostics
                                    setFormDiagnostics([]);
                                    // Use ref to get current mode (not stale closure value)
                                    const currentMode = inputModeRef.current;
                                    const rawValue = (currentMode === InputMode.PROMPT || currentMode === InputMode.TEMPLATE) && rawExpression ? rawExpression(updatedValue) : updatedValue;

                                    onChange(rawValue);
                                    if (getExpressionEditorDiagnostics && (currentMode === InputMode.EXP || currentMode === InputMode.PROMPT || currentMode === InputMode.TEMPLATE)) {
                                        getExpressionEditorDiagnostics(
                                            (required ?? !field.optional) || updatedValue !== '',
                                            updatedValue,
                                            key,
                                            getPropertyFromFormField(field)
                                        );
                                    }

                                    // Check if the current character is a trigger character
                                    const triggerCharacter =
                                        updatedCursorPosition > 0
                                            ? triggerCharacters.find((char) => updatedValue[updatedCursorPosition - 1] === char)
                                            : undefined;
                                    if (triggerCharacter) {
                                        await retrieveCompletions(
                                            updatedValue,
                                            getPropertyFromFormField(field),
                                            updatedCursorPosition,
                                            triggerCharacter
                                        );
                                    } else {
                                        await retrieveCompletions(
                                            updatedValue,
                                            getPropertyFromFormField(field),
                                            updatedCursorPosition
                                        );
                                    }
                                }}
                                extractArgsFromFunction={handleExtractArgsFromFunction}
                                onCompletionSelect={handleCompletionSelect}
                                onFocus={async () => {
                                    handleFocus(onChange);
                                }}
                                onBlur={handleBlur}
                                onSave={handleSave}
                                onCancel={onCancel}
                                onRemove={onRemove}
                                isHelperPaneOpen={isHelperPaneOpen}
                                changeHelperPaneState={handleChangeHelperPaneState}
                                getHelperPane={handleGetHelperPane}
                                helperPaneHeight={helperPaneHeight}
                                helperPaneWidth={recordTypeField ? 400 : undefined}
                                growRange={growRange}
                                helperPaneZIndex={helperPaneZIndex}
                                exprRef={exprRef}
                                anchorRef={anchorRef}
                                onToggleHelperPane={toggleHelperPaneState}
                                onOpenExpandedMode={onOpenExpandedMode}
                                isInExpandedMode={isExpandedModalOpen}
                            />
                            {error ?
                                <ErrorBanner errorMsg={error.message.toString()} /> :
                                formDiagnostics && formDiagnostics.length > 0 &&
                                <ErrorBanner errorMsg={formDiagnostics.map(d => d.message).join(', ')} />
                            }
                            {onOpenExpandedMode && toEditorMode(inputModeRef.current) && (
                                <ExpandedEditor
                                    isOpen={isExpandedModalOpen}
                                    field={field}
                                    value={watch(key)}
                                    onChange={async (updatedValue: string, updatedCursorPosition: number) => {

                                        // clear field diagnostics
                                        setFormDiagnostics([]);
                                        // Use ref to get current mode (not stale closure value)
                                        const currentMode = inputModeRef.current;
                                        const rawValue = (currentMode === InputMode.PROMPT || currentMode === InputMode.TEMPLATE) && rawExpression ? rawExpression(updatedValue) : updatedValue;

                                        onChange(rawValue);
                                        if (getExpressionEditorDiagnostics && (currentMode === InputMode.EXP || currentMode === InputMode.PROMPT || currentMode === InputMode.TEMPLATE)) {
                                            getExpressionEditorDiagnostics(
                                                (required ?? !field.optional) || rawValue !== '',
                                                rawValue,
                                                key,
                                                getPropertyFromFormField(field)
                                            );
                                        }

                                        // Check if the current character is a trigger character
                                        const triggerCharacter =
                                            updatedCursorPosition > 0
                                                ? triggerCharacters.find((char) => rawValue[updatedCursorPosition - 1] === char)
                                                : undefined;
                                        if (triggerCharacter) {
                                            await retrieveCompletions(
                                                rawValue,
                                                getPropertyFromFormField(field),
                                                updatedCursorPosition,
                                                triggerCharacter
                                            );
                                        } else {
                                            await retrieveCompletions(
                                                rawValue,
                                                getPropertyFromFormField(field),
                                                updatedCursorPosition
                                            );
                                        }
                                    }}
                                    onClose={() => {
                                        setIsExpandedModalOpen(false)
                                    }}
                                    onSave={handleSaveExpandedMode}
                                    mode={toEditorMode(inputModeRef.current)!}
                                    completions={completions}
                                    fileName={effectiveFileName}
                                    targetLineRange={effectiveTargetLineRange}
                                    sanitizedExpression={sanitizedExpression}
                                    rawExpression={rawExpression}
                                    extractArgsFromFunction={handleExtractArgsFromFunction}
                                    getHelperPane={handleGetHelperPane}
                                    error={error}
                                    formDiagnostics={formDiagnostics}
                                    inputMode={inputModeRef.current}
                                />
                            )}
                        </div>
                    )}
                />
            </S.Container>
            {showModeSwitchWarning && (
                <WarningPopup
                    isOpen={showModeSwitchWarning}
                    onContinue={handleModeSwitchWarningContinue}
                    onCancel={handleModeSwitchWarningCancel}
                />
            )}
        </FieldProvider>
    );
};
