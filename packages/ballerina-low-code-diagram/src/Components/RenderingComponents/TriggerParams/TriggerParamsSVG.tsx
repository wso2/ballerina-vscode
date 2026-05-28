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
import React, { useContext, useEffect, useState } from "react";

import { Context } from "../../../Context/diagram";

export const TRIGGER_PARAMS_SVG_WIDTH_WITH_SHADOW = 110;
export const TRIGGER_PARAMS_SVG_HEIGHT_WITH_SHADOW = 30;
export const TRIGGER_PARAMS_SVG_WIDTH = 99;
export const TRIGGER_PARAMS_SVG_HEIGHT = 24;

export function TriggerParamsSVG(props: { x: number, y: number, text: any }) {
    const { text, ...xyProps } = props;
    const diagramContext = useContext(Context);
    const showTooltip = diagramContext?.api?.edit?.showTooltip;
    const [tooltip, setTooltip] = useState(undefined);
    const tooltipText = {
        code: text
    }
    const paramSVG = (
        <g id="Trigger-Params" transform="translate(3.5 2.5)">
            <g id="Trigger-Params-wrapper" transform="translate(-1038.5 -145.5)">
                <g id="Rectangle" transform="translate(1038.5 145.5)" fill="#fff" stroke="#ccd1f2" strokeMiterlimit="10" strokeWidth="1">
                    <rect width="99" height="24" rx="4" stroke="none" />
                    <rect x="0.5" y="0.5" width="98" height="23" rx="3.5" fill="none" />
                </g>
                <text id="Trigger-Params-text" className="trigger-params-text" transform="translate(1087.5 160.5)" >
                    <tspan x="0" y="0" textAnchor="middle" data-testid="trigger-params-text-block"> {text.length >= 18 ? text.slice(0, 15) + "..." : text} </tspan>
                </text>
            </g>
        </g>
    );

    useEffect(() => {
        if (text && showTooltip) {
            setTooltip(showTooltip(paramSVG, tooltipText.code));
        }
    }, [text]);

    return (
        <svg {...xyProps} width={TRIGGER_PARAMS_SVG_WIDTH_WITH_SHADOW} height={TRIGGER_PARAMS_SVG_HEIGHT_WITH_SHADOW} >
            {tooltip ? tooltip : paramSVG}
        </svg>
    )
}
