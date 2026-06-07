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
import React, { useState } from "react";

import { BallerinaConstruct } from "@wso2/ballerina-core";
import { STKindChecker, STNode } from "@wso2/syntax-tree";

import { getQualifiedNameReferenceNodeFromType } from '../../../../Utils/index'
import { DefaultConnectorIcon, DefaultIconProps } from "../Icon/DefaultConnectorIcon";

export interface ModuleIconProps {
    node?: STNode;
    module?: BallerinaConstruct;
    cx?: number;
    cy?: number;
    width?: number;
    scale?: number;
}

export function ModuleIcon(props: ModuleIconProps) {
    const { node, module, cx, cy, width, scale } = props;
    const balCentralCdn = "https://bcentral-packageicons.azureedge.net/images";
    const iconWidth = width || 42;
    let iconUrl = "";
    const defaultProps: DefaultIconProps = { scale: scale || 1, cx, cy, width: iconWidth };

    const [showDefaultIcon, setShowDefaultIcon] = useState(false);

    const getIconUrl = (baseUrl: string, orgName: string, moduleName: string, version: string) => {
        return `${baseUrl}/${orgName}_${moduleName}_${version}.png`;
    };

    if (node && (STKindChecker.isLocalVarDecl(node) || STKindChecker.isModuleVarDecl(node))) {
        let moduleInfo = node.typedBindingPattern.typeDescriptor?.typeData.typeSymbol?.moduleID;
        if (!moduleInfo && getQualifiedNameReferenceNodeFromType(node.typedBindingPattern.typeDescriptor)){
            moduleInfo = getQualifiedNameReferenceNodeFromType(node.typedBindingPattern.typeDescriptor).typeData.typeSymbol?.moduleID;
        }
        if (!moduleInfo && STKindChecker.isArrayTypeDesc(node.typedBindingPattern.typeDescriptor)) {
            moduleInfo = node.typedBindingPattern.typeDescriptor?.typeData.typeSymbol?.memberTypeDescriptor.moduleID;
        }
        if (moduleInfo){
            iconUrl = getIconUrl(balCentralCdn, moduleInfo.orgName, moduleInfo.moduleName, moduleInfo.version);
        }
    } else if (node && STKindChecker.isActionStatement(node) && STKindChecker.isRemoteMethodCallAction(node.expression)
        && node.expression.expression.typeData?.symbol?.moduleID) {
        const moduleInfo = node.expression.expression.typeData?.symbol?.moduleID;
        if (moduleInfo){
            iconUrl = getIconUrl(balCentralCdn, moduleInfo.orgName, moduleInfo.moduleName, moduleInfo.version);
        }
    } else if (node && STKindChecker.isObjectField(node) && node.typeData?.typeSymbol?.moduleID) {
        const moduleInfo = node.typeData.typeSymbol.moduleID;
        if (moduleInfo){
            iconUrl = getIconUrl(balCentralCdn, moduleInfo.orgName, moduleInfo.moduleName, moduleInfo.version);
        }
    } else if (module && module.icon === "" && !showDefaultIcon) {
        setShowDefaultIcon(true);
    } else if (module) {
        iconUrl =
            module.icon ||
            module.package?.icon ||
            getIconUrl(balCentralCdn, module.package.organization, module.moduleName, module.package.version);
    } else if (!showDefaultIcon) {
        setShowDefaultIcon(true);
    }

    const handleLoadingError = () => {
        setShowDefaultIcon(true);
    };

    const svgIcon = (
        <svg x={cx} y={cy} width={iconWidth} height={iconWidth} xmlns="http://www.w3.org/2000/svg">
            <image href={iconUrl} height={iconWidth} width={iconWidth} onError={handleLoadingError} />
        </svg>
    );

    const imageIcon = (
        <img
            src={iconUrl}
            alt={module?.moduleName}
            style={{ width: "100%", height: "auto", maxWidth: iconWidth, maxHeight: iconWidth }}
            onError={handleLoadingError}
        />
    );

    return (
        <>
            {!showDefaultIcon && node && svgIcon}
            {!showDefaultIcon && module && imageIcon}
            {showDefaultIcon && <DefaultConnectorIcon {...defaultProps} />}
        </>
    );
}
