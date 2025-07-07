/*
 * Copyright (c) 2024, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein is strictly forbidden, unless permitted by WSO2 in accordance with
 * the WSO2 Commercial License available at http://wso2.com/licenses.
 * For specific language governing the permissions and limitations under
 * this license, please see the license as well as any agreement you’ve
 * entered into with WSO2 governing the purchase of this software and any
 * associated services.
 */
// tslint:disable: jsx-no-multiline-js
import React from "react";

import { css } from "@emotion/css";
import { Codicon } from "@wso2/ui-toolkit";

import { IO_NODE_DEFAULT_WIDTH } from "../../../../../components/Diagram/utils/constants";

interface SearchNoResultFoundProps {
    kind: SearchNoResultFoundKind;
}

export enum SearchNoResultFoundKind {
    InputField = "input field",
    OutputField = "output field",
    OutputValue = "output value",
    SubMapping = "sub mapping",
    ModuleVariable = "module variable"
}

const useStyles = () => ({
    treeContainer: css({
        width: `${IO_NODE_DEFAULT_WIDTH}px`,
        cursor: "default",
        padding: "12px",
        fontFamily: "GilmerRegular",
        background: "var(--vscode-sideBar-background)",
        border: "1.8px dashed var(--vscode-dropdown-border)",
        borderRadius: "6px"
    }),
    noResultFoundBanner: css({
        width: "320px",
        display: "flex",
        opacity: 0.8
    })
});

function SearchNoResultFound({ kind }: SearchNoResultFoundProps) {
    const classes = useStyles();
    return (
        <div className={classes.treeContainer}>
            <div className={classes.noResultFoundBanner}>
                <Codicon sx={{ marginRight: 10 }} name="search" />
                <div>
                    {`No matching ${kind} found`}
                </div>
            </div>
        </div>
    );
}

export function InputSearchNoResultFound({ kind }: SearchNoResultFoundProps) {
    return <SearchNoResultFound kind={kind}/>
}

export function OutputSearchNoResultFound({ kind }: SearchNoResultFoundProps) {
    return <SearchNoResultFound kind={kind}/>
}
