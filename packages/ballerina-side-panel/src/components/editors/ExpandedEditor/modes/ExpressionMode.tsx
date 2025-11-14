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

import React from "react";
import styled from "@emotion/styled";
import { EditorModeExpressionProps } from "./types";
import { ChipExpressionBaseComponent2 } from "../../MultiModeExpressionEditor/ChipExpressionEditor/components/ChipExpressionBaseComponent2";

const ExpressionContainer = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
`;

/**
 * Expression mode editor - uses ChipExpressionBaseComponent in expanded mode
 */
export const ExpressionMode: React.FC<EditorModeExpressionProps> = ({
    value,
    onChange,
    completions = [],
    fileName,
    targetLineRange,
    extractArgsFromFunction,
    getHelperPane
}) => {
    // Convert onChange signature from (value: string) => void to (value: string, cursorPosition: number) => void
    const handleChange = (updatedValue: string, updatedCursorPosition: number) => {
        onChange(updatedValue, updatedCursorPosition);
    };

    return (
        <ExpressionContainer>
            <ChipExpressionBaseComponent2
                value={value}
                onChange={handleChange}
                completions={completions}
                fileName={fileName}
                targetLineRange={targetLineRange}
                extractArgsFromFunction={extractArgsFromFunction}
                getHelperPane={getHelperPane}
                isInExpandedMode={true}
            />
        </ExpressionContainer>
    );
};
