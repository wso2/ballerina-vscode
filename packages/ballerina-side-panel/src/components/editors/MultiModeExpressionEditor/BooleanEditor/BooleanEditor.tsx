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

import React, { ChangeEvent } from "react";
import { Dropdown } from "@wso2/ui-toolkit";
import { FormField } from "../../../Form/types";
import { OptionProps } from "@wso2/ballerina-core";

interface BooleanEditorProps {
    value: string;
    field: FormField;
    onChange: (value: string | undefined, cursorPosition: number) => void;
}

const DEFAULT_NONE_SELECTED_VALUE = "__none__";

const dropdownItems: OptionProps[] = [
    {
        id: "1",
        content: "True",
        value: "true"
    },
    {
        id: "2",
        content: "False",
        value: "false"
    },
    {
        id: "default-option",
        content: "No Selection",
        value: DEFAULT_NONE_SELECTED_VALUE
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

export const BooleanEditor: React.FC<BooleanEditorProps> = ({ value, onChange, field }) => {

    const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
        let value = e.target.value;
        if (value === DEFAULT_NONE_SELECTED_VALUE) {
            onChange("", 0);
        } else {
            const bool = parseBoolean(value);
            onChange(String(bool), String(bool).length);
        }
    }

    const getValidatedValue = (): string => {
        if (typeof value === 'boolean') return String(value);
        if (value === undefined || value === "") return DEFAULT_NONE_SELECTED_VALUE;
        if (typeof value === 'string') {
            const v = value.trim().toLowerCase();
            if (v === 'true' || v === 'false') return v;
        }
        return DEFAULT_NONE_SELECTED_VALUE;
    }


    return (
        <Dropdown
            id={field.key}
            value={getValidatedValue()}
            items={dropdownItems}
            onChange={handleChange}
            sx={{ width: "100%" }}
            containerSx={{ width: "100%" }}
        />
    );
};

export default BooleanEditor;
