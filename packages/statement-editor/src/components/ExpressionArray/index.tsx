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
// tslint:disable: jsx-no-multiline-js jsx-no-lambda
import React from "react";

import { STKindChecker, STNode } from "@wso2/syntax-tree";

import { ArrayType } from "../../constants";
import { ExpressionComponent } from "../Expression";
import { ExpressionArrayElementComponent } from "../ExpressionArrayElement";
import { TokenComponent } from "../Token";

export interface ExpressionArrayProps {
    expressions: STNode[];
    modifiable?: boolean;
    arrayType?: ArrayType;
}

export function ExpressionArrayComponent(props: ExpressionArrayProps) {
    const { expressions, modifiable, arrayType } = props;

    const [hoverIndex, setHoverIndex] = React.useState(null);

    const onMouseEnter = (e: React.MouseEvent , index: number) => {
        setHoverIndex(index);
        e.stopPropagation()
        e.preventDefault();
    }

    const onMouseLeave = (e: React.MouseEvent) => {
        setHoverIndex(null);
        e.stopPropagation()
        e.preventDefault();
    }

    return (
        <span onMouseLeave={onMouseLeave}>
            { expressions.map((expression: STNode, index: number) => {
                return (STKindChecker.isCommaToken(expression))
                ? (
                     <TokenComponent key={index} model={expression} />
                ) : (
                    <ExpressionArrayElementComponent
                        expression={expression}
                        modifiable={modifiable}
                        arrayType={arrayType}
                        index={index}
                        length={expressions.length}
                        onMouseEnterCallback={onMouseEnter}
                        isHovered={hoverIndex === index}
                    >
                        {(index === (expressions.length - 1)) ? (
                            <ExpressionComponent
                                key={index}
                                model={expression}
                                isHovered={true} // Always we need to show the last plus
                            />
                        ) : (
                            <ExpressionComponent
                                key={index}
                                model={expression}
                                isHovered={hoverIndex === index}
                            />
                        )}
                    </ExpressionArrayElementComponent>
                )
            })}
        </span>
    );
}
