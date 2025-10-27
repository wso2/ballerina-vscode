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

import { FormExpressionEditor } from "@wso2/ui-toolkit";
import { ExpressionField } from "./ExpressionField";
import React from "react";
import { getValueForTextModeEditor } from "./utils";

type TextModeEditorProps = Pick<ExpressionField, 'name' | 'value' | 'autoFocus' | 'ariaLabel' | 'placeholder' | 'onChange' | 'onFocus' | 'onBlur' | 'onSave' | 'onCancel' | 'onRemove' | 'growRange' | 'exprRef' | 'anchorRef'>;

export const TextModeEditor: React.FC<TextModeEditorProps> = ({
    name,
    value,
    autoFocus,
    ariaLabel,
    placeholder,
    onChange,
    onFocus,
    onBlur,
    onSave,
    onCancel,
    onRemove,
    growRange,
    exprRef,
    anchorRef,
}) => {

    const handleOnChange = async (value: string, updatedCursorPosition: number) => {
        const newValue = "\"" + value + "\"";
        onChange(newValue, updatedCursorPosition);
    }

    return (
        <FormExpressionEditor
            ref={exprRef}
            anchorRef={anchorRef}
            name={name}
            completions={[]}
            value={getValueForTextModeEditor(value)}
            autoFocus={autoFocus}
            startAdornment={<></>}
            ariaLabel={ariaLabel}
            onChange={handleOnChange}
            onFocus={onFocus}
            onBlur={onBlur}
            onSave={onSave}
            onCancel={onCancel}
            onRemove={onRemove}
            enableExIcon={false}
            growRange={growRange}
            sx={{ paddingInline: '0' }}
            placeholder={placeholder}
        />
    );
};

export default TextModeEditor
