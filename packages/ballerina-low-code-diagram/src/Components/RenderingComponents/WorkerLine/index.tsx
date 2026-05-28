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

import cn from "classnames";

import { FunctionViewState, ViewState } from "../../../ViewState";

import "./style.scss";

export interface WorkerLineProps {
    viewState: ViewState
}

export function WorkerLine(props: WorkerLineProps) {
    const { viewState } = props;
    const functionViewState: FunctionViewState = viewState as FunctionViewState;
    const x = functionViewState.workerLine.x;
    const y = functionViewState.workerLine.y;
    const h = functionViewState.workerLine.h;
    const classes = cn("worker-line");
    return (
        <g className={classes}>
            <line x1={x} y1={y} x2={x} y2={y + h} />
        </g>
    );
}
