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
import React, { MouseEvent, ReactNode, useEffect, useState } from 'react';

import { Button, Codicon, ProgressRing } from '@wso2/ui-toolkit';
import { css } from '@emotion/css';
import classNames from "classnames";

import { RecordFieldPortModel } from '../Port';
import { ExpressionLabelModel } from './ExpressionLabelModel';

export const useStyles = () => ({
    container: css({
        width: '100%',
        backgroundColor: "var(--vscode-sideBar-background)",
        padding: "2px",
        borderRadius: "6px",
        border: "1px solid var(--vscode-welcomePage-tileBorder)",
        display: "flex",
        color: "var(--vscode-checkbox-border)",
        alignItems: "center",
        "& > vscode-button > *": {
            margin: "0 2px"
        }
    }),
    containerHidden: css({
        visibility: 'hidden',
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
    element: css({
        backgroundColor: 'var(--vscode-input-background)',
        padding: '10px',
        cursor: 'pointer',
        transitionDuration: '0.2s',
        userSelect: 'none',
        pointerEvents: 'auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        '&:hover': {
            filter: 'brightness(0.95)',
        },
    }),
    loadingContainer: css({
        padding: '10px',
    })
});

export enum LinkState {
    TemporaryLink,
    LinkSelected,
    LinkNotSelected
}

export interface SubLinkLabelWidgetProps {
    model: ExpressionLabelModel;
}

export function SubLinkLabelWidget(props: SubLinkLabelWidgetProps) {
    const [linkStatus, setLinkStatus] = useState<LinkState>(LinkState.LinkNotSelected);
    const [deleteInProgress, setDeleteInProgress] = useState(false);
    
    const classes = useStyles();
    const { link, value, valueNode, context, deleteLink } = props.model;
    const collapsedFields = context?.collapsedFields || [];
    const source = link?.getSourcePort();
    const target = link?.getTargetPort();
    
    useEffect(() => {
        if (link && link.isActualLink) {
            link.registerListener({
                selectionChanged(event) {
                    setLinkStatus(event.isSelected ? LinkState.LinkSelected : LinkState.LinkNotSelected);
                },
            });
        } else {
            setLinkStatus(LinkState.TemporaryLink);
        }
    }, [props.model]);

    const onClickDelete = (evt?: MouseEvent<HTMLDivElement>) => {
        if (evt) {
            evt.preventDefault();
            evt.stopPropagation();
        }
        setDeleteInProgress(true);
        if (deleteLink) {
            deleteLink();
        }
    };


    const loadingScreen = (
        <ProgressRing sx={{ height: '16px', width: '16px' }} />
    );

    const elements: ReactNode[] = [
        (
            <div
                key={`sub-link-label-edit-${value}`}
                className={classes.btnContainer}
            >
                {deleteInProgress ? (
                    loadingScreen
                ) : (
                    <Button
                        appearance="icon"
                        onClick={onClickDelete}
                        data-testid={`expression-label-delete`}
                        sx={{ userSelect: "none", pointerEvents: "auto" }}
                    >
                        <Codicon name="trash" iconSx={{ color: "var(--vscode-errorForeground)" }} />
                    </Button>
                )}
            </div>
        )
    ];

   
    let isSourceCollapsed = false;
    let isTargetCollapsed = false;

    if (source instanceof RecordFieldPortModel) {
        if (source?.parentId) {
            const fieldName = source.field.name;
            isSourceCollapsed = collapsedFields?.includes(`${source.parentId}.${fieldName}`)
        } else {
            isSourceCollapsed = collapsedFields?.includes(source.portName)
        }
    }

    if (target instanceof RecordFieldPortModel) {
        if (target?.parentId) {
            const fieldName = target.field.name;
            isTargetCollapsed = collapsedFields?.includes(`${target.parentId}.${fieldName}`)
        } else {
            isTargetCollapsed = collapsedFields?.includes(target.portName)
        }
    }

    const bothCollapsed = isSourceCollapsed && isTargetCollapsed;
    const eitherCollapsed = isSourceCollapsed || isTargetCollapsed;

    if ((valueNode && bothCollapsed) || (!valueNode && eitherCollapsed)) {
        // Disable link widgets based on collapse states
        return null;
    }

    if (linkStatus === LinkState.TemporaryLink) {
        return (
            <div className={classNames(classes.container, classes.element, classes.loadingContainer)}>
                {loadingScreen}
            </div>
        );
    }

    return (
        <div
            data-testid={`sub-link-label-for-${link?.getSourcePort()?.getName()}-to-${link?.getTargetPort()?.getName()}`}
            className={classNames(
                classes.container,
                linkStatus === LinkState.LinkNotSelected && !deleteInProgress && classes.containerHidden
            )}
        >
            {elements}
        </div>
    );
}
