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
// tslint:disable: jsx-no-multiline-js jsx-no-lambda
import React from "react";

import { Button, Codicon, Divider, Icon, Tooltip } from "@wso2/ui-toolkit";
import { Diagnostic } from "vscode-languageserver-types";

import { useStyles } from "../style";

interface Props {
    placement: "top" | "bottom" | "left" | "right";
    children: React.ReactNode;
    diagnostic: Diagnostic
    value?: string
    onClick?: () => void;
}

export const DiagnosticTooltipID = "data-mapper-diagnostic-tooltip";

export function DiagnosticTooltip(props: Partial<Props>) {
    const { diagnostic, value, children, onClick } = props;
    const classes = useStyles();
    const source = diagnostic.source || value

    const Code = () => (
        <>
            <Divider />
            <div className={classes.source}>
                <code
                    data-lang="ballerina"
                    className={classes.code}
                >
                    {source.trim()}
                </code>
                <Button
                    appearance="icon"
                    className={classes.editButton}
                    aria-label="edit"
                    onClick={onClick}
                >
                    <Codicon name="tools" sx={{ marginRight: "8px" }} />
                    <span className={classes.editButtonText}>Fix by editing expression</span>
                </Button>
            </div>
        </>

    );
    const DiagnosticC = () => (
        <>
            <Button
                appearance="icon"
                className={classes.editButton}
                aria-label="edit"
                onClick={onClick}
            >
                <Icon name="error-icon" iconSx={{ color: "var(--vscode-errorForeground)" }} />
            </Button>
            <div className={classes.diagnosticWrapper}>{diagnostic.message}</div>
        </>

    );

    const tooltipTitleComponent = (
        <pre className={classes.pre}>
            {diagnostic.message && <DiagnosticC />}
            {source && <Code />}
        </pre>
    );

    return (
        <Tooltip
            id={DiagnosticTooltipID}
            content={tooltipTitleComponent}
            position="bottom"
        >
            {children}
        </Tooltip>
    )

}
