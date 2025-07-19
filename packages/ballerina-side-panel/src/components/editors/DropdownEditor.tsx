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

import React from "react";
import styled from "@emotion/styled";

import { Dropdown } from "@wso2/ui-toolkit";

import { FormField } from "../Form/types";
import { capitalize, getValueForDropdown } from "./utils";
import { useFormContext } from "../../context";
import { SubPanel, SubPanelView } from "@wso2/ballerina-core";

interface DropdownEditorProps {
    field: FormField;
    openSubPanel?: (subPanel: SubPanel) => void;
    // Additional props for MCP tools functionality
    serviceUrl?: string;
    configs?: object;
    rpcClient?: any;
    onToolsChange?: (selectedTools: string[]) => void;
}

export function DropdownEditor(props: DropdownEditorProps) {
    const { field, openSubPanel, serviceUrl, configs, rpcClient, onToolsChange } = props;
    const { form } = useFormContext();
    const { register, setValue, watch } = form;


    return (
        <>
            <Dropdown
                id={field.key}
                description={field.documentation}
                {...register(field.key, { required: !field.optional, value: getValueForDropdown(field) })}
                label={capitalize(field.label)}
                items={field.itemOptions ? field.itemOptions : field.items?.map((item) => ({ id: item, content: item, value: item }))}
                required={!field.optional}
                disabled={!field.editable}
                onChange={(e) => {
                    setValue(field.key, e.target.value);
                    field.onValueChange?.(e.target.value);
                }}
                sx={{ width: "100%" }}
                containerSx={{ width: "100%" }}
                addNewBtnClick={field.addNewButton ? () => openSubPanel({ view: SubPanelView.ADD_NEW_FORM }) : undefined}
            />
        </>
    );
}
