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
export const BIGPLUS_SVG_WIDTH_WITH_SHADOW = 40;
export const BIGPLUS_SVG_HEIGHT_WITH_SHADOW = 40;
export const BIGPLUS_SVG_WIDTH = 25;
export const BIGPLUS_SVG_HEIGHT = 25;
export const BIGPLUS_SHADOW_OFFSET = BIGPLUS_SVG_HEIGHT_WITH_SHADOW - BIGPLUS_SVG_HEIGHT;

import * as React from "react";

export function BigPlusSVG(props: { x: number, y: number }) {
    const { ...xyProps } = props;
    return (
        <svg {...xyProps} width={BIGPLUS_SVG_WIDTH_WITH_SHADOW} height={BIGPLUS_SVG_HEIGHT_WITH_SHADOW} className="big-plus">
            <defs>
                <linearGradient
                    id="BigPlusLinearGradientDefault"
                    x1="0.5"
                    y1="0.004"
                    x2="0.5"
                    y2="1"
                    gradientUnits="objectBoundingBox"
                >
                    <stop offset="0" stopColor="#fff" />
                    <stop offset="1" stopColor="#f7f8fb" />
                </linearGradient>
                <filter id="BigPlusFilterDefault" x="0" y="0" width="34" height="34" filterUnits="userSpaceOnUse">
                    <feOffset dy="1" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feFlood floodColor="#9a9eac" floodOpacity="0.302" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
                <filter id="BigPlusFilterHover" x="0" y="0" width="40" height="40" filterUnits="userSpaceOnUse">
                    <feOffset dy="2" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feFlood floodColor="#9a9eac" floodOpacity="0.502" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
                <filter id="BigPlusFilterClick" x="0" y="0" width="28" height="28" filterUnits="userSpaceOnUse">
                    <feOffset dy="1" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="0.5" result="blur" />
                    <feFlood floodColor="#9a9eac" floodOpacity="0.502" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
            </defs>
            <g id="BigPlus" transform="translate(4.5 3.5)">
                <g transform="matrix(1, 0, 0, 1, -4.5, -3.5)" >
                    <g id="BigPlusRectangle" transform="translate(4.5 3.5)" >
                        <rect className="plus-rect" width="25" height="25" rx="12.5" stroke="none" />
                        <rect className="plus-rect" x="0.5" y="0.5" width="24" height="24" rx="12" fill="none" />
                    </g>
                </g>
                <path
                    className="plus_icon"
                    id="BigPlusCombined"
                    d="M4,8.5V5H.5a.5.5,0,1,1,0-1H4V.5a.5.5,0,1,1,1,0V4H8.5a.5.5,0,0,1,0,1H5V8.5a.5.5,0,0,1-1,0Z"
                    transform="translate(8 8)"
                    fill="#36b475"
                />
            </g>
        </svg>
    )
}
