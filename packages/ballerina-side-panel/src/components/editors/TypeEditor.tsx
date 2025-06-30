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

import React, { useEffect, useRef, useState } from "react";
import {
    Codicon,
    ErrorBanner,
    FormExpressionEditor,
    FormExpressionEditorRef,
    HelperPaneHeight,
    Icon,
    RequiredFormInput,
    ThemeColors,
    Tooltip,
    Typography
} from "@wso2/ui-toolkit";
import { FormField } from "../Form/types";
import { useFormContext } from "../../context";
import { Controller } from "react-hook-form";
import { S } from "./ExpressionEditor";
import { sanitizeType } from "./utils";
import { debounce } from "lodash";
import styled from "@emotion/styled";
import ReactMarkdown from "react-markdown";

interface TypeEditorProps {
    field: FormField;
    openRecordEditor: (open: boolean) => void;
    handleOnFieldFocus?: (key: string) => void;
    handleOnTypeChange?: () => void;
    autoFocus?: boolean;
}

const Ribbon = styled.div({
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

const EditorRibbon = ({ onClick }: { onClick: () => void }) => {
    return (
        <Tooltip content="Add Type" containerSx={{ cursor: 'default' }}>
            <Ribbon onClick={onClick}>
                <Icon name="bi-type" sx={{ 
                    color: ThemeColors.ON_PRIMARY, 
                    fontSize: '12px', 
                    width: '12px', 
                    height: '12px'
                }} />
            </Ribbon>
        </Tooltip>
    );
};

const getDefaultCompletion = (newType: string) => {
    return (
        <S.TitleContainer>
            <Codicon name="add" />
            <Typography variant="body3" sx={{ fontWeight: 600 }}>
                Add Type: {newType}
            </Typography>
        </S.TitleContainer>
    )
}

export function TypeEditor(props: TypeEditorProps) {
    const { field, openRecordEditor, handleOnFieldFocus, handleOnTypeChange, autoFocus } = props;
    const { form, expressionEditor } = useFormContext();
    const { control } = form;
    const {
        types,
        referenceTypes,
        helperPaneOrigin: typeHelperOrigin,
        helperPaneHeight: typeHelperHeight,
        retrieveVisibleTypes,
        getTypeHelper,
        onFocus,
        onBlur,
        onCompletionItemSelect,
        onSave,
        onCancel,
    } = expressionEditor;

    const exprRef = useRef<FormExpressionEditorRef>(null);
    const typeBrowserRef = useRef<HTMLDivElement>(null);

    const cursorPositionRef = useRef<number | undefined>(undefined);
    const [showDefaultCompletion, setShowDefaultCompletion] = useState<boolean>(false);
    const [focused, setFocused] = useState<boolean>(false);

    const [isTypeHelperOpen, setIsTypeHelperOpen] = useState<boolean>(false);

    const handleFocus = async (value: string) => {
        setFocused(true);
        // Trigger actions on focus
        await onFocus?.();
        await retrieveVisibleTypes(value, value.length, true, field.valueTypeConstraint as string);
        handleOnFieldFocus?.(field.key);
    };

    const handleBlur = async () => {
        setFocused(false);
        // Trigger actions on blur
        await onBlur?.();
        setShowDefaultCompletion(undefined);
        // Clean up memory
        cursorPositionRef.current = undefined;
    };

    const handleCompletionSelect = async (value: string) => {
        // Trigger actions on completion select
        await onCompletionItemSelect?.(value, field.key);

        // Set cursor position
        const cursorPosition = exprRef.current?.shadowRoot?.querySelector('textarea')?.selectionStart;
        cursorPositionRef.current = cursorPosition;
        setShowDefaultCompletion(false);
    };

    const handleCancel = () => {
        onCancel?.();
        handleChangeTypeHelperState(false);
        setShowDefaultCompletion(false);
    }

    const handleDefaultCompletionSelect = () => {
        openRecordEditor(true);
        handleCancel();
    }

    const handleTypeEdit = (value: string) => {
        handleOnTypeChange && handleOnTypeChange();
    };

    const debouncedTypeEdit = debounce(handleTypeEdit, 300);

    const handleChangeTypeHelperState = (isOpen: boolean) => {
        setIsTypeHelperOpen(isOpen);
    };

    const toggleTypeHelperPaneState = () => {
        if (!isTypeHelperOpen) {
            exprRef.current?.focus();
        } else {
            handleChangeTypeHelperState(false);
        }
    };

    const handleGetTypeHelper = (
        value: string,
        onChange: (value: string, updatedCursorPosition: number) => void,
        helperPaneHeight: HelperPaneHeight
    ) => {
        return getTypeHelper(
            field.key,
            field.valueTypeConstraint as string,
            typeBrowserRef,
            value,
            cursorPositionRef.current,
            isTypeHelperOpen,
            onChange,
            handleChangeTypeHelperState,
            helperPaneHeight,
            handleCancel
        );
    }

    /* Track cursor position */
    const handleSelectionChange = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return;
        }

        const range = selection.getRangeAt(0);

        if (exprRef.current?.parentElement.contains(range.startContainer)) {
            cursorPositionRef.current = exprRef.current?.inputElement?.selectionStart ?? 0;
        }
    }

    useEffect(() => {
        const typeField = exprRef.current;
        if (!typeField) {
            return;
        }

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        }
    }, [exprRef.current]);

    return (
        <S.Container>
            <S.HeaderContainer>
                <S.Header>
                    <S.LabelContainer>
                        <S.Label>{field.label}</S.Label>
                        {!field.optional && <RequiredFormInput />}
                    </S.LabelContainer>
                    <S.EditorMdContainer>
                        {field.documentation && <ReactMarkdown>{field.documentation}</ReactMarkdown>}
                    </S.EditorMdContainer>
                </S.Header>
                {field.valueTypeConstraint && 
                    <S.Type isVisible={focused} title={field.valueTypeConstraint as string}>{sanitizeType(field.valueTypeConstraint as string)}</S.Type>}
            </S.HeaderContainer>
            <Controller
                control={control}
                name={field.key}
                defaultValue={field.value}
                rules={{
                    required: {
                        value: !field.optional,
                        message: `${field.label} is required`
                    }
                }}
                render={({ field: { name, value, onChange }, fieldState: { error } }) => (
                    <div>
                        <FormExpressionEditor
                            key={field.key}
                            ref={exprRef}
                            anchorRef={typeBrowserRef}
                            name={name}
                            startAdornment={<EditorRibbon onClick={toggleTypeHelperPaneState} />}
                            completions={types}
                            showDefaultCompletion={showDefaultCompletion}
                            getDefaultCompletion={() => getDefaultCompletion(value)}
                            value={value}
                            ariaLabel={field.label}
                            onChange={async (updatedValue: string, updatedCursorPosition: number) => {
                                if (updatedValue === value) {
                                    return;
                                }

                                onChange(updatedValue);
                                debouncedTypeEdit(updatedValue);
                                cursorPositionRef.current = updatedCursorPosition;

                                // Set show default completion
                                const typeExists = referenceTypes.find((type) => type.label === updatedValue);
                                const validTypeForCreation = updatedValue.match(/^[a-zA-Z_'][a-zA-Z0-9_]*$/);
                                if (updatedValue && !typeExists && validTypeForCreation) {
                                    setShowDefaultCompletion(true);
                                } else {
                                    setShowDefaultCompletion(false);
                                }

                                // Retrieve types
                                await retrieveVisibleTypes(
                                    updatedValue,
                                    updatedCursorPosition,
                                    false,
                                    field.valueTypeConstraint as string
                                );
                            }}
                            onCompletionSelect={handleCompletionSelect}
                            onDefaultCompletionSelect={handleDefaultCompletionSelect}
                            onFocus={() => handleFocus(value)}
                            enableExIcon={false}
                            isHelperPaneOpen={isTypeHelperOpen}
                            changeHelperPaneState={handleChangeTypeHelperState}
                            getHelperPane={handleGetTypeHelper}
                            helperPaneOrigin={typeHelperOrigin}
                            helperPaneHeight={typeHelperHeight}
                            onBlur={handleBlur}
                            onSave={onSave}
                            onCancel={handleCancel}
                            placeholder={field.placeholder}
                            autoFocus={autoFocus}
                            sx={{ paddingInline: '0' }}
                        />
                        {error?.message && <ErrorBanner errorMsg={error.message.toString()} />}
                    </div>
                )}
            />
        </S.Container>
    );
}
