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

import { debounce } from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import { Control, Controller, FieldValues, UseFormWatch } from 'react-hook-form';
import styled from '@emotion/styled';
import {
    Button,
    CompletionItem,
    ErrorBanner,
    FormExpressionEditor,
    FormExpressionEditorRef,
    HelperPaneHeight,
    Icon,
    RequiredFormInput,
    ThemeColors,
    Tooltip
} from '@wso2/ui-toolkit';
import { getPropertyFromFormField, sanitizeType } from './utils';
import { FormField, FormExpressionEditorProps } from '../Form/types';
import { useFormContext } from '../../context';
import {
    LineRange,
    RecordTypeField,
    SubPanel,
    SubPanelView,
    SubPanelViewProps
} from '@wso2/ballerina-core';
import ReactMarkdown from 'react-markdown';

export type ContextAwareExpressionEditorProps = {
    id?: string;
    fieldKey?: string;
    placeholder?: string;
    required?: boolean;
    showHeader?: boolean;
    field: FormField;
    openSubPanel?: (subPanel: SubPanel) => void;
    subPanelView?: SubPanelView;
    handleOnFieldFocus?: (key: string) => void;
    autoFocus?: boolean;
    visualizable?: boolean;
    recordTypeField?: RecordTypeField;
};

type ExpressionEditorProps = ContextAwareExpressionEditorProps &
    FormExpressionEditorProps & {
        control: Control<FieldValues, any>;
        watch: UseFormWatch<any>;
        targetLineRange?: LineRange;
        fileName: string;
    };

export namespace S {
    export const Container = styled.div({
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontFamily: 'var(--font-family)'
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
        justifyContent: 'space-between'
    });

    export const Header = styled.div({
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    });

