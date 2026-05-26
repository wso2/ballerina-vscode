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
// tslint:disable: jsx-wrap-multiline
import React, { ReactElement, useContext, useEffect, useState } from "react"

import { DeleteButton, EditButton, TypeDefinitionIcon } from "@wso2/ballerina-core";
import { MethodDeclaration, ObjectField, ObjectTypeDesc, STKindChecker, TypeDefinition } from "@wso2/syntax-tree";

import { Context } from "../../../Context/diagram";
import { ComponentExpandButton } from "../../ComponentExpandButton";
import { RecordDefinitionComponent } from "../RecordDefinion";

import "./style.scss";

export interface TypeDefComponentProps {
    model: TypeDefinition;
}

export function TypeDefinitionComponent(props: TypeDefComponentProps) {
    const { model } = props;
    const diagramContext = useContext(Context);
    const { isReadOnly } = diagramContext.props;
    const gotoSource = diagramContext?.api?.code?.gotoSource;
    const deleteComponent = diagramContext?.api?.edit?.deleteComponent;
    const renderDialogBox = diagramContext?.api?.edit?.renderDialogBox;
    const showTooltip = diagramContext?.api?.edit?.showTooltip;

    const [isEditable, setIsEditable] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleMouseEnter = () => {
        setIsEditable(true);
    };
    const handleMouseLeave = () => {
        setIsEditable(false);
    };
    const onExpandClick = () => {
        setIsExpanded(!isExpanded);
    };

    const handleDeleteBtnClick = () => {
        if (deleteComponent) {
            deleteComponent(model);
        }
    }

    const handleEditBtnClick = () => {
        if (renderDialogBox) {
            renderDialogBox("Unsupported", handleEditBtnConfirm, undefined);
        }
    }

    const handleEditBtnConfirm = () => {
        const targetposition = model.position;
        gotoSource({ startLine: targetposition.startLine, startColumn: targetposition.startColumn });
    }

    const component: JSX.Element[] = [];

    if (STKindChecker.isRecordTypeDesc(model.typeDescriptor)) {
        component.push(
            <RecordDefinitionComponent model={model} />
        )
    } else {
        const typeModel: TypeDefinition = model as TypeDefinition;

        const varName = typeModel.typeName.value;
        const type = typeModel.typeDescriptor.source.split(/[\s, <]+/)[0];
        const typeMaxWidth = type.length >= 10;
        const nameMaxWidth = varName.length >= 20;
        let typeFields;
        if (STKindChecker.isObjectTypeDesc(model.typeDescriptor)) {
            typeFields = [];
            const objectModel = typeModel.typeDescriptor as ObjectTypeDesc;
            for (const field of (typeModel.typeDescriptor as ObjectTypeDesc).members) {
                if (field.kind === "ObjectField") {
                    const fieldName = (field as ObjectField).fieldName.value;
                    const fieldType = (field as ObjectField).typeName.source.trim();
                    typeFields.push([fieldType, fieldName]);
                } else if (field.kind === "MethodDeclaration") {
                    const fieldName = (field as MethodDeclaration).methodName.value;
                    const fieldType = (field as MethodDeclaration).functionKeyword.value;
                    const fieldValue = (field as MethodDeclaration).methodSignature.source;
                    typeFields.push([fieldType, fieldName + fieldValue]);
                }
            }
        }
        const typeText = (
            <tspan x="0" y="0">{typeMaxWidth ? type.slice(0, 10) + "..." : type}</tspan>
        );

        // TODO:Check the rendering issue in this tooltip
        let tooltip: ReactElement;
        if (showTooltip) {
            tooltip = showTooltip(typeText, model.source.slice(1, -1));
        }

        component.push(
            <div>
                <div className="type-comp" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                    <div className="type-header" >
                        <div className="type-content">
                            <div className="type-icon">
                                <TypeDefinitionIcon />
                            </div>
                            <div className="type-type">
                                {tooltip ? tooltip : typeText}
                            </div>
                            <div className="type-name">
                                <tspan x="0" y="0">{nameMaxWidth ? varName.slice(0, 20) + "..." : varName}</tspan>
                            </div>
                        </div>
                        {isEditable && !isReadOnly && (
                            <div className="type-amendment-options">
                                <div className="type-edit">
                                    <EditButton onClick={handleEditBtnClick} />
                                </div>
                                <div className="type-delete">
                                    <DeleteButton onClick={handleDeleteBtnClick} />
                                </div>
                                {typeFields && (
                                    <div className="type-expand">
                                        <ComponentExpandButton isExpanded={isExpanded} onClick={onExpandClick} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="type-separator" />
                    {isExpanded && typeFields && (
                        <>
                            <div className="type-fields" >
                                {typeFields.map(typefield => (
                                    <div className="type-field" key={typefield[1]}>
                                        <div className="type-field-type">
                                            {typefield[0]}
                                        </div>
                                        <div className="type-field-name">
                                            {typefield[1]};
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                {/* {editingEnabled && <UnsupportedConfirmButtons onConfirm={handleEditBtnConfirm} onCancel={handleEditBtnCancel} />} */}
            </div>
        )
    }
    return (
        <>
            {component}
        </>
    );
}
