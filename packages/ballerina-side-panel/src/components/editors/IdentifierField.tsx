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

import { ErrorBanner, TextField } from "@wso2/ui-toolkit";
import React, { useState, useCallback, useEffect } from "react";
import { debounce } from "lodash";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { useFormContext } from "../../context";
import { buildRequiredRule, capitalize, getPropertyFromFormField } from "./utils";
import { FormField } from "../Form/types";
export interface IdentifierFieldProps {
    field: FormField;
    handleOnFieldFocus?: (key: string) => void;
    autoFocus?: boolean;
    onBlur?: () => void | Promise<void>;
}

export function IdentifierField(props: IdentifierFieldProps) {
    const { field, handleOnFieldFocus, autoFocus, onBlur } = props;
    const { rpcClient } = useRpcContext();
    const { expressionEditor, form } = useFormContext();
    const { getExpressionEditorDiagnostics } = expressionEditor;
    const [formDiagnostics, setFormDiagnostics] = useState(field.diagnostics);
    const { watch, formState, register, setValue } = form;
    const { errors } = formState;

    useEffect(() => {
        setFormDiagnostics(field.diagnostics);
    }, [field.diagnostics]);

    // Sync external field value changes to the form (e.g., when a sibling field's onValueChange updates the value)
    useEffect(() => {
        setValue(field.key, field.value ?? '');
    }, [field.key, field.value, setValue]);

    const validateIdentifierName = useCallback(debounce(async (value: string) => {
        const fieldValue = watch(field.key);

        const response = await getExpressionEditorDiagnostics(!field.optional || fieldValue !== '',
            fieldValue,
            field.key,
            getPropertyFromFormField(field));
    }, 250), [rpcClient, field]);

    const handleOnBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
        validateIdentifierName(e.target.value);
        onBlur?.();
    }

    const handleOnFocus = (e: React.ChangeEvent<HTMLInputElement>) => {
        validateIdentifierName(e.target.value);
        handleOnFieldFocus?.(field.key);
    }

    const registerField = register(field.key, {
        required: buildRequiredRule({ isRequired: !field.optional, label: field.label }),
        value: field.value
    })
    const { onChange } = registerField;


    const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormDiagnostics([]);
        onChange(e);
        validateIdentifierName(e.target.value);
        field.onValueChange?.(e.target.value as string);
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
            <TextField
                id={field.key}
                label={capitalize(field.label)}
                {...registerField}
                onChange={(e) => handleOnChange(e)}
                required={!field.optional}
                description={field.documentation}
                placeholder={field.placeholder}
                readOnly={!field.editable}
                errorMsg={errors[field.key]?.message.toString()}
                onBlur={(e) => handleOnBlur(e)}
                onFocus={(e) => handleOnFocus(e)}
                autoFocus={autoFocus}
                sx={{ width: "100%" }}
            />
            {(!errors[field.key]?.message) && formDiagnostics && formDiagnostics.length > 0 && (
                <ErrorBanner errorMsg={formDiagnostics.map(d => d.message).join(', ')} />
            )}
        </div>
    );
}
