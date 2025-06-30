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

import { useStyles } from "./style";
import { Typography } from "@wso2/ui-toolkit";
import { ISSUES_URL } from "../../utils";

export default function Default() {
    const classes = useStyles();

    return (
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
                A problem occurred while rendering the Data Mapper.
            </Typography>
            <Typography variant="body2" className={classes.errorMsg}>
                Please raise an issue with the sample code in our <a href={ISSUES_URL}>issue tracker</a>
            </Typography>
        </div>
    );
}
