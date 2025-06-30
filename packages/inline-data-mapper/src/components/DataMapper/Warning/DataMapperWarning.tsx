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

import React, { ReactNode } from 'react';

import { Codicon } from '@wso2/ui-toolkit';
import classNames from "classnames";
import { useStyles } from './style';

export interface WarningBannerProps {
    message: ReactNode | string;
    testId?: string;
    className?: string;
}

export const WarningBanner = (props: WarningBannerProps) => {
    const classes = useStyles();
    const { message, testId, className } = props;

    return (
        <div className={classNames(classes.warningContainer, className)} data-testid="warning-banner">
            <div className={classes.warningIcon}>
                <Codicon iconSx={{ fontSize: 25 }} name="warning" />
            </div>
            <div data-test-id={testId} className={classes.warningBody} >
                {(typeof message === 'string' ? <p>{message}</p> : (message))}
            </div>
        </div>
    );
};
