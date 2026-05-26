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

import PullingModuleImg from "../../assets/images/PullingModuleImg";
import SourceMissingImg from "../../assets/images/SourceMissingImg";
import { useStatementEditorStyles } from "../styles";

import { useStyles } from "./style";

export enum OverlayType {
    Disabled,
    ModulePulling,
}

export interface EditorOverlayProps {
    type: OverlayType;
}

export function EditorOverlay(props: EditorOverlayProps) {
    const { type } = props;
    const classes = useStyles();
    const overlayClasses = useStatementEditorStyles();

    return (
        <div className={overlayClasses.mainStatementWrapper} data-testid="editor-overlay">
            {type === OverlayType.Disabled && (
                <div className={overlayClasses.loadingWrapper}>
                    <SourceMissingImg />
                    <p className={classes.title}>Source code has been changed</p>
                    <p className={classes.subtitle}>Please retry editing a statement</p>
                </div>
            )}
            {type === OverlayType.ModulePulling && (
                <div className={overlayClasses.loadingWrapper}>
                    <PullingModuleImg />
                    <p className={classes.title}>Pulling packages</p>
                    <p className={classes.subtitle}>This might take some time</p>
                </div>
            )}
        </div>
    );
}
