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

import { Dropdown, OptionProps } from "@wso2/ui-toolkit";
import React, { ChangeEvent, useMemo } from "react"
import { FormField } from "../../../Form/types";

interface EnumEditorProps {
    value: string;
    field: FormField;
    onChange: (value: string, cursorPosition: number) => void;
    items: OptionProps[];
}

export const EnumEditor = (props: EnumEditorProps) => {
    // Ensure value is in items, otherwise use first item's value
    const itemsList = props.items.length > 0 ? props.items : props.field.itemOptions;
    const selectedValue = props.value && props.value !== "" && itemsList.some(item => item.value === props.value) ? props.value : itemsList[0].value;
    const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
        props.onChange(e.target.value, e.target.value.length)
    }
    return (
        <Dropdown
            id={props.field.key}
            value={selectedValue.trim()}
            items={itemsList}
            onChange={handleChange}
            sx={{ width: "100%" }}
            containerSx={{ width: "100%" }}
        />
    )
}
