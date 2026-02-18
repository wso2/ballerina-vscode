/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import { InputType } from "@wso2/ballerina-core";
import { Form, FormValues, S, useFormContext, useModeSwitcherContext, FormField, FormFieldEditorProps } from "../..";
import { Codicon } from "@wso2/ui-toolkit/lib/components/Codicon/Codicon";
import { ScrollableList, ScrollableListRef } from "@wso2/ui-toolkit/lib/components/ScrollableList/ScrollableList";
import ModeSwitcher from "../ModeSwitcher";
import { getMapSubFormFieldFromTypes, buildStringMap, stringToRawObjectEntries, getRecordTypeFields } from "./utils";

export const FormMapEditorNew = (props: FormFieldEditorProps & {
    onChange: (value: any) => void;
    value: any;
}) => {
    const [repeatableFields, setRepeatableFields] = useState<FormField[][]>([]);
    const scrollableListRef = useRef<ScrollableListRef>(null);
    const isInternalUpdate = useRef(false);
    const { expressionEditor } = useFormContext();

    const modeSwitcherContext = useModeSwitcherContext();

    const processToOutputFormat = (fields: FormField[][]): Record<string, unknown> => {
        const output: Record<string, unknown> = {};
        fields.forEach((field) => {
            const keyField = field[0];
            const valueField = field[1];
            if (keyField.value) {
                output[keyField.value as string] = valueField;
            }
        });
        return output;
    }

    const processToInputFormat = (input: Record<string, unknown>): FormField[][] => {
        const fields: FormField[][] = [];
        Object.entries(input).forEach(([key, value]) => {
            const keyId = (value as FormField)?.key?.replace("mp-val-", "mp-key-") || crypto.randomUUID();
            const keyField: FormField = {
                key: keyId,
                label: "Key",
                type: "IDENTIFIER",
                optional: false,
                editable: true,
                documentation: "",
                value: key,
                types: [{ fieldType: "IDENTIFIER", selected: true }],
                enabled: true
            };
            const valueField: FormField = value as FormField;
            fields.push([keyField, valueField]);
        });
        return fields;
    }

    const handleAddNewItem = () => {
        const key = crypto.randomUUID();
        if (!(props.field.types[0] as any).template) return;
        const newField = getMapSubFormFieldFromTypes(key, (props.field.types[0] as any).template.types as InputType[])
        setRepeatableFields(prev => [...prev, newField]);
        isInternalUpdate.current = true;
        // Wait for the dom update
        setTimeout(() => {
            scrollableListRef.current?.scrollToBottom();
        }, 100);
    }

    const handleFormOnChange = (fieldKey: string, value: any, _allValues: FormValues, _parentKey: string) => {
        const newRepeatableFields = repeatableFields.map((formFields) => {
            // Check if any field in this array matches the fieldKey
            const fieldIndex = formFields.findIndex(field => field.key === fieldKey);
            if (fieldIndex !== -1) {
                const newFields = [...formFields];
                newFields[fieldIndex] = { ...newFields[fieldIndex], value };
                return newFields;
            }
            return formFields;
        });
        setRepeatableFields(newRepeatableFields);
        isInternalUpdate.current = true;
        props.onChange(processToOutputFormat(newRepeatableFields));
    }

    const handleModeSwitchValueChange = () => {
        const stringValue = buildStringMap(repeatableFields);
        props.onChange(stringValue);
    }

    const handleDeleteItem = (keyToDelete: string) => {
        const newRepeatableFields = repeatableFields.filter((formField) => formField[0].key !== keyToDelete);
        setRepeatableFields(newRepeatableFields);
        isInternalUpdate.current = true;
        props.onChange(processToOutputFormat(newRepeatableFields));
    };

    useEffect(() => {
        if (!props.value) return;
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false;
            return;
        }
        let processedInputValue: string | FormField[][] = "";
        if (typeof props.value === 'string') {
            processedInputValue = props.value;
        } else {
            processedInputValue = processToInputFormat(props.value);
        }
        let newValue = buildStringMap(processedInputValue);
        const initialValues = stringToRawObjectEntries(newValue);
        const initialFields = initialValues.map((val) => {
            const key = crypto.randomUUID();
            const fields = getMapSubFormFieldFromTypes(key, (props.field.types[0] as any).template.types as InputType[]);
            fields[0].value = val.key;
            fields[1].value = val.value;
            return fields;
        });
        setRepeatableFields(initialFields);
    }, [props.value, props.field.types]);

    return (
        <S.Container>
            <S.Header>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px' }}>
                    <div>
                        <S.HeaderContainer>
                            <S.LabelContainer>
                                <S.Label>{props.field.label}</S.Label>
                            </S.LabelContainer>
                        </S.HeaderContainer>
                        <S.EditorMdContainer>
                            <S.Description>{props.field.documentation}</S.Description>
                        </S.EditorMdContainer>
                    </div>
                    {modeSwitcherContext?.isModeSwitcherEnabled && (
                        <S.FieldInfoSection>
                            <ModeSwitcher
                                fieldKey={props.field.key}
                                value={modeSwitcherContext.inputMode}
                                isRecordTypeField={modeSwitcherContext.isRecordTypeField}
                                onChange={(value) => {
                                    handleModeSwitchValueChange();
                                    modeSwitcherContext.onModeChange(value);
                                }}
                                types={modeSwitcherContext.types}
                            />
                        </S.FieldInfoSection>
                    )}
                </div>
            </S.Header>
            <ScrollableList
                ref={scrollableListRef}
                itemCount={repeatableFields.length}
                maxVisibleItems={2}
            >
                {
                    repeatableFields.map((formField) => (
                        <S.ItemContainer style={{ padding: '1px', position: 'relative', marginBottom: '4px' }} key={formField[0].key}>
                            <div style={{ position: 'absolute', top: '4px', right: '4px', zIndex: 1 }}>
                                <Codicon
                                    name="close"
                                    sx={{ cursor: 'pointer', opacity: 0.6, '&:hover': { opacity: 1 } }}
                                    onClick={() => handleDeleteItem(formField[0].key)}
                                />
                            </div>
                            <Form
                                key={formField[0].key}
                                formFields={formField}
                                recordTypeFields={getRecordTypeFields(formField)}
                                openRecordEditor={props.openRecordEditor}
                                onChange={(fieldKey: string, value: any, allValues: FormValues) => {
                                    handleFormOnChange(fieldKey, value, allValues, formField[0].key);
                                }}
                                expressionEditor={{
                                    ...expressionEditor,
                                    onCompletionItemSelect: expressionEditor?.onCompletionItemSelect,
                                    getHelperPane: expressionEditor?.getHelperPane,
                                    types: expressionEditor?.types,
                                    referenceTypes: expressionEditor?.referenceTypes,
                                    retrieveVisibleTypes: expressionEditor?.retrieveVisibleTypes,
                                    getTypeHelper: expressionEditor?.getTypeHelper,
                                    helperPaneHeight: expressionEditor?.helperPaneHeight
                                }}
                                submitText={'Save'}
                                nestedForm={true}
                                preserveOrder={true}
                            />
                        </S.ItemContainer>

                    ))}
            </ScrollableList>
            <S.AddNewButton
                onClick={handleAddNewItem}
                appearance="icon"
            >
                <Codicon name="add" sx={{ marginRight: "5px" }} />
                {repeatableFields.length === 0 ? "Initialize Map" : "Add New Item"}
            </S.AddNewButton>
        </S.Container>
    )
};
