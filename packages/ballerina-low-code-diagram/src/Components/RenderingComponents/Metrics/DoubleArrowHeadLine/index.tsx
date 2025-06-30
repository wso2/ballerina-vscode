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

import { ArrowHead } from "../../ArrowHead";
import "../style.scss";

export interface DoubleArrowHeadLineProps {
    startX: number,
    endX: number,
    startY: number,
    endY: number,
    direction: "vertical" | "horizontal",
    className: string
}

export function DoubleArrowHeadLineC(props: DoubleArrowHeadLineProps) {
    const { startX, endX, startY, endY, direction, className } = props;

    return (
        <g>
            <ArrowHead x={startX} y={startY} direction={direction === "vertical" ? "up" : "left"} />
            <line x1={startX} y1={startY} x2={endX} y2={endY} className={className}/>
            <ArrowHead x={endX} y={endY} direction={direction === "vertical" ? "down" : "right"} />
        </g>
    );
}

export const DoubleArrowHeadLine = DoubleArrowHeadLineC;
