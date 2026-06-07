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
// tslint:disable: jsx-no-multiline-js
import React, { useRef, useState } from "react";

import { useStyles } from "./style";
import { cx } from "@emotion/css";
import { TextArea, Typography } from "@wso2/ui-toolkit";
import { FormField } from "../../../../../types";

interface FormTextAreaProps {
    validate?: (field: string, isInvalid: boolean) => void;
    rowsMax?: number;
    defaultValue?: string;
    label?: string;
    placeholder?: string;
    isInvalid?: boolean;
    text?: string;
}

interface FormElementProps<T = {}> {
    onChange?: (event: any) => void;
    customProps?: T;
    model?: FormField | any;
    defaultValue?: string;
    label?: string;
    placeholder?: string;
    isInvalid?: boolean;
    text?: string;
}

export function FormTextArea(props: FormElementProps<FormTextAreaProps>) {
    const classes = useStyles();
    const { onChange, defaultValue, placeholder, customProps, model } = props;
    const defaultText: string = defaultValue ? defaultValue : "";
    const errorClass = customProps?.isInvalid ? cx("error-class") : cx("valid");
    const codeAreaRef = useRef<HTMLTextAreaElement>(null);

    const [inputValue, setInputValue] = useState(defaultText);

    if (customProps?.validate !== undefined) {
        customProps?.validate(model.name, inputValue === "");
    }

    const handleOnChange = (value: string) => {
        setInputValue(value);
        onChange(value);
    };

    React.useEffect(() => {
        setInputValue(defaultText);
    }, [defaultText]);

    React.useEffect(() => {
        if (codeAreaRef.current) {
            const textarea = codeAreaRef.current.shadowRoot.querySelector("textarea");
            const handleOnKeyDown = (event: KeyboardEvent) => {
                if (event.key === "Tab") {
                    event.preventDefault();
                    const selectionStart = textarea.selectionStart;
                    textarea.setRangeText("  ", selectionStart, selectionStart, "end");
                }
            };

            textarea.addEventListener("keydown", handleOnKeyDown);
            return () => {
                textarea.removeEventListener("keydown", handleOnKeyDown);
            };
        }
    }, [codeAreaRef]);

    return (
        <div className="textarea-wrapper">
            <div className={errorClass}>
                <TextArea
                    ref={codeAreaRef}
                    className={classes.textArea}
                    placeholder={placeholder}
                    onTextChange={handleOnChange}
                    value={inputValue}
                    resize="vertical"
                    rows={8}
                />
                {customProps?.text ? (
                    <Typography variant="body2" className="textarea-error-text">
                        {customProps.text}
                    </Typography>
                ) : null}
            </div>
        </div>
    );
}
