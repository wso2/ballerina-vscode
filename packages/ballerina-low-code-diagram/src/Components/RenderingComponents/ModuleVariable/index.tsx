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
import React, { useContext, useEffect, useRef, useState } from "react"

import { ConfigurableIcon, DeleteButton, EditButton, ModuleVariableIcon } from "@wso2/ballerina-core";
import { CaptureBindingPattern, ModuleVarDecl, QualifiedNameReference, STKindChecker, STNode } from "@wso2/syntax-tree";
import classNames from "classnames";

import { Context } from "../../../Context/diagram";
import { filterComments } from "../../../Utils";
import { ModuleIcon } from "../Connector/ConnectorHeader/ModuleIcon";

import "./style.scss";

export const MODULE_VAR_MARGIN_LEFT: number = 24.5;
export const MODULE_VAR_PLUS_OFFSET: number = 7.5;
export const MODULE_VAR_HEIGHT: number = 49;
export const MIN_MODULE_VAR_WIDTH: number = 275;

export interface ModuleVariableProps {
    model: STNode;
}

export function ModuleVariable(props: ModuleVariableProps) {
    const { model } = props;
    const diagramContext = useContext(Context);
    const { isReadOnly } = diagramContext.props;
    const deleteComponent = diagramContext?.api?.edit?.deleteComponent;
    const renderEditForm = diagramContext?.api?.edit?.renderEditForm;
    const modifyDiagram = diagramContext?.api?.code?.modifyDiagram;
    const showTooltip = diagramContext?.api?.edit?.showTooltip;

    const [tooltip, setTooltip] = useState(undefined);
    // const [deleteFormVisible, setDeleteFormVisible] = useState(false);

    const deleteBtnRef = useRef(null);

    let varType = '';
    let varName = '';
    let varValue = '';
    let isConfigurable = false;
    let isModuleConnector = false;
    let isDisabledEdit = false;

    if (model && STKindChecker.isModuleVarDecl(model) && model.typeData.isEndpoint) {
        isModuleConnector = true;
        if (STKindChecker.isQualifiedNameReference(model.typedBindingPattern.typeDescriptor)) {
            varType = (model.typedBindingPattern.typeDescriptor as QualifiedNameReference).source.trim();
        }
        if (STKindChecker.isCaptureBindingPattern(model.typedBindingPattern.bindingPattern)) {
            varName = (model.typedBindingPattern.bindingPattern as CaptureBindingPattern).variableName?.value;
        }
    } else if (STKindChecker.isModuleVarDecl(model)) {
        const moduleMemberModel = model as ModuleVarDecl;
        varType = (moduleMemberModel.typedBindingPattern.bindingPattern as CaptureBindingPattern)?.typeData?.
            typeSymbol?.typeKind;
        varName = (moduleMemberModel.typedBindingPattern.bindingPattern as CaptureBindingPattern)?.variableName?.value;
        varValue = model.source.trim();
        isConfigurable = model && model.qualifiers.length > 0
            && model.qualifiers.filter(qualifier => STKindChecker.isConfigurableKeyword(qualifier)).length > 0;
    } else if (STKindChecker.isObjectField(model) && model.typeData.isEndpoint) {
        isModuleConnector = true;
        varType = model.typeName.source.trim();
        varName = model.fieldName.value;
        isDisabledEdit = true; // TODO: need to fix service level statement adding feature
    } else if (STKindChecker.isObjectField(model)) {
        varType = model.typeData?.typeSymbol?.typeKind;
        varName = model.fieldName.value;
        varValue = model.source.trim();
    }

    varType = filterComments(varType);
    const typeMaxWidth = varType?.length >= 10;
    const nameMaxWidth = varName?.length >= 20;

    // const handleOnDeleteCancel = () => {
    //     setDeleteFormVisible(false);
    // }

    const handleOnDeleteClick = () => {
        // setDeleteFormVisible(true);
        hadnleOnDeleteConfirm();
    }

    const hadnleOnDeleteConfirm = () => {
        deleteComponent(model);
    }

    const handleEditBtnClick = () => {
        renderEditForm(model, model.position, { formType: model.kind, isLoading: false });
    }

    const moduleVariableTypeElement = (
        <tspan x="0" y="0">{typeMaxWidth ? varType.slice(0, 10) + "..." : varType}</tspan>
    );

    useEffect(() => {
        if (model && showTooltip) {
            setTooltip(showTooltip(moduleVariableTypeElement, model.source.slice(1, -1)));
        }
    }, [model]);

    return (
        <div>
            <div className={"module-variable-container"} data-test-id="module-var">
                <div className="module-variable-header">
                    <div className={"module-variable-wrapper"}>
                        <div className={"module-variable-icon"}>
                            {isModuleConnector && <ModuleIcon node={model} width={16} scale={0.35} />}
                            {!isModuleConnector && isConfigurable && <ConfigurableIcon />}
                            {!isModuleConnector && !isConfigurable && <ModuleVariableIcon />}
                        </div>
                        <div className={"module-variable-type-text"}>
                            {tooltip ? tooltip : moduleVariableTypeElement}
                        </div>
                        <div className={"module-variable-name-text"}>
                            <tspan x="0" y="0">
                                {nameMaxWidth ? varName.slice(0, 20) + "..." : varName}
                            </tspan>
                        </div>
                    </div>
                    {!isReadOnly && (
                        <div className={"module-variable-actions"}>
                            {!isDisabledEdit && (
                                <div className={classNames("edit-btn-wrapper", "show-on-hover")}>
                                    <EditButton onClick={handleEditBtnClick} />
                                </div>
                            )}
                            <div className={classNames("delete-btn-wrapper", "show-on-hover")}>
                                <div ref={deleteBtnRef}>
                                    <DeleteButton onClick={handleOnDeleteClick} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* {
                deleteFormVisible && (
                    <DeleteConfirmDialog
                        onCancel={handleOnDeleteCancel}
                        onConfirm={hadnleOnDeleteConfirm}
                        position={
                            deleteBtnRef.current
                                ? {
                                    x: deleteBtnRef.current.offsetLeft,
                                    y: deleteBtnRef.current.offsetTop,
                                }
                                : { x: 0, y: 0 }
                        }
                        message={'Delete Variable?'}
                        isFunctionMember={false}
                    />
                )
            } */}
            {/* {
                editFormVisible && (
                    <FormGenerator
                        model={model}
                        configOverlayFormStatus={{
                            isLoading: false,
                            formType: model.kind,
                            formArgs: {
                                model
                            }
                        }}
                        targetPosition={model.position}
                        onCancel={handleEditBtnCancel}
                        onSave={handleEditBtnCancel}
                    />
                )
            } */}
        </div>
    );
}
