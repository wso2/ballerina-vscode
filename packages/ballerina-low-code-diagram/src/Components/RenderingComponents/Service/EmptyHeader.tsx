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

import { ClassIcon, DeleteButton, EditButton } from "@wso2/ballerina-core";
import { ServiceDeclaration, STKindChecker } from "@wso2/syntax-tree";
import classNames from "classnames";

import { Context as DiagramContext } from "../../../Context/diagram";
import { HeaderWrapper } from "../../../HeaderWrapper";

import "./style.scss";

export interface EmptyHeaderProps {
    model: ServiceDeclaration;
    isExpanded: boolean;
    onExpandClick: () => void;
}

export function EmptyHeader(props: EmptyHeaderProps) {
    const { model, onExpandClick } = props;
    const diagramContext = useContext(DiagramContext);
    const { isReadOnly } = diagramContext.props;
    const deleteComponent = diagramContext?.api?.edit?.deleteComponent;
    const gotoSource = diagramContext?.api?.code?.gotoSource;
    const renderDialogBox = diagramContext?.api?.edit?.renderDialogBox;
    const renderEditForm = diagramContext?.api?.edit?.renderEditForm;

    let serviceType = "";
    if (STKindChecker.isServiceDeclaration(model) && model.expressions?.length > 0) {
        const expression = model.expressions[0];
        if (
            STKindChecker.isExplicitNewExpression(expression) &&
            STKindChecker.isQualifiedNameReference(expression.typeDescriptor) &&
            STKindChecker.isIdentifierToken(expression.typeDescriptor.modulePrefix)
        ) {
            serviceType = expression.typeDescriptor.modulePrefix.value.toUpperCase();
        } else if (STKindChecker.isSimpleNameReference(expression)) {
            serviceType = expression.typeData?.typeSymbol?.moduleID?.moduleName?.toUpperCase();
        }
    }

    let servicePath = "";
    model.absoluteResourcePath.forEach((pathSegment) => {
        servicePath += pathSegment.value || pathSegment.source;
    });

    const handleDeleteBtnClick = () => {
        deleteComponent(model);
    };

    const handleEditBtnClick = () => {
        // renderDialogBox("Unsupported", handleEditBtnConfirm);
        renderEditForm(model, model.position, {
                formType: 'GraphQL', isLoading: false
            }
        )
    };

    const handleEditBtnConfirm = () => {
        const targetposition = model.position;
        gotoSource({ startLine: targetposition.startLine, startColumn: targetposition.startColumn });
    };

    return (
        <HeaderWrapper className={"class-component-header"} onClick={onExpandClick}>
            <div className={"header-segement-container"}>
                <div className="header-segment">
                    <ClassIcon />
                </div>
                <div className={"header-segment"}>{serviceType}</div>
                <div className={"header-segment-path"}>{servicePath || ""}</div>
            </div>
            {!isReadOnly && (
                <div className="class-amendment-options">
                    <div className={classNames("class-component-edit", "show-on-hover")}>
                        <EditButton onClick={handleEditBtnClick} />
                    </div>
                    <div className={classNames("class-component-delete", "show-on-hover")}>
                        <DeleteButton onClick={handleDeleteBtnClick} />
                    </div>
                </div>
            )}
        </HeaderWrapper>
    );
}
