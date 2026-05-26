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
// tslint:disable: jsx
import React from 'react';

import { TOP_CURVE_SVG_HEIGHT, TOP_CURVE_SVG_WIDTH } from '../IfElse/Else/TopCurve';

import { ControlFlowLineSVG } from './ControlFlowLineSVG';
import { ControlFlowTopCurveSVG } from './ControlFlowTopCurveSVG';
export interface ControlFlowElseStartProp {
    x: number;
    y: number;
    h: number;
    w: number;
}

export default function ControlFlowElseStart(props: ControlFlowElseStartProp) {
    const { h, w, x, y } = props;

    return (
        <g className="control-flow-line">
            <ControlFlowTopCurveSVG
                x={x + w - TOP_CURVE_SVG_WIDTH}
                y={y}
                width={TOP_CURVE_SVG_WIDTH}
                height={TOP_CURVE_SVG_HEIGHT}
            />
            <ControlFlowLineSVG
                x1={x + w}
                y1={y + TOP_CURVE_SVG_HEIGHT}
                x2={x + w}
                y2={y + h + TOP_CURVE_SVG_HEIGHT}
            />
            <ControlFlowLineSVG
                x1={x}
                y1={y}
                x2={x + w - TOP_CURVE_SVG_WIDTH}
                y2={y}
            />
        </g>
    );
}
