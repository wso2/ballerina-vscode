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
import React, { useMemo } from 'react';

import { IntermediateClauseType, ResultClauseType, TypeKind } from '@wso2/ballerina-core';
import { Icon, Item, Menu, MenuItem, ProgressRing } from '@wso2/ui-toolkit';
import { css } from '@emotion/css';

import { MappingType } from '../Link';
import { ExpressionLabelModel } from './ExpressionLabelModel';
import { convertAndMap, createNewMapping, mapSeqToX, mapWithClause, mapWithCustomFn, mapWithQuery, mapWithTransformFn } from '../utils/modification-utils';
import classNames from 'classnames';
import { genArrayElementAccessSuffix } from '../utils/common-utils';
import { InputOutputPortModel } from '../Port';
import { getGenericTypeKind, isNumericType, isPrimitive } from '../utils/type-utils';

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
    marginRight: '10px'
}

export interface MappingOptionsWidgetProps {
    model: ExpressionLabelModel;
}

export function MappingOptionsWidget(props: MappingOptionsWidgetProps) {
    const classes = useStyles();
    const { link, context  } = props.model;
    const pendingMappingType = link.pendingMappingType;

    const [inProgress, setInProgress] = React.useState(false);
    
    const menuItems: Item[] = useMemo(() => {
        const wrapWithProgress = (onClick: () => Promise<void>) => {
            return async () => {
                setInProgress(true);
                await onClick();
            }
        };
        
        const onClickMapDirectly = async () => {
            await createNewMapping(link);
        }
    
        const onClickMapIndividualElements = async () => {
            await mapWithQuery(link, ResultClauseType.SELECT, context);
        };
    
        const onClickMapArraysAccessSingleton = async () => {
           await createNewMapping(link, (expr: string) => `${expr}${genArrayElementAccessSuffix(link)}`);
        };
    
        const onClickAggregateArray = async () => {
            await mapWithQuery(link, ResultClauseType.COLLECT, context);
        };
    
        const onClickMapWithCustomFn = async () => {
            await mapWithCustomFn(link, context);
        };
    
        const onClickMapWithTransformFn = async () => {
            await mapWithTransformFn(link, context);
        }
    
        const onClickMapWithAggregateFn = async (fn: string) => {
            await createNewMapping(link, (expr: string) => `${fn}(${expr})`);
        }

        const onClickMapSeqToPrimitive = async (fn: string) => {
            await mapSeqToX(link, context, (expr: string) => `${fn}(${expr})`);
        }

        const onClickConvertAndMap = async () => {
            await convertAndMap(link, context);
        }

        const onClickConnectArraysWithJoin = () => {
            mapWithClause(link, IntermediateClauseType.JOIN, context);
        }

        const oncClickConnectArraysWithFrom = () => {
            mapWithClause(link, IntermediateClauseType.FROM, context);
        }

        const getItemElement = (id: string, label: string, iconName: string = "lightbulb", isCodicon?: boolean) => {
            return (
                <div
                    className={classes.itemContainer}
                    key={id}
                >
                    <Icon isCodicon={isCodicon} name={iconName} sx={codiconStyles} />
                    {label}
                </div>
            );
        }

        const customFnMenuItem: Item = {
            id: "custom-func",
            label: getItemElement("custom-func", "Map Using Custom Function", "function-icon"),
            onClick: wrapWithProgress(onClickMapWithCustomFn)
        }

        const transformFnMenuItem: Item = {
            id: "transform-func",
            label: getItemElement("transform-func", "Map Using Transform Function", "dataMapper"),
            onClick: wrapWithProgress(onClickMapWithTransformFn)
        }
    
        const a2aMenuItems: Item[] = [
            {
                id: "a2a-inner",
                label: getItemElement("a2a-inner", "Map Each Element", "bi-convert"),
                onClick: wrapWithProgress(onClickMapIndividualElements)
            },
            {
                id: "a2a-direct",
                label: getItemElement("a2a-direct", "Assign As-Is", "warning", true),
                onClick: wrapWithProgress(onClickMapDirectly)
            }
        ];

        const convertMenuItems: Item[] = [
            {
                id: "convert-n-map",
                label: getItemElement("convert-n-map", "Convert and Map", "refresh"),
                onClick: wrapWithProgress(onClickConvertAndMap)
            }
        ];

        const arrayConnectMenuItems: Item[] = [
            {
                id: "array-from",
                label: getItemElement("array-from", "Nested Iterate", "nested"),
                onClick: oncClickConnectArraysWithFrom
            },
            {
                id: "array-join",
                label: getItemElement("array-join", "Join with Condition", "join"),
                onClick: onClickConnectArraysWithJoin
            }
        ];
    
        const defaultMenuItems: Item[] = [
            {
                id: "direct",
                label: getItemElement("direct", "Assign As-Is", "warning", true),
                onClick: wrapWithProgress(onClickMapDirectly)
            }
        ];
    
        const genAggregateItems = (onClick: (fn: string) => Promise<void>) => {
            const aggregateFnsNumeric = ["sum", "avg", "min", "max"];
            const aggregateFnsString = ["string:'join"];
            const aggregateFnsCommon = ["first", "last"];

            const iconsMap: Record<string, string> = {
                sum: "sum",
                avg: "graph-avg",
                min: "graph-min",
                max: "graph-max",
                "string:'join": "bi-link",
                first: "chevron-first",
                last: "chevron-last"
            };
    
            const sourcePort = link.getSourcePort() as InputOutputPortModel;
            const sourceType = sourcePort.attributes.field.kind;
    
            const aggregateFns = [...(isNumericType(sourceType) ? aggregateFnsNumeric :
                getGenericTypeKind(sourceType) === TypeKind.String ? aggregateFnsString :
                    []),
            ...aggregateFnsCommon];
            const a2sAggregateItems: Item[] = aggregateFns.map((fn) => ({
                id: `a2s-collect-${fn}`,
                label: getItemElement(`a2s-collect-${fn}`, fn, iconsMap[fn]),
                onClick: wrapWithProgress(async () => await onClick(fn))
            }));
            return a2sAggregateItems;
        };
    
        const genArrayToSingletonItems = (): Item[] => {
            const a2sMenuItems: Item[] = [
                {
                    id: "a2s-index",
                    label: getItemElement("a2s-index", "Extract Single Element from Array", "index-zero", true),
                    onClick: wrapWithProgress(onClickMapArraysAccessSingleton)
                }
    
            ];
            const sourcePort = link.getSourcePort() as InputOutputPortModel;
            const targetPort = link.getTargetPort() as InputOutputPortModel;
            const sourceMemberType = sourcePort.attributes.field.member?.kind;
            const targetType = targetPort.attributes.field.kind;
    
            if (sourceMemberType === targetType && isPrimitive(sourceMemberType)) {
                a2sMenuItems.push({
                    id: "a2s-aggregate",
                    label: getItemElement("a2s-aggregate", "Aggregate and map", "Aggregate"),
                    onClick: wrapWithProgress(onClickAggregateArray)
                });
            }
    
            return a2sMenuItems;
        };
    
        const genMenuItems = (): Item[] => {
            switch (pendingMappingType) {
                case MappingType.ArrayToArray:
                    return [...a2aMenuItems, customFnMenuItem];
                case MappingType.ArrayToSingleton:
                    return [...genArrayToSingletonItems(), customFnMenuItem, transformFnMenuItem];
                case MappingType.ArrayToSingletonAggregate:
                    return genAggregateItems(onClickMapWithAggregateFn);
                case MappingType.ArrayConnect:
                    return arrayConnectMenuItems;
                case MappingType.Incompatible:
                    return [...defaultMenuItems, customFnMenuItem, transformFnMenuItem];
                case MappingType.ContainsUnions:
                    return [...defaultMenuItems, customFnMenuItem];
                case MappingType.SeqToPrimitive:
                    return genAggregateItems(onClickMapSeqToPrimitive);
                case MappingType.ConvertiblePrimitives:
                    return [...convertMenuItems, ...defaultMenuItems];
                default:
                    return defaultMenuItems;
            }
        };

        const menuItems = genMenuItems();
       
        return menuItems;
    }, [pendingMappingType, link, context]);

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
