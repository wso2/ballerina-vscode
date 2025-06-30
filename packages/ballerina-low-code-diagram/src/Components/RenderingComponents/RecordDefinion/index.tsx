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
import React, { useContext, useState } from "react"

import { DeleteButton, EditButton, RecordEditor as RecordIcon } from "@wso2/ballerina-core";
import { RecordFieldWithDefaultValue, RecordTypeDesc, STKindChecker, TypeDefinition } from "@wso2/syntax-tree";
import classNames from "classnames";

import { Context } from "../../../Context/diagram";
import { HeaderActions } from "../../../HeaderActions";

import "./style.scss";


export const RECORD_MARGIN_LEFT: number = 24.5;
export const RECORD_PLUS_OFFSET: number = 7.5;

export interface RecordDefComponentProps {
    model: TypeDefinition;
}

export function RecordDefinitionComponent(props: RecordDefComponentProps) {
    const { model } = props;

    const diagramContext = useContext(Context);
    const { isReadOnly } = diagramContext.props;
    const deleteComponent = diagramContext?.api?.edit?.deleteComponent;
    const renderEditForm = diagramContext?.api?.edit?.renderEditForm;

    const [isExpanded, setIsExpanded] = useState(false);

    const onExpandClick = () => {
        setIsExpanded(!isExpanded);
    };
    const handleDeleteConfirm = () => {
        deleteComponent(model);
    };
    const handleEditClick = () => {
        renderEditForm(model, model.position, {
            formType: STKindChecker.isRecordTypeDesc(model.typeDescriptor) ? "RecordEditor" : model.kind, isLoading: false
        }
        )
    };

    const component: JSX.Element[] = [];

    if (STKindChecker.isRecordTypeDesc(model.typeDescriptor)) {

        const recordModel: TypeDefinition = model as TypeDefinition;

        const varName = recordModel.typeName.value;

        const record = [];
        for (const field of (recordModel.typeDescriptor as RecordTypeDesc).fields) {
            if (STKindChecker.isRecordField(field)) {
                const fieldName = field.fieldName.value;
                const fieldType = field.typeName.source?.trim();
                record.push([fieldType, fieldName]);
            } else if (STKindChecker.isRecordFieldWithDefaultValue(field)) {
                const fieldName = field.fieldName.value;
                const fieldType = field.typeName.source?.trim();
                const fieldValue = (field as RecordFieldWithDefaultValue).expression.source
                record.push([fieldType, fieldName + " = " + fieldValue]);
            }
        }

        component.push(
            <div className="record-comp" data-record-name={varName}>
                <div className="record-header" >
                    <div className="record-content">
                        <div className="record-icon">
                            <RecordIcon />
                        </div>
                        <div className="record-type">
                            Record
                        </div>
                        <div className="record-name">
                            {varName}
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
                <div className="record-separator" />
            </div>
        )
    } else {
        // ToDo : sort out how to display general typedefinitions
        component.push(
            <div className="record-comp">
                <div className="record-header" >
                    <div className="record-content">
                        <div className="record-icon">
                            <RecordIcon />
                        </div>
                        <div className="record-name">
                            {model.source.trim()}
                        </div>
                    </div>
                    <HeaderActions
                        model={model}
                        deleteText="Delete this Type Definition?"
                        isExpanded={isExpanded}
                        showOnRight={true}
                        onExpandClick={onExpandClick}
                        onConfirmDelete={handleDeleteConfirm}
                    />
                </div>
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
