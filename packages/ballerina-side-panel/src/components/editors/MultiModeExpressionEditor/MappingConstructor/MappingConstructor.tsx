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
import styled from '@emotion/styled';
import { Button, Codicon, ThemeColors } from '@wso2/ui-toolkit';

interface MappingConstructorProps {
    label: string;
    values: Record<string, string>;
    onChange: (updated: string, updatedCursorPosition: number) => void;
}

interface KeyValuePair {
    key: string;
    value: string;
}

export namespace S {
    export const Container = styled.div({
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontFamily: 'var(--font-family)',
    });

    export const Label = styled.label({
        color: 'var(--vscode-editor-foreground)',
        fontSize: '13px',
        fontWeight: 'bold',
    });

    export const ItemContainer = styled.div({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    });

    export const Input = styled.input<{ isError?: boolean }>(({ isError }) => ({
        flex: 1,
        padding: '4px 8px',
        border: `1px solid ${ThemeColors.OUTLINE}`,
        borderRadius: '4px',
        backgroundColor: isError ? 'var(--vscode-inputValidation-errorBackground)' : 'var(--vscode-input-background)',
        color: 'var(--vscode-input-foreground)',
        fontSize: '13px',
        fontFamily: 'var(--vscode-editor-font-family)',
        '&:focus': {
            outline: `1px solid ${ThemeColors.PRIMARY}`,
            borderColor: ThemeColors.PRIMARY,
        },
    }));

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

export const MappingConstructor: React.FC<MappingConstructorProps> = ({ label, values, onChange }) => {
    const [pairs, setPairs] = useState<KeyValuePair[]>([]);

    useEffect(() => {
        const initialPairs = Object.entries(values).map(([key, value]) => ({ key, value }));
        setPairs(initialPairs);
    }, [JSON.stringify(values)]);

    const getDuplicateKeys = (pairs: KeyValuePair[]): Set<string> => {
        const keyCount = new Map<string, number>();
        pairs.forEach(pair => {
            if (pair.key.trim()) {
                keyCount.set(pair.key.trim(), (keyCount.get(pair.key.trim()) || 0) + 1);
            }
        });
        return new Set([...keyCount.entries()].filter(([, count]) => count > 1).map(([key]) => key));
    };

    const updatePairs = (newPairs: KeyValuePair[]) => {
        setPairs(newPairs);
        const map: Record<string, string> = {};
        newPairs.forEach(pair => {
            if (pair.key.trim()) {
                map[pair.key.trim()] = pair.value;
            }
        });
        if (JSON.stringify(map) !== JSON.stringify(values)) {
            onChange(JSON.stringify(map), JSON.stringify(map).length);
        }
    };

    const handleKeyChange = (index: number, key: string) => {
        const newPairs = [...pairs];
        newPairs[index].key = key;
        updatePairs(newPairs);
    };

    const handleValueChange = (index: number, value: string) => {
        const newPairs = [...pairs];
        newPairs[index].value = value;
        updatePairs(newPairs);
    };

    const handleDelete = (index: number) => {
        const newPairs = pairs.filter((_, i) => i !== index);
        updatePairs(newPairs);
    };

    const handleAdd = () => {
        const newPairs = [...pairs, { key: '', value: '' }];
        updatePairs(newPairs);
    };

    const duplicateKeys = getDuplicateKeys(pairs);

    return (
        <S.Container>
            <S.Label>{label}</S.Label>
            {pairs.map((pair, index) => (
                <S.ItemContainer key={index}>
                    <S.Input
                        type="text"
                        value={pair.key}
                        onChange={(e) => handleKeyChange(index, e.target.value)}
                        placeholder="Key"
                        isError={duplicateKeys.has(pair.key.trim())}
                    />
                    <S.Input
                        type="text"
                        value={pair.value}
                        onChange={(e) => handleValueChange(index, e.target.value)}
                        placeholder="Value"
                        isError={false}
                    />
                    <S.DeleteButton
                        appearance="icon"
                        onClick={() => handleDelete(index)}
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
                Add Entry
            </S.AddButton>
        </S.Container>
    );
};

export default MappingConstructor;