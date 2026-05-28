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

import { ModuleProperty } from "@wso2/ballerina-core";
import { Grid } from '@wso2/ui-toolkit';
import classNames from "classnames";

import { SUGGESTION_COLUMN_SIZE } from '../../../constants';
import { useStatementEditorStyles, useStmtEditorHelperPanelStyles } from "../../styles";
import { ModuleElement } from "../ModuleElement";

interface SearchCategoryProps {
    label: string,
    searchResult: ModuleProperty[]
}

export function SearchCategory(props: SearchCategoryProps) {
    const stmtEditorHelperClasses = useStmtEditorHelperPanelStyles();
    const statementEditorClasses = useStatementEditorStyles();
    const { label, searchResult } = props;

    return (
        <div className={stmtEditorHelperClasses.libraryElementBlock}>
            <div
                className={classNames(
                    stmtEditorHelperClasses.helperPaneSubHeader,
                    stmtEditorHelperClasses.libraryElementBlockLabel
                )}
            >
                {label}
            </div>
            <Grid columns={SUGGESTION_COLUMN_SIZE} data-testid="library-element-block-content">
                {searchResult.map((property: ModuleProperty, index: number) => (
                    <ModuleElement
                        moduleProperty={property}
                        key={index}
                        isFunction={label === 'Functions'}
                        label={label}
                    />
                ))}
            </Grid>
            <div className={statementEditorClasses.separatorLine} />
        </div>
    );
}
