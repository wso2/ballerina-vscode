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

export const TRIGGER_SVG_WIDTH = 29;
export const TRIGGER_SVG_HEIGHT = 97;
export const TRIGGER_RECT_SVG_HEIGHT = 49;
export const TRIGGER_RECT_SVG_WIDTH = 11;

export function TriggerSVG(props: { x: number, y: number }) {
    const { ...xyProps } = props;
    return (
        <svg {...xyProps} width={TRIGGER_SVG_WIDTH} height={TRIGGER_SVG_HEIGHT} >
            <defs>
                <linearGradient id="linear-gradient" x1="0.5" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
                    <stop offset="0" stopColor="#fcfcfd" />
                    <stop offset="1" stopColor="#f7f8fb" />
                </linearGradient>
                <filter id="Rectangle_Copy_5" x="0" y="0" width="23" height="62" filterUnits="userSpaceOnUse">
                    <feOffset dy="1" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feFlood floodColor="#a9acb6" floodOpacity="0.388" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
                <clipPath id="clipPath">
                    <rect id="Mask" width="7" height="46" rx="3" transform="translate(1 1)" fill="#fff" />
                </clipPath>
            </defs>
            <g id="trigger_copy" className="trigger-group" transform="translate(10 1)">
                <g transform="matrix(1, 0, 0, 1, -7, -6)" filter="url(#Rectangle_Copy_5)">
                    <g id="Rectangle_Copy_5-2" transform="translate(7 6)" stroke="#32324d" strokeMiterlimit="10" strokeWidth="1" fill="url(#linear-gradient)">
                        <rect width="9" height="48" rx="4.5" stroke="none" />
                        <rect x="-0.5" y="-0.5" width="10" height="49" rx="5" fill="none" />
                    </g>
                </g>
                <rect id="Mask-2" width="7" height="46" rx="3" transform="translate(1 1)" fill="#fff" />
                <g id="trigger_copy-2" clipPath="url(#clipPath)">
                    <path id="Combined_Shape" d="M0,63.227,13.436,47.739l.564.65L.564,63.877ZM0,59.55,13.436,44.061l.564.651L.564,60.2Zm0-3.677L13.436,40.385l.564.65L.564,56.523ZM0,52.2,13.436,36.707l.564.651L.564,52.846Zm0-3.615.027-.031L0,48.519,13.436,33.031l.564.65-.027.031.027.031L.564,49.231Zm0-3.739L13.436,29.354,14,30,.564,45.492Zm0-3.615L.027,41.2,0,41.165,13.436,25.677l.564.65-.027.031.027.031L.564,41.877Zm0-3.739L13.436,22,14,22.65.564,38.138Zm0-3.615L13.436,18.384l.564.651L.564,34.523ZM0,30.2,13.436,14.708l.564.65L.564,30.846Zm0-3.676L13.436,11.03l.564.651L.564,27.169Zm0-3.677L13.436,7.354,14,8,.564,23.492Zm0-3.677L13.436,3.677,14,4.327.564,19.815Zm0-3.677L13.436,0,14,.65.564,16.139Z" transform="translate(-3 -7.615)" fill="#8d91a3" />
                </g>
            </g>
        </svg>
    )
}
