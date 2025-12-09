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
    goToSource: () => void;
}

export default function ErrorScreen(props: ErrorScreenProps) {
    const classes = useStyles();
    const { resetBoundary } = useErrorBoundary();
    const { onClose, goToSource } = props;

    return (
        <>
            <div className={classes.overlay} />
            <div className={classes.errorBody}>
                <div className={classes.errorContainer}>
                    <div className={classes.infoIcon}>
                        <Codicon iconSx={{ fontSize: 25 }} name="info" />
                    </div>
                    <div className={classes.iconContainer}>
                        <Button appearance="icon" onClick={onClose}>
                            <Icon name="close" isCodicon sx={{ width: 24, height: 24 }} iconSx={{ fontSize: 24 }} />
                        </Button>
                    </div>
                    <div className={classes.iconContainer}>
                        <Button appearance="icon" onClick={resetBoundary}>
                            <Icon name="refresh" isCodicon sx={{ width: 24, height: 24 }} iconSx={{ fontSize: 24 }} />
                        </Button>
                    </div>
                    <div className={classes.iconContainer}>
                        <Button appearance="icon" onClick={goToSource}>
                            <Icon name="code" isCodicon sx={{ width: 24, height: 24 }} iconSx={{ fontSize: 24 }} />
                        </Button>
                    </div>
                    <div data-test-id={"error-message"} className={classes.errorMessage} >
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
