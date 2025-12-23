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

import { Dropdown, LocationSelector, RadioButtonGroup } from "@wso2/ui-toolkit";

import { FormField } from "../Form/types";
import { capitalize, getValueForDropdown } from "./utils";
import { useFormContext } from "../../context";
import styled from "@emotion/styled";
import { getPrimaryInputType, PropertyModel, RecordTypeField } from "@wso2/ballerina-core";
import { EditorFactory } from "./EditorFactory";

interface ChoiceFormProps {
    field: FormField;
    recordTypeFields?: RecordTypeField[];
}

const Form = styled.div`
    display: grid;
    gap: 20px;
    width: 100%;
`;

const ChoiceSection = styled.div`
    display: grid;
    gap: 20px;
    width: 100%;
`;

const FormSection = styled.div`
    display: grid;
    gap: 20px;
    width: 100%;
`;

export function ChoiceForm(props: ChoiceFormProps) {
    const { field, recordTypeFields } = props;
    const { form } = useFormContext();
    const { setValue, clearErrors } = form;

    const [selectedOption, setSelectedOption] = useState<number>(1);

    const [dynamicFields, setDynamicFields] = useState<FormField[]>([]);
    const [dynamicRecordTypeFields, setDynamicRecordTypeFields] = useState<RecordTypeField[]>([]);

    // Reset to first option when field.choices changes (parent CHOICE changed)
    useEffect(() => {
        // Find the first enabled choice
        const enabledChoiceIndex = field.choices.findIndex(choice => choice.enabled);
        if (enabledChoiceIndex !== -1) {
            const newSelectedOption = enabledChoiceIndex + 1;
            if (newSelectedOption !== selectedOption) {
                setSelectedOption(newSelectedOption);
                setValue(field.key, enabledChoiceIndex);
            }
        }
    }, [field.choices]);

    // Add useEffect to set initial values and react to choice changes
    useEffect(() => {
        const realValue = selectedOption - 1;
        // Validate that the realValue is within bounds
        if (realValue < 0 || realValue >= field.choices.length) {
            return;
        }
        const property = field.choices[realValue];
        const { formFields, recordTypeFieldsForChoice } = convertConfig(property);
        setDynamicFields(formFields);
        setDynamicRecordTypeFields(recordTypeFieldsForChoice);
        if (formFields.length > 0) {
            Object.entries(property.properties).forEach(([propKey, propValue]) => {
                if (propValue.value !== undefined) {
                    setValue(propKey, propValue.value);
                }
            });
        }
    }, [selectedOption, field.choices]);

    const convertConfig = (model: PropertyModel): { formFields: FormField[], recordTypeFieldsForChoice: RecordTypeField[] } => {
        const formFields: FormField[] = [];
        const recordTypeFieldsForChoice: RecordTypeField[] = [];

        for (const key in model.properties) {
            const expression = model.properties[key];

            // console.log(`>>> Processing property: ${key}`, {
            //     valueType: expression.valueType,
            //     valueTypeConstraint: expression.valueTypeConstraint,
            //     hasTypeMembers: !!expression.typeMembers,
            //     typeMembersLength: expression.typeMembers?.length || 0,
            //     typeMembers: expression.typeMembers
            // });

            let items = undefined;
            if (getPrimaryInputType(expression.types)?.fieldType === "MULTIPLE_SELECT" || getPrimaryInputType(expression.types)?.fieldType === "SINGLE_SELECT") {
                items = expression.items;
            }
            const formField: FormField = {
                key: key,
                label: expression?.metadata.label || key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase()),
                type: getPrimaryInputType(expression.types)?.fieldType,
                documentation: expression?.metadata.description || "",
                types: expression.types,
                editable: expression.editable,
                enabled: expression?.enabled ?? true,
                optional: expression.optional,
                value: expression.value,
                advanced: expression.advanced,
                diagnostics: [],
                items,
                choices: expression.choices,
                placeholder: expression.placeholder,
                defaultValue: expression.defaultValue as string
            }
            formFields.push(formField);

            // If this property has typeMembers, create a RecordTypeField for it
            const primaryType = getPrimaryInputType(expression.types);
            if (primaryType?.typeMembers && primaryType.typeMembers.length > 0) {
                const recordTypeField: RecordTypeField = {
                    key: key,
                    property: {
                        metadata: expression.metadata || { label: "", description: "" },
                        value: expression.value || "",
                        optional: expression.optional || false,
                        editable: expression.editable !== undefined ? expression.editable : true,
                        types: expression.types
                    },
                    recordTypeMembers: primaryType.typeMembers.filter(member => member.kind === "RECORD_TYPE")
                };
                recordTypeFieldsForChoice.push(recordTypeField);
            } 
        }
        console.log(">>> Final Dynamic Form Fields:", formFields)
        console.log(">>> Final Dynamic Record Type Fields:", recordTypeFieldsForChoice)
        return { formFields, recordTypeFieldsForChoice };
    }

    return (
        <Form>
            <ChoiceSection>
                <RadioButtonGroup
                    id="choice-options"
                    label={field.documentation}
                    defaultValue={selectedOption}
                    defaultChecked={true}
                    value={selectedOption}
                    options={field.choices.map((choice, index) => ({ id: index.toString(), value: index + 1, content: choice.metadata.label }))}
                    onChange={(e) => {
                        console.log("Choice Form Index:", Number(e.target.value))
                        const checkedValue = Number(e.target.value);
                        const realValue = checkedValue - 1;
                        setSelectedOption(checkedValue);
                        setValue(field.key, realValue);
                        clearErrors();
                    }}
                />
            </ChoiceSection>

            <FormSection>
                {dynamicFields.map((dfield, index) => {
                    // Merge parent recordTypeFields with dynamically generated ones
                    const mergedRecordTypeFields = [
                        ...(recordTypeFields || []),
                        ...dynamicRecordTypeFields
                    ];

                    return (
                        <EditorFactory
                            key={dfield.key}
                            field={dfield}
                            autoFocus={index === 0 ? true : false}
                            recordTypeFields={mergedRecordTypeFields}
                        />
                    );
                })}
            </FormSection>

        </Form>

    );
}


