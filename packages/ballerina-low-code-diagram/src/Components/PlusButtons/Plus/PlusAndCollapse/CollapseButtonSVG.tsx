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

export const COLLAPSE_BUTTON_SVG_WIDTH_WITH_SHADOW = 40;
export const COLLAPSE_BUTTON_SVG_HEIGHT_WITH_SHADOW = 40;
export const COLLAPSE_BUTTON_SVG_WIDTH = 25;
export const COLLAPSE_BUTTON_SVG_HEIGHT = 25;
export const COLLAPSE_BUTTON_SHADOW_OFFSET = COLLAPSE_BUTTON_SVG_WIDTH_WITH_SHADOW - COLLAPSE_BUTTON_SVG_HEIGHT;

export function ColapseButtonSVG(props: { x: number, y: number }) {
    const { ...xyProps } = props;
    return (
        <svg {...xyProps} width={COLLAPSE_BUTTON_SVG_WIDTH_WITH_SHADOW} height={COLLAPSE_BUTTON_SVG_HEIGHT_WITH_SHADOW} >
            <defs>
                <linearGradient
                    id="CollapseLinearGradient"
                    x1="0.5"
                    y1="0.004"
                    x2="0.5"
                    y2="1"
                    gradientUnits="objectBoundingBox"
                >
                    <stop offset="0" stopColor="#fff" />
                    <stop offset="1" stopColor="#f7f8fb" />
                </linearGradient>
                <filter
                    id="CollapseFilterDefault"
                    x="0"
                    y="0"
                    width="34"
                    height="34"
                    filterUnits="userSpaceOnUse"
                >
                    <feOffset dy="1" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feFlood floodColor="#9a9eac" floodOpacity="0.302" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
                <filter id="CollapseFilterHover" x="0" y="0" width="40" height="40" filterUnits="userSpaceOnUse">
                    <feOffset dy="2" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feFlood floodColor="#9a9eac" floodOpacity="0.502" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
                <filter id="CollapseFilterClick" x="0" y="0" width="28" height="28" filterUnits="userSpaceOnUse">
                    <feOffset dy="1" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="0.5" result="blur" />
                    <feFlood floodColor="#9a9eac" floodOpacity="0.502" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
            </defs>
            <g id="Collapse" transform="translate(4.5 3.5)" className="collaspe-btn" >
                <g transform="matrix(1, 0, 0, 1, -4.5, -3.5)" filter="(#CollapseFilterDefault)">
                    <g id="CollapseRectangle" transform="translate(4.5 3.5)">
                        <rect width="25" height="25" rx="4" stroke="none" />
                        <rect x="0.5" y="0.5" width="24" height="24" rx="3.5" fill="none" />
                    </g>
                </g>
                <path
                    id="CollapseIcon"
                    className="collaspe-btn-icon"
                    d="M4,13V9.737l-1.15,1.15a.5.5,0,1,1-.707-.707l1.748-1.75a.5.5,0,0,1,.609-.5.5.5,0,0,1,
                    .463.135.5.5,0,0,1,.147.364l1.748,1.75a.5.5,0,1,1-.707.707L5,9.737V13ZM.5,7a.5.5,0,1,1,
                    0-1h8a.5.5,0,1,1,0,1ZM4.037,4.933a.5.5,0,0,1-.147-.364L2.143,2.82a.5.5,0,0,1,.707-.707L4,
                    3.263V0H5V3.263l1.15-1.15a.5.5,0,0,1,.707.707L5.109,4.569a.5.5,0,0,1-.5.51A.492.492,0,0,1,
                    4.5,5.068a.5.5,0,0,1-.463-.135Z"
                    transform="translate(8 6.003)"
                />
            </g>
        </svg>
    )
}

