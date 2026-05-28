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
// tslint:disable: no-unused-expression
import React, { useContext, useState } from "react"

import { EnumIcon } from "@wso2/ballerina-core";
import { EnumDeclaration, EnumMember, STKindChecker } from "@wso2/syntax-tree";

import { Context } from "../../../Context/diagram";
import { HeaderActions } from "../../../HeaderActions";

import "./style.scss";

export interface EnumDeclarationComponentProps {
    model: EnumDeclaration;
}

export function EnumDeclarationComponent(props: EnumDeclarationComponentProps) {
    const { model } = props;
    const diagramContext = useContext(Context);
    const deleteComponent = diagramContext?.api?.edit?.deleteComponent;
    const gotoSource = diagramContext?.api?.code?.gotoSource;
    const [isExpanded, setIsExpanded] = useState(false);
    // const [editingEnabled, setEditingEnabled] = useState(false);

    const onExpandClick = () => {
        setIsExpanded(!isExpanded);
    }

    const handleDeleteConfirm = () => {
        deleteComponent(model);
    }

    const handleEditBtnConfirm = () => {
        const targetposition = model.position;
        gotoSource({ startLine: targetposition.startLine, startColumn: targetposition.startColumn });
    }

    const members: JSX.Element[] = model.enumMemberList
        .filter(member => !STKindChecker.isCommaToken(member))
        .map((member: EnumMember, i: number) => {
            return (
                <div key={`${model.identifier.value}-member-${i}`} className="enum-field" >
                    <div className="enum-field-type">
                        {member.identifier.value}
                    </div>
                    {
                        member.constExprNode && (
                            <div className="enum-field-name">
                                = {member.constExprNode.source}
                            </div>
                        )
                    }
                </div>
            )
        })

    return (
        <div>
            <div className="enum-comp">
                <div className="enum-header" >
                    <div className="enum-content">
                        <div className="enum-icon">
                            <EnumIcon />
                        </div>
                        <div className="enum-type">
                            Enum
                        </div>
                        <div className="enum-name">
                            {model.identifier.value}
                        </div>
                    </div>
                    <HeaderActions
                        model={model}
                        deleteText="Delete this Enum?"
                        isExpanded={isExpanded}
                        onExpandClick={onExpandClick}
                        onConfirmDelete={handleDeleteConfirm}
                        onConfirmEdit={handleEditBtnConfirm}
                    />
                </div>
                <div className="enum-separator" />
                {isExpanded && (
                    <>
                        <div className="enum-fields" >
                            {members}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
