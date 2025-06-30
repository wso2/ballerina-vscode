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
import React from "react";

import { ControlFlowLineState } from "../../../ViewState";

import { ControlFlowLineSVG } from "./ControlFlowLineSVG";
import "./style.scss";

export interface ControlFlowProps {
    controlFlowViewState?: ControlFlowLineState;
}

export function ControlFlowLine(props: ControlFlowProps) {
    const { controlFlowViewState } = props;
    const { h = 0, x, y, w = 0, isDotted } = controlFlowViewState;

    return (
        <g className="control-flow-line">
            <ControlFlowLineSVG
                x1={x}
                y1={y}
                x2={x + w}
                y2={y + h}
                isDotted={isDotted}
            />
        </g>
    );
}
