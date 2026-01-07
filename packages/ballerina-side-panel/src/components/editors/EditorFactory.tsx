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

import React from "react";

import { getPrimaryInputType, isDropDownType, isTemplateType, NodeKind, NodeProperties, RecordTypeField, SubPanel, SubPanelView } from "@wso2/ballerina-core";

import { FormField } from "../Form/types";
import { MultiSelectEditor } from "./MultiSelectEditor";
import { TextEditor } from "./TextEditor";
import { TypeEditor } from "./TypeEditor";
import { ContextAwareExpressionEditor, DataMapperJoinClauseRhsEditor } from "./ExpressionEditor";
import { ParamManagerEditor } from "../ParamManager/ParamManager";
import { DropdownEditor } from "./DropdownEditor";
import { FileSelect } from "./FileSelect";
import { CheckBoxEditor } from "./CheckBoxEditor";
import { ChoiceForm } from "./ChoiceForm";
import { FormMapEditor } from "./FormMapEditor";
import { TextAreaEditor } from "./TextAreaEditor";
import { DropdownChoiceForm } from "./DropdownChoiceForm";
import { IdentifierEditor } from "./IdentifierEditor";
import { ReadonlyField } from "./ReadonlyField";
import { ContextAwareRawExpressionEditor } from "./RawExpressionEditor";
import { IdentifierField } from "./IdentifierField";
import { PathEditor } from "./PathEditor";
import { HeaderSetEditor } from "./HeaderSetEditor";
import { CompletionItem } from "@wso2/ui-toolkit";
import { CustomDropdownEditor } from "./CustomDropdownEditor";
import { ActionExpressionEditor } from "./ActionExpressionEditor";
import { CheckBoxConditionalEditor } from "./CheckBoxConditionalEditor";
import { ActionTypeEditor } from "./ActionTypeEditor";
import { AutoCompleteEditor } from "./AutoCompleteEditor";

interface FormFieldEditorProps {
    field: FormField;
    selectedNode?: NodeKind;
    openRecordEditor?: (open: boolean, newType?: string | NodeProperties) => void;
    openSubPanel?: (subPanel: SubPanel) => void;
    subPanelView?: SubPanelView;
    handleOnFieldFocus?: (key: string) => void;
    onBlur?: () => void | Promise<void>;
    autoFocus?: boolean;
    handleOnTypeChange?: () => void;
    recordTypeFields?: RecordTypeField[];
    onIdentifierEditingStateChange?: (isEditing: boolean) => void;
    setSubComponentEnabled?: (isAdding: boolean) => void;
    handleNewTypeSelected?: (type: string | CompletionItem) => void;
    scopeFieldAddon?: React.ReactNode;
    isContextTypeEditorSupported?: boolean;
    openFormTypeEditor?: (open: boolean, newType?: string) => void;
}

