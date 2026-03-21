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

import { Codicon, Dropdown, LinkButton, LocationSelector, RadioButtonGroup, ThemeColors } from "@wso2/ui-toolkit";

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

const ButtonContainer = styled.div`
    display: flex;
    justify-content: flex-start;
`;

export function ChoiceForm(props: ChoiceFormProps) {
    const { field, recordTypeFields } = props;
    const { form } = useFormContext();
    const { setValue, clearErrors } = form;

    const [selectedOption, setSelectedOption] = useState<number>(1);

    const [dynamicFields, setDynamicFields] = useState<FormField[]>([]);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);

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
            const fieldType = getPrimaryInputType(expression.types)?.fieldType;
            let items = undefined;
            if (fieldType === "MULTIPLE_SELECT" || fieldType === "SINGLE_SELECT") {
                items = expression.items;
            }

            // For SINGLE_SELECT with nested per-option properties, build dynamicFormFields
            let dynamicFormFields: { [key: string]: FormField[] } | undefined = undefined;
            if (fieldType === "SINGLE_SELECT" && expression.properties && expression.items) {
                dynamicFormFields = {};
                for (const optionKey in expression.properties) {
                    const optionValue = expression.properties[optionKey];
                    if (optionValue.properties) {
                        dynamicFormFields[optionKey] = convertConfig(optionValue);
                    } else {
                        dynamicFormFields[optionKey] = [];
                    }
                }
            }

            const formField: FormField = {
                key: key,
                label: expression?.metadata.label || key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase()),
                type: fieldType,
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
                defaultValue: expression.defaultValue as string,
                advanceProps: fieldType === "GROUP_SECTION" ? convertConfig(expression) : undefined,
                dynamicFormFields,
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
                    options={field.choices.map((choice, index) => ({
                        id: index.toString(),
                        value: index + 1,
                        content: choice.metadata.label,
                        disabled: field.editable === false || (!choice.editable && !choice.enabled)
                    }))}
                    onChange={(e) => {
                        if (field.editable === false) return;
                        const checkedValue = Number(e.target.value);
                        const realValue = checkedValue - 1;
                        const choice = field.choices[realValue];
                        if (choice && !choice.editable && !choice.enabled) {
                            return;
                        }
                        setSelectedOption(checkedValue);
                        setValue(field.key, realValue);
                        clearErrors();
                    }}
                />
            </ChoiceSection>

            {(() => {
                const nonAdvancedFields = dynamicFields.filter(dfield => !dfield.advanced);
                const advancedFields = dynamicFields.filter(dfield => dfield.advanced);

                if (nonAdvancedFields.length === 0 && advancedFields.length === 0) return null;

                return (
                    <FormSection>
                        {nonAdvancedFields.map((dfield, index) => (
                            <FieldFactory
                                key={dfield.key}
                                field={dfield}
                                autoFocus={index === 0}
                                recordTypeFields={recordTypeFields}
                            />
                        ))}
                        {advancedFields.length > 0 && (
                            <ButtonContainer>
                                <LinkButton
                                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                                    sx={{ fontSize: 12, padding: 8, color: ThemeColors.PRIMARY, gap: 4 }}
                                >
                                    <Codicon
                                        name={showAdvancedOptions ? "chevron-up" : "chevron-down"}
                                        iconSx={{ fontSize: 12 }}
                                        sx={{ height: 12 }}
                                    />
                                    {showAdvancedOptions ? "Collapse" : "Expand"}
                                </LinkButton>
                            </ButtonContainer>
                        )}
                        {showAdvancedOptions && advancedFields.map((dfield) => (
                            <FieldFactory
                                key={dfield.key}
                                field={dfield}
                                recordTypeFields={recordTypeFields}
                            />
                        ))}
                    </FormSection>
                );
            })()}

        </Form>

    );
}

