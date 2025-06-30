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

export const COLLAPSE_SVG_WIDTH_WITH_SHADOW = 20;
export const COLLAPSE_SVG_HEIGHT_WITH_SHADOW = 20;
export const COLLAPSE_SVG_WIDTH = 16;
export const COLLAPSE_SVG_HEIGHT = 16;
export const COLLAPSE_SHADOW_OFFSET = COLLAPSE_SVG_WIDTH_WITH_SHADOW - COLLAPSE_SVG_HEIGHT;

export function ColapseButtonSVG(props: { x: number, y: number, onClick: () => void }) {
    const { onClick, ...xyProps } = props;
    return (
        <svg {...xyProps} id="UnfoldDefault" width={COLLAPSE_SVG_WIDTH} height={COLLAPSE_SVG_HEIGHT} onClick={onClick}>
            <g id="Collapse_Default" transform="translate(1 1)">
                <g id="Rectangle_Copy_8">
                    <rect id="Rectangle_Copy_8-2" width="14" height="14" rx="2" fill="#fff" />
                    <g id="Rectangle_Copy_8-3" fill="none" stroke="#bdbec4" strokeMiterlimit="10" strokeWidth="1">
                        <rect width="14" height="14" rx="2" stroke="none" />
                        <rect x="-0.5" y="-0.5" width="15" height="15" rx="2.5" fill="none" />
                    </g>
                </g>
                <path id="Combined_Shape" d="M5.216,9.494l-.069-.059L3.5,7.792,1.854,9.436a.5.5,0,0,1-.638.059l-.069-.059A.5.5,0,0,1,1.089,8.8l.058-.069L3.5,6.379,5.854,8.73a.5.5,0,0,1-.638.764ZM.5,5.29A.5.5,0,0,1,.41,4.3L.5,4.29h6a.5.5,0,0,1,.09.992L6.5,5.29ZM1.147.852A.5.5,0,0,1,1.785.088l.069.059L3.5,1.79,5.146.147A.5.5,0,0,1,5.784.088l.069.058a.5.5,0,0,1,.058.637L5.854.852,3.5,3.2Z" transform="translate(3.5 2.211)" fill="#40404b" />
            </g>
        </svg>
    )
}
