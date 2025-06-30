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
import { Button, Codicon, TextField, ThemeColors } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";

import { FormField } from "../Form/types";
import { useFormContext } from "../../context";
import { RecordTypeField } from "@wso2/ballerina-core";
import { SubPanel } from "@wso2/ballerina-core";
import { SubPanelView } from "@wso2/ballerina-core";
import { ContextAwareExpressionEditor } from "./ExpressionEditor";

// Reusing the same styled components namespace
namespace S {
    export const Container = styled.div({
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    });

    export const LabelContainer = styled.div({
        display: "flex",
        alignItems: "center",
    });

    export const Label = styled.label({
        color: "var(--vscode-editor-foreground)",
        textTransform: "capitalize",
    });

    export const Description = styled.div({
        color: "var(--vscode-list-deemphasizedForeground)",
    });

    export const EditorContainer = styled.div({
        display: "flex",
        gap: "8px",
        alignItems: "center",
        width: "100%",
        padding: "8px",
        border: "1px solid var(--dropdown-border)",
        borderRadius: "8px",
    });

    export const KeyValueContainer = styled.div({
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: "100%",
    });

    export const AddNewButton = styled(Button)`
        & > vscode-button {
            color: var(--vscode-textLink-activeForeground);
            border-radius: 0px;
            padding: 3px 5px;
            margin-top: 4px;
        }
        & > vscode-button > * {
            margin-right: 6px;
        }
    `;

    export const DeleteButton = styled(Button)`
        & > vscode-button {
            color: ${ThemeColors.ERROR};
        }
    `;
}

interface MapEditorProps {
    field: FormField;
    label: string;
    openSubPanel?: (subPanel: SubPanel) => void;
    subPanelView?: SubPanelView;
    handleOnFieldFocus?: (key: string) => void;
    autoFocus?: boolean;
    visualizable?: boolean;
    recordTypeField?: RecordTypeField;
}

export function MapEditor(props: MapEditorProps) {
    const { field, label, ...rest } = props;
    const { form } = useFormContext();
    const { register, unregister, setValue, watch, formState } = form;

    const initialValues = Array.isArray(field.value) ? field.value : [];
    const [editorCount, setEditorCount] = useState(Math.max(initialValues.length, 1));

    // Add useEffect to set initial values
    useEffect(() => {
        if (Array.isArray(field.value) && field.value.length > 0) {
            field.value.forEach((item, index) => {
                const key = Object.keys(item)[0];
                const value = Object.values(item)[0];
                setValue(`${field.key}-${index}-key`, key);
                setValue(`${field.key}-${index}-value`, value);
            });
        }
    }, [field.value, field.key, setValue]);

    // Watch all the individual key-value pair values
    const values = [...Array(editorCount)]
        .map((_, index) => {
            const key = watch(`${field.key}-${index}-key`);
            const value = watch(`${field.key}-${index}-value`);

            if (key === undefined) {
                setValue(`${field.key}-${index}-key`, "");
            }

            if (value === undefined) {
                setValue(`${field.key}-${index}-value`, "");
            }

            if (!key && !value) return undefined;

            return {
                [key]: value
            };
        })
        .filter(Boolean);

    // Update the main field.value array whenever individual fields change
    useEffect(() => {
        setValue(field.key, values);
    }, [values, field.key, setValue]);

    const onAddAnother = () => {
        setEditorCount((prev) => prev + 1);
    };

    const onDelete = (indexToDelete: number) => {
        // Unregister the deleted fields
        unregister(`${field.key}-${indexToDelete}-key`);
        unregister(`${field.key}-${indexToDelete}-value`);

        // Unregister and re-register fields after the deleted index to shift them up
        for (let i = indexToDelete + 1; i < editorCount; i++) {
            const keyValue = watch(`${field.key}-${i}-key`);
            const valueValue = watch(`${field.key}-${i}-value`);
            
            unregister(`${field.key}-${i}-key`);
            unregister(`${field.key}-${i}-value`);
            
            setValue(`${field.key}-${i-1}-key`, keyValue);
            setValue(`${field.key}-${i-1}-value`, valueValue);
        }

        // Update the main field value
        const newValues = values.filter((_, i) => i !== indexToDelete);
        setValue(field.key, newValues);
        setEditorCount((prev) => prev - 1);
    };

    return (
        <S.Container>
            <S.LabelContainer>
                <S.Label>{field.label}</S.Label>
            </S.LabelContainer>
            <S.Description>{field.documentation}</S.Description>
            {[...Array(editorCount)].map((_, index) => (
                <S.EditorContainer key={`${field.key}-${index}`}>
                    <S.KeyValueContainer>
                        <TextField
                            id={`${field.key}-${index}-key`}
                            {...register(`${field.key}-${index}-key`, {
                                validate: {
                                    keyFormat: (value, formValues) => {
                                        // If there's no value but the corresponding value field is filled
                                        const correspondingValue = watch(`${field.key}-${index}-value`);
                                        if (correspondingValue && !value) {
                                            return "Key is required when value is provided";
                                        }
                                        
                                        // If there's a value, validate its format
                                        if (value) {
                                            if (/^\d/.test(value)) {
                                                return "Key cannot start with a number";
                                            }
                                            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
                                                return "Key can only contain letters, numbers, and underscores";
                                            }
                                            
                                            // Check for uniqueness only if there's a value
                                            const keys = values
                                                .map((_, i) => watch(`${field.key}-${i}-key`))
                                                .filter((_, i) => i !== index);
                                            if (keys.includes(value)) {
                                                return "Key must be unique";
                                            }
                                        }
                                        return true;
                                    }
                                }
                            })}
                            placeholder="Key"
                            disabled={!field.editable}
                            sx={{ width: "100%" }}
                            errorMsg={formState?.errors[`${field.key}-${index}-key`]?.message as string}
                        />
                        <ContextAwareExpressionEditor
                            {...rest}
                            field={field}
                            id={`${field.key}-${index}-value`}
                            fieldKey={`${field.key}-${index}-value`}
                            showHeader={false}
                            placeholder="Value"
                        />
                    </S.KeyValueContainer>
                    <S.DeleteButton
                        appearance="icon"
                        onClick={() => onDelete(index)}
                        disabled={!field.editable}
                        tooltip="Delete"
                    >
                        <Codicon name="trash" />
                    </S.DeleteButton>
                </S.EditorContainer>
            ))}
            <S.AddNewButton appearance="icon" aria-label="add" onClick={onAddAnother}>
                <Codicon name="add" />
                {label}
            </S.AddNewButton>
        </S.Container>
    );
};
