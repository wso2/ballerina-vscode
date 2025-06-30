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
import React, { useContext, useState } from "react";

import { DELETE_CONNECTOR, LowcodeEvent, STModification } from "@wso2/ballerina-core";
import { STNode } from "@wso2/syntax-tree";

import { Context } from "../../../Context/diagram";
import { useFunctionContext } from "../../../Context/Function";
import { DefaultConfig } from "../../../Visitors/default";

import { DeleteSVG } from "./DeleteSVG";
import "./style.scss";

export interface DeleteBtnProps {
    cx: number;
    cy: number;
    model: STNode;
    toolTipTitle?: string;
    isReferencedInCode?: boolean;
    isButtonDisabled?: boolean;
    showOnRight?: boolean;
    isConnector?: boolean;
    onDraftDelete?: () => void;
    createModifications?: (model: STNode) => STModification[];
}

export function DeleteBtn(props: DeleteBtnProps) {
    const diagramContext = useContext(Context);

    const { isReadOnly } = diagramContext.props;
    const onEvent = diagramContext?.api?.insights?.onEvent;
    const deleteComponent = diagramContext?.api?.edit?.deleteComponent;
    const renderDialogBox = diagramContext?.api?.edit?.renderDialogBox;
    const { overlayId } = useFunctionContext();

    const { cx, cy, model, onDraftDelete, toolTipTitle, isButtonDisabled, isReferencedInCode, showOnRight, isConnector } = props;

    const [isConfirmDialogActive, setConfirmDialogActive] = useState(false);
    const [, setBtnActive] = useState(false);

    const onMouseEnter = () => {
        setBtnActive(true);
    };

    const onMouseLeave = () => {
        // if confirm dialog is active keep btn active,
        // else hide on mouse leave
        setBtnActive(isConfirmDialogActive);
    };

    const onBtnClick = () => {
        if (!isButtonDisabled) {
            if (isReferencedInCode && renderDialogBox) { // TODO: fix the renderDialogBox
                renderDialogBox("Delete", onDeleteConfirm, closeConfirmDialog, {
                    x: cx + (showOnRight ? (-(DefaultConfig.deleteConfirmOffset.x)) / 2 : DefaultConfig.deleteConfirmOffset.x),
                    y: cy + (showOnRight ? 0 : DefaultConfig.deleteConfirmOffset.y),
                }, overlayId);
                setConfirmDialogActive(true);
            } else {
                onDeleteConfirm();
            }
        }
    };

    const onConnectorDeleteEvent = () => {
        const event: LowcodeEvent = {
            type: DELETE_CONNECTOR,
            property: {
                connectorName: model?.typeData?.typeSymbol?.moduleID?.packageName
            }
        };
        onEvent(event);
    };

    const closeConfirmDialog = () => {
        setConfirmDialogActive(false);
        setBtnActive(false);
    };

    const onDeleteConfirm = () => {
        // if (isConnector) {
        //     onConnectorDeleteEvent();
        // }
        // delete logic
        if (model) {
            diagramContext.props.onDeleteComponent(model);
            // deleteComponent(model, closeConfirmDialog)
        } else if (onDraftDelete) {
            onDraftDelete();
        }
    };

    return (
        <g>
            {!isReadOnly &&
                <g>
                    <g
                        className="delete-icon-show"
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        data-testid="deleteBtn"
                        onClick={onBtnClick}
                    >
                        <DeleteSVG x={cx} y={cy} toolTipTitle={toolTipTitle} />
                    </g>
                </g>
            }
        </g>
    );
}
