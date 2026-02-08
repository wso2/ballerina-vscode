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

import React, { useEffect } from "react";
import { FormField } from "../Form/types";
import { RadioButtonGroup } from "@wso2/ui-toolkit";
import { useFormContext } from "../../context";

interface RadioButtonGroupEditorProps {
    field: FormField;
}

export function RadioButtonGroupEditor(props: RadioButtonGroupEditorProps) {
    const { field } = props;
    const { form } = useFormContext();
    const { register, setValue, watch, getValues } = form;

    const currentValue = watch(field.key);

    // Only set initial value on mount, not when field.value changes
    // This prevents the form from resetting when sections collapse/expand
    useEffect(() => {
        const formValues = getValues();
        const currentFormValue = formValues[field.key];
        if (currentFormValue === undefined || currentFormValue === null || currentFormValue === "") {
            setValue(field.key, field.value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array - only run on mount

    const handleChange = (e: any) => {
        const value = e.target.value;
        setValue(field.key, value);
        field.onValueChange?.(value);
    };

    return (
        <RadioButtonGroup
            {...register(field.key, {
                value: field.value,
                onChange: handleChange
            })}
            label={field.label}
            orientation="horizontal"
            options={field.itemOptions || []}
            value={currentValue}
            className="radio-button-group"
        />
    );
}
