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

export const EXPAND_SVG_WIDTH_WITH_SHADOW = 40;
export const EXPAND_SVG_HEIGHT_WITH_SHADOW = 40;
export const EXPAND_SVG_WIDTH = 25;
export const EXPAND_SVG_HEIGHT = 25;
export const EXPAND_SHADOW_OFFSET = EXPAND_SVG_WIDTH_WITH_SHADOW - EXPAND_SVG_HEIGHT;

export function ExpandButtonSVG(props: { x: number, y: number, onClick: () => void }) {
    const { onClick, ...xyProps } = props;
    return (
        <svg {...xyProps} width={EXPAND_SVG_WIDTH} height={EXPAND_SVG_HEIGHT} onClick={onClick}>
        <g id="Expand_default" transform="translate(1 1)">
            <g id="Rectangle_Copy_8">
                <rect id="Rectangle_Copy_8-2" width="14" height="14" rx="2" fill="#fff" />
                <g id="Rectangle_Copy_8-3" fill="none" stroke="#bdbec4" strokeMiterlimit="10" strokeWidth="1">
                    <rect width="14" height="14" rx="2" stroke="none" />
                    <rect x="-0.5" y="-0.5" width="15" height="15" rx="2.5" fill="none" />
                </g>
            </g>
            <path id="Path_4_Copy_7" d="M.146-.146a.5.5,0,0,0,.638.058L.854-.146,2.5-1.79,4.146-.146a.5.5,0,0,0,.638.058l.069-.058a.5.5,0,0,0,.058-.637L4.854-.852,2.5-3.2.146-.852A.5.5,0,0,0,.146-.146Z" transform="translate(4.5 5.205)" fill="#40404b" />
            <path id="Path_4_Copy_9" d="M.146-.146a.5.5,0,0,0,.638.058L.854-.146,2.5-1.79,4.146-.146a.5.5,0,0,0,.638.058l.069-.058a.5.5,0,0,0,.058-.637L4.854-.852,2.5-3.2.146-.852A.5.5,0,0,0,.146-.146Z" transform="translate(9.5 8.802) rotate(180)" fill="#40404b" />
            <path id="Path_5_Copy_4" d="M1,1.5a.5.5,0,0,1-.992.09L0,1.5V.5A.5.5,0,0,1,.992.41L1,.5Z" transform="translate(6.55 6.001)" fill="#40404b" />
        </g>
        </svg>
    )
}
