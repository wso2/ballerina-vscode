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
import React, { useContext } from "react"

import {
    DeleteButton,
    EditButton,
    FunctionIcon
} from "@wso2/ballerina-core";
import {
    FunctionDefinition,
    STKindChecker
} from "@wso2/syntax-tree";
import classNames from "classnames";

import { Context } from "../../../../Context/diagram";

import "./style.scss";

export interface ExprBodiedFuncComponentProps {
    model: FunctionDefinition;
}

export function ExprBodiedFuncComponent(props: ExprBodiedFuncComponentProps) {
    const { model } = props;

    const diagramContext = useContext(Context);
    const { isReadOnly } = diagramContext.props;
    const deleteComponent = diagramContext?.api?.edit?.deleteComponent;
    const renderEditForm = diagramContext?.api?.edit?.renderEditForm;

    const handleDeleteConfirm = () => {
        deleteComponent(model);
    };
    const handleEditClick = () => {
        renderEditForm(model, model.position, {
            formType: 'DataMapper', isLoading: false
        }
        )
    };

    const component: JSX.Element[] = [];

    if (STKindChecker.isExpressionFunctionBody(model.functionBody)) {
        const funcName = model.functionName.value;

        component.push(
            <div className="expr-bodied-func-comp" data-record-name={funcName}>
                <div className="function-header" >
                    <div className="function-content">
                        <div className="function-icon">
                            <FunctionIcon />
                        </div>
                        <div className="function-name">
                            {funcName}
                        </div>
                    </div>
                    {!isReadOnly && (
                        <div className="amendment-options">
                            <div className={classNames("edit-btn-wrapper", "show-on-hover")}>
                                <EditButton onClick={handleEditClick} />
                            </div>
                            <div className={classNames("delete-btn-wrapper", "show-on-hover")}>
                                <DeleteButton onClick={handleDeleteConfirm} />
                            </div>
                        </div>
                    )
                    }
                </div>
                <div className="function-separator" />
            </div>
        )
    }

    return (
        <>
            <div id={"edit-div"} />
            {component}
        </>
    );
}