    export const Type = styled.div<{ isVisible: boolean }>(({ isVisible }) => ({
        color: ThemeColors.PRIMARY,
        fontFamily: 'monospace',
        fontSize: '12px',
        border: `1px solid ${ThemeColors.PRIMARY}`,
        borderRadius: '999px',
        padding: '2px 8px',
        display: 'inline-block',
        userSelect: 'none',
        maxWidth: '148px',
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
        color: var(--vscode-textPreformat-foreground);
        font-family: var(--vscode-editor-font-family);
        font-size: 12px;
    `;

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

const EditorRibbon = ({ onClick }: { onClick: () => void }) => {
    return (
        <Tooltip content="Add Expression" containerSx={{ cursor: 'default' }}>
            <S.Ribbon onClick={onClick}>
                <Icon name="bi-expression" sx={{
                    color: ThemeColors.ON_PRIMARY,
                    fontSize: '12px',
                    width: '12px',
                    height: '12px'
                }} />
            </S.Ribbon>
        </Tooltip>
    );
};

export const ContextAwareExpressionEditor = (props: ContextAwareExpressionEditorProps) => {
    const { form, expressionEditor, targetLineRange, fileName } = useFormContext();

    return (
        <ExpressionEditor
            fileName={fileName}
            targetLineRange={targetLineRange}
            {...props}
            {...form}
            {...expressionEditor}
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
        openSubPanel,
        handleOnFieldFocus,
        subPanelView,
        targetLineRange,
        fileName,
        visualizable,
        helperPaneOrigin,
        helperPaneHeight,
        recordTypeField,
        growRange = { start: 1, offset: 9 },
        rawExpression, // original expression
        sanitizedExpression // sanitized expression that will be rendered in the editor
    } = props as ExpressionEditorProps;

    const key = fieldKey ?? field.key;
    const [focused, setFocused] = useState<boolean>(false);

    // If Form directly  calls ExpressionEditor without setting targetLineRange and fileName through context
    const { targetLineRange: contextTargetLineRange, fileName: contextFileName } = useFormContext();
    const effectiveTargetLineRange = targetLineRange ?? contextTargetLineRange;
    const effectiveFileName = fileName ?? contextFileName;

    const [isHelperPaneOpen, setIsHelperPaneOpen] = useState<boolean>(false);
    /* Define state to retrieve helper pane data */

    const exprRef = useRef<FormExpressionEditorRef>(null);
    const anchorRef = useRef<HTMLDivElement>(null);

    // Use to fetch initial diagnostics
    const fetchInitialDiagnostics = useRef<boolean>(true);
    const fieldValue = rawExpression ? rawExpression(watch(key)) : watch(key);

    // Initial render
    useEffect(() => {
        // Fetch initial diagnostics
        if (getExpressionEditorDiagnostics && fieldValue !== undefined && fetchInitialDiagnostics.current) {
            fetchInitialDiagnostics.current = false;
            getExpressionEditorDiagnostics(
                (required ?? !field.optional) || fieldValue !== '',
                fieldValue,
                key,
                getPropertyFromFormField(field)
            );
        }
    }, [fieldValue]);

    const handleFocus = async () => {
        setFocused(true);

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

    const handleOpenSubPanel = (view: SubPanelView, subPanelInfo: SubPanelViewProps) => {
        openSubPanel({
            view: view,
            props: view === SubPanelView.UNDEFINED ? undefined : subPanelInfo
        });
    };

    const handleInlineDataMapperOpen = (isUpdate: boolean) => {
        if (subPanelView === SubPanelView.INLINE_DATA_MAPPER && !isUpdate) {
            openSubPanel({ view: SubPanelView.UNDEFINED });
        } else {
            handleOpenSubPanel(SubPanelView.INLINE_DATA_MAPPER, {
                inlineDataMapper: {
                    filePath: effectiveFileName,
                    flowNode: undefined, // This will be updated in the Form component
                    position: {
                        line: effectiveTargetLineRange.startLine.line,
                        offset: effectiveTargetLineRange.startLine.offset
                    },
                    propertyKey: key,
                    editorKey: key
                }
            });
            handleOnFieldFocus?.(key);
        }
    };


    const handleChangeHelperPaneState = (isOpen: boolean) => {
        setIsHelperPaneOpen(isOpen);
    };

    const toggleHelperPaneState = () => {
        if (!isHelperPaneOpen) {
            exprRef.current?.focus();
        } else {
            handleChangeHelperPaneState(false);
        }
    };

    const handleGetHelperPane = (
        value: string,
        onChange: (value: string, updatedCursorPosition: number) => void,
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
            field.type === "LV_EXPRESSION"
        );
    };

    const updateSubPanelData = (value: string) => {
        if (subPanelView === SubPanelView.INLINE_DATA_MAPPER) {
            handleInlineDataMapperOpen(true);
        }
    };

    const handleExtractArgsFromFunction = async (value: string, cursorPosition: number) => {
        return await extractArgsFromFunction(value, getPropertyFromFormField(field), cursorPosition);
    };

    const debouncedUpdateSubPanelData = debounce(updateSubPanelData, 300);

    const codeActions = [
        visualizable && (
            <Button appearance="icon" onClick={() => handleInlineDataMapperOpen(false)}>
                <S.DataMapperBtnTxt>Map Data Inline</S.DataMapperBtnTxt>
            </Button>
        )
    ];

    const defaultValueText = field.defaultValue ?
        <S.DefaultValue>Defaults to {field.defaultValue}</S.DefaultValue> : null;

    const documentation = field.documentation
        ? field.documentation.endsWith('.')
            ? field.documentation
            : `${field.documentation}.`
        : '';
    
    return (
        <S.Container id={id}>
            {showHeader && (
                <S.Header>
                    <S.HeaderContainer>
                        <S.LabelContainer>
                            <S.Label>{field.label}</S.Label>
                            {(required ?? !field.optional) && <RequiredFormInput />}
                        </S.LabelContainer>
                        {field.valueTypeConstraint && (
                            <S.Type isVisible={focused} title={field.valueTypeConstraint as string}>
                                {sanitizeType(field.valueTypeConstraint as string)}
                            </S.Type>
                        )}
                    </S.HeaderContainer>
                        <S.EditorMdContainer>
                            {documentation && <ReactMarkdown>{documentation}</ReactMarkdown>}
                            {defaultValueText}
                        </S.EditorMdContainer>
                    </S.Header>
            )}
            <Controller
                control={control}
                name={key}
                rules={{ required: required ?? (!field.optional && !field.placeholder) }}
                render={({ field: { name, value, onChange }, fieldState: { error } }) => (
                    <div>
                        <FormExpressionEditor
                            key={key}
                            ref={exprRef}
                            anchorRef={anchorRef}
                            name={name}
                            completions={completions}
                            value={sanitizedExpression ? sanitizedExpression(value) : value}
                            autoFocus={autoFocus}
                            startAdornment={<EditorRibbon onClick={toggleHelperPaneState} />}
                            ariaLabel={field.label}
                            onChange={async (updatedValue: string, updatedCursorPosition: number) => {
                                if (updatedValue === value) {
                                    return;
                                }

                                const rawValue = rawExpression ? rawExpression(updatedValue) : updatedValue;
                                onChange(rawValue);
                                debouncedUpdateSubPanelData(rawValue);

                                if (getExpressionEditorDiagnostics) {
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
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            onSave={onSave}
                            onCancel={onCancel}
                            onRemove={onRemove}
                            enableExIcon={false}
                            isHelperPaneOpen={isHelperPaneOpen}
                            changeHelperPaneState={handleChangeHelperPaneState}
                            helperPaneOrigin="bottom"
                            getHelperPane={handleGetHelperPane}
                            helperPaneHeight={helperPaneHeight}
                            helperPaneWidth={recordTypeField ? 400 : undefined}
                            growRange={growRange}
                            sx={{ paddingInline: '0' }}
                            codeActions={codeActions}
                            placeholder={placeholder}
                        />
                        {error && <ErrorBanner errorMsg={error.message.toString()} />}
                    </div>
                )}
            />
        </S.Container>
    );
};
