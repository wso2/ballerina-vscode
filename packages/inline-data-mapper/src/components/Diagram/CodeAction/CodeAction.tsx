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
import React from "react";
import { Button, Codicon } from "@wso2/ui-toolkit";

import { CodeActionTooltip } from "./CodeActionTooltip";

export interface CodeAction {
    title: string;
    onClick: () => void;
}

export interface CodeActionWidgetProps {
    codeActions: CodeAction[];
    isConfiguration?: boolean;
    btnSx?: React.CSSProperties;
}

export function CodeActionWidget(props: CodeActionWidgetProps) {
    const { codeActions, isConfiguration, btnSx } = props;

    return (
        <CodeActionTooltip codeActions={codeActions}>
            <Button
                appearance="icon"
                data-testid={`data-mapper-code-action`}
                sx={{ ...btnSx, userSelect: "none", pointerEvents: "auto" }}
            >
                <Codicon
                    name={isConfiguration ? "settings-gear" : "lightbulb"}
                    sx={{ height: "18px", width: "18px" }}
                    iconSx={{ fontSize: "17px", color: "var(--vscode-input-placeholderForeground)" }}
                />
            </Button>
        </CodeActionTooltip>
    );
}
