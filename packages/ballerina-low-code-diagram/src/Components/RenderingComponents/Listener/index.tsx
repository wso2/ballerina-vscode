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
import React, { useContext, useEffect, useState } from 'react'

import { DeleteButton, EditButton, ListenerIcon } from '@wso2/ballerina-core';
import { ListenerDeclaration, STKindChecker, STNode } from "@wso2/syntax-tree";
import classNames from "classnames";

import { Context } from '../../../Context/diagram';
import { DefaultTooltip } from '../DefaultTooltip';

import "./style.scss";

export const LISTENER_MARGIN_LEFT: number = 24.5;
export const LISTENER_PLUS_OFFSET: number = 7.5;

export interface ListenerProps {
    model: STNode;
}

export function ListenerC(props: ListenerProps) {
    const { model } = props;
    const diagramContext = useContext(Context);
    const { isReadOnly } = diagramContext.props;
    const deleteComponent = diagramContext?.api?.edit?.deleteComponent;
    const renderEditForm = diagramContext?.api?.edit?.renderEditForm;
    const gotoSource = diagramContext?.api?.code?.gotoSource;
    const showTooltip = diagramContext?.api?.edit?.showTooltip;

    const [isEditable, setIsEditable] = useState(false);
    const [tooltip, setTooltip] = useState(undefined);
    // const [editingEnabled, setEditingEnabled] = useState(false);

    const listenerModel: ListenerDeclaration = model as ListenerDeclaration;
    const listenerName = listenerModel.variableName.value;
    // TODO derive listener type for other cases
    const listenerType = STKindChecker.isQualifiedNameReference(listenerModel.typeDescriptor)
        ? listenerModel.typeDescriptor.modulePrefix.value
        : "";
    let listenerPort = "";
    if (STKindChecker.isExplicitNewExpression(listenerModel.initializer)
        || STKindChecker.isImplicitNewExpression(listenerModel.initializer)) {
            listenerModel.initializer.parenthesizedArgList?.arguments.forEach((argument) => {
                listenerPort += argument.source?.trim();
            });
        }
    const typeMaxWidth = listenerType.length >= 10;
    const nameMaxWidth = listenerName.length >= 20;

    const handleMouseEnter = () => {
        setIsEditable(true);
    };
    const handleMouseLeave = () => {
        setIsEditable(false);
    };

    const handleDeleteBtnClick = () => {
        deleteComponent(model);
    }

    const handleEditBtnClick = () => {
        const supportedListenerType: boolean = STKindChecker.isExplicitNewExpression(listenerModel.initializer)
                        || STKindChecker.isImplicitNewExpression(listenerModel.initializer);
        if (supportedListenerType) {
            renderEditForm(model, model.position, { formType: model.kind, isLoading: false });
        } else {
            const targetposition = model.position;
            gotoSource({ startLine: targetposition.startLine, startColumn: targetposition.startColumn });
        }
    }

    const listenerTypeComponent = (
        <tspan x="0" y="0">{typeMaxWidth ? listenerType.slice(0, 10).toUpperCase() + "..." : listenerType.toUpperCase()}</tspan>
    );

    const listenerNameComponent = (
        <tspan x="0" y="0">{nameMaxWidth ? listenerName.slice(0, 20) + "..." : listenerName}</tspan>
    );

    const defaultTooltip = (
        <DefaultTooltip text={model.source.slice(1, -1)}>{listenerNameComponent}</DefaultTooltip>
    );

    useEffect(() => {
        if (model && showTooltip) {
            setTooltip(showTooltip(listenerTypeComponent, model.source.slice(1, -1)));
        }
    }, [model]);


    return (
        <>
            <div
                className="listener-comp"
                data-listener-name={listenerName}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="listener-header">
                    <div className="listener-content">
                        <div className="listener-icon">
                            <ListenerIcon />
                        </div>
                        <div className="listener-type">
                            {tooltip ? tooltip : listenerTypeComponent}
                        </div>
                        <div className="listener-name">
                            {listenerNameComponent}
                        </div>
                    </div>
                    {!isReadOnly && (
                        <div className={"listener-amendment-options"}>
                            <div className={classNames("edit-btn-wrapper", "show-on-hover")}>
                                <EditButton onClick={handleEditBtnClick} />
                            </div>
                            <div className={classNames("delete-btn-wrapper", "show-on-hover")}>
                                <DeleteButton onClick={handleDeleteBtnClick} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export const Listener = ListenerC;

