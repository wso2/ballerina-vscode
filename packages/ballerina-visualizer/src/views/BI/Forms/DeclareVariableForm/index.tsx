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

import {
    Form,
    FormProps,
} from "@wso2/ballerina-side-panel";
import { CompletionItem } from "@wso2/ui-toolkit";
import { useEffect, useState } from "react";


export const VariableForm = (props: FormProps) => {
    const { handleSelectedTypeChange } = props;
    const [formFields, setFormFields] = useState(props.formFields);

    useEffect(() => {
        setFormFields(props.formFields);
    }, [props.formFields]);

    const handleOnTypeChange = (type: CompletionItem) => {
        updateExpressionValueTypeConstraint(type?.value || '');
        handleSelectedTypeChange(type);
    };

    const updateExpressionValueTypeConstraint = (valueTypeConstraint: string) => {
        const fieldsWithoutExpression = props.formFields.filter((field) => {
            return field.type !== "ACTION_OR_EXPRESSION";
        });
        const expressionField = props.formFields.find((field) => field.type === "ACTION_OR_EXPRESSION");
        if (expressionField) {
            expressionField.valueTypeConstraint = valueTypeConstraint;
        }
        const updatedFields = [...fieldsWithoutExpression, expressionField];
        setFormFields(updatedFields);
    }
    return (
        <>
            <Form {...props}  handleSelectedTypeChange={handleOnTypeChange} formFields={formFields} />
        </>

    );
}
