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
import { useErrorBoundary } from "react-error-boundary";

import { useStyles } from "./style";
import { Button, Codicon, Icon, Typography } from "@wso2/ui-toolkit";
import { ISSUES_URL } from "../../../Diagram/utils/constants";
import classNames from "classnames";

interface ErrorScreenProps {
    onClose?: () => void;
    error?: Error;
    resetErrorBoundary?: () => void;
}

export function ErrorScreen2(props: ErrorScreenProps) {
    const classes = useStyles();
    const { resetBoundary } = useErrorBoundary();

    const handleReset = () => {
        resetBoundary();
    };

    return (
        <>
            {props.onClose && (
                <div className={classes.closeButtonContainer}>
                    <Button appearance="icon" onClick={props.onClose}>
                        <Codicon name="close" />
                    </Button>
                </div>
            )}
            <div className={classes.root}>
                <div className={classes.errorImg}>
                    <svg
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--vscode-editor-foreground)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>
                <Typography variant="h4" className={classes.errorTitle}>
                    This mapping cannot be visualized.
                </Typography>
                <div className={classes.iconContainer}>
                    <Button appearance="icon" onClick={handleReset}>
                        <Icon name="refresh" isCodicon sx={{ width: 24, height: 24 }} iconSx={{ fontSize: 24 }} />
                    </Button>
                </div>
                <Typography variant="body2" className={classes.errorMsg}>
                    Please raise an issue with the sample code in our <a href={ISSUES_URL}>issue tracker</a>
                </Typography>
            </div>
        </>
    );
}

export default function ErrorScreen(props: ErrorScreenProps) {
    const classes = useStyles();

    return (
        <>
            <div className={classes.overlay} />
            <div className={classes.errorMessage}>
                <div className={classNames(classes.warningContainer, classes.errorBanner)}>
                    <div className={classes.warningIcon}>
                        <Codicon iconSx={{ fontSize: 25 }} name="info" />
                    </div>
                    <div data-test-id={"error-message"} className={classes.warningBody} >
                        <p>This mapping cannot be visualized.</p>
                        <p>
                            Please raise an issue with the <a>sample code</a> in our <a href={ISSUES_URL}>issue tracker</a>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
