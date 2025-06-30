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
import { useFormContext } from "../../context";
import { ContextAwareExpressionEditorProps, ExpressionEditor } from "./ExpressionEditor";

export const ContextAwareRawExpressionEditor = (props: ContextAwareExpressionEditorProps) => {
    const { form, expressionEditor, targetLineRange, fileName } = useFormContext();

    return (
        <ExpressionEditor
            fileName={fileName}
            {...targetLineRange}
            {...props}
            {...form}
            {...expressionEditor}
            rawExpression={getRawExp}
            sanitizedExpression={getSanitizedExp}
        />
    );
};

const getSanitizedExp = (value: string) => {
    if (value) {
        return value.replace(/`/g, "");
    }
    return value;
};

const getRawExp = (value: string) => {
    if (value && !value.startsWith("`") && !value.endsWith("`")) {
        return `\`${value}\``;
    }
    return value;
};
