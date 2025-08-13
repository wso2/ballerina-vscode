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

import { ResultClauseType, TypeKind } from '@wso2/ballerina-core';
import { Codicon, Item, Menu, MenuItem, ProgressRing } from '@wso2/ui-toolkit';
import { css } from '@emotion/css';

import { MappingType } from '../Link';
import { ExpressionLabelModel } from './ExpressionLabelModel';
import { createNewMapping, mapWithCustomFn, mapWithQuery } from '../utils/modification-utils';
import classNames from 'classnames';

export const useStyles = () => ({
    arrayMappingMenu: css({
        pointerEvents: 'auto',
        position: 'relative'
    }),
    itemContainer: css({
        display: 'flex',
        width: '100%',
        alignItems: 'center'
    }),
    container: css({
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: "var(--vscode-editor-background)",
        padding: "2px",
        borderRadius: "6px",
        border: "1px solid var(--vscode-debugIcon-breakpointDisabledForeground)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        "& > vscode-button > *": {
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
    loadingContainer: css({
        padding: '10px',
    })
});

const a2aMenuStyles = {
    backgroundColor: "var(--vscode-quickInput-background)",
    boxShadow: "none",
    padding: "0px",
    border: "1px solid var(--vscode-debugIcon-breakpointDisabledForeground)"
};

const codiconStyles = {
    color: 'var(--vscode-editorLightBulb-foreground)',
    marginRight: '10px'
}

export interface ArrayMappingOptionsWidgetProps {
    model: ExpressionLabelModel;
}

export function ArrayMappingOptionsWidget(props: ArrayMappingOptionsWidgetProps) {
    const classes = useStyles();
    const { link, context  } = props.model;
    const pendingMappingType = link.pendingMappingType;

    const [inProgress, setInProgress] = React.useState(false);
    const wrapWithProgress = (onClick: () => Promise<void>) => {
        return async () => {
            link.pendingMappingType = MappingType.Default;
            setInProgress(true);
            await onClick();
            setInProgress(false);
        }
    };
    
    const onClickMapDirectly = async () => {
        await createNewMapping(link);
    }

    const onClickMapIndividualElements = async () => {
        await mapWithQuery(link, ResultClauseType.SELECT, context);
    };

    const onClickMapArraysAccessSingleton = async () => {
       await createNewMapping(link, (expr: string) => `${expr}[0]`);
    };

    const onClickAggregateArray = async () => {
        await mapWithQuery(link, ResultClauseType.COLLECT, context);
    };

    const onClickMapWithCustomFunction = async () => {
        await mapWithCustomFn(link, context);
    };

    const onClickMapUsingCollectClause = async (collectFunction: string) => {

    }

    const getItemElement = (id: string, label: string) => {
        return (
            <div
                className={classes.itemContainer}
                key={id}
            >
                <Codicon name="lightbulb" sx={codiconStyles} />
                {label}
            </div>
        );
    }

    const a2aMenuItems: Item[] = [
        {
            id: "a2a-direct",
            label: getItemElement("a2a-direct", "Map Input Array to Output Array"),
            onClick: wrapWithProgress(onClickMapDirectly)
        },
        {
            id: "a2a-inner",
            label: getItemElement("a2a-inner", "Map Array Elements Individually"),
            onClick: wrapWithProgress(onClickMapIndividualElements)
        }
    ];

    const a2sMenuItems: Item[] = [
        {
            id: "a2s-direct",
            label: getItemElement("a2s-direct", "Extract Single Element from Array"),
            onClick: wrapWithProgress(onClickMapArraysAccessSingleton)
        },
        {
            id: "a2s-aggregate",
            label: getItemElement("a2s-aggregate", "Aggregate using Query"),
            onClick: wrapWithProgress(onClickAggregateArray)
        }
    ];

    const collectClauseFns = ["sum", "avg", "min", "max", "count"];

    const a2sCollectClauseItems: Item[] = collectClauseFns.map((func) => ({
        id: `a2s-collect-${func}`,
        label: getItemElement(`a2s-collect-${func}`, `Aggregate using ${func}`),
        onClick: wrapWithProgress(async () => await onClickMapUsingCollectClause(func))
    }));

    const defaultMenuItems: Item[] = [
        {
            id: "a2a-direct",
            label: getItemElement("direct", "Map directly"),
            onClick: wrapWithProgress(onClickMapDirectly)
        }
    ];

    const menuItems = pendingMappingType === MappingType.ArrayToArray
        ? a2aMenuItems
        : pendingMappingType === MappingType.ArrayToSingleton
            ? a2sMenuItems
            : pendingMappingType === MappingType.ArrayToSingletonWithCollect
                ? a2sCollectClauseItems
                : defaultMenuItems;

    if (pendingMappingType !== MappingType.ArrayToSingletonWithCollect) {
        menuItems.push({
            id: "a2a-a2s-func",
            label: getItemElement("a2a-a2s-func", "Map Using Custom Function"),
            onClick: wrapWithProgress(onClickMapWithCustomFunction)
        });
    }
    return (
        <div className={classes.arrayMappingMenu}>
            <Menu sx={{...a2aMenuStyles, visibility: inProgress ? 'hidden' : 'visible'}}>
                {menuItems.map((item: Item) =>
                    <MenuItem
                        key={`item ${item.id}`}
                        item={item}
                    />
                )}
            </Menu>
            {inProgress && (
                <div className={classNames(classes.container)}>
                    <div className={classNames(classes.element, classes.loadingContainer)}>
                        <ProgressRing
                            sx={{ height: '16px', width: '16px' }}
                            color="var(--vscode-debugIcon-breakpointDisabledForeground)"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
