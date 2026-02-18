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
import { Form, FormField, FormFieldEditorProps, FormValues, S, useFormContext, useModeSwitcherContext } from "../..";
import { Codicon } from "@wso2/ui-toolkit/lib/components/Codicon/Codicon";
import { ScrollableList, ScrollableListRef } from "@wso2/ui-toolkit/lib/components/ScrollableList/ScrollableList";
import ModeSwitcher from "../ModeSwitcher";
import { getArraySubFormFieldFromTypes, stringToRawArrayElements, buildStringArray, getRecordTypeFields } from "./utils";

export const FormArrayEditor = (props: FormFieldEditorProps & {
    onChange: (value: any) => void;
    value: any;
}) => {
    const [repeatableFields, setRepeatableFields] = useState<FormField[]>([]);
    const { expressionEditor } = useFormContext();
    const scrollableListRef = useRef<ScrollableListRef>(null);

    const modeSwitcherContext = useModeSwitcherContext();

    const handleAddNewItem = () => {
        const key = crypto.randomUUID();
        if (!(props.field.types[0] as any).template) return;
        const newField = getArraySubFormFieldFromTypes(key, (props.field.types[0] as any).template.types as InputType[])
        setRepeatableFields(prev => [...prev, newField]);
        // Wait for the dom update
        setTimeout(() => {
            scrollableListRef.current?.scrollToBottom();
        }, 100);
    }

    const handleFormOnChange = (_fieldKey: string, value: any, _allValues: FormValues, parentKey: string) => {
        const newRepeatableFields = repeatableFields.map((formField) => {
            if (formField.key === parentKey) {
                return { ...formField, value };
            }
            return formField;
        });
        setRepeatableFields(newRepeatableFields);
        props.onChange(newRepeatableFields);
    }

    const handleModeSwitchValueChange = () => {
        const stringValue = buildStringArray(repeatableFields);
        props.onChange(stringValue);
    }

    const handleDeleteItem = (keyToDelete: string) => {
        const newRepeatableFields = repeatableFields.filter((formField) => formField.key !== keyToDelete);
        setRepeatableFields(newRepeatableFields);
        props.onChange(newRepeatableFields);
    };

    useEffect(() => {
        if (!props.value) return;
        if (JSON.stringify(props.value) === JSON.stringify(repeatableFields)) return;
        let newValue = buildStringArray(props.value);
        const initialValues = stringToRawArrayElements(newValue);
        const initialFields = initialValues.map((val) => {
            const key = crypto.randomUUID();
            return {
                ...getArraySubFormFieldFromTypes(key, (props.field.types[0] as any).template.types as InputType[]),
                value: val
            }
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
                maxVisibleItems={3}
            >
                {
                    repeatableFields.map((formField) => (
                        <S.ItemContainer style={{ position: 'relative', marginBottom: '4px' }} key={formField.key}>
                            <div style={{ position: 'absolute', top: '4px', right: '4px', zIndex: 1 }}>
                                <Codicon
                                    name="close"
                                    sx={{ cursor: 'pointer', opacity: 0.6, '&:hover': { opacity: 1 } }}
                                    onClick={() => handleDeleteItem(formField.key)}
                                />
                            </div>
                            <Form
                                key={formField.key}
                                formFields={[formField]}
                                recordTypeFields={getRecordTypeFields([formField])}
                                openRecordEditor={props.openRecordEditor}
                                onChange={(fieldKey: string, value: any, allValues: FormValues) => {
                                    handleFormOnChange(fieldKey, value, allValues, formField.key);
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
                {repeatableFields.length === 0 ? "Initialize Array" : "Add New Item"}
            </S.AddNewButton>
        </S.Container>
    )
};
