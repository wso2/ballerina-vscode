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

import { InputOutputPortModel, ValueType } from '../Port';
import { genArrayElementAccessSuffix, getValueType } from '../utils/common-utils';
import { MappingType } from '../Link';
import { ExpressionLabelModel } from './ExpressionLabelModel';

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
    const { link  } = props.model;
    const pendingMappingType = link.pendingMappingType;

    const sourcePort = link.getSourcePort() as InputOutputPortModel;
    const targetPort = link?.getTargetPort() as InputOutputPortModel;
    const valueType = getValueType(link);

    const isValueModifiable = valueType === ValueType.Default
        || valueType === ValueType.NonEmpty;
    
    const onClickMapArrays = async () => {
        if (isValueModifiable) {
        } else {
        }
    }

    const onClickMapIndividualElements = async () => {
        
    };

    const onClickMapArraysAccessSingleton = async () => {
       
    };

    const onClickAggregateArray = async () => {

    };

    const onClickMapUsingCustomFunction = async () => {
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
            id: "a2s-aggregate",
            label: getItemElement("a2s-aggregate", "Aggregate using Query"),
            onClick: onClickAggregateArray
        }
    ];

    const collectClauseFns = ["sum", "avg", "min", "max", "count"];

    const a2sCollectClauseItems: Item[] = collectClauseFns.map((func) => ({
        id: `a2s-collect-${func}`,
        label: getItemElement(`a2s-collect-${func}`, `Aggregate using ${func}`),
        onClick: () => onClickMapUsingCollectClause(func)
    }));


    const menuItems = pendingMappingType === MappingType.ArrayToArray ? a2aMenuItems : 
    pendingMappingType === MappingType.ArrayToSingleton ? a2sMenuItems : 
    a2sCollectClauseItems;

    if (pendingMappingType !== MappingType.ArrayToSingletonWithCollect) {
        menuItems.push({
            id: "a2a-a2s-func",
            label: getItemElement("a2a-a2s-func", "Map Using Custom Function"),
            onClick: onClickMapUsingCustomFunction
        });
    }
    

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
