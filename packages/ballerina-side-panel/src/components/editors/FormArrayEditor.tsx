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

import React, { useEffect, useState } from "react";
import { FormMapEditorProps } from "./FormMapEditorNew";
import { InputType } from "@wso2/ballerina-core";
import { Form, FormField, FormValues, S, useModeSwitcherContext } from "../..";
import { Codicon } from "@wso2/ui-toolkit/lib/components/Codicon/Codicon";
import { ScrollableList } from "@wso2/ui-toolkit/lib/components/ScrollableList/ScrollableList";
import ModeSwitcher from "../ModeSwitcher";
import { getFormFieldFromTypes, extractTopLevelElements, buildStringArray } from "./utils";

export const FormArrayEditor = (props: FormMapEditorProps & {
    onChange: (value: any) => void;
    value: any;
}) => {
    const [repeatableFields, setRepeatableFields] = useState<FormField[]>([]);

    const modeSwitcherContext = useModeSwitcherContext();

    const handleAddAnotherFututre = () => {
        const key = crypto.randomUUID();
        const newField = getFormFieldFromTypes(key, (props.field.types[0] as any).template.types as InputType[])
        setRepeatableFields(prev => [...prev, newField]);
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
        let newValue = buildStringArray(props.value);;
        const initialValues = extractTopLevelElements(newValue);
        const initialFields = initialValues.map((val) => {
            const key = crypto.randomUUID();
            return {
                ...getFormFieldFromTypes(key, (props.field.types[0] as any).template.types as InputType[]),
                value: val
            }
        });
        setRepeatableFields(initialFields);
    }, [props.value]);

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
                itemCount={repeatableFields.length}
                maxVisibleItems={3}
            >
                {
                        repeatableFields.map((formField) => (
                            <S.ItemContainer style={{ padding: '1px', position: 'relative' }} key={formField.key}>
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
                                    openRecordEditor={props.openRecordEditor}
                                    onSubmit={props.onSubmit}
                                    onChange={(fieldKey: string, value: any, allValues: FormValues) => {
                                        handleFormOnChange(fieldKey, value, allValues, formField.key);
                                    }}
                                    onCancelForm={props.onCancelForm}
                                    expressionEditor={{
                                        ...props.expressionEditor,
                                        onCompletionItemSelect: props.expressionEditor?.onCompletionItemSelect,
                                        getHelperPane: props.expressionEditor?.getHelperPane,
                                        types: props.expressionEditor?.types,
                                        referenceTypes: props.expressionEditor?.referenceTypes,
                                        retrieveVisibleTypes: props.expressionEditor?.retrieveVisibleTypes,
                                        getTypeHelper: props.expressionEditor?.getTypeHelper,
                                        helperPaneHeight: props.expressionEditor?.helperPaneHeight
                                    }}
                                    submitText={'Save'}
                                    nestedForm={true}
                                    preserveOrder={true}
                                />
                            </S.ItemContainer>

                        ))}
            </ScrollableList>
            <S.AddNewButton
                onClick={handleAddAnotherFututre}
                appearance="icon"
            >
                <Codicon name="add" sx={{ marginRight: "5px" }} />
                Add New Item
            </S.AddNewButton>
        </S.Container>
    )
};