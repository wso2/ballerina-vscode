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
import React from "react";

import { css } from "@emotion/css";
import { Icon, Typography } from "@wso2/ui-toolkit";

const useStyles = () => ({
    menuItem: css({
        fontSize: '12px',
        height: '30px',
        cursor: "pointer",
        '&:hover': {
            backgroundColor: 'var(--vscode-list-hoverBackground)',
        }
    }),
    menuItemText: css({
        padding: '5px',
        fontSize: '12px'
    })
});

export interface RecordItemProps {
    recordName: string;
    onClickRecordItem: (recordName: string) => void;
}

export function RecordItem(props: RecordItemProps) {
    const { recordName, onClickRecordItem } = props;
    const classes = useStyles();

    const onClickOnListItem = () => {
        onClickRecordItem(recordName);
    };

    return (
        <>
            <div
                className={classes.menuItem}
                key={recordName}
                onClick={onClickOnListItem}
            >
                <Icon name="symbol-struct-icon" />
                <Typography className={classes.menuItemText}>{recordName}</Typography>
            </div>
        </>
    );
}

