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

import { Button, Icon } from "@wso2/ui-toolkit";

import { DiagnosticTooltip } from "./DiagnosticTooltip";

export interface DiagnosticWidgetProps {
    diagnostic: any,
    value?: string,
    onClick?: () => void,
    isLabelElement? : boolean,
    btnSx?: React.CSSProperties
}

export function DiagnosticWidget(props: DiagnosticWidgetProps) {
    const {diagnostic, value, onClick, btnSx} =  props;

    return (
        <DiagnosticTooltip diagnostic={diagnostic} value={value} onClick={onClick}>
            <Button
                appearance="icon"
                data-testid={`expression-label-diagnostic`}
                onClick={onClick}
                sx={btnSx}
            >
                <Icon
                    name="error-icon"
                    sx={{ height: "14px", width: "14px" }}
                    iconSx={{ fontSize: "14px", color: "var(--vscode-errorForeground)" }}
                />
            </Button>
        </DiagnosticTooltip>
    )
}
