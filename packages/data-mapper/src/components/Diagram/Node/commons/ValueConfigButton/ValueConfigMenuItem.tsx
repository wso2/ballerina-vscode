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

import { Icon, Item, MenuItem, Tooltip } from '@wso2/ui-toolkit';
import { css } from '@emotion/css';

const useStyles = () => ({
    itemContainer: css({
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center'
    }),
    symbol: css({
        alignSelf: 'flex-end',
    }),
    warning: css({
        color: 'var(--vscode-editorError-foreground)',
        fontSize: '16px',
        marginLeft: '5px'
    })
});

export interface ValueConfigMenuItem {
    title: string;
    onClick: () => void;
    onClose?: () => void;
    warningMsg?: string;
    level?: number;
}

export function ValueConfigMenuItem(props: ValueConfigMenuItem) {
    const { title, onClick, onClose, warningMsg } = props;
    const classes = useStyles();

    const onClickMenuItem = () => {
        onClick();
        onClose();
    }

    const itemElement = (
        <div className={classes.itemContainer}>
            <div>{title}</div>
            {warningMsg && (
                <Tooltip
                    content={warningMsg}
                >
                    <Icon name="error-icon" iconSx={{ color: "var(--vscode-errorForeground)" }} />
                </Tooltip>
            )}
        </div>
    );

    const menuItem: Item = { id: title, label: itemElement, onClick: onClickMenuItem }

    return (
        <MenuItem
            key={title}
            item={menuItem}
        />
    );
}
