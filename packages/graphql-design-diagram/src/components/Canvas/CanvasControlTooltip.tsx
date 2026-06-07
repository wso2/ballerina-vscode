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

import { css } from '@emotion/css';
import { Button, Tooltip } from '@wso2/ui-toolkit';

interface ControlButtonProps {
    children: ReactNode;
    onClick: () => void;
    tooltipTitle: string;
}

export const useStyles = () => ({
    controlButton: css({
        background: "var(--vscode-input-background)",
        display: "flex",
        justifyContent: "center"
    })
});

export function CanvasControlTooltip(props: ControlButtonProps) {
    const { children, onClick, tooltipTitle } = props;
    const styles = useStyles();

    return (
        <Tooltip
            content={tooltipTitle}
            position="bottom"
            sx={{ padding: '4px' }}
        >
            <Button
                onClick={onClick}
                appearance='icon'
                className={styles.controlButton}
            >
                {children}
            </Button>
        </Tooltip>
    );
}
