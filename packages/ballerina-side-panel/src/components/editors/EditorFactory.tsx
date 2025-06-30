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

import { NodeKind, RecordTypeField, SubPanel, SubPanelView } from "@wso2/ballerina-core";

import { FormField } from "../Form/types";
import { MultiSelectEditor } from "./MultiSelectEditor";
import { TextEditor } from "./TextEditor";
import { TypeEditor } from "./TypeEditor";
import { ContextAwareExpressionEditor } from "./ExpressionEditor";
import { ParamManagerEditor } from "../ParamManager/ParamManager";
import { DropdownEditor } from "./DropdownEditor";
import { FileSelect } from "./FileSelect";
import { CheckBoxEditor } from "./CheckBoxEditor";
import { ArrayEditor } from "./ArrayEditor";
import { MapEditor } from "./MapEditor";
import { ChoiceForm } from "./ChoiceForm";
import { FormMapEditor } from "./FormMapEditor";
import { TextAreaEditor } from "./TextAreaEditor";
import { DropdownChoiceForm } from "./DropdownChoiceForm";
import { IdentifierEditor } from "./IdentifierEditor";
import { ReadonlyField } from "./ReadonlyField";
import { ContextAwareRawExpressionEditor } from "./RawExpressionEditor";
import { IdentifierField } from "./IdentifierField";
import { PathEditor } from "./PathEditor";

interface FormFieldEditorProps {
    field: FormField;
    selectedNode?: NodeKind;
    openRecordEditor?: (open: boolean) => void;
    openSubPanel?: (subPanel: SubPanel) => void;
    subPanelView?: SubPanelView;
    handleOnFieldFocus?: (key: string) => void;
    autoFocus?: boolean;
    handleOnTypeChange?: () => void;
    visualizableFields?: string[];
    recordTypeFields?: RecordTypeField[];
    onIdentifierEditingStateChange?: (isEditing: boolean) => void;
}

export const EditorFactory = (props: FormFieldEditorProps) => {
    const {
        field,
        selectedNode,
        openRecordEditor,
        openSubPanel,
        subPanelView,
        handleOnFieldFocus,
        autoFocus,
        handleOnTypeChange,
        visualizableFields,
        recordTypeFields,
        onIdentifierEditingStateChange
    } = props;
    if (!field.enabled || field.hidden) {
        return <></>;
    } else if (field.type === "MULTIPLE_SELECT") {
        return <MultiSelectEditor field={field} label={"Attach Another"} openSubPanel={openSubPanel} />;
    } else if (field.type === "CHOICE") {
        return <ChoiceForm field={field} recordTypeFields={recordTypeFields} />;
    } else if (field.type === "DROPDOWN_CHOICE") {
        return <DropdownChoiceForm field={field} />;
    } else if (field.type === "TEXTAREA" || field.type === "STRING") {
        return <TextAreaEditor field={field} />;
    } else if (field.type === "EXPRESSION_SET") {
        return <ArrayEditor field={field} label={"Add Another Value"} />;
    } else if (field.type === "MAPPING_EXPRESSION_SET") {
        return (
            <MapEditor
                field={field}
                label={"Add Another Key-Value Pair"}
                openSubPanel={openSubPanel}
                subPanelView={subPanelView}
                handleOnFieldFocus={handleOnFieldFocus}
                autoFocus={autoFocus}
                visualizable={visualizableFields?.includes(field.key)}
                recordTypeField={recordTypeFields?.find(recordField => recordField.key === field.key)}
            />
        );
    } else if (field.type === "FLAG") {
        return <CheckBoxEditor field={field} />;
    } else if (field.type === "EXPRESSION" && field.key === "resourcePath") {
        // HACK: this should fixed with the LS API. this is used to avoid the expression editor for resource path field.
        return <TextEditor field={field} handleOnFieldFocus={handleOnFieldFocus} />;
    } else if (field.type.toUpperCase() === "ENUM") {
        // Enum is a dropdown field
        return <DropdownEditor field={field} />;
    } else if (field.type === "FILE_SELECT" && field.editable) {
        return <FileSelect field={field} />;
    } else if (field.type === "SINGLE_SELECT" && field.editable) {
        // HACK:Single select field is treat as type editor for now
        return <DropdownEditor field={field} openSubPanel={openSubPanel} />;
    } else if (!field.items && (field.key === "type" || field.type === "TYPE") && field.editable) {
        // Type field is a type editor
        return (
            <TypeEditor
                field={field}
                openRecordEditor={openRecordEditor}
                handleOnFieldFocus={handleOnFieldFocus}
                autoFocus={autoFocus}
                handleOnTypeChange={handleOnTypeChange}
            />
        );
    } else if (!field.items && (field.type === "EXPRESSION" || field.type === "LV_EXPRESSION" || field.type == "ACTION_OR_EXPRESSION") && field.editable) {
        // Expression field is a inline expression editor
        return (
            <ContextAwareExpressionEditor
                field={field}
                openSubPanel={openSubPanel}
                subPanelView={subPanelView}
                handleOnFieldFocus={handleOnFieldFocus}
                autoFocus={autoFocus}
                visualizable={visualizableFields?.includes(field.key)}
                recordTypeField={recordTypeFields?.find(recordField => recordField.key === field.key)}
            />
        );
    } else if (!field.items && field.type === "RAW_TEMPLATE" && field.editable) {
        return (
            <ContextAwareRawExpressionEditor
                field={field}
                autoFocus={autoFocus}
            />
        );
    } else if (field.type === "VIEW") {
        // Skip this property
        return <></>;
    } else if (field.type === "PARAM_MANAGER") {
        return <ParamManagerEditor field={field} openRecordEditor={openRecordEditor} handleOnFieldFocus={handleOnFieldFocus} selectedNode={selectedNode} />;
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
        return <IdentifierField field={field} handleOnFieldFocus={handleOnFieldFocus} autoFocus={autoFocus} />;
    } else if (field.type === "SERVICE_PATH" || field.type === "ACTION_PATH") {
        return <PathEditor field={field} handleOnFieldFocus={handleOnFieldFocus} autoFocus={autoFocus} />;
    } else {
        // Default to text editor
        // Readonly fields are also treated as text editor
        return <TextEditor field={field} handleOnFieldFocus={handleOnFieldFocus} autoFocus={autoFocus} />;
    }
};
