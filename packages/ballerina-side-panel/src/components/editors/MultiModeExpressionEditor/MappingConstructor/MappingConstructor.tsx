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
    value: any[];
    onChange: (updated: any[]) => void;
    expressionFieldProps: ExpressionFieldProps;
}

const transformExternalValueToInternal = (externalValue: any[]): any[] => {
    if (!externalValue) return [];
    return externalValue.map((item, index) => {
        // Each item is like {someKey: "someValue"}, extract key and value
        const entries = Object.entries(item);
        const [key, value] = entries.length > 0 ? entries[0] : ["", ""];
        return { id: index, key: key || "", value: value || "" };
    });
}

const toOutputFormat = (pairs: any[]): any[] => {
    return pairs.map(pair => {
        if (pair.key) {
            return { [pair.key]: pair.value };
        }
        return {};
    });
}

const getNextId = (items: any[]): number => {
    if (items.length === 0) {
        return 0;
    }
    return Math.max(...items.map(item => item.id)) + 1;
}


export const MappingConstructor: React.FC<MappingConstructorProps> = ({ label, value, onChange, expressionFieldProps }) => {
    const [_ , setManualRerenderTrigger] = useState(true);
    const internalValueRef = useRef<any[]>([]);

    useEffect(() => {
        internalValueRef.current = transformExternalValueToInternal(value);
        setManualRerenderTrigger(prev => !prev);
    }, [value]);

    const handleAddPair = () => {
        const newPair = { id: getNextId(internalValueRef.current), key: "", value: "" };
        const updatedValue = [...internalValueRef.current, newPair];
        internalValueRef.current = updatedValue;
        onChange(toOutputFormat(updatedValue));
    }

    const handleDeletePair = (id: number) => {
        const updatedValue = internalValueRef.current.filter(pair => pair.id !== id);
        internalValueRef.current = updatedValue;
        onChange(toOutputFormat(updatedValue));
    }

    const handleKeyChange = (id: number, newKey: string) => {
        const updatedValue = internalValueRef.current.map(pair => 
            pair.id === id ? { ...pair, key: newKey } : pair
        );
        internalValueRef.current = updatedValue;
        onChange(toOutputFormat(updatedValue));
    }

    const handleValueChange = (id: number, newValue: string) => {
        const updatedValue = internalValueRef.current.map(pair => 
            pair.id === id ? { ...pair, value: newValue } : pair
        );
        internalValueRef.current = updatedValue;
        onChange(toOutputFormat(updatedValue));
    }

    return (
        <S.Container>
            {internalValueRef.current.map((pair) => (
                <S.ItemContainer style={{
                    border: "1px solid var(--dropdown-border)",
                    padding: "8px",
                    borderRadius: "8px",
                }} key={pair.id}>
                    <S.KeyValueContainer>
                        <S.Input
                            type="text"
                            value={pair.key}
                            onChange={(e) => handleKeyChange(pair.id, e.target.value)}
                            placeholder="Key"
                        />

                        <ChipExpressionEditorComponent
                            disabled={pair.key === "" || pair.key === undefined}
                            getHelperPane={expressionFieldProps.getHelperPane}
                            isExpandedVersion={false}
                            completions={expressionFieldProps.completions}
                            onChange={(value) => handleValueChange(pair.id, value)}
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
                        onClick={() => handleDeletePair(pair.id)}
                    >
                        <Codicon sx={{ color: ThemeColors.ERROR }} name="trash" />
                    </S.DeleteButton>
                </S.ItemContainer>
            ))}
            <Button
                onClick={handleAddPair}
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

export default MappingConstructor;