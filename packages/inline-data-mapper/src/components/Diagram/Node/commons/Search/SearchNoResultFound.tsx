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

import { TreeContainer } from "../Tree/Tree";
import { Codicon } from "@wso2/ui-toolkit";

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
    noResultFoundBanner: css({
        width: "320px",
        padding: "10px",
        display: "flex",
    })
});

function SearchNoResultFound({ kind }: SearchNoResultFoundProps) {
    const classes = useStyles();
    return (
        <TreeContainer>
            <div className={classes.noResultFoundBanner}>
                <Codicon sx={{ marginRight: 8, fontSize: 22 }} name="search" />
                <div>
                    {`No matching ${kind} found`}
                </div>
            </div>
        </TreeContainer>
    );
}

export function InputSearchNoResultFound({ kind }: SearchNoResultFoundProps) {
    return <SearchNoResultFound kind={kind}/>
}

export function OutputSearchNoResultFound({ kind }: SearchNoResultFoundProps) {
    return <SearchNoResultFound kind={kind}/>
}
