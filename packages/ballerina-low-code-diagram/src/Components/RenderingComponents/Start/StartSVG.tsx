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
// tslint:disable: jsx-wrap-multiline
import React from "react";

export const START_SVG_WIDTH_WITH_SHADOW = 94;
export const START_SVG_HEIGHT_WITH_SHADOW = 52;
export const START_HOVER_SVG_WIDTH_WITH_SHADOW = 94;
export const START_HOVER_SVG_HEIGHT_WITH_SHADOW = 52;
export const START_SVG_WIDTH = 82;
export const START_SVG_HEIGHT = 40;
export const START_SVG_SHADOW_OFFSET = START_SVG_HEIGHT_WITH_SHADOW - START_SVG_HEIGHT;

export function StartSVG(props: { x: number, y: number, text: string }) {
    const { text: startText, ...xyProps } = props;

    return (
        <svg {...xyProps} width={START_HOVER_SVG_WIDTH_WITH_SHADOW} height={START_HOVER_SVG_HEIGHT_WITH_SHADOW}>
            <defs>
                <filter id="StartFilterDefault" x="0" y="0" width="94" height="52" filterUnits="userSpaceOnUse">
                    <feOffset dy="1" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feFlood flood-color="#a9acb6" flood-opacity="0.388" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
                <linearGradient id="linear-gradient" x1="0.5" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
                    <stop offset="0" stop-color="#fcfcfd" />
                    <stop offset="1" stop-color="#f7f8fb" />
                </linearGradient>
            </defs>
            <g id="Start" className="start-button" >
                <g>
                    <g className="start-button-rect" transform="matrix(1, 0, 0, 1, -6, -5)" filter="url(#StartFilterDefault)">
                        <rect id="StartRectangle" width={START_SVG_WIDTH} height={START_SVG_HEIGHT} rx="20" transform="translate(6 5)" fill="#dce1ff" />
                    </g>
                    <g id="Rectangle-4" className="start-rect-fill" >
                        <rect width="82" height="40" rx="20" stroke="none" fill="#dce1ff" />
                        <rect x="0.5" y="0.5" width="81" height="39" rx="19.5" fill="none" />
                    </g>
                </g>
                <text id="StartText" x="42" y="24" textAnchor="middle" className="start-text">
                    <tspan className="start-text">
                        {startText.length > 9 ? `${startText.substring(0, 7)}...` : startText}
                    </tspan>
                </text>
            </g>
        </svg>
    )
}
