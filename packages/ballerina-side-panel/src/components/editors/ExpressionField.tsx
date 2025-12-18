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

import React, { RefObject } from 'react';
import {
    CompletionItem,
    FnSignatureDocumentation,
    FormExpressionEditorRef,
    HelperPaneHeight,
    ThemeColors,
    Tooltip
} from '@wso2/ui-toolkit';
import { S } from './ExpressionEditor';
import TextModeEditor from './MultiModeExpressionEditor/TextExpressionEditor/TextModeEditor';
import { InputMode, TokenType } from './MultiModeExpressionEditor/ChipExpressionEditor/types';
import { LineRange } from '@wso2/ballerina-core/lib/interfaces/common';
import { FormField, HelperpaneOnChangeOptions } from '../Form/types';
import { ChipExpressionEditorComponent } from './MultiModeExpressionEditor/ChipExpressionEditor/components/ChipExpressionEditor';
import RecordConfigPreviewEditor from './MultiModeExpressionEditor/RecordConfigPreviewEditor/RecordConfigPreviewEditor';
import { RawTemplateEditorConfig, StringTemplateEditorConfig } from './MultiModeExpressionEditor/Configurations';
import NumberExpressionEditor from './MultiModeExpressionEditor/NumberExpressionEditor/NumberEditor';
import { EnumEditor } from './MultiModeExpressionEditor/EnumEditor/EnumEditor';
import { SQLExpressionEditor } from './MultiModeExpressionEditor/SqlExpressionEditor/SqlExpressionEditor';
import BooleanEditor from './MultiModeExpressionEditor/BooleanEditor/BooleanEditor';
import { getPrimaryInputType, isDropDownType } from '@wso2/ballerina-core';
import { DynamicArrayBuilder } from './MultiModeExpressionEditor/DynamicArrayBuilder/DynamicArrayBuilder';
import { ChipExpressionEditorDefaultConfiguration } from './MultiModeExpressionEditor/ChipExpressionEditor/ChipExpressionDefaultConfig';

export interface ExpressionFieldProps {
    field: FormField;
    inputMode: InputMode;
    primaryMode: InputMode;
    name: string;
    value: string | any[];
    fileName?: string;
    targetLineRange?: LineRange;
    completions: CompletionItem[];
    autoFocus?: boolean;
    sanitizedExpression?: (value: string) => string;
    rawExpression?: (value: string) => string;
    ariaLabel?: string;
    placeholder?: string;
    onChange: (updatedValue: string, updatedCursorPosition: number) => void;
    extractArgsFromFunction?: (value: string, cursorPosition: number) => Promise<{
        label: string;
        args: string[];
        currentArgIndex: number;
        documentation?: FnSignatureDocumentation;
    }>;
    onCompletionSelect?: (value: string, item: CompletionItem) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onSave?: (value: string) => void;
    onCancel?: () => void;
    onRemove?: () => void;
    isHelperPaneOpen: boolean;
    changeHelperPaneState: (isOpen: boolean) => void;
    getHelperPane?: (
        value: string,
        onChange: (value: string, options?: HelperpaneOnChangeOptions) => void,
        helperPaneHeight: HelperPaneHeight
    ) => React.ReactNode;
    helperPaneHeight?: HelperPaneHeight;
    helperPaneWidth?: number;
    growRange?: { start: number; offset: number };
    helperPaneZIndex?: number;
    exprRef: RefObject<FormExpressionEditorRef>;
    anchorRef: RefObject<HTMLDivElement>;
    onToggleHelperPane: () => void;
    onOpenExpandedMode?: () => void;
    isInExpandedMode?: boolean;
}

const EditorRibbon = ({ onClick }: { onClick: () => void }) => {
    return (
        <Tooltip content="Add Expression" containerSx={{ cursor: 'default' }}>
            <S.Ribbon onClick={onClick}>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    style={{ color: ThemeColors.ON_PRIMARY }}>
                    <path
                        fill="currentColor"
                        d="M12.42 5.29c-1.1-.1-2.07.71-2.17 1.82L10 10h2.82v2h-3l-.44 5.07A4.001 4.001 0 0 1 2 18.83l1.5-1.5c.33 1.05 1.46 1.64 2.5 1.3c.78-.24 1.33-.93 1.4-1.74L7.82 12h-3v-2H8l.27-3.07a4.01 4.01 0 0 1 4.33-3.65c1.26.11 2.4.81 3.06 1.89l-1.5 1.5c-.25-.77-.93-1.31-1.74-1.38M22 13.65l-1.41-1.41l-2.83 2.83l-2.83-2.83l-1.43 1.41l2.85 2.85l-2.85 2.81l1.43 1.41l2.83-2.83l2.83 2.83L22 19.31l-2.83-2.81z" />
                </svg>
            </S.Ribbon>
        </Tooltip>
    );
};

export const getEditorConfiguration = (inputMode: InputMode, primaryMode: InputMode) => {
    switch (inputMode) {
        case InputMode.TEXT:
            return new StringTemplateEditorConfig();
        case InputMode.TEMPLATE:
            return new RawTemplateEditorConfig();
        default:
            return new ChipExpressionEditorDefaultConfiguration();
    }
};

