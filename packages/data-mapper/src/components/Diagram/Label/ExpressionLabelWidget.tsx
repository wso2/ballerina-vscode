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

import { ResultClauseType } from '@wso2/ballerina-core';
import { Button, Codicon, ProgressRing } from '@wso2/ui-toolkit';
import { css } from '@emotion/css';
import classNames from "classnames";

import { DiagnosticWidget } from '../Diagnostic/DiagnosticWidget';
import { ExpressionLabelModel } from './ExpressionLabelModel';
import { MappingType } from '../Link';
import { CodeActionWidget } from '../CodeAction/CodeAction';
import { InputOutputPortModel } from '../Port';
import { mapWithCustomFn, mapWithQuery, mapWithTransformFn } from '../utils/modification-utils';
import { getMappingType } from '../utils/common-utils';
import { useDMExpressionBarStore } from "../../../store/store";
import { DiagramEngine } from '@projectstorm/react-diagrams';

export interface ExpressionLabelWidgetProps {
    model: ExpressionLabelModel;
    engine: DiagramEngine;
}

export const useStyles = () => ({
    container: css({
        width: '100%',
        backgroundColor: "var(--vscode-editor-background)",
        padding: "2px",
        borderRadius: "6px",
        border: "1px solid var(--vscode-debugIcon-breakpointDisabledForeground)",
        display: "flex",
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
    iconWrapper: css({
        height: '22px',
        width: '22px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    }),
    codeIconButton: css({
        color: 'var(--vscode-checkbox-border)',
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

export enum LinkState {
    TemporaryLink,
    LinkSelected,
    LinkNotSelected
}

export function ExpressionLabelWidget(props: ExpressionLabelWidgetProps) {
    const [isTempLink, setIsTempLink] = useState<boolean>(false);
    const [isLinkSelected, setIsLinkSelected] = useState<boolean>(false);
    const [mappingType, setMappingType] = React.useState<MappingType>(MappingType.Default);
    const [deleteInProgress, setDeleteInProgress] = useState(false);

    const classes = useStyles();
    const setExprBarFocusedPort = useDMExpressionBarStore(state => state.setFocusedPort);

    const { link, value, deleteLink, context, collectClauseFn } = props.model;
    const targetPort = link?.getTargetPort() as InputOutputPortModel;
    const diagnostic = link && link.hasError() ? link.diagnostics[0] || link.diagnostics[0] : null;

    const handleLinkStatus = (isSelected: boolean) => {
        setIsLinkSelected(isSelected);
    }

    useEffect(() => {
        if (link?.isActualLink) {
            link.registerListener({
                selectionChanged(event) {
                    handleLinkStatus(event.isSelected);
                },
            });
            const mappingType = getMappingType(source, target);
            setMappingType(mappingType);
        } else {
            setIsTempLink(true);
        }
    }, [link]);

    useEffect(() => {
        if (link) {
            setIsLinkSelected(link.isSelected());
        }
    }, [link?.isSelected()]);

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

    const onClickEdit = (evt?: MouseEvent<HTMLDivElement>) => {
        setExprBarFocusedPort(targetPort);
    };

    const collectClauseFns = ["sum", "avg", "min", "max", "count"];
  
    const onClickChangeCollectClauseFn = async ( collectClauseFn: string) => {

    }

    const loadingScreen = (
        <ProgressRing sx={{ height: '16px', width: '16px' }} color="var(--vscode-debugIcon-breakpointDisabledForeground)" />
    );

    const elements: ReactNode[] = [
        (
            <div
                key={`expression-label-edit-${value}`}
                className={classes.btnContainer}
            >
                <Button
                    appearance="icon"
                    onClick={onClickEdit}
                    data-testid={`expression-label-edit`}
                    sx={{ userSelect: "none", pointerEvents: "auto" }}
                >
                    <Codicon name="code" iconSx={{ color: "var(--vscode-input-placeholderForeground)" }} />
                </Button>
                {collectClauseFn && (
                    <>
                        <div className={classes.separator} />
                        <CodeActionWidget
                            key={`expression-label-code-action-collect-clause-fn`}
                            codeActions={collectClauseFns.map((fn) => ({
                                title: fn,
                                onClick: () => onClickChangeCollectClauseFn(fn)
                            }))}
                            collectClauseFn={collectClauseFn}
                            sx={{ padding: "5px", color: "var(--vscode-button-foreground)"}}
                        />
                    </>
                )}

                <div className={classes.separator}/>
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
        ),
    ];

    const onClickMapWithQuery = async () => {
        await mapWithQuery(link, ResultClauseType.SELECT, context);
    };

    const onClickMapWithCustomFn = async () => {
        await mapWithCustomFn(link, context);
    };

    const onClickMapWithTransformFn = async () => {
        await mapWithTransformFn(link, context);
    }

    const codeActions = [];

    if (mappingType === MappingType.ArrayToArray) {
        codeActions.push({
            title: "Map with query expression",
            onClick: onClickMapWithQuery
        });
    } else if (mappingType === MappingType.ArrayToSingleton) {
        // TODO: Add impl
    }

    codeActions.push({
        title: "Map with custom function",
        onClick: onClickMapWithCustomFn
    });

    if (mappingType !== MappingType.Default && mappingType !== MappingType.ContainsUnions) {   
        codeActions.push({
            title: "Map with transform function",
            onClick: onClickMapWithTransformFn
        });
    }

    if (codeActions.length > 0) {
        elements.push(<div className={classes.separator}/>);
        elements.push(
            <CodeActionWidget
                key={`expression-label-code-action-${value}`}
                codeActions={codeActions}
                sx={{ margin: "0 2px" }}
            />
        );
    }

    if (diagnostic) {
        elements.push(<div className={classes.separator}/>);
        elements.push(
            <DiagnosticWidget
                key={`expression-label-diagnostic-${value}`}
                diagnostic={diagnostic}
                value={value}
                onClick={onClickEdit}
                isLabelElement={true}
                btnSx={{ margin: "0 2px" }}
            />
        );
    }

    const source = link?.getSourcePort();
    const target = link?.getTargetPort();

    return isTempLink
        ? (
            <div className={classNames(classes.container)}>
                <div className={classNames(classes.element, classes.loadingContainer)}>
                    {loadingScreen}
                </div>
            </div>
        ) : (
            <div
                data-testid={`expression-label-for-${link?.getSourcePort()?.getName()}-to-${link?.getTargetPort()?.getName()}`}
                className={classNames(
                    classes.container,
                    !isLinkSelected && !deleteInProgress && !collectClauseFn && classes.containerHidden
                )}
            >
                {elements}
            </div>
        );
}
