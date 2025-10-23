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
    onChipClick?: (element: HTMLElement, value: string, type: string, absoluteOffset?: number) => void,
    onChipBlur?: () => void,
    chipId?: string
): ReactNode => {
    const handleClick = (element: HTMLElement) => {
        console.log(`Clicked on ${type}: ${value}`);
        if (onChipClick) {
            onChipClick(element, value, type, absoluteOffset);
        }
    };

    const handleBlur = () => {
        console.log(`Blurred from ${type}: ${value}`);
        if (onChipBlur) {
            onChipBlur();
        }
    };

    switch (type) {
        case "variable":
            return <ChipComponent type="variable" dataElementId={chipId} text={value} onClick={handleClick} onBlur={handleBlur} />;
        case "parameter":
            return <ChipComponent type="parameter" dataElementId={chipId} text={value} onClick={handleClick} onBlur={handleBlur} />;
        case "property":
            return <ChipComponent type="property" dataElementId={chipId} text={value} onClick={handleClick} onBlur={handleBlur} />;
        default:
            return <ChipComponent type="property" dataElementId={chipId} text={value} onClick={handleClick} onBlur={handleBlur} />;
    }
}

export type TokenizedExpressionProps = {
    expressionModel: ExpressionModel[];
    onChipClick?: (element: HTMLElement, value: string, type: string, absoluteOffset?: number) => void;
    onChipBlur?: () => void;
    onExpressionChange?: (updatedExpressionModel: ExpressionModel[], cursorDelta: number) => void;
    onTriggerRebuild?: (value: string, caretPosition?: number) => void;
}

export const TokenizedExpression = (props: TokenizedExpressionProps) => {
    const { expressionModel, onExpressionChange, onTriggerRebuild } = props;

    return (
        expressionModel.length === 0 ? (
            <TextElement
                key="empty"
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
                                    'variable',
                                    undefined,
                                    props.onChipClick,
                                    props.onChipBlur,
                                    element.id
                                )}
                            </React.Fragment>
                        );
                    } else {
                        return <TextElement
                            key={element.id}
                            element={element}
                            expressionModel={expressionModel}
                            index={index}
                            onExpressionChange={onExpressionChange}
                            onTriggerRebuild={onTriggerRebuild}
                        />;
                    }
                })}
            </>
        )
    )
}
