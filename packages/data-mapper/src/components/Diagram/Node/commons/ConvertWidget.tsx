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

import React from 'react';
import { css } from "@emotion/css";
import { IO_NODE_FIELD_HEIGHT, GAP_BETWEEN_INPUT_NODES } from "../../utils/constants";

interface ConvertWidgetProps {
    direction: 'up' | 'down';
    height?: number;
    className?: string;
}

const useConvertWidgetStyles = (height: number) => ({
    container: css({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: `${height}px`,
        width: '100%',
        backgroundColor: 'transparent'
    }),
    arrowUp: css({
        width: 0,
        height: 0,
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderBottom: '12px solid var(--vscode-foreground)',
        opacity: 0.8,
        '&:hover': {
            opacity: 1
        }
    }),
    arrowDown: css({
        width: 0,
        height: 0,
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderTop: '12px solid var(--vscode-foreground)',
        opacity: 0.8,
        '&:hover': {
            opacity: 1
        }
    })
});

export default function ConvertWidget({ direction, height = IO_NODE_FIELD_HEIGHT - GAP_BETWEEN_INPUT_NODES, className = '' }: ConvertWidgetProps) {
    const styles = useConvertWidgetStyles(height);
    
    const arrowClass = direction === 'up' ? styles.arrowUp : styles.arrowDown;
    const containerClass = className ? `${styles.container} ${className}` : styles.container;

    return (
        <div className={containerClass}>
            <div className={arrowClass} />
        </div>
    );
}