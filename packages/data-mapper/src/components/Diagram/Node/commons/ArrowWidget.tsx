/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import { Icon } from "@wso2/ui-toolkit";
import { IO_NODE_FIELD_HEIGHT, GAP_BETWEEN_INPUT_NODES } from "../../utils/constants";

interface ArrowWidgetProps {
    direction: 'up' | 'down';
    height?: number;
    className?: string;
}

const useArrowWidgetStyles = (height: number, direction: 'up' | 'down') => ({
    container: css({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: `${height}px`,
        width: '100%',
        backgroundColor: 'transparent'
    }),
    arrow: css({
        color: 'var(--vscode-foreground)',
        opacity: 0.8,
        fontSize: '16px',
        transform: direction === 'up' && 'rotate(180deg)' || 'none',
        '&:hover': {
            opacity: 1
        }
    })
});

export default function ArrowWidget({ direction, height = IO_NODE_FIELD_HEIGHT - GAP_BETWEEN_INPUT_NODES, className = '' }: ArrowWidgetProps) {
    const styles = useArrowWidgetStyles(height, direction);
    
    const containerClass = className ? `${styles.container} ${className}` : styles.container;

    return (
        <div className={containerClass}>
            <Icon name="arrow-down-solid" className={styles.arrow} />
        </div>
    );
}
