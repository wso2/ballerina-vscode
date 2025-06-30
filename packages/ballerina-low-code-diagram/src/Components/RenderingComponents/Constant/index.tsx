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
import React, { useContext, useEffect, useState } from "react"

import { ConstantIcon, DeleteButton, EditButton } from "@wso2/ballerina-core";
import { ConstDeclaration, STNode } from "@wso2/syntax-tree";
import classNames from "classnames";

import { Context } from "../../../Context/diagram";

import "./style.scss";

export const MODULE_VAR_MARGIN_LEFT: number = 24.5;
export const MODULE_VAR_PLUS_OFFSET: number = 7.5;
export const MODULE_VAR_HEIGHT: number = 49;
export const MIN_MODULE_VAR_WIDTH: number = 275;

export interface ConstantProps {
    model: STNode;
}

export function Constant(props: ConstantProps) {
    const { model } = props;
    const diagramContext = useContext(Context);
    const deleteComponent = diagramContext?.api?.edit?.deleteComponent;
    const renderEditForm = diagramContext?.api?.edit?.renderEditForm;
    const showTooltip = diagramContext?.api?.edit?.showTooltip;
    const [tooltip, setTooltip] = useState(undefined);

    const constModel: ConstDeclaration = model as ConstDeclaration;
    const varType = "const";
    const varName = constModel.variableName.value;
    const varValue = constModel.initializer.source.trim();

    const typeMaxWidth = varType.length >= 10;
    const nameMaxWidth = varName.length >= 20;

    const handleDeleteBtnClick = () => {
        if (deleteComponent) {
            deleteComponent(model);
        }
    }

    const handleEditBtnClick = () => {
        if (renderEditForm) {
            renderEditForm(model, model.position, {
                formType: model.kind,
                isLoading: false
            });
        }
    }

    const typeText = (
        <tspan x="0" y="0">{typeMaxWidth ? varType.slice(0, 10) + "..." : varType}</tspan>
    );


    useEffect(() => {
        if (model && showTooltip) {
            setTooltip(showTooltip(typeText, model.source.slice(1, -1)));
        }
    }, [model]);


    return (
        <div>
            <div
                className={"const-container"}
                data-test-id="const"
                data-const-name={varName}
            >
                <div className={"const-wrapper"}>
                    <div className={"const-icon"}>
                        <ConstantIcon />
                    </div>
                    <div className={"const-type-text"}>
                        {tooltip ? tooltip : typeText}
                    </div>
                    <div className={"const-name-text"}>
                        <tspan x="0" y="0">{nameMaxWidth ? varName.slice(0, 20) + "..." : varName}</tspan>
                    </div>
                </div>
                <div className="amendment-options">
                    <div className={classNames("edit-btn-wrapper", "show-on-hover")}>
                        <EditButton onClick={handleEditBtnClick} />
                    </div>
                    <div className={classNames("delete-btn-wrapper", "show-on-hover")}>
                        <DeleteButton onClick={handleDeleteBtnClick} />
                    </div>
                </div>
            </div>
        </div>
    );
}
