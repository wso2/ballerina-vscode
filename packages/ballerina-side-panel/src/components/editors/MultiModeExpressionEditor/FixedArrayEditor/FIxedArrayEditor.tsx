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

interface FixedArrayEditorProps {
    value: string;
    field: FormField;
    onChange: (value: string, cursorPosition: number) => void;
    options: OptionProps[];
}

export const FixedArrayEditor: React.FC<FixedArrayEditorProps> = ({ value, onChange, field, options }) => {
    const [updatedOptions, setUpdatedOptions] = React.useState<OptionProps[]>(options);

    React.useEffect(() => {
        const newOptions = [...options];
        newOptions.unshift({ id: "default-option", content: "None Selected", value: "" });
        setUpdatedOptions(newOptions);
    }, [options]);
    
    const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
        onChange(e.target.value, e.target.value.length)
    }

    return (
        <Dropdown
            id={field.key}
            multiple
            value={value.trim()}
            items={updatedOptions}
            onChange={handleChange}
            sx={{ width: "100%" }}
            containerSx={{ width: "100%" }}
        />
    );
};

export default FixedArrayEditor;
