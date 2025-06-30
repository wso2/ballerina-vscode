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
// tslint:disable: jsx-no-multiline-js align  jsx-wrap-multiline
import React, { ReactElement, useContext, useEffect, useState } from "react";

import { Context } from "../../../Context/diagram";
import { DefaultConfig } from "../../../Visitors/default";
import { DefaultTooltip } from "../DefaultTooltip";

import "./style.scss";

export let VARIABLE_NAME_WIDTH = 125;
export const ICON_SVG_WRAPPER_WIDTH = 25;

export function VariableName(props: { x: number, y: number, variableName: string, processType?: string, key_id: number }) {
    const { processType, variableName, key_id, ...xyProps } = props;
    const [textWidth, setTextWidth] = useState(VARIABLE_NAME_WIDTH);
    const diagramContext = useContext(Context);
    const showTooltip = diagramContext?.api?.edit?.showTooltip;
    const [tooltip, setTooltip] = useState(undefined);

    useEffect(() => {
        setTextWidth(document.getElementById("variableLegnth_" + key_id).getBoundingClientRect().width);
    }, []);

    const variableMaxWidth = variableName.length >= 15;
    const variableWidth = textWidth
    let variableX = 0;


    variableX = (variableWidth > VARIABLE_NAME_WIDTH) ? variableWidth - ICON_SVG_WRAPPER_WIDTH : variableX = (VARIABLE_NAME_WIDTH - variableWidth - (DefaultConfig.dotGap * 2));

    const variableTextComp: ReactElement = (
        <text id="getResponse" transform="translate(36 1)" className="variable-name">
            <tspan
                id={"variableLegnth_" + key_id}
                x={variableX}
                y="25"
            >
                {variableMaxWidth ? variableName.slice(0, 10) + "..." : variableName}
            </tspan>
        </text>
    );

    // TODO:Check the rendering issue in this tooltip

    const defaultTooltip = (
        <DefaultTooltip text={{ heading: variableName }}>{variableTextComp}</DefaultTooltip>
    );

    useEffect(() => {
        if (variableName && showTooltip) {
            setTooltip(showTooltip(variableTextComp, variableName)
            );
        }
        setTextWidth(document.getElementById("variableLegnth_" + key_id).getBoundingClientRect().width);
    }, [variableName]);

    return (
        <svg {...xyProps} width="150" height="50" className="variable-wrapper">
            {/* {tooltip ? tooltip : defaultTooltip} */}
            {/* {variableTextComp} */}
            {defaultTooltip}
        </svg >
    );
}
