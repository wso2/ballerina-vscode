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
import React, {useContext, useEffect, useState} from "react";

import { Context } from "../../../Context/diagram";

export const DELETE_SVG_WIDTH_WITH_SHADOW = 34;
export const DELETE_SVG_HEIGHT_WITH_SHADOW = 34;
export const DELETE_SVG_WIDTH = 25;
export const DELETE_SVG_HEIGHT = 25;
export const DELETE_SVG_OFFSET = 16;
export const DELETE_SHADOW_OFFSET = DELETE_SVG_HEIGHT_WITH_SHADOW - DELETE_SVG_HEIGHT;

export function DeleteSVG(props: { x: number, y: number, toolTipTitle?: string, ref?: any }) {
    const { toolTipTitle, ...xyProps } = props;
    const diagramContext = useContext(Context);
    const showTooltip = diagramContext?.api?.edit?.showTooltip;
    const [tooltipComp, setTooltipComp] = useState(undefined);

    const deleteSVGIcon = (
        <g id="DeleteGroup" className="delete-circle" transform="translate(3.5 3.5)">
            <g transform="matrix(1, 0, 0, 1, -7.5, -6.5)">
                <g id="Delete" transform="translate(4.5 3.5)">
                    <rect width="18" height="18" rx="10.5" stroke="none" />
                    <rect x="0.5" y="0.5" width="17" height="17" rx="10" fill="none" />
                </g>
            </g>
                <path
                    id="DeleteIcon"
                    className="delete-bin-icon"
                    d="M3.745,12a2,2,0,0,1-2-2V3H.5a.5.5,0,1,1,0-1h11a.5.5,0,0,1,0,1H10.249v7a2,2,0,0,1-2,2Zm-1-2a1,1,0,0,
                0,1,1h4.5a1,1,0,0,0,1-1V3h-6.5Zm4-1.5v-4a.5.5,0,1,1,1,0v4a.5.5,0,1,1-1,0Zm-2.5,0v-4a.5.5,0,1,1,1,
                0v4a.5.5,0,1,1-1,0Zm0-7.5a.5.5,0,1,1,0-1h3.5a.5.5,0,0,1,0,1Z"
                    fill="#fe523c"
                />
        </g>
    );

    useEffect(() => {
        if (props.toolTipTitle && showTooltip) {
            setTooltipComp(showTooltip(deleteSVGIcon, props.toolTipTitle));
        }
    }, [toolTipTitle]);

    return (
        <svg  {...xyProps} width={DELETE_SVG_WIDTH_WITH_SHADOW} height={DELETE_SVG_HEIGHT_WITH_SHADOW}>
            <defs>
                <linearGradient id="DeleteLinearGradient" x1="0.5" y1="0.004" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
                    <stop offset="0" stopColor="#fff" />
                    <stop offset="1" stopColor="#f7f8fb" />
                </linearGradient>
                <filter id="DeleteFilter" x="0" y="0" width="34" height="34" filterUnits="userSpaceOnUse">
                    <feOffset dy="1" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feFlood floodColor="#9a9eac" floodOpacity="0.502" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
                <filter id="DeleteFilter" x="0" y="0" width="40" height="40" filterUnits="userSpaceOnUse">
                    <feOffset dy="2" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feFlood floodColor="#9a9eac" floodOpacity="0.502" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
                <filter id="DeleteFilter" x="0" y="0" width="40" height="40" filterUnits="userSpaceOnUse">
                    <feOffset dy="2" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feFlood floodColor="#9a9eac" floodOpacity="0.502" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
            </defs>
            {props.toolTipTitle && tooltipComp ? (
                tooltipComp
            ) : (
                <g>
                    {deleteSVGIcon}
                </g>
            )
            }
        </svg>
    )
}
