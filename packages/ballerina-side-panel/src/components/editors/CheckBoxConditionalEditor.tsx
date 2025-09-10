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

import React, { useEffect, useState } from "react";
import { FormField } from "../Form/types";
import { CheckBoxGroup, FormCheckBox } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { EditorFactory } from "./EditorFactory";
import { useFormContext } from "../../context";
import { ContextAwareExpressionEditor } from "./ExpressionEditor";

const Form = styled.div`
    display: grid;
    gap: 20px;
    width: 100%;
`;

const FormSection = styled.div`
    display: grid;
    gap: 20px;
    width: 100%;
`;

const Label = styled.div`
    font-family: var(--font-family);
    color: var(--vscode-editor-foreground);
    text-align: left;
    text-transform: capitalize;
`;
const Description = styled.div`
    font-family: var(--font-family);
    color: var(--vscode-list-deemphasizedForeground);
    text-align: left;
`;
const LabelGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;
const BoxGroup = styled.div`
    display: flex;
    flex-direction: row;
    width: 100%;
    align-items: flex-start;
    gap: 10px;
`;

interface CheckBoxConditionalEditorProps {
    field: FormField;
}

export function CheckBoxConditionalEditor(props: CheckBoxConditionalEditorProps) {
    const { field } = props;
    const { form } = useFormContext();
    const { register, control, watch } = form;
    const [conditionalFields, setConditionalFields] = useState<FormField[]>([]);

    const { setValue } = form;

    const checked = watch(field.key, true);

    console.log("Conditional Fields: ", field.advanceProps);

    useEffect(() => {
        setConditionalFields(field.advanceProps);
    }, []);

    // Add useEffect to set initial values
    useEffect(() => {
        if (conditionalFields.length > 0) {
            Object.entries(conditionalFields).forEach(([_, propValue]) => {
                if (propValue.value !== undefined) {
                    setValue(propValue.key, propValue.value);
                }
            });
        }
    }, [conditionalFields]);

    return (
        <Form>
            <CheckBoxGroup containerSx={{ width: "100%" }}>
                <BoxGroup>
                    <FormCheckBox
                        name={field.key}
                        {...register(field.key, { value: getBooleanValue(field, field.value) })}
                        control={control as any}
                    />
                    <LabelGroup>
                        <Label>{field.label}</Label>
                        <Description>{field.documentation}</Description>
                    </LabelGroup>
                </BoxGroup>
            </CheckBoxGroup>
            <FormSection>
                {!checked && conditionalFields.length > 0 && (
                    <>
                        {conditionalFields.map((dfield) => (
                            <EditorFactory
                                key={dfield.key}
                                field={dfield}
                            />
                        ))}
                    </>
                )}
            </FormSection>
        </Form>

    );

}

function getBooleanValue(field: FormField, value: any) {
    if (field.type === "FLAG") {
        return value === "true" || value === true;
    }
    return value;
}

