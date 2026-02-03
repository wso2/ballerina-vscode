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
import { Form, FormField, FormValues, S, useFormContext } from "../..";
import { getPrimaryInputType, PropertyModel, NodeKind, NodeProperties, RecordTypeField, SubPanel, SubPanelView, InputType } from "@wso2/ballerina-core";
import { Codicon, CompletionItem } from "@wso2/ui-toolkit";


//Add to util
/**
 * Maps the properties to an array of FormField objects.
 * 
 * @param properties The properties to map.
 * @returns An array of FormField objects.
 */
function mapPropertiesToFormFields(properties: { [key: string]: PropertyModel; }): FormField[] {
    if (!properties) return [];

    return Object.entries(properties).map(([key, property]) => {

        // Determine value for MULTIPLE_SELECT
        let value: any = property.value;
        if (getPrimaryInputType(property.types).fieldType === "MULTIPLE_SELECT") {
            if (property.values && property.values.length > 0) {
                value = property.values;
            } else if (property.value) {
                value = [property.value];
            } else if (property.items && property.items.length > 0) {
                value = [property.items[0]];
            } else {
                value = [];
            }
        }

        let items = undefined;
        if (getPrimaryInputType(property.types)?.fieldType === "MULTIPLE_SELECT" || getPrimaryInputType(property.types)?.fieldType === "SINGLE_SELECT") {
            items = property.items;
        }

        return {
            key,
            label: property?.metadata?.label,
            type: getPrimaryInputType(property.types)?.fieldType,
            documentation: property?.metadata?.description || "",
            editable: true,
            enabled: property.enabled ?? true,
            optional: property.optional,
            value,
            types: property.types,
            advanced: property.advanced,
            diagnostics: [],
            items,
            choices: property.choices,
            placeholder: property.placeholder,
            addNewButton: property.addNewButton,
            lineRange: property?.codedata?.lineRange,
            advanceProps: mapPropertiesToFormFields(property.properties)
        } as FormField;
    });
}

const getFormFieldFromTypes = (formId: string, types: InputType[]): FormField => {
    return {
        key: `test-${formId}`,
        label: "test label",
        type: getPrimaryInputType(types)?.fieldType || "",
        optional: false,
        editable: true,
        documentation: "",
        value: "",
        types: types,
        enabled: true
    }
}



export interface FormMapEditorProps {
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
    onSubmit?: (data: any) => void;
    onCancelForm?: () => void;
    onCompletionItemSelect?: any;
    getHelperPane?: any;
    getTypeHelper?: any;
    onCancelEdit?: any;
    parameter?: any;
}

export const FormMapEditorNew = (props: FormMapEditorProps & {
    onChange: (value: any) => void;
    value: any;
}) => {
    const {
        field,
        openRecordEditor,
        onSubmit,
        onCancelForm,
        onCompletionItemSelect,
        getHelperPane,
        getTypeHelper,
        onCancelEdit,
        parameter,
        onChange,
        value
    } = props;

    const [repeatableFields, setRepeatableFields] = React.useState<FormField[][]>([]);
    const {  expressionEditor } = useFormContext();

    const handleFormOnChange = (fieldKey: string, value: any, allValues: FormValues, formId: string) => {
        const newRepeatableFields = repeatableFields.map((formFieldArray) => {
            if (formFieldArray[0].key === formId) {
                return formFieldArray.map((formField) => {
                    if (formField.key === fieldKey) {
                        return { ...formField, value };
                    }
                    return formField;
                });
            }
            return formFieldArray;
        });
        setRepeatableFields(newRepeatableFields);
        onChange(newRepeatableFields);
    }

    const handleAddAnotherFuture = () => {
        setRepeatableFields(prev => [...prev, [getFormFieldFromTypes(crypto.randomUUID(), (field.types[0] as any).template.types as InputType[])]]);
    }

    return (
        <S.Container>
            <S.Label>{field.label}</S.Label>
            <S.Description>{field.documentation}</S.Description>
            {
                repeatableFields.map((formField) => (
                    <S.ItemContainer style={{ padding: '1px' }} key={formField[0].key}>
                        <Form
                            key={formField[0].key}
                            formFields={formField}
                            openRecordEditor={openRecordEditor}
                            onSubmit={onSubmit}
                            onChange={(fieldKey: string, value: any, allValues: FormValues) => {
                                handleFormOnChange(fieldKey, value, allValues, formField[0].key);
                            }}
                            onCancelForm={onCancelForm}
                            expressionEditor={{
                                ...expressionEditor,
                                onCompletionItemSelect: onCompletionItemSelect,
                                getHelperPane: getHelperPane,
                                types: expressionEditor?.types,
                                referenceTypes: expressionEditor?.referenceTypes,
                                retrieveVisibleTypes: expressionEditor?.retrieveVisibleTypes,
                                getTypeHelper: getTypeHelper,
                                helperPaneHeight: expressionEditor?.helperPaneHeight
                            }}
                            submitText={'Save'}
                            nestedForm={true}
                            preserveOrder={true}
                        />
                    </S.ItemContainer>

                ))
            }
            <S.AddNewButton
                onClick={handleAddAnotherFuture}
                appearance="icon"
            >
                <Codicon name="add" sx={{ marginRight: "5px" }} />
                Add another future
            </S.AddNewButton>
        </S.Container>
    )
}