export const ExpressionField: React.FC<ExpressionFieldProps> = (props: ExpressionFieldProps) => {
    const {
        inputMode,
        field,
        primaryMode,
        name,
        value,
        completions,
        autoFocus,
        ariaLabel,
        placeholder,
        fileName,
        targetLineRange,
        onChange,
        extractArgsFromFunction,
        onFocus,
        onBlur,
        onSave,
        onCancel,
        onRemove,
        getHelperPane,
        growRange,
        exprRef,
        anchorRef,
        sanitizedExpression,
        rawExpression,
        onOpenExpandedMode,
        isInExpandedMode
    } = props;

    if ( inputMode === InputMode.ARRAY) {
        return (
            <DynamicArrayBuilder
                value={value}
                expressionFieldProps={props}
            />
        );
    }
    if (Array.isArray(value)) {
        throw new Error(`Invalid value type: expected a string but received an array for input mode ${inputMode}`);
    }

    const primaryInputType = getPrimaryInputType(field.types || []);
    if (inputMode === InputMode.BOOLEAN) {
        return (
            <BooleanEditor
                value={value}
                field={field}
                onChange={(val) => onChange(val, val.length)}
            />
        );
    }
    if (inputMode === InputMode.DROPDOWN && isDropDownType(primaryInputType)) {
        return (
            <EnumEditor
                value={value}
                field={field}
                onChange={(val) => onChange(val, val.length)}
                items={primaryInputType.options}

            />
        );
    }
    if (inputMode === InputMode.RECORD) {
        return (
            <RecordConfigPreviewEditor
                exprRef={exprRef}
                anchorRef={anchorRef}
                name={name}
                value={value}
                autoFocus={autoFocus}
                ariaLabel={ariaLabel}
                onChange={onChange}
                onFocus={onFocus}
                onBlur={onBlur}
                onSave={onSave}
                onCancel={onCancel}
                onRemove={onRemove}
                growRange={growRange}
                placeholder={placeholder}
                onOpenExpandedMode={onOpenExpandedMode}
                isInExpandedMode={isInExpandedMode}
            />
        );
    }
    if (inputMode === InputMode.TEXT) {
        return (
            <TextModeEditor
                getHelperPane={getHelperPane}
                isExpandedVersion={false}
                completions={completions}
                onChange={onChange}
                value={value}
                sanitizedExpression={sanitizedExpression}
                rawExpression={rawExpression}
                fileName={fileName}
                targetLineRange={targetLineRange}
                extractArgsFromFunction={extractArgsFromFunction}
                onOpenExpandedMode={onOpenExpandedMode}
                onRemove={onRemove}
                isInExpandedMode={isInExpandedMode}
                configuration={getEditorConfiguration(inputMode, primaryMode)}
            />

        );
    }
    if (inputMode === InputMode.TEMPLATE) {
        return (
            <TextModeEditor
                getHelperPane={getHelperPane}
                isExpandedVersion={false}
                completions={completions}
                onChange={onChange}
                value={value}
                sanitizedExpression={sanitizedExpression}
                rawExpression={rawExpression}
                fileName={fileName}
                targetLineRange={targetLineRange}
                extractArgsFromFunction={extractArgsFromFunction}
                onOpenExpandedMode={onOpenExpandedMode}
                onRemove={onRemove}
                isInExpandedMode={isInExpandedMode}
                configuration={new RawTemplateEditorConfig()}
            />

        );
    }
    if (inputMode === InputMode.PROMPT) {
        return (
            <TextModeEditor
                getHelperPane={getHelperPane}
                isExpandedVersion={false}
                completions={completions}
                onChange={onChange}
                value={value}
                sanitizedExpression={sanitizedExpression}
                rawExpression={rawExpression}
                fileName={fileName}
                targetLineRange={targetLineRange}
                extractArgsFromFunction={extractArgsFromFunction}
                onOpenExpandedMode={onOpenExpandedMode}
                onRemove={onRemove}
                isInExpandedMode={isInExpandedMode}
                configuration={getPrimaryInputType(field.types)?.ballerinaType === "ai:Prompt" ? new RawTemplateEditorConfig() : new StringTemplateEditorConfig()}
            />

        );
    }
    if (inputMode === InputMode.NUMBER) {
        return (
            <NumberExpressionEditor
                getHelperPane={getHelperPane}
                isExpandedVersion={false}
                completions={completions}
                onChange={onChange}
                value={value}
                sanitizedExpression={sanitizedExpression}
                rawExpression={rawExpression}
                fileName={fileName}
                targetLineRange={targetLineRange}
                extractArgsFromFunction={extractArgsFromFunction}
                onOpenExpandedMode={onOpenExpandedMode}
                onRemove={onRemove}
                isInExpandedMode={isInExpandedMode}
            />

        );
    }
    if (inputMode === InputMode.SQL) {
        return (
            <SQLExpressionEditor
                getHelperPane={getHelperPane}
                isExpandedVersion={false}
                completions={completions}
                onChange={onChange}
                value={value}
                sanitizedExpression={sanitizedExpression}
                rawExpression={rawExpression}
                fileName={fileName}
                targetLineRange={targetLineRange}
                extractArgsFromFunction={extractArgsFromFunction}
                onOpenExpandedMode={onOpenExpandedMode}
                onRemove={onRemove}
                isInExpandedMode={isInExpandedMode}
            />
        );
    }

    return (
        <ChipExpressionEditorComponent
            getHelperPane={getHelperPane}
            isExpandedVersion={false}
            completions={completions}
            onChange={onChange}
            value={value}
            sanitizedExpression={sanitizedExpression}
            rawExpression={rawExpression}
            fileName={fileName}
            targetLineRange={targetLineRange}
            extractArgsFromFunction={extractArgsFromFunction}
            onOpenExpandedMode={onOpenExpandedMode}
            onRemove={onRemove}
            isInExpandedMode={isInExpandedMode}
            configuration={getEditorConfiguration(inputMode, primaryMode)}
        />
    );
};
