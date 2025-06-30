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
import React, { useContext } from "react";

import { ServiceIconLight } from "@wso2/ballerina-core";
import {
    ListenerDeclaration,
    ServiceDeclaration,
    STKindChecker,
} from "@wso2/syntax-tree";

import { Context as DiagramContext } from "../../../Context/diagram";
import { HeaderActionsWithMenu } from "../../../HeaderActions";
import { HeaderWrapper } from "../../../HeaderWrapper";

import "./style.scss";

export const SERVICE_HEADER_HEIGHT: number = 49;

export const SERVICE_TYPE_WIDTH: number = 80;
export const SERVICE_TYPE_HEIGHT: number = 32;
export const SERVICE_TYPE_PADDING_TOP: number = 8.5;
export const SERVICE_TYPE_PADDING_LEFT: number = 8.5;

export const SERVICE_TYPE_TEXT_PADDING_TOP: number = 20;
export const SERVICE_TYPE_TEXT_PADDING_LEFT: number = 15;

export const SERVICE_PATH_TEXT_PADDING_TOP: number = 20;
export const SERVICE_PATH_TEXT_PADDING_LEFT: number = 15;

export const SERVICE_LISTENER_AND_PATH_GAP: number = 100;

export interface ServiceHeaderProps {
    model: ServiceDeclaration;
    isExpanded: boolean;
    onExpandClick: () => void;
    onClickTryIt: () => void;
    onClickRun: () => void;
}

export function ServiceHeader(props: ServiceHeaderProps) {
    const { model, isExpanded, onExpandClick, onClickTryIt, onClickRun } = props;
    const diagramContext = useContext(DiagramContext);
    const { stSymbolInfo } = diagramContext.props;
    const deleteComponent = diagramContext?.api?.edit?.deleteComponent;
    let servicePath = "";

    model.absoluteResourcePath.forEach((pathSegment) => {
        servicePath += pathSegment.value;
    });

    let serviceType = "";
    let listeningOnText = "";
    let isUnsupportedType;

    if (STKindChecker.isExplicitNewExpression(model.expressions[0])) {
        if (
            STKindChecker.isQualifiedNameReference(
                model.expressions[0].typeDescriptor
            )
        ) {
            serviceType = model.expressions[0].typeDescriptor.modulePrefix.value.toUpperCase();
            listeningOnText = model.expressions[0].source;
        }
    } else if (STKindChecker.isSimpleNameReference(model.expressions[0]) && stSymbolInfo) {
        const listenerNode: ListenerDeclaration = stSymbolInfo.listeners.get(
            model.expressions[0].name.value
        ) as ListenerDeclaration;
        if (listenerNode && STKindChecker.isQualifiedNameReference(listenerNode.typeDescriptor)) {
            serviceType = listenerNode.typeDescriptor.modulePrefix.value.toUpperCase();
            listeningOnText = model.expressions[0].source;
        }
    }

    const unSupportedTypes = ["GRPC", "NATS", "WEBSOCKET", "WEBSUB"];
    (unSupportedTypes.includes(serviceType)) ? isUnsupportedType = true : isUnsupportedType = false;

    const handleDeleteConfirm = () => {
        deleteComponent(model);
    };

    return (
        <HeaderWrapper
            className={"service-header"}
            onClick={onExpandClick}
        >
            <div className={"header-segement-container"}>
                <div className={"header-segment"}>
                    <ServiceIconLight className="dark-fill"/>
                </div>
                <div className={"header-segment"}>{serviceType}</div>
                <div className={"header-segment-path"}>{servicePath}</div>
                <div className={"header-segment-listener"}>
                    {listeningOnText.length > 0 ? `listening on ${listeningOnText}` : ""}
                </div>
            </div>
            <HeaderActionsWithMenu
                model={model}
                isExpanded={isExpanded}
                onExpandClick={onExpandClick}
                onConfirmDelete={handleDeleteConfirm}
                unsupportedType={isUnsupportedType}
                onClickTryIt={onClickTryIt}
                onClickRun={onClickRun}
            />
        </HeaderWrapper >
    );
}
