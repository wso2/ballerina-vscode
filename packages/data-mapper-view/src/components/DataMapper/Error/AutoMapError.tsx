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
import React from 'react';

import { Button, Typography } from '@wso2/ui-toolkit';
import { css } from '@emotion/css';
import { ISSUES_URL } from '../utils';

const useStyles = (() => ({
    errorContainer: css({
        display: 'flex',
        flexDirection: 'column'
    }),
    closeButton: css({
        marginTop: '20px',
        textTransform: 'none',
        alignSelf: 'flex-end',
        justifySelf: 'flex-start',
    })
}))

export interface AutoMapError {
    code: number;
    onClose: () => void;
    message?: string;
}

export function AutoMapError(props: AutoMapError) {
    const { code, onClose, message } = props;
    const classes = useStyles();

    let errorMessage = "Request timeout exceeded. Please try again.";

    if (message) {
        errorMessage = message;
    }

    function shouldRenderGithubRepo(errorCode: number): boolean {
        switch (errorCode) {
            case 3:
            case 4:
            case 5:
                return true;
            default:
                return false;
        }
    }

    return (
        <div className={classes.errorContainer}>
            <Typography variant="body2">
                {errorMessage}
            </Typography>
            {shouldRenderGithubRepo(code) && (
                <Typography >
                    Please raise an issue with a sample code in our <a href={ISSUES_URL}>issue tracker.</a>
                </Typography>
            )}
            <Button
                onClick={onClose}
                className={classes.closeButton}
            >
                {'Close'}
            </Button>
        </div>
    )
}
