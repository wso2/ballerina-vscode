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

import './style.scss';

export const EDIT_SVG_WIDTH_WITH_SHADOW = 34;
export const EDIT_SVG_HEIGHT_WITH_SHADOW = 34;
export const EDIT_SVG_WIDTH = 25;
export const EDIT_SVG_HEIGHT = 25;
export const EDIT_SVG_OFFSET = 16;
export const EDIT_SHADOW_OFFSET = EDIT_SVG_HEIGHT_WITH_SHADOW - EDIT_SVG_HEIGHT;

export function EditSVG(props: { x: number, y: number }) {
    const { ...xyProps } = props;
    return (
        <svg  {...xyProps} width={EDIT_SVG_WIDTH_WITH_SHADOW} height={EDIT_SVG_HEIGHT_WITH_SHADOW}>
            <defs>
                <linearGradient id="EditLinearGradient" x1="0.5" y1="0.004" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
                    <stop offset="0" stopColor="#fff" />
                    <stop offset="1" stopColor="#f7f8fb" />
                </linearGradient>
                <filter id="EditFilter" x="0" y="0" width="34" height="34" filterUnits="userSpaceOnUse">
                    <feOffset dy="1" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feFlood floodColor="#9a9eac" floodOpacity="0.502" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
            </defs>
            <g id="Edit-Button" className="edit-circle edit-click" transform="translate(3.5 4.5)">
                <g transform="matrix(1, 0, 0, 1, -7.5, -6.5)">
                    <g id="EditGroup" transform="translate(4.5 3.5)" >
                        <rect width="18" height="18" rx="12.5" stroke="none" />
                        <rect x="0.5" y="0.5" width="17" height="17" rx="12" fill="none" />
                    </g>
                </g>
                <path
                    id="Icon-Path"
                    className="edit-icon"
                    d="M5.5,10.916a.5.5,0,0,1,0-1h6a.5.5,0,0,1,0,1Zm-5.5,0V8.209L7.649.56a1.913,1.913,0,0,1,
                   2.56-.131l.145.131.118.13a1.907,1.907,0,0,1-.118,2.58L2.707,10.916ZM8.357,1.267,1,
                   8.622V9.916H2.292L9.646,2.563a.92.92,0,0,0,.083-1.2l-.078-.089L9.57,1.2l-.1-.067a.911.911,
                   0,0,0-1.118.135Z"
                    fill="#36b475"
                />
                {/* <path
                    id="edit"
                    className="edit-icon-hover"
                    d="M5.5,12a.5.5,0,0,1,0-1h6a.5.5,0,0,1,0,1ZM0,11V8.291L7.708.56a1.913,1.913,0,0,1,
                  2.56-.131l.145.131.118.13a1.916,1.916,0,0,1-.118,2.58L2.707,11Z"
                    transform="translate(0 0)"
                    fill="#36b475"
                /> */}

            </g>
        </svg>
    )
}
