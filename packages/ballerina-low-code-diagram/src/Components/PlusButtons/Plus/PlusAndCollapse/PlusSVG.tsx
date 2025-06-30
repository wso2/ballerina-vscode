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

export const PLUS_SVG_WIDTH_WITH_SHADOW = 33.5;
export const PLUS_SVG_HEIGHT_WITH_SHADOW = 33.5;
export const PLUS_SVG_WIDTH = 24.5;
export const PLUS_SVG_HEIGHT = 25;
export const PLUS_SVG_SHADOW_OFFSET = PLUS_SVG_HEIGHT_WITH_SHADOW - PLUS_SVG_HEIGHT;

export function PlusSVG(props: { x: number, y: number }) {
    const { ...xyProps } = props;
    return (
        <svg {...xyProps} width={PLUS_SVG_WIDTH_WITH_SHADOW} height={PLUS_SVG_HEIGHT_WITH_SHADOW} className="plus-holder" >
            <defs>
                <linearGradient id="PlusLinearGradientDefault" x1="0.5" y1="0.004" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
                    <stop offset="0" stopColor="#fff" />
                    <stop offset="1" stopColor="#f7f8fb" />
                </linearGradient>
                <linearGradient id="PlusLinearGradientHover" x1="0.5" y1="0.004" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
                    <stop offset="0" stopColor="#05a26b" />
                    <stop offset="1" stopColor="#049a65" />
                </linearGradient>
                <linearGradient id="PlusLinearGradientClick" x1="0.5" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
                    <stop offset="0" stopColor="#05a26b" />
                    <stop offset="1" stopColor="#07af74" />
                </linearGradient>
                <filter id="PlusFilter" x="0" y="0" width="34" height="34" filterUnits="userSpaceOnUse">
                    <feOffset dy="1" in="SourceAlpha"/>
                    <feGaussianBlur stdDeviation="1.5" result="blur"/>
                    <feFlood floodColor="#9a9eac" floodOpacity="0.502"/>
                    <feComposite operator="in" in2="blur"/>
                    <feComposite in="SourceGraphic"/>
                </filter>
                <filter id="PlusFilter" x="0" y="0" width="40" height="40" filterUnits="userSpaceOnUse">
                    <feOffset dy="2" in="SourceAlpha"/>
                    <feGaussianBlur stdDeviation="2.5" result="blur"/>
                    <feFlood floodColor="#9a9eac" floodOpacity="0.502"/>
                    <feComposite operator="in" in2="blur"/>
                    <feComposite in="SourceGraphic"/>
                </filter>
                <filter id="PlusFilter" x="0" y="0" width="34" height="34" filterUnits="userSpaceOnUse">
                    <feOffset dy="3" in="SourceAlpha"/>
                    <feGaussianBlur stdDeviation="1.5" result="blur"/>
                    <feFlood floodColor="#3d7f68" floodOpacity="0.2"/>
                    <feComposite operator="in" in2="blur"/>
                    <feComposite in="SourceGraphic"/>
                </filter>
            </defs>
            <g className="plus-icon product-tour-big-plus" id="Plus" transform="translate(-301.5 -346.5)">
                <g transform="matrix(1, 0, 0, 1, 301.5, 346.5)" filter="url(#PlusFilter)" >
                    <g id="Plus_a" transform="translate(4.5 3.5)">
                        <path d="M4,0H25a0,0,0,0,1,0,0V25a0,0,0,0,1,0,0H4a4,4,0,0,1-4-4V4A4,4,0,0,1,4,0Z" stroke="none"/>
                         <path d="M4,.5H24a.5.5,0,0,1,.5.5V24a.5.5,0,0,1-.5.5H4A3.5,3.5,0,0,1,.5,21V4A3.5,3.5,0,0,1,4,.5Z" fill="none"/>
                    </g>
                </g>
                <path
                    id="Plus_add"
                    d="M4,8.5V5H.5a.5.5,0,1,1,0-1H4V.5a.5.5,0,1,1,1,0V4H8.5a.5.5,0,0,1,0,1H5V8.5a.5.5,0,0,1-1,0Z"
                    transform="translate(314 358)"
                    className="plus-add-icon"
                />
            </g>
        </svg>
    )
}
