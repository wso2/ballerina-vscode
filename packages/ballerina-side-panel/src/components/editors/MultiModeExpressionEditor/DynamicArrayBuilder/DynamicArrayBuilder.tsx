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

import React, { useState, useEffect, useMemo, useRef } from "react";
import styled from '@emotion/styled';
import { Button, Codicon, ThemeColors } from '@wso2/ui-toolkit';
import { ExpressionField, ExpressionFieldProps, getEditorConfiguration } from "../../ExpressionField";
import { InputMode } from "../ChipExpressionEditor/types";
import { getPrimaryInputType } from "@wso2/ballerina-core";
import { getInputModeFromBallerinaType, getInputModeFromTypes } from "../ChipExpressionEditor/utils";
import { ChipExpressionEditorComponent } from "../ChipExpressionEditor/components/ChipExpressionEditor";
import { useFormContext } from "../../../../context";
import { S } from "../styles";

interface DynamicArrayBuilderProps {
    label: string;
    value: string | any[];
    onChange: (updated: string, updatedCursorPosition: number) => void;
    expressionFieldProps: ExpressionFieldProps;
}

export const DynamicArrayBuilder = (props: DynamicArrayBuilderProps) => {
    const { label, value, onChange, expressionFieldProps } = props;
    const { form } = useFormContext();
    const { setValue, getValues } = form;

    // Use a ref to track the current editing state to avoid stale closures
    const currentValuesRef = useRef<string[]>(Array.isArray(value) ? value : [""]);

    // Update ref when prop changes from parent (e.g., opening in edit mode)
    useEffect(() => {
        currentValuesRef.current = Array.isArray(value) ? value : [""];
    }, [value]);

    // Use the value from props directly (controlled by parent/form context)
    const arrayValues = useMemo(() => {
        return Array.isArray(value) ? value : [""];
    }, [value]);

    const handleInputChange = (index: number, newValue: string) => {
        // Use the current ref value to ensure we have the latest state
        const currentArray = [...currentValuesRef.current];
        currentArray[index] = newValue;
        currentValuesRef.current = currentArray;
        setValue(expressionFieldProps.field.key, currentArray, { shouldValidate: false, shouldDirty: true });
    };

    const handleDelete = (index: number) => {
        const currentArray = [...currentValuesRef.current];
        const newArray = currentArray.filter((_, i) => i !== index);
        currentValuesRef.current = newArray;
        setValue(expressionFieldProps.field.key, newArray, { shouldValidate: false, shouldDirty: true });
    };

    const handleAdd = () => {
        const currentArray = [...currentValuesRef.current];
        const newArray = [...currentArray, ''];
        currentValuesRef.current = newArray;
        setValue(expressionFieldProps.field.key, newArray, { shouldValidate: false, shouldDirty: true });
    };

    const primaryInputMode = useMemo(() => {
        if (!expressionFieldProps.field.types || expressionFieldProps.field.types.length === 0) {
            return InputMode.EXP;
        }
        return getInputModeFromBallerinaType(getPrimaryInputType(expressionFieldProps.field.types).ballerinaType)
    }, [expressionFieldProps.field.types]);
    return (
        <S.Container>
            {arrayValues.map((value, index) => (
                <S.ItemContainer key={`${expressionFieldProps.field.key}-${index}`}>
                    <ChipExpressionEditorComponent
                        getHelperPane={props.expressionFieldProps.getHelperPane}
                        isExpandedVersion={false}
                        completions={props.expressionFieldProps.completions}
                        onChange={(value) => handleInputChange(index, value)}
                        value={value}
                        sanitizedExpression={props.expressionFieldProps.sanitizedExpression}
                        rawExpression={props.expressionFieldProps.rawExpression}
                        fileName={props.expressionFieldProps.fileName}
                        targetLineRange={props.expressionFieldProps.targetLineRange}
                        extractArgsFromFunction={props.expressionFieldProps.extractArgsFromFunction}
                        onOpenExpandedMode={props.expressionFieldProps.onOpenExpandedMode}
                        onRemove={props.expressionFieldProps.onRemove}
                        isInExpandedMode={props.expressionFieldProps.isInExpandedMode}
                        configuration={getEditorConfiguration(primaryInputMode, primaryInputMode)}
                    />
                    <S.DeleteButton
                        appearance="icon"
                        onClick={() => handleDelete(index)}
                    >
                        <Codicon sx={{ color: ThemeColors.ERROR }} name="trash" />
                    </S.DeleteButton>
                </S.ItemContainer>
            ))}
            <Button
                onClick={handleAdd}
                appearance="icon"
            >
                <div style={{ display: 'flex', gap: '4px', padding: '4px 8px', alignItems: 'center' }}>
                    <Codicon name="add" />
                    Add Item
                </div>
            </Button>
        </S.Container>
    );
};