export const EditorFactory = (props: FormFieldEditorProps) => {
    const {
        field,
        selectedNode,
        openRecordEditor,
        openSubPanel,
        subPanelView,
        handleOnFieldFocus,
        onBlur,
        autoFocus,
        handleOnTypeChange,
        recordTypeFields,
        onIdentifierEditingStateChange,
        setSubComponentEnabled,
        handleNewTypeSelected,
        isContextTypeEditorSupported,
        openFormTypeEditor,
        scopeFieldAddon
    } = props;

    const showWithExpressionEditor = field.types?.some(type => {
        return type && (
            type.fieldType === "EXPRESSION" ||
            type.fieldType === "LV_EXPRESSION" ||
            type.fieldType === "ACTION_OR_EXPRESSION" ||
            type.fieldType === "TEXT" ||
            type.fieldType === "EXPRESSION_SET" ||
            type.fieldType === "TEXT_SET" ||
            (type.fieldType === "SINGLE_SELECT" && isDropDownType(type)) ||
            type.fieldType === "RECORD_MAP_EXPRESSION"
        );
    });

    if (!field.enabled || field.hidden) {
        return <></>;
    } else if (field.type === "MULTIPLE_SELECT") {
        return <MultiSelectEditor field={field} label={"Attach Another"} openSubPanel={openSubPanel} />;
    } else if (field.type === "HEADER_SET") {
        return <HeaderSetEditor field={field} />;
    } else if (field.type === "CHOICE") {
        return <ChoiceForm field={field} recordTypeFields={recordTypeFields} />;
    } else if (field.type === "DROPDOWN_CHOICE") {
        return <DropdownChoiceForm field={field} />;
    } else if (field.type === "TEXTAREA" || field.type === "STRING") {
        return <TextAreaEditor field={field} />;
    } else if (field.type === "FLAG") {
        return <CheckBoxEditor field={field} />;
    } else if (field.type === "EXPRESSION" && field.key === "resourcePath") {
        // HACK: this should fixed with the LS API. this is used to avoid the expression editor for resource path field.
        return <TextEditor field={field} handleOnFieldFocus={handleOnFieldFocus} />;
    } else if (field.type?.toUpperCase() === "ENUM") {
        // Enum is a dropdown field
        return <DropdownEditor field={field} openSubPanel={openSubPanel} />;
    } else if (field.type?.toUpperCase() === "AUTOCOMPLETE") {
        return <AutoCompleteEditor field={field} openSubPanel={openSubPanel} />;
    } else if (field.type === "CUSTOM_DROPDOWN") {
        return <CustomDropdownEditor field={field} openSubPanel={openSubPanel} />;
    } else if (field.type === "FILE_SELECT" && field.editable) {
        return <FileSelect field={field} />;
    } else if (field.type === "SINGLE_SELECT" && !showWithExpressionEditor && field.editable) {
        return <DropdownEditor field={field} openSubPanel={openSubPanel} />;
    } else if (!field.items && (field.type === "ACTION_TYPE") && field.editable) {
        return (
            <ActionTypeEditor
                field={field}
                openRecordEditor={openRecordEditor}
                handleOnFieldFocus={handleOnFieldFocus}
                autoFocus={autoFocus}
                handleOnTypeChange={handleOnTypeChange}
                handleNewTypeSelected={handleNewTypeSelected}
            />
        );
    } else if (!field.items && (field.key === "type" || field.type === "TYPE") && field.editable) {
        return (
            <TypeEditor
                field={field}
                openRecordEditor={openRecordEditor}
                openFormTypeEditor={openFormTypeEditor}
                isContextTypeEditorSupported={isContextTypeEditorSupported}
                handleOnFieldFocus={handleOnFieldFocus}
                autoFocus={autoFocus}
                onBlur={onBlur}
                handleOnTypeChange={handleOnTypeChange}
                handleNewTypeSelected={handleNewTypeSelected}

            />
        );
    } else if (!field.items && (field.type === "RAW_TEMPLATE" || getPrimaryInputType(field.types)?.ballerinaType === "ai:Prompt") && field.editable) {
        return (
            <ContextAwareRawExpressionEditor
                field={field}
                openSubPanel={openSubPanel}
                subPanelView={subPanelView}
                handleOnFieldFocus={handleOnFieldFocus}
                onBlur={onBlur}
                autoFocus={autoFocus}
                recordTypeField={recordTypeFields?.find(recordField => recordField.key === field.key)}
            />
        );

    } else if (!field.items && field.type === "ACTION_EXPRESSION") {
        return (
            <ActionExpressionEditor
                field={field}
                openSubPanel={openSubPanel}
                subPanelView={subPanelView}
                handleOnFieldFocus={handleOnFieldFocus}
                autoFocus={autoFocus}
                recordTypeField={recordTypeFields?.find(recordField => recordField.key === field.key)}
            />
        );
    } else if (showWithExpressionEditor && field.editable) {
        // Expression field is a inline expression editor
        return (
            <ContextAwareExpressionEditor
                field={field}
                openSubPanel={openSubPanel}
                subPanelView={subPanelView}
                handleOnFieldFocus={handleOnFieldFocus}
                onBlur={onBlur}
                autoFocus={autoFocus}
                recordTypeField={recordTypeFields?.find(recordField => recordField.key === field.key)}
            />
        );
    } else if (field.type === "VIEW") {
        // Skip this property
        return <></>;
    } else if (
        (field.type === "PARAM_MANAGER") ||
        (field.type === "REPEATABLE_PROPERTY" && isTemplateType(getPrimaryInputType(field.types)))
    ) {
        return <ParamManagerEditor setSubComponentEnabled={setSubComponentEnabled} field={field} openRecordEditor={openRecordEditor} handleOnFieldFocus={handleOnFieldFocus} selectedNode={selectedNode} />;
    } else if (field.type === "REPEATABLE_PROPERTY") {
        return <FormMapEditor field={field} label={"Add Another Key-Value Pair"} />;
    } else if (field.type === "IDENTIFIER" && !field.editable && field?.lineRange) {
        return <IdentifierEditor
            field={field}
            handleOnFieldFocus={handleOnFieldFocus}
            autoFocus={autoFocus}
            onEditingStateChange={onIdentifierEditingStateChange}
        />;
    } else if (field.type !== "IDENTIFIER" && !field.editable) {
        return <ReadonlyField field={field} />;
    } else if (field.type === "IDENTIFIER" && field.editable) {
        return <IdentifierField field={field} handleOnFieldFocus={handleOnFieldFocus} autoFocus={autoFocus} onBlur={onBlur} />;
    } else if (field.type === "SERVICE_PATH" || field.type === "ACTION_PATH") {
        return <PathEditor field={field} handleOnFieldFocus={handleOnFieldFocus} autoFocus={autoFocus} />;
    } else if (field.type === "CONDITIONAL_FIELDS" && field.editable) {
        // Conditional fields is a group of fields which are conditionally shown based on a checkbox field
        return (
            <CheckBoxConditionalEditor
                field={field}
            />
        );
    } else if (field.type === "DM_JOIN_CLAUSE_RHS_EXPRESSION") {
        // Expression field for Data Mapper join on condition RHS
        return (
            <DataMapperJoinClauseRhsEditor
                field={field}
                openSubPanel={openSubPanel}
                subPanelView={subPanelView}
                handleOnFieldFocus={handleOnFieldFocus}
                onBlur={onBlur}
                autoFocus={autoFocus}
                recordTypeField={recordTypeFields?.find(recordField => recordField.key === field.key)}
            />
        );
    } else {
        // Default to text editor
        // Readonly fields are also treated as text editor
        return <TextEditor field={field} handleOnFieldFocus={handleOnFieldFocus} autoFocus={autoFocus} />;
    }
};
