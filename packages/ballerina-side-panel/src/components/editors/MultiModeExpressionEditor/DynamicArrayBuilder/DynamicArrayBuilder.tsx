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

import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from '@emotion/styled';
import { Button, Codicon, ErrorBanner } from '@wso2/ui-toolkit';
import { ExpressionFieldProps, getEditorConfiguration } from "../../ExpressionField";
import { InputMode } from "../ChipExpressionEditor/types";
import { getPrimaryInputType } from "@wso2/ballerina-core";
import { getInputModeFromBallerinaType } from "../ChipExpressionEditor/utils";
import { ChipExpressionEditorComponent } from "../ChipExpressionEditor/components/ChipExpressionEditor";
import { useFormContext } from "../../../../context";

interface DynamicArrayBuilderProps {
    value: string | any[];
    expressionFieldProps: ExpressionFieldProps;
}

export namespace S {
    export const Container = styled.div({
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontFamily: 'var(--font-family)',
    });

    export const ItemContainer = styled.div({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    });

    export const DeleteButton = styled(Button)({
        padding: '4px',
        minWidth: 'auto',
        height: 'auto',
    });

    export const AddButton = styled(Button)({
        alignSelf: 'flex-start',
        padding: '4px 8px',
        fontSize: '12px',
    });
}

/**
 * DynamicArrayBuilder component for managing array inputs with validation.
 * Supports minItems and defaultItems configuration from the field's EXPRESSION_SET type.
 */
export const DynamicArrayBuilder = (props: DynamicArrayBuilderProps) => {
    const { value, expressionFieldProps } = props;
    const { form } = useFormContext();
    const { setValue, setError, clearErrors, formState: { errors } } = form;

    // Extract configuration from EXPRESSION_SET type definition
    const expressionSetType = expressionFieldProps.field.types.find(t => t.fieldType === "EXPRESSION_SET");
    const minItems = expressionSetType?.minItems ?? 1;
    const defaultItems = expressionSetType?.defaultItems ?? 1;
    
    const [isInitialized, setIsInitialized] = useState(false);
    const currentValuesRef = useRef<string[]>([]);

    /**
     * Converts the incoming value to an array, using defaultItems if empty.
     */
    const getInitialValue = (): string[] => {
        if (Array.isArray(value) && value.length > 0) {
            return value;
        }

        const isEmpty = !value ||
                       value === '' ||
                       value === '[]' ||
                       (Array.isArray(value) && value.length === 0);

        return isEmpty && defaultItems > 0 ? Array(defaultItems).fill("") : [];
    };

    // Initialize the field with default items on mount
    useEffect(() => {
        const initialValue = getInitialValue();
        const shouldInitialize = initialValue.length > 0 && (
            !value ||
            value === '' ||
            value === '[]' ||
            (Array.isArray(value) && value.length === 0)
        );

        if (shouldInitialize) {
            currentValuesRef.current = initialValue;
            setValue(expressionFieldProps.field.key, initialValue, { shouldValidate: false, shouldDirty: false });
        }
        setIsInitialized(true);
    }, []);

    // Update ref when value changes from parent
    useEffect(() => {
        if (isInitialized) {
            currentValuesRef.current = getInitialValue();
        }
    }, [value, isInitialized]);

    // Compute current array values
    const arrayValues = useMemo(() => {
        if (!isInitialized) {
            return currentValuesRef.current;
        }
        return getInitialValue();
    }, [value, isInitialized]);

    // Validate minItems constraint
    useEffect(() => {
        if (!isInitialized) return;

        const hasNonEmptyValues = arrayValues.some(v => v && v.trim() !== '');

        if (minItems > 0) {
            const isInvalid = arrayValues.length < minItems || !hasNonEmptyValues;

            if (isInvalid) {
                setError(expressionFieldProps.field.key, {
                    type: 'required',
                    message: `At least ${minItems} ${minItems > 1 ? 'items are' : 'item is'} required with valid value${minItems > 1 ? 's' : ''}`
                });
            } else {
                clearErrors(expressionFieldProps.field.key);
            }
        } else {
            clearErrors(expressionFieldProps.field.key);
        }
    }, [arrayValues, minItems, expressionFieldProps.field.key, setError, clearErrors, isInitialized]);

    // Ensure minimum number of items are always visible
    useEffect(() => {
        if (!isInitialized) return;

        const requiredCount = Math.max(minItems, defaultItems);

        if (requiredCount > 0 && arrayValues.length < requiredCount) {
            const paddedArray = [...arrayValues];
            while (paddedArray.length < requiredCount) {
                paddedArray.push('');
            }
            currentValuesRef.current = paddedArray;
            setValue(expressionFieldProps.field.key, paddedArray, { shouldValidate: true });
        }
    }, [arrayValues, isInitialized, minItems, defaultItems, expressionFieldProps.field.key, setValue]);

    const handleInputChange = (index: number, newValue: string) => {
        const updatedArray = [...currentValuesRef.current];
        updatedArray[index] = newValue;
        currentValuesRef.current = updatedArray;
        setValue(expressionFieldProps.field.key, updatedArray, { shouldValidate: true, shouldDirty: true });
    };

    const handleDelete = (index: number) => {
        const updatedArray = currentValuesRef.current.filter((_, i) => i !== index);
        currentValuesRef.current = updatedArray;
        setValue(expressionFieldProps.field.key, updatedArray, { shouldValidate: true, shouldDirty: true });
    };

    const handleAdd = () => {
        const updatedArray = [...currentValuesRef.current, ''];
        currentValuesRef.current = updatedArray;
        setValue(expressionFieldProps.field.key, updatedArray, { shouldValidate: true, shouldDirty: true });
    };

    const primaryInputMode = useMemo(() => {
        if (expressionFieldProps.field.types.length === 0) {
            return InputMode.EXP;
        }
        return getInputModeFromBallerinaType(getPrimaryInputType(expressionFieldProps.field.types).ballerinaType);
    }, [expressionFieldProps.field.types]);

    const renderError = () => {
        const error = errors[expressionFieldProps.field.key];
        if (!error) return null;

        const errorMessage = typeof error.message === 'string'
            ? error.message
            : String(error.message || 'Validation error');

        return <ErrorBanner errorMsg={errorMessage} />;
    };

    return (
        <S.Container>
            {arrayValues.map((itemValue, index) => (
                <S.ItemContainer key={`${expressionFieldProps.field.key}-${index}`}>
                    <ChipExpressionEditorComponent
                        getHelperPane={props.expressionFieldProps.getHelperPane}
                        isExpandedVersion={false}
                        completions={props.expressionFieldProps.completions}
                        onChange={(value) => handleInputChange(index, value)}
                        value={itemValue}
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
                        disabled={arrayValues.length <= minItems}
                    >
                        <Codicon name="trash" />
                    </S.DeleteButton>
                </S.ItemContainer>
            ))}
            <S.AddButton
                onClick={handleAdd}
                appearance="secondary"
            >
                <Codicon name="add" />
                Add Item
            </S.AddButton>
            {renderError()}
        </S.Container>
    );
};
