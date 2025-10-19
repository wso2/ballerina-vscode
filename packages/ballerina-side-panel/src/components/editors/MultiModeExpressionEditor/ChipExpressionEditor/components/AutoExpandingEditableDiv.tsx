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

import React from "react"
import { ChipEditorField } from "../styles"

export type AutoExpandingEditableDivProps = {
    children?: React.ReactNode;
    fieldRef?: React.RefObject<HTMLDivElement>;
    onChange: (value: string) => void;
    onSelect?: () => void;
    value: string;
    tokens: number[];
    onClick?: () => void;
    onKeyUp?: () => void;
}

export const AutoExpandingEditableDiv = (props: AutoExpandingEditableDivProps) => {
    const { children, onChange, onSelect, onClick, onKeyUp, fieldRef, value, tokens } = props;

    const handleChange = (event: React.FormEvent<HTMLDivElement>) => {
        onChange(event.currentTarget.textContent || "");
    }

    return (
        <ChipEditorField
            ref={fieldRef}
            key={`${props.value}-${props.tokens.join(',')}`}
            contentEditable
            suppressContentEditableWarning
            onInput={handleChange}
            onSelect={onSelect}
            onClick={onClick}
            onKeyUp={onKeyUp}
        >
            {children}
        </ChipEditorField>
    )
}
