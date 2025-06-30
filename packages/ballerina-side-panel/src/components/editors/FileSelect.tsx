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

import React, { useState } from "react";

import { Dropdown, LocationSelector } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";

import { FormField } from "../Form/types";
import { capitalize, getValueForDropdown } from "./utils";
import { useFormContext } from "../../context";
import { Controller } from "react-hook-form";

interface DropdownEditorProps {
    field: FormField;
}

export function FileSelect(props: DropdownEditorProps) {
    const { field } = props;
    const { form } = useFormContext();
    const { setValue, control } = form;

    const { rpcClient } = useRpcContext();
    const [filePath, setFilePath] = useState("");

    const handleFileSelect = async () => {
        const projectDirectory = await rpcClient.getCommonRpcClient().selectFileOrDirPath({ isFile: true });
        setFilePath(projectDirectory.path);
        setValue(field.key, projectDirectory.path, { shouldValidate: true });
    };

    return (
        <Controller
            control={control}
            name={field.key}
            rules={{ required: !field.optional && !field.placeholder }}
            render={({ field: { value }, fieldState: { error } }) => (
                <LocationSelector
                    label={`Select ${field.label} File`}
                    btnText="Select File"
                    selectedFile={value}
                    onSelect={handleFileSelect}
                />
            )}
        />
    );
}
