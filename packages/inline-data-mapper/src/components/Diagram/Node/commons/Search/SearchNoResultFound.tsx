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
