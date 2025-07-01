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
import React, { ReactNode } from "react";

import { css } from "@emotion/css";
import { STNode } from "@wso2/syntax-tree";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { TreeContainer } from "../commons/Tree/Tree";
import { Divider, Icon } from "@wso2/ui-toolkit";

interface UnsupportedIOProp {
    children: ReactNode
}

interface UnsupportedExprProps {
    filePath: string;
    unsupportedExpr: STNode;
    context: IDataMapperContext;
}

interface UnsupportedIOProps {
    message: string;
}

const useStyles = () => ({
    treeContainer: css({
        cursor: "default"
    }),
    unsupportedIOBanner: css({
        width: "320px"
    }),
    infoContainer: css({
        display: 'flex',
        lineHeight: 'initial',
        fontSize: '13.5px',
        padding: '5px'
    }),
    unsupportedFile: css({
        color: "var(--vscode-button-background)",
        backgroundColor: "var(--vscode-input-background)",
        fontFamily: "monospace",
        fontWeight: 100,
        cursor: "pointer",
        '&:hover': {
            textDecoration: "underline"
        }
    }),
    infoSymbol: css({
        fontSize: "17px",
        marginRight: "5px"
    }),
    divider: css({
        margin: '5px 0px'
    }),
});

function UnsupportedIOWidget({ children }: UnsupportedIOProp) {
    const classes = useStyles();
    return (
        <TreeContainer className={classes.treeContainer}>
            <span className={classes.unsupportedIOBanner}>
                {children}
            </span>
        </TreeContainer>
    );
}

export function UnsupportedIO({ message }: UnsupportedIOProps) {
    const classes = useStyles();

    return (
        <UnsupportedIOWidget>
            <div className={classes.infoContainer}>
                <Icon name="error-outline" />
                <span>{message}</span>
            </div>
        </UnsupportedIOWidget>
    );
}

export function UnsupportedExpr({ filePath, unsupportedExpr, context }: UnsupportedExprProps) {
    const classes = useStyles();

    const handleGoToSource = () => {
        context.goToSource(unsupportedExpr.position);
    }


    return (
        <UnsupportedIOWidget>
            <div className={classes.infoContainer}>
                <Icon name="error-outline" />
                <span>{`Unsupported Expression`}</span>
            </div>
            <Divider />
            <a
                onClick={handleGoToSource}
                className={classes.unsupportedFile}
            >
                {`${unsupportedExpr?.value || unsupportedExpr.source}`}
            </a>
            <div>{`Conditional outputs are not supported by the Data Mapper.`}</div>
            <span>{`Please change the source and try again.`}</span>
        </UnsupportedIOWidget>
    );
}
