
import React from "react";

import { ProgressIndicator, TextField } from "@wso2/ui-toolkit";

export interface FunctionNameEditorProps {
    value: string;
    onBlur?: (event: unknown) => void;
    onChange: (newVal: string) => void;
    isValidating: boolean;
    errorMessage?: string;
    disabled?: boolean;
}

export function FunctionNameEditor(props: FunctionNameEditorProps)  {
    const { value, onChange, onBlur, isValidating, errorMessage, disabled } = props;
    return (
        <>
            <TextField
                size={80}
                onBlur={onBlur}
                onTextChange={onChange}
                label="Name"
                required={true}
                value={value}
                placeholder="Data Mapper Name"
                errorMsg={errorMessage}
                data-testid={`data-mapper-config-fn-name`}
                disabled={disabled}
            />
            {isValidating && <ProgressIndicator />}
        </>
    );
}
