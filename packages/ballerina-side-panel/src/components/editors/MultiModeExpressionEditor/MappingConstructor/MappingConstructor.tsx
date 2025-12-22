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

import React, { useState, useEffect } from "react";
import { S } from '../styles';
import { Button, Codicon, ThemeColors } from "@wso2/ui-toolkit";
import { ChipExpressionEditorComponent } from "../ChipExpressionEditor/components/ChipExpressionEditor";
import { ExpressionFieldProps } from "../../ExpressionField";
import { ChipExpressionEditorDefaultConfiguration } from "../ChipExpressionEditor/ChipExpressionDefaultConfig";

interface MappingConstructorProps {
    label: string;
    value: string;
    onChange: (updated: string, updatedCursorPosition: number) => void;
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

    // Matches text in format =>  key: "value"
    const ENTRY_REGEX = /(\w+)\s*:\s*"([^"]*)"/g;

    const entries = [];
    let match;

    while ((match = ENTRY_REGEX.exec(mapString)) !== null) {
        entries.push(`${match[1]}: "${match[2]}"`);
    }

    return entries;
}


export const MappingConstructor: React.FC<MappingConstructorProps> = ({ label, value, onChange, expressionFieldProps }) => {
    const [pairs, setPairs] = useState<KeyValuePair[]>([]);
    const [isAddMoreValid, setIsAddMoreValid] = useState(false);

    const createFinalValue = (pairs: KeyValuePair[]) => {
        const mapString = pairs
            .filter(pair => pair.key.trim() !== "")
            .map(pair => `${pair.key}: ${pair.value}`)
            .join(', ');
        return `{ ${mapString} }`;
    }

    useEffect(() => {
        if (value !== createFinalValue(pairs)) {
            const entries: string[] = extractMapEntries(value);
            const initialPairs: KeyValuePair[] = entries.map(entry => {
                const [key, val] = entry.split(':').map(part => part.trim());
                return { key, value: val };
            });
            setPairs(initialPairs);
        }
    }, [value]);

    useEffect(() => {
        const lastPair = pairs[pairs.length - 1];
        const isValid = pairs.length === 0 || (lastPair && lastPair.key.trim() !== "" && lastPair.value.trim() !== "");
        setIsAddMoreValid(isValid);
    }, [JSON.stringify(pairs)]);

    const handleAddPair = () => {
        const updatedPairs = [...pairs, { key: ``, value: '""' }];
        setPairs(updatedPairs);
    }

    const handleDeletePair = (index: number) => {
        const updatedPairs = pairs.filter((_, i) => i !== index);
        setPairs(updatedPairs);
        onChange(createFinalValue(updatedPairs), createFinalValue(updatedPairs).length);
    }

    const handleKeyChange = (index: number, newKey: string) => {
        const updatedPairs = [...pairs];
        updatedPairs[index].key = newKey;
        setPairs(updatedPairs)
        onChange(createFinalValue(updatedPairs), createFinalValue(updatedPairs).length);
    }

    const handleValueChange = (index: number, newValue: string) => {
        const updatedPairs = [...pairs];
        updatedPairs[index].value = newValue;
        setPairs(updatedPairs);
        onChange(createFinalValue(updatedPairs), createFinalValue(updatedPairs).length);
    }


    return (
        <S.Container>
            {pairs.map((pair, index) => (
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