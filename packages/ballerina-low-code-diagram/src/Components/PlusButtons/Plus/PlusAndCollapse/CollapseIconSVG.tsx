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

export const COLLAPSE_ICON_SVG_WIDTH_WITH_SHADOW = 34;
export const COLLAPSE_ICON_SVG_HEIGHT_WITH_SHADOW = 34;
export const COLLAPSE_ICON_SVG_WIDTH = 24.5;
export const COLLAPSE_ICON_SVG_HEIGHT = 25;
export const COLLAPSE_ICON_SVG_SHADOW_OFFSET = COLLAPSE_ICON_SVG_HEIGHT_WITH_SHADOW - COLLAPSE_ICON_SVG_HEIGHT;

export function CollapseSVG(props: { x: number, y: number }) {
    const { ...xyProps } = props;
    return (
        <svg {...xyProps} width={COLLAPSE_ICON_SVG_WIDTH_WITH_SHADOW} height={COLLAPSE_ICON_SVG_HEIGHT_WITH_SHADOW} className="collapse-holder">
            <defs>
                <linearGradient id="CollapseLinearGradientDefault" x1="0" y1="0.004" x2="0" y2="1" gradientUnits="objectBoundingBox">
                    <stop offset="0" stopColor="#fff" />
                    <stop offset="1" stopColor="#f7f8fb" />
                </linearGradient>
                <filter id="CollapseFilter" x="0" y="0" width="34" height="34" filterUnits="userSpaceOnUse">
                    <feOffset dy="1" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feFlood floodColor="#9a9eac" floodOpacity="0.302" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
            </defs>
            <g id="Collapse" className="collapse-icon" transform="translate(-21027.5 -18596)">
                <g transform="matrix(1, 0, 0, 1, 21027.5, 18596)" filter="url(#CollapseFilter)">
                    <g id="Plus_a" transform="translate(29 29) rotate(180)">
                        <path id="WhiteBackground" d="M4,0H25a0,0,0,0,1,0,0V25a0,0,0,0,1,0,0H4a4,4,0,0,1-4-4V4A4,4,0,0,1,4,0Z" fill="#fdfdfe" stroke="none"  />
                        <path id="StrokeBackground" className="collapse-strokebg" d="M25,25.5H3.5c-1.9,0-3.5-1.6-3.5-3.6V3.6C0,1.6,1.6,0,3.5,0H25V25.5z M3.5,1C2.1,1,1,2.2,1,3.6v18.4 c0,1.4,1.1,2.6,2.5,2.6H24V1H3.5z" fill="#05a26b" stroke="none" />
                    </g>
                </g>
                <path id="CollapseIcon" className="collapse-dropdown-icon" d="M4,13V9.737l-1.15,1.15a.5.5,0,1,1-.707-.707l1.748-1.75a.5.5,0,0,1,.609-.5.5.5,0,0,1,.463.135.5.5,0,0,1,.147.364l1.748,1.75a.5.5,0,1,1-.707.707L5,9.737V13ZM.5,7a.5.5,0,1,1,0-1h8a.5.5,0,1,1,0,1ZM4.037,4.933a.5.5,0,0,1-.147-.364L2.143,2.82a.5.5,0,0,1,.707-.707L4,3.263V0H5V3.263l1.15-1.15a.5.5,0,0,1,.707.707L5.109,4.569a.5.5,0,0,1-.5.51A.492.492,0,0,1,4.5,5.068a.5.5,0,0,1-.463-.135Z" transform="translate(21040 18605.5)" fill="#36b475" />
            </g>
        </svg>
    )
}
