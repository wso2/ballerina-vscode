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

export const COUNTERRIGHT_SVG_WIDTH = 50.055;
export const COUNTERRIGHT_SVG_HEIGHT = 29;

export function CounterRightSVG(props: { x: number, y: number, text: string }) {
    const { ...xyProps } = props;
    return (
        <svg {...xyProps} width={COUNTERRIGHT_SVG_WIDTH} height={COUNTERRIGHT_SVG_HEIGHT} className="plus-holder" >
            <defs>
                <linearGradient
                    id="CounterRightLinearGradient"
                    x1="0.5"
                    y1="-3.921"
                    x2="0.5"
                    y2="1.283"
                    gradientUnits="objectBoundingBox"
                >
                    <stop offset="0" stopColor="#8d91a3" />
                    <stop offset="1" stopColor="#32324d" />
                </linearGradient>
                <filter id="CounterRightFilter" x="0" y="0" width={COUNTERRIGHT_SVG_WIDTH} height={COUNTERRIGHT_SVG_HEIGHT} filterUnits="userSpaceOnUse">
                    <feOffset dy="1" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="1" result="blur" />
                    <feFlood floodColor="#8a92ab" floodOpacity="0.373" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
            </defs>
            <g id="CounterRight" transform="translate(3 2)">
                <g transform="matrix(1, 0, 0, 1, -3, -2)" filter="url(#CounterRightFilter)">
                    <path
                        id="CounterRightRectangle"
                        d="M0,3A3,3,0,0,1,3,0H37a3,3,0,0,1,3,3V8c0,2.072,4.055,3.5,4.055,3.5S40,12.983,40,16v4a3,3,0,0,
                        1-3,3H3a3,3,0,0,1-3-3Z"
                        transform="translate(3 2)"
                        fill="url(#CounterRightLinearGradient)"
                    />
                </g>
                <text
                    id="CounterRightText"
                    transform="translate(20 15)"
                    fill="#fff"
                    fontSize="11"
                    fontFamily="GilmerMedium, Gilmer Medium"
                >
                    <tspan x="-12.501" y="0">{props.text}</tspan>
                </text>
            </g>
        </svg>
    )
}
