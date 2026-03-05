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
import { FieldFactory } from "./FieldFactory";

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

    // Add useEffect to set initial values
    useEffect(() => {
        const realValue = selectedOption - 1;
        const property = field.choices[realValue];
        const choiceProperty = convertConfig(property);
        setDynamicFields(choiceProperty);
        if (choiceProperty.length > 0) {
            Object.entries(property.properties).forEach(([propKey, propValue]) => {
                if (propValue.value !== undefined) {
                    setValue(propKey, propValue.value);
                }
            });
        }
    }, [selectedOption]);

    const convertConfig = (model: PropertyModel): FormField[] => {
        const formFields: FormField[] = [];
        for (const key in model.properties) {
            const expression = model.properties[key];
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
        }
        return formFields;
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
                        const checkedValue = Number(e.target.value);
                        const realValue = checkedValue - 1;
                        setSelectedOption(checkedValue);
                        setValue(field.key, realValue);
                        clearErrors();
                    }}
                />
            </ChoiceSection>

            <FormSection>
                {dynamicFields.filter(dfield => (field.advanced  || !dfield.advanced)).map((dfield, index) => {
                    return (
                        <FieldFactory
                            key={dfield.key}
                            field={dfield}
                            autoFocus={index === 0 ? true : false}
                            recordTypeFields={recordTypeFields}
                        />
                    );
                })}
            </FormSection>

        </Form>

    );
}

