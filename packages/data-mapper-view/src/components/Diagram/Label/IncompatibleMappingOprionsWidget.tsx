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

import { Codicon, Item, Menu, MenuItem } from '@wso2/ui-toolkit';
import { css } from '@emotion/css';

import { RecordFieldPortModel, ValueType } from '../Port';
import {
    createSourceForMapping,
    getValueType,
    mapUsingCustomFunction,
    modifySpecificFieldSource,
    updateExistingValue
} from '../utils/dm-utils';
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

const menuStyles = {
    backgroundColor: "var(--vscode-quickInput-background)",
    boxShadow: "none",
    padding: "0px",
    border: "1px solid var(--vscode-debugIcon-breakpointDisabledForeground)"
};

const codiconStyles = {
    color: 'var(--vscode-editorLightBulb-foreground)',
    marginRight: '10px'
}

export interface IncompatibleMappingOprionsWidgetProps {
    model: ExpressionLabelModel;
}

export function IncompatibleMappingOprionsWidget(props: IncompatibleMappingOprionsWidgetProps) {
    const classes = useStyles();
    const { link, context } = props.model;

    const sourcePort = link.getSourcePort() as RecordFieldPortModel;
    const targetPort = link?.getTargetPort() as RecordFieldPortModel;
    const valueType = getValueType(link);

    const onClickMapDirectly = async () => {
        if (valueType === ValueType.Default) {
            await updateExistingValue(sourcePort, targetPort);
        } else if (valueType === ValueType.NonEmpty) {
            await modifySpecificFieldSource(sourcePort, targetPort, link.getID());
        } else {
            await createSourceForMapping(sourcePort, targetPort);
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

    const o2oMenuItems: Item[] = [
        {
            id: "incompatible-direct",
            label: getItemElement("incompatible-direct", "Map Directly"),
            onClick: onClickMapDirectly
        },
        {
            id: "incompatible-func",
            label: getItemElement("incompatible-func", "Map Using Custom Function"),
            onClick: onClickMapUsingCustomFunction
        }
    ];

    return (
        <div className={classes.arrayMappingMenu}>
            <Menu sx={menuStyles}>
                {o2oMenuItems.map((item: Item) =>
                    <MenuItem
                        key={`item ${item.id}`}
                        item={item}
                    />
                )}
            </Menu>
        </div>
    );
}
