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
import React from "react";

import { DiagnosticMsgSeverity } from "@wso2/ballerina-core";

export const TOP_CURVE_SVG_WIDTH = 6.5;
export const TOP_CURVE_SVG_HEIGHT = 6.5;

export function TopCurveSVG(xyProps: { x: number, y: number, diagnostics: DiagnosticMsgSeverity, strokeWidth?: number }) {
    const { diagnostics } = xyProps;
    const diagnosticStyles = diagnostics?.severity === "ERROR" ? "line-curve-error" : "line-curve-warning";
    const lineStyles = diagnostics ? diagnosticStyles : "line-curve"
    const { strokeWidth } = xyProps;

    return (
        <svg {...xyProps} width={TOP_CURVE_SVG_WIDTH} height={TOP_CURVE_SVG_HEIGHT} style={{ "overflow": "visible" }}>
            <path className={lineStyles} d="M0,0.5c3.3,0,6,2.7,6,6c0,0,0,0,0,0" strokeWidth={strokeWidth ? strokeWidth : 1} />
        </svg>
    );
}
