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
import React, { MouseEvent, ReactNode } from 'react';

import { Button, Codicon } from '@wso2/ui-toolkit';
import { css } from '@emotion/css';
import classNames from "classnames";

import { ExpressionLabelModel } from './ExpressionLabelModel';
import { useDMQueryClausesPanelStore } from '../../../store/store';


export interface QueryExprLabelWidgetProps {
    model: ExpressionLabelModel;
}

export const useStyles = () => ({
    container: css({
        width: '100%',
        backgroundColor: "var(--vscode-sideBar-background)",
        padding: "2px",
        borderRadius: "6px",
        display: "flex",
        color: "var(--vscode-checkbox-border)",
        alignItems: "center",
        "& > vscode-button > *": {
            margin: "0 2px"
        }
    }),
    btnContainer: css({
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        "& > *": {
            margin: "0 2px"
        }
    }),
    deleteIconButton: css({
        color: 'var(--vscode-checkbox-border)',
    }),
    separator: css({
        height: 'fit-content',
        width: '1px',
        backgroundColor: 'var(--vscode-editor-lineHighlightBorder)',
    }),
    rightBorder: css({
        borderRightWidth: '2px',
        borderColor: 'var(--vscode-pickerGroup-border)',
    }),
    loadingContainer: css({
        padding: '10px',
    }),
});

export function QueryExprLabelWidget(props: QueryExprLabelWidgetProps) {

    const classes = useStyles();
    const { link, value} = props.model;
    const diagnostic = link && link.hasError() ? link.diagnostics[0] || link.diagnostics[0] : null;

    const { setIsQueryClausesPanelOpen } = useDMQueryClausesPanelStore();
    const onClickOpenClausePanel = (evt?: MouseEvent<HTMLDivElement>) => {
        setIsQueryClausesPanelOpen(true);
    };

    const elements: ReactNode[] = [
        (
            <div
                key={`expression-label-edit-${value}`}
                className={classes.btnContainer}
            >
                <Button
                    appearance="icon"
                    onClick={onClickOpenClausePanel}
                    data-testid={`expression-label-edit`}
                    sx={{ userSelect: "none", pointerEvents: "auto" }}
                >
                    <Codicon name="filter-filled" iconSx={{ color: "var(--vscode-input-placeholderForeground)" }} />
                </Button>
            </div>
        ),
    ];

    return (
        <div
            data-testid={`query-expr-label-for-${link?.getSourcePort()?.getName()}-to-${link?.getTargetPort()?.getName()}`}
            className={classNames(
                classes.container
            )}
        >
            <div
                key={`query-expr-label-open-clause-panel`}
                className={classes.btnContainer}
            >
                <Button
                    appearance="icon"
                    onClick={onClickOpenClausePanel}
                    data-testid={`query-expr-label-open-clause-panel`}
                    sx={{ userSelect: "none", pointerEvents: "auto" }}
                >
                    <Codicon name="filter-filled" iconSx={{ color: "var(--vscode-input-placeholderForeground)" }} />
                </Button>
            </div>
        </div>
    );
}
