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

import { TypeKind } from '@wso2/ballerina-core';
import { Codicon, Item, Menu, MenuItem } from '@wso2/ui-toolkit';
import { css } from '@emotion/css';

import { MappingType, RecordFieldPortModel, ValueType } from '../Port';
import { DataMapperLinkModel } from '../Link';
import { ExpressionLabelModel } from './ExpressionLabelModel';
import { buildInputAccessExpr, createSourceForMapping, genArrayElementAccessSuffix, getLocalVariableNames, getValueType, mapUsingCustomFunction, modifySpecificFieldSource, updateExistingValue } from '../utils/dm-utils';
import { ClauseType, generateQueryExpression } from '../Link/link-utils';
import { useDMFocusedViewStateStore } from '../../../store/store';
import { canPerformAggregation } from '../utils/type-utils';

export const useStyles = () => ({
    arrayMappingMenu: css({
        pointerEvents: 'auto'
    }),
    itemContainer: css({
        display: 'flex',
        width: '100%',
        alignItems: 'center'
    }),
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
    const { link, pendingMappingType, context } = props.model;
    const focusedViewStore = useDMFocusedViewStateStore();

    const sourcePort = link.getSourcePort() as RecordFieldPortModel;
    const targetPort = link?.getTargetPort() as RecordFieldPortModel;
    const valueType = getValueType(link);
    const targetPortHasLinks = Object.values(targetPort.links)
        ?.some(link => (link as DataMapperLinkModel)?.isActualLink);

    const isValueModifiable = valueType === ValueType.Default
        || (valueType === ValueType.NonEmpty && !targetPortHasLinks);
    
    const onClickMapArrays = async () => {
        if (valueType === ValueType.Default) {
            await updateExistingValue(sourcePort, targetPort);
        } else if (valueType === ValueType.NonEmpty) {
            await modifySpecificFieldSource(sourcePort, targetPort, link.getID());
        } else {
            await createSourceForMapping(sourcePort, targetPort);
        }
    }

    const onClickMapIndividualElements = async (clause: ClauseType = ClauseType.Select, isElementAccss?: boolean) => {
        if (targetPort instanceof RecordFieldPortModel && sourcePort instanceof RecordFieldPortModel) {
            const targetPortField = targetPort.field;
            const isArrayType = targetPortField.typeName === TypeKind.Array && targetPortField?.memberType;
            const isAggregation = clause === ClauseType.Collect;

            if (isArrayType || isElementAccss || isAggregation) {
                let isSourceOptional = sourcePort.field.optional;
                const localVariables = getLocalVariableNames(context.functionST);
                const inputAccessExpr = buildInputAccessExpr((link.getSourcePort() as RecordFieldPortModel).fieldFQN);
                const targetType = isElementAccss || isAggregation ? targetPortField : targetPortField.memberType;

                const mapFnSrc = generateQueryExpression(
                    inputAccessExpr, targetType, isSourceOptional, clause, [...localVariables]
                );

                focusedViewStore.setPortFQNs(sourcePort.fieldFQN, targetPort.fieldFQN);

                const updatedMapFnSrc = isElementAccss ? `(${mapFnSrc})[0]` : mapFnSrc;
                if (isValueModifiable) {
                    await updateExistingValue(sourcePort, targetPort, updatedMapFnSrc);
                } else {
                    await createSourceForMapping(sourcePort, targetPort, updatedMapFnSrc);
                }
            }
        }
    };

    const onClickMapArraysAccessSingleton = async () => {
        const newExpr = (sourcePort as RecordFieldPortModel).fieldFQN + genArrayElementAccessSuffix(sourcePort, targetPort);

        if (valueType === ValueType.Default) {
            await updateExistingValue(sourcePort, targetPort, newExpr);
        } else if (valueType === ValueType.NonEmpty) {
            await modifySpecificFieldSource(sourcePort, targetPort, link.getID(), newExpr);
        } else {
            await createSourceForMapping(sourcePort, targetPort, newExpr);
        }
    }

    const onClickMapUsingCustomFunction = async () => {
        await mapUsingCustomFunction(sourcePort, targetPort, link.getID(), context, valueType);
    };

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
            onClick: onClickMapArrays
        },
        {
            id: "a2a-inner",
            label: getItemElement("a2a-inner", "Map Array Elements Individually"),
            onClick: onClickMapIndividualElements
        }
    ];

    const a2sMenuItems: Item[] = [
        {
            id: "a2s-direct",
            label: getItemElement("a2s-direct", "Extract Single Element from Array"),
            onClick: onClickMapArraysAccessSingleton
        },
        {
            id: "a2s-inner",
            label: getItemElement("a2s-inner", "Map Array Elements Individually and access element"),
            onClick: () => onClickMapIndividualElements(ClauseType.Select, true)
        }
    ];

    if (canPerformAggregation(targetPort)) {
        a2sMenuItems.push({
            id: "a2a-aggregate",
            label: getItemElement("a2a-aggregate", "Aggregate using Query"),
            onClick: () => onClickMapIndividualElements(ClauseType.Collect)
        });
    }

    const menuItems = pendingMappingType === MappingType.ArrayToArray ? a2aMenuItems : a2sMenuItems;

    menuItems.push({
        id: "a2a-a2s-func",
        label: getItemElement("a2a-a2s-func", "Map Using Custom Function"),
        onClick: onClickMapUsingCustomFunction
    });

    return (
        <div className={classes.arrayMappingMenu}>
            <Menu sx={a2aMenuStyles}>
                {menuItems.map((item: Item) =>
                    <MenuItem
                        key={`item ${item.id}`}
                        item={item}
                    />
                )}
            </Menu>
        </div>
    );
}
