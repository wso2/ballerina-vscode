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
import * as React from "react";

import "../style.scss"

import { ErrorSVG } from "./ErrorSVG";
import { SuccessSVG } from "./SuccessSVG";

export interface SuccessTextProps {
    x: number,
    y: number,
    successRate: number,
    failureRate: number
}

export function SuccessFailureC(props: SuccessTextProps) {
    const { x, y, successRate, failureRate } = props;
    if (failureRate > successRate){
        return (
            <g>
                <ErrorSVG x={x} y={y} failureRate={failureRate}/>
            </g>
        );
    }else{
        return (
            <g>
                <SuccessSVG x={x} y={y} successRate={successRate} />
            </g>
        );
    }
}

export const SuccesFailure = SuccessFailureC;
