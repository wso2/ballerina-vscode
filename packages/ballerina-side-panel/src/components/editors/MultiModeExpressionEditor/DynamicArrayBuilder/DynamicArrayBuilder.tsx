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

interface DynamicArrayBuilderProps {
    label: string;
    values: string[];
    onChange: (updated: string, updatedCursorPosition: number) => void;
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

    export const Input = styled.input({
        flex: 1,
        padding: '4px 8px',
        border: `1px solid ${ThemeColors.OUTLINE}`,
        borderRadius: '4px',
        backgroundColor: 'var(--vscode-input-background)',
        color: 'var(--vscode-input-foreground)',
        fontSize: '13px',
        fontFamily: 'var(--vscode-editor-font-family)',
        '&:focus': {
            outline: `1px solid ${ThemeColors.PRIMARY}`,
            borderColor: ThemeColors.PRIMARY,
        },
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

export const DynamicArrayBuilder = (props: DynamicArrayBuilderProps) => {
    const { label, values, onChange } = props;
    const [arrayValues, setArrayValues] = useState<string[]>(values);

    useEffect(() => {
        setArrayValues(values);
    }, [values]);

    const updateArray = (newArray: string[]) => {
        setArrayValues(newArray);
        const formatted = `[${newArray.map(v => `"${v}"`).join(', ')}]`;
        onChange(formatted, formatted.length);
    };

    const handleInputChange = (index: number, value: string) => {
        const newArray = [...arrayValues];
        newArray[index] = value;
        updateArray(newArray);
    };

    const handleDelete = (index: number) => {
        const newArray = arrayValues.filter((_, i) => i !== index);
        updateArray(newArray);
    };

    const handleAdd = () => {
        const newArray = [...arrayValues, ''];
        updateArray(newArray);
    };

    return (
        <S.Container>
            <S.Label>{label}</S.Label>
            {arrayValues.map((value, index) => (
                <S.ItemContainer key={index}>
                    <S.Input
                        type="text"
                        value={value}
                        onChange={(e) => handleInputChange(index, e.target.value)}
                        placeholder="Enter value"
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
                Add Item
            </S.AddButton>
        </S.Container>
    );
};