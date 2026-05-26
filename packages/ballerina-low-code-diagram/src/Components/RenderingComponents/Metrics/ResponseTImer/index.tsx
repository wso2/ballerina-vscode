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
import * as React from "react";

import { TRIGGER_RECT_SVG_HEIGHT } from "../../ActionInvocation/TriggerSVG";
import "../style.scss"

import { CounterLeftSVG } from "./CounterLeftSVG";

export interface ResponseTimerProps {
    x: number,
    y: number,
    responseTime: string
}

export function ResponseTimerC(props: ResponseTimerProps) {
    const { x, y, responseTime } = props;
    const responseTimeValue = Number(responseTime);
    const value = responseTimeValue > 1000 ? (responseTimeValue / 1000).toFixed(2) : responseTimeValue;
    const unit = responseTimeValue > 1000 ? " s" : " ms";

    return (
        <g>
            <CounterLeftSVG x={x} y={y - TRIGGER_RECT_SVG_HEIGHT / 2.5} text={value.toString() + unit}/>
        </g>
    );
}

export const ResponseTimer = ResponseTimerC;

export function PerformanceLabelC(props: ResponseTimerProps) {
    const { x, y, responseTime } = props;
    return (
        <g>
            <CounterLeftSVG x={x} y={y - TRIGGER_RECT_SVG_HEIGHT / 2.5} text={responseTime}/>
        </g>
    );
}

export const PerformanceLabel = PerformanceLabelC;
