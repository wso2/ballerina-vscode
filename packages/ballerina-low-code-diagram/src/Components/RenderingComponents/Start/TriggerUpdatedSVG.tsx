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

export const UPDATE_TRIGGER_SVG_WIDTH = 154;
export const UPDATE_TRIGGER_SVG_HEIGHT = 32;

export function TriggerUpdatedSVG(props: { x: number, y: number, className?: string }) {
    const {className, ...xyProps } = props;
    return (
        <svg {...xyProps} width={UPDATE_TRIGGER_SVG_WIDTH} height={UPDATE_TRIGGER_SVG_HEIGHT}>
            <g id="Group_161" transform="translate(-809 -103)">
                <rect id="Update_rect" width="154" height="32" rx="15" transform="translate(809 103)" fill="#fff" />
                <text id="Trigger_is_updated" transform="translate(840 122)" fill="#222228" font-size="12" font-family="GilmerRegular, Gilmer Regular">
                    <tspan x="0" y="0">Trigger is updated</tspan>
                </text>
                <g id="Icon_Alerts_Success" transform="translate(817 111)">
                    <path id="Combined_Shape" d="M0,8A8.01,8.01,0,0,1,8,0V1a7,7,0,1,0,7,7h1A8,8,0,0,1,0,8ZM8.207,9.864a.491.491,0,0,1-.232-.131L5.146,6.9a.5.5,0,0,1,0-.707l.05-.05a.5.5,0,0,1,.708,0l2.6,2.6,5.009-5.01a.5.5,0,0,1,.707,0l.05.051a.5.5,0,0,1,0,.707L8.9,9.853a.5.5,0,0,1-.7.011Z" transform="translate(0 0)" fill="#36b475" />
                </g>
            </g>
        </svg>
    )
}
