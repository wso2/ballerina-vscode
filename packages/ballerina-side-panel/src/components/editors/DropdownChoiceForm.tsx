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
import { buildRequiredRule, capitalize, getValueForDropdown } from "./utils";
import { useFormContext } from "../../context";
import styled from "@emotion/styled";
import { FieldFactory } from "./FieldFactory";

interface DropdownChoiceFormProps {
    field: FormField;
}

const FormContainer = styled.div`
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

export function DropdownChoiceForm(props: DropdownChoiceFormProps) {
    const { field } = props;
    const { form } = useFormContext();
    const { setValue, register } = form;

    const [selectedOption, setSelectedOption] = useState<string>("");

    const [dynamicFields, setDynamicFields] = useState<FormField[]>([]);


    // Add useEffect to set initial values
    useEffect(() => {
        if (field.dynamicFormFields[selectedOption]) {
            const fields = field.dynamicFormFields[selectedOption];
            setDynamicFields(fields);
        } else {
            setDynamicFields([]);
        }
        setValue(field.key, selectedOption);
    }, [selectedOption]);

    return (
        <FormContainer>
            <ChoiceSection>
                <Dropdown
                    id={field.key}
                    {...register(field.key, {
                        required: buildRequiredRule({ isRequired: !field.optional, label: field.label }),
                        value: getValueForDropdown(field)
                    })}
                    label={capitalize(field.label)}
                    description={field.documentation}
                    items={field.itemOptions ? field.itemOptions : field.items?.map((item) => ({ id: item, content: item, value: item }))}
                    required={!field.optional}
                    disabled={!field.editable}
                    sx={{ width: "100%" }}
                    containerSx={{ width: "100%" }}
                    onChange={(e) => {
                        setSelectedOption(e.target.value);
                        setValue(field.key, e.target.value);
                    }}
                />
            </ChoiceSection>
            <FormSection>
                {dynamicFields.map((dfield, index) => {
                    if (!dfield.advanced && !dfield.optional) {
                        return (
                            <FieldFactory
                                key={dfield.key}
                                field={dfield}
                                autoFocus={index === 0 ? true : false}
                            />
                        );
                    }
                })}
            </FormSection>
        </FormContainer>
    );
}
