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
import { ReactNode } from "react";
import { ChipComponent } from "./ChipComponent";
import { TextElement } from "./TextElement";
import { ExpressionModel } from "../types";

export const getTokenTypeFromIndex = (index: number): string => {
    const tokenTypes: { [key: number]: string } = {
        0: 'variable',
        1: 'property',
        2: 'parameter'
    };
    return tokenTypes[index] || 'property';
};

export const getTokenChip = (
    value: string,
    type: string,
    absoluteOffset?: number,
    onChipClick?: (element: HTMLElement, value: string, type: string, id?: string) => void,
    onChipBlur?: () => void,
    onChipFocus?: (element: HTMLElement, value: string, type: string, absoluteOffset?: number) => void,
    chipId?: string
): ReactNode => {
    const handleClick = (element: HTMLElement) => {
        if (onChipClick) {
            onChipClick(element, value, type, chipId);
        }
    };

    const handleBlur = () => {
        if (onChipBlur) {
            onChipBlur();
        }
    };

    const handleFocus = (element: HTMLElement) => {
        if (onChipFocus) {
            onChipFocus(element, value, type, absoluteOffset);
        }
    };

    return <ChipComponent type={type as 'variable' | 'property' | 'parameter'} dataElementId={chipId} text={value} onClick={handleClick} onBlur={handleBlur} onFocus={handleFocus} />;

}

export type TokenizedExpressionProps = {
    expressionModel: ExpressionModel[];
    onChipClick?: (element: HTMLElement, value: string, type: string, id?: string) => void;
    onChipBlur?: () => void;
    onTextFocus?: (e: React.FocusEvent<HTMLSpanElement>) => void;
    onChipFocus?: (element: HTMLElement, value: string, type: string, absoluteOffset?: number) => void;
    onExpressionChange?: (updatedExpression: ExpressionModel[], cursorPosition: number, lastTypedText: string) => void;
}

export const TokenizedExpression = (props: TokenizedExpressionProps) => {
    const { expressionModel, onExpressionChange } = props;

    return (
        expressionModel.length === 0 ? (
            <TextElement
                key="empty"
                sx={{
                    display: "inline-block"
                }}
                element={{ id: "empty", value: "", isToken: false, length: 0 } as ExpressionModel}
                expressionModel={[]}
                index={0}
                onExpressionChange={onExpressionChange}
            />
        ) : (
            <>
                {expressionModel.map((element, index) => {
                    if (element.isToken) {
                        // Use stable key to prevent React from remounting and losing focus
                        return (
                            <React.Fragment key={element.id}>
                                {getTokenChip(
                                    element.value,
                                    element.type,
                                    undefined,
                                    props.onChipClick,
                                    props.onChipBlur,
                                    props.onChipFocus,
                                    element.id
                                )}
                            </React.Fragment>
                        );
                    } else {
                        return <TextElement
                            key={element.id}
                            element={element}
                            expressionModel={expressionModel}
                            onTextFocus={props.onTextFocus}
                            index={index}
                            onExpressionChange={onExpressionChange}
                            sx={{
                                display: expressionModel.length === 1 ? 'inline-block' : 'inline',
                            }}
                        />;
                    }
                })}
            </>
        )
    )
}
