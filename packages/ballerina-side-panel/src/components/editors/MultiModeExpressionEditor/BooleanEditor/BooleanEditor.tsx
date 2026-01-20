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

import React, { ChangeEvent, useEffect } from "react";
import { Dropdown } from "@wso2/ui-toolkit";
import { FormField } from "../../../Form/types";
import { OptionProps } from "@wso2/ballerina-core";
import { normalizeEditorValue } from "../ChipExpressionEditor/utils";

interface BooleanEditorProps {
    value: string;
    field: FormField;
    onChange: (value: string, cursorPosition: number) => void;
}

const initialDropdownItems: OptionProps[] = [
    {
        id: "1",
        content: "True",
        value: true
    },
    {
        id: "2",
        content: "False",
        value: false
    }
]

const parseBoolean = (value: unknown): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        if (v === 'true') return true;
        if (v === 'false') return false;
    }
    return false;
};

const isValueMatchBooleanValue = (value: unknown): boolean => {
    if (typeof value === 'boolean') return true;
    if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        if (v === 'true' || v === 'false') return true;
    }
    return false;
};


export const BooleanEditor: React.FC<BooleanEditorProps> = ({ value, onChange, field }) => {
    const [dropdownOptions, setDropdownOptions] = React.useState<OptionProps[]>(initialDropdownItems);
    const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
        handleChangeWrapper(parseBoolean(e.target.value));
    }

    useEffect(() => {
        if (!field.optional) return;
        setDropdownOptions([...initialDropdownItems, {
            id: "default-option",
            content: "None Selected",
            value: ""
        },]);
    }, [field]);

    const getValidatedValue = (): string => {
        if (typeof value === 'boolean') return String(value);
        if (isValueMatchBooleanValue(value)) return value;
        return field.optional ? "" : "false"
    }

    const handleChangeWrapper = (value: boolean | string) => {
        onChange(String(value), String(value).length);
    }

    return (
        <Dropdown
            id={field.key}
            value={getValidatedValue()}
            items={dropdownOptions}
            onChange={handleChange}
            sx={{ width: "100%" }}
            containerSx={{ width: "100%" }}
        />
    );
};

export default BooleanEditor;
