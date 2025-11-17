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
import { getPropertyFromFormField, sanitizeType } from './utils';
import { FormField, FormExpressionEditorProps, HelperpaneOnChangeOptions } from '../Form/types';
import { useFormContext } from '../../context';
import {
    LineRange,
    RecordTypeField,
    SubPanel,
    SubPanelView
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
    valueTypeConstraint?: string;
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
    const [inputMode, setInputMode] = useState<InputMode>(recordTypeField ? InputMode.GUIDED : InputMode.EXP);
    const inputModeRef = useRef<InputMode>(inputMode);
    const [isExpressionEditorHovered, setIsExpressionEditorHovered] = useState<boolean>(false);
    const [showModeSwitchWarning, setShowModeSwitchWarning] = useState(false);
    const [targetInputMode, setTargetInputMode] = useState<InputMode | null>(null);
    const [formDiagnostics, setFormDiagnostics] = useState(field.diagnostics);
    const [isExpandedModalOpen, setIsExpandedModalOpen] = useState(false);

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
    const fieldValue = inputModeRef.current === InputMode.TEMPLATE && rawExpression ? rawExpression(watch(key)) : watch(key);

    // Initial render
    useEffect(() => {
        if (!targetLineRange) return;
        // Fetch initial diagnostics
        if (getExpressionEditorDiagnostics && fieldValue !== undefined
            && (inputMode === InputMode.EXP || inputMode === InputMode.TEMPLATE)
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
            setInputMode(InputMode.GUIDED);
            return;
        }

        let newInputMode = getInputModeFromTypes(field.valueTypeConstraint)
        if (isModeSwitcherRestricted()) {
            setInputMode(InputMode.EXP);
            return;
        }
        if (!newInputMode) {
            setInputMode(InputMode.EXP);
            return;
        }
        if (newInputMode === InputMode.TEXT
            && typeof initialFieldValue.current === 'string'
            && initialFieldValue.current.trim() !== ''
            && !(initialFieldValue.current.trim().startsWith("\"")
                && initialFieldValue.current.trim().endsWith("\"")
            )
        ) {
            setInputMode(InputMode.EXP)
        } else if (newInputMode === InputMode.TEMPLATE) {
            if (sanitizedExpression && rawExpression) {
                const sanitized = sanitizedExpression(initialFieldValue.current as string);
                if (sanitized === initialFieldValue.current) {
                    setInputMode(InputMode.EXP);
                } else {
                    setInputMode(InputMode.TEMPLATE);
                }
            }
        } else {
            setInputMode(newInputMode);
        }
    }, [field?.valueTypeConstraint, recordTypeField]);

    const handleFocus = async (controllerOnChange?: (value: string) => void) => {
        setFocused(true);

        // If in guided mode with recordTypeField, open ConfigureRecordPage directly
        if (inputMode === InputMode.GUIDED && recordTypeField && onOpenRecordConfigPage) {
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
            field.valueTypeConstraint,
            inputMode,
        );
    };

    const handleExtractArgsFromFunction = async (value: string, cursorPosition: number) => {
        return await extractArgsFromFunction(value, getPropertyFromFormField(field), cursorPosition);
    };

    const handleModeChange = (value: InputMode) => {
        const currentValue = watch(key);

        // Warn when switching from EXP to TEXT if value doesn't have quotes
        if (
            inputMode === InputMode.EXP
            && value === InputMode.TEXT
            && (!currentValue.trim().startsWith("\"") || !currentValue.trim().endsWith("\""))
            && currentValue.trim() !== ''
        ) {
            setTargetInputMode(value);
            setShowModeSwitchWarning(true);
            return;
        }

        // Warn when switching from EXP to TEMPLATE if sanitization would hide parts of the expression
        if (
            inputMode === InputMode.EXP
            && value === InputMode.TEMPLATE
            && sanitizedExpression
            && currentValue
            && currentValue.trim() !== ''
        ) {
            setTargetInputMode(value);
            if (currentValue === sanitizedExpression(currentValue)) {
                setShowModeSwitchWarning(true);
            } else {
                setInputMode(value);
            }
            return;
        }

        // Auto-add quotes when switching from TEXT to EXP if not present
        if (inputMode === InputMode.TEXT && value === InputMode.EXP) {
            if (currentValue && typeof currentValue === 'string' &&
                !currentValue.startsWith('"') && !currentValue.endsWith('"')) {
                setValue(key, `"${currentValue}"`);
            }
        }

        setInputMode(value);
    };

    const handleModeSwitchWarningContinue = () => {
        if (targetInputMode !== null) {
            setInputMode(targetInputMode);
            setTargetInputMode(null);
            if (targetInputMode === InputMode.TEMPLATE && inputMode === InputMode.EXP && rawExpression) {
                setValue(key, rawExpression(""));
            }
        }
        setShowModeSwitchWarning(false);
    };

    const handleModeSwitchWarningCancel = () => {
        setTargetInputMode(null);
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

    // Only allow opening expanded mode for specific fields or expression mode
    const onOpenExpandedMode = (!props.isInExpandedMode &&
        (["query", "instructions", "role"].includes(field.key) || inputMode === InputMode.EXP || inputMode === InputMode.TEMPLATE))
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
        if (nodeInfo?.kind === "FOREACH") return true;
        return false;
    };

    const isModeSwitcherAvailable = () => {
        if (recordTypeField) return true;
        if (isModeSwitcherRestricted()) return false;
        if (!(focused || isExpressionEditorHovered)) return false;
        if (!getInputModeFromTypes(field.valueTypeConstraint)) return false;
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
                                        {field.valueTypeConstraint && (
                                            <S.Type style={{ marginLeft: '5px' }} isVisible={focused} title={field.valueTypeConstraint as string}>
                                                {sanitizeType(field.valueTypeConstraint as string)}
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
                                        valueTypeConstraint={field.valueTypeConstraint}
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
                                inputMode={inputMode}
                                name={name}
                                value={value}
                                completions={completions}
                                fileName={effectiveFileName}
                                targetLineRange={effectiveTargetLineRange}
                                autoFocus={recordTypeField ? false : autoFocus}
                                sanitizedExpression={inputMode === InputMode.TEMPLATE ? sanitizedExpression : undefined}
                                rawExpression={inputMode === InputMode.TEMPLATE ? rawExpression : undefined}
                                ariaLabel={field.label}
                                placeholder={placeholder}
                                onChange={async (updatedValue: string, updatedCursorPosition: number) => {
                                    if (updatedValue === value) {
                                        return;
                                    }

                                    // clear field diagnostics
                                    setFormDiagnostics([]);
                                    // Use ref to get current mode (not stale closure value)
                                    const currentMode = inputModeRef.current;
                                    const rawValue = currentMode === InputMode.TEMPLATE && rawExpression ? rawExpression(updatedValue) : updatedValue;

                                    onChange(rawValue);
                                    if (getExpressionEditorDiagnostics && (currentMode === InputMode.EXP || currentMode === InputMode.TEMPLATE)) {
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
                            {onOpenExpandedMode && (
                                <ExpandedEditor
                                    isOpen={isExpandedModalOpen}
                                    field={field}
                                    value={watch(key)}
                                    onChange={async (updatedValue: string, updatedCursorPosition: number) => {
                                        if (updatedValue === value) {
                                            return;
                                        }

                                        // clear field diagnostics
                                        setFormDiagnostics([]);
                                        // Use ref to get current mode (not stale closure value)
                                        const currentMode = inputModeRef.current;
                                        const rawValue = currentMode === InputMode.TEMPLATE && rawExpression ? rawExpression(updatedValue) : updatedValue;

                                        onChange(rawValue);
                                        if (getExpressionEditorDiagnostics && (currentMode === InputMode.EXP || currentMode === InputMode.TEMPLATE)) {
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
                                    mode={inputMode === InputMode.EXP ? "expression" : undefined}
                                    completions={completions}
                                    fileName={effectiveFileName}
                                    targetLineRange={effectiveTargetLineRange}
                                    sanitizedExpression={inputMode === InputMode.TEMPLATE ? sanitizedExpression : undefined}
                                    rawExpression={inputMode === InputMode.TEMPLATE ? rawExpression : undefined}
                                    extractArgsFromFunction={handleExtractArgsFromFunction}
                                    getHelperPane={handleGetHelperPane}
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
