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

import React, { useState } from "react"
import { Codicon } from "@wso2/ui-toolkit";
import { S } from "../styles"

interface TupleEditorProps {
    label: string
}
export const TupleEditor: React.FC<TupleEditorProps> = ({ label }) => {
    const [values, setValues] = useState<string[]>([""]);

    const handleValueChange = (index: number, value: string) => {
        const newValues = [...values];
        newValues[index] = value;
        setValues(newValues);
    };

    const handleDelete = (index: number) => {
        setValues(values.filter((_, i) => i !== index));
    };

    const handleAdd = () => {
        setValues([...values, ""]);
    };

    return (
        <S.Container>
            <S.Label>{label}</S.Label>
            {values.map((value, index) => (
                <S.ItemContainer key={index}>
                    <S.IndexContainer>{index}</S.IndexContainer>
                    <S.Input
                        type="text"
                        value={value}
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