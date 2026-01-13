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

import React, { useState, useEffect, useCallback, useRef } from "react";
import { S } from '../styles';
import { Button, Codicon, ThemeColors } from "@wso2/ui-toolkit";
import { ChipExpressionEditorComponent } from "../ChipExpressionEditor/components/ChipExpressionEditor";
import { ExpressionFieldProps } from "../../ExpressionField";
import { ChipExpressionEditorDefaultConfiguration } from "../ChipExpressionEditor/ChipExpressionDefaultConfig";

interface MappingConstructorProps {
    label: string;
    value: string;
    onChange: (updated: string) => void;
    expressionFieldProps: ExpressionFieldProps;
}

interface KeyValuePair {
    key: string;
    value: string;
}

/**
 * Extracts key-value pairs from a map string representation.
 * @param mapString - The string representation of the map, e.g., '{ key1: "value1", key2: "value2" }'.
 * @returns An array of strings, each representing a key-value pair in the format 'key: "value"'.
 */
function extractMapEntries(mapString) {
    if (!mapString) {
        return [];
    }

    // Matches text in format =>  key: "value" (key can be empty)
    const ENTRY_REGEX = /(\w*)\s*:\s*"([^"]*)"/g;

    const entries = [];
    let match;

    while ((match = ENTRY_REGEX.exec(mapString)) !== null) {
        entries.push(`${match[1]}: "${match[2]}"`);
    }

    return entries;
}

const createFinalValue = (pairs: KeyValuePair[]) => {
    const mapString = pairs
        .map(pair => `${pair.key}: ${pair.value}`)
        .join(', ');
    return `{ ${mapString} }`;
}

const getPairsFromValue = (value: string): KeyValuePair[] => {
    const entries: string[] = extractMapEntries(value);
    return entries.map(entry => {
        const [key, val] = entry.split(':').map(part => part.trim());
        return { key, value: val };
    });
}

export const MappingConstructor: React.FC<MappingConstructorProps> = ({ label, value, onChange, expressionFieldProps }) => {
    const [isAddMoreValid, setIsAddMoreValid] = useState(false);
    const valueRef = useRef(value);

    // Keep ref updated with latest value
    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    useEffect(() => {
        const pairs = getPairsFromValue(value);
        const lastPair = pairs[pairs.length - 1];
        const isValid = pairs.length === 0 || (lastPair && lastPair.key.trim() !== "" && lastPair.value.trim() !== "");
        setIsAddMoreValid(isValid);
    }, [value]);

    const handleAddPair = useCallback(() => {
        const updatedPairs = [...getPairsFromValue(valueRef.current), { key: ``, value: '""' }];
        onChange(createFinalValue(updatedPairs));
    }, [onChange]);

    const handleDeletePair = useCallback((index: number) => {
        const updatedPairs = getPairsFromValue(valueRef.current).filter((_, i) => i !== index);
        onChange(createFinalValue(updatedPairs));
    }, [onChange]);

    const handleKeyChange = useCallback((index: number, newKey: string) => {
        const updatedPairs = getPairsFromValue(valueRef.current);
        updatedPairs[index].key = newKey;
        onChange(createFinalValue(updatedPairs));
    }, [onChange]);

    const handleValueChange = useCallback((index: number, newValue: string) => {
        const updatedPairs = getPairsFromValue(valueRef.current);
        updatedPairs[index].value = newValue;
        onChange(createFinalValue(updatedPairs));
    }, [onChange]);


    return (
        <S.Container>
            {getPairsFromValue(value).map((pair, index) => (
                <S.ItemContainer style={{
                    border: "1px solid var(--dropdown-border)",
                    padding: "8px",
                    borderRadius: "8px",
                }} key={index}>
                    <S.KeyValueContainer>
                        <S.Input
                            type="text"
                            value={pair.key}
                            onChange={(e) => handleKeyChange(index, e.target.value)}
                            placeholder="Key"
                        />

                        <ChipExpressionEditorComponent
                            getHelperPane={expressionFieldProps.getHelperPane}
                            isExpandedVersion={false}
                            completions={expressionFieldProps.completions}
                            onChange={(value) => handleValueChange(index, value)}
                            value={pair.value}
                            sanitizedExpression={expressionFieldProps.sanitizedExpression}
                            rawExpression={expressionFieldProps.rawExpression}
                            fileName={expressionFieldProps.fileName}
                            targetLineRange={expressionFieldProps.targetLineRange}
                            extractArgsFromFunction={expressionFieldProps.extractArgsFromFunction}
                            onOpenExpandedMode={expressionFieldProps.onOpenExpandedMode}
                            onRemove={expressionFieldProps.onRemove}
                            isInExpandedMode={expressionFieldProps.isInExpandedMode}
                            configuration={new ChipExpressionEditorDefaultConfiguration()}
                            placeholder={expressionFieldProps.field.placeholder}
                        />
                    </S.KeyValueContainer>
                    <S.DeleteButton
                        appearance="icon"
                        onClick={() => handleDeletePair(index)}
                    >
                        <Codicon sx={{ color: ThemeColors.ERROR }} name="trash" />
                    </S.DeleteButton>
                </S.ItemContainer>
            ))}
            <Button
                onClick={handleAddPair}
                appearance="icon"
                disabled={!isAddMoreValid}
            >
                <div style={{ display: 'flex', gap: '4px', padding: '4px 8px', alignItems: 'center' }}>
                    <Codicon name="add" />
                    Add Item
                </div>
            </Button>
        </S.Container>
    );
};

export default MappingConstructor;