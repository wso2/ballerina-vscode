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
// tslint:disable: jsx-no-multiline-js

import * as React from "react";

import { ARROW_HEIGHT, ARROW_WIDTH } from "../ArrowHead";

import './style.scss';

export function ControlFLowArrowSVG(props: { x1: number, y: number, x2: number, isDotted: boolean, isLeft?: boolean }) {
    const { isDotted, x1, x2, y, isLeft } = props;
    const pointX = isDotted ? x2 : x1;

    const pointsR = `${pointX - ARROW_HEIGHT},${y - ARROW_WIDTH} ${pointX - ARROW_HEIGHT},${y + ARROW_WIDTH} ${pointX},${y}  `;
    const pointsL = `${pointX + ARROW_HEIGHT},${y - ARROW_WIDTH} ${pointX + ARROW_HEIGHT},${y + ARROW_WIDTH} ${pointX},${y}  `;
    const points = isLeft ? pointsL : (isDotted ? pointsL : pointsR);
    return (
        <svg>
            <defs>
                <filter id="control_flow_glowing_filter" {...props} filterUnits="userSpaceOnUse">
                    <feOffset in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feFlood flood-color="#36b475" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
            </defs>

            <g className="arrow-head">
                <polygon points={points} filter="url(#control_flow_glowing_filter)" />
            </g>
            <g>
                <line
                    className={isDotted ? "line-dashed" : "line"}
                    filter="url(#control_flow_glowing_filter)"
                    x1={x1}
                    y1={y}
                    x2={x2}
                    y2={y}
                    fill="none"
                    stroke="#36b475"
                    strokeMiterlimit="10"
                    strokeWidth="1"
                />
            </g>
        </svg>
    );
}

