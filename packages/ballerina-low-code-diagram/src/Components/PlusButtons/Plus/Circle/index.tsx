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

export const PLUSCIRCLE_SVG_WIDTH_WITH_SHADOW = 13;
export const PLUSCIRCLE_SVG_HEIGHT_WITH_SHADOW = 13;
export const PLUSCIRCLE_SVG_WIDTH = 11;
export const PLUSCIRCLE_SVG_HEIGHT = 11;

export function PlusCircleSVG(props: { x: number, y: number, selected: boolean }) {
    const { selected, ...xyProps } = props;
    return (
        <svg {...xyProps} width={PLUSCIRCLE_SVG_WIDTH_WITH_SHADOW} height={PLUSCIRCLE_SVG_HEIGHT_WITH_SHADOW}>
            <g id="PlusCircle" transform="translate(1 1)" fill={selected ? "#5567d5" : "#ffffff"} stroke="#a6b3ff" strokeMiterlimit="10" strokeWidth="1">
                <circle cx="5.5" cy="5.5" r="5.5" stroke="none" />
                <circle cx="5.5" cy="5.5" r="6" fill="none" />
            </g>
            <path
                id="PlusCircleAddIcon"
                d="M2,4.5V3H.5a.5.5,0,1,1,0-1H2V.5a.5.5,0,1,1,1,0V2H4.5a.5.5,0,1,1,0,1H3V4.5a.5.5,0,1,1-1,0Z"
                transform="translate(4 4)"
                fill={selected ? "#ffffff" : "#5567d5"}
            />
        </svg>
    )
}
