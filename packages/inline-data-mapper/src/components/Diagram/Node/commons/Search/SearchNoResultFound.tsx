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
