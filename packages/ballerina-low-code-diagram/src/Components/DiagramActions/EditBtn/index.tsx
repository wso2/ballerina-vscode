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
// tslint:disable: jsx-no-multiline-js jsx-wrap-multiline
import React, { useContext } from "react";

import { NodePosition, STNode } from "@wso2/syntax-tree";

import { Context } from "../../../Context/diagram";

import { EditSVG } from "./EditSVG";
import "./style.scss";

export interface EditBtnProps {
    cx: number;
    cy: number;
    model: STNode;
    onHandleEdit?: () => void;
    className?: string;
    height?: number;
    width?: number;
    // dispatchEditComponentStart: (targetPosition: any) => void;
    isButtonDisabled?: boolean;
}

export function EditBtn(props: EditBtnProps) {
    const {
        props: { isReadOnly },
        actions: { editorComponentStart: dispatchEditComponentStart },
        state: { targetPosition }
    } = useContext(Context);
    const { cx, cy, onHandleEdit, model, isButtonDisabled } = props;
    const onEditClick = () => {
        if (!isButtonDisabled) {
            const targetPos = targetPosition as NodePosition;
            if (model &&
                (targetPos?.startLine !== model.position.startLine
                    || targetPos?.startColumn !== model.position.startColumn)) {
                dispatchEditComponentStart({
                    ...model.position,
                    endLine: 0,
                    endColumn: 0,
                })
            }
            onHandleEdit();
        }
    };

    if (isReadOnly) return null;

    return (
        <g onClick={onEditClick} className="edit-icon-wrapper" data-testid="editBtn">
            <g>
                <EditSVG x={cx} y={cy} />
            </g>
        </g>
    )

}
