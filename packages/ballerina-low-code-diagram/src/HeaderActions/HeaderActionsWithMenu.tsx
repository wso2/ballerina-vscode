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
import React, { useContext, useRef, useState } from "react";

import {
    DeleteButton,
    EditButton,
    LabelDeleteIcon,
    LabelEditIcon,
    LabelRunIcon,
    LabelTryIcon,
    ShowMenuIcon,
} from "@wso2/ballerina-core";
import { STNode } from "@wso2/syntax-tree";
import classNames from "classnames";

import { ComponentExpandButton } from "../Components/ComponentExpandButton";
import { Context } from "../Context/diagram";

import "./style.scss";

export interface HeaderActionsProps {
    model: STNode;
    isExpanded: boolean;
    formType?: string;
    onExpandClick: () => void;
    onConfirmDelete: () => void;
    onClickTryIt?: () => void;
    onClickRun?: () => void;
    unsupportedType?: boolean;
    isResource?: boolean;
    isFunction?: boolean;
}

export function HeaderActionsWithMenu(props: HeaderActionsProps) {
    const {
        model,
        isExpanded,
        onExpandClick,
        formType,
        onConfirmDelete,
        onClickTryIt,
        onClickRun,
        unsupportedType,
        isResource,
        isFunction
    } = props;

    const diagramContext = useContext(Context);
    const { isReadOnly, syntaxTree } = diagramContext.props;
    const gotoSource = diagramContext?.api?.code?.gotoSource;
    const renderEditForm = diagramContext?.api?.edit?.renderEditForm;
    const renderDialogBox = diagramContext?.api?.edit?.renderDialogBox;

    const [isDeleteViewVisible, setIsDeleteViewVisible] = useState(false);
    const handleDeleteBtnClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onConfirmDelete();
    };

    const [isEditViewVisible, setIsEditViewVisible] = useState(false);
    const [isUnSupported, setIsUnSupported] = useState(false);

    const [isMenuVisible, setIsMenuVisible] = useState(false);

    const catMenu = useRef(null);

    const closeOpenMenus = (e: MouseEvent) => {
        if (
            catMenu.current &&
            isMenuVisible &&
            !catMenu.current.contains(e.target)
        ) {
            setIsMenuVisible(false);
        }
    };

    React.useEffect(() => {
        document.addEventListener("mousedown", closeOpenMenus);
        return function cleanup() {
            document.removeEventListener("mousedown", closeOpenMenus);
        };
    }, [isMenuVisible]);

    const handleEditBtnClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (unsupportedType) {
            if (renderDialogBox) {
                renderDialogBox(
                    "Unsupported",
                    unsupportedEditConfirm,
                    unSupportedEditCancel
                );
            }
        } else {
            if (renderEditForm) {
                renderEditForm(
                    model,
                    model?.position,
                    { formType: formType ? formType : model.kind, isLoading: false },
                    handleEditBtnCancel,
                    handleEditBtnCancel
                );
            }
        }
    };

    const handleEditBtnCancel = () => setIsEditViewVisible(false);

    const unsupportedEditConfirm = () => {
        if (model && gotoSource) {
            const targetposition = model.position;
            setIsUnSupported(false);
            gotoSource({
                startLine: targetposition.startLine,
                startColumn: targetposition.startColumn,
            });
        }
    };

    const unSupportedEditCancel = () => setIsUnSupported(false);

    React.useEffect(() => {
        setIsDeleteViewVisible(false);
    }, [model]);

    React.useEffect(() => {
        if (isEditViewVisible && renderEditForm) {
            renderEditForm(
                model,
                model?.position,
                { formType: "ServiceDesign", isLoading: false },
                handleEditBtnCancel,
                handleEditBtnCancel
            );
        }
    }, [syntaxTree]);

    const showMenuClick = (e: React.MouseEvent) => {
        setIsMenuVisible(!isMenuVisible);
    };

    const handleOnClickRun = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClickRun();
    };

    const handleOnClickTryIt = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClickTryIt();
    };

    const handleOnClickDesign = (e: React.MouseEvent) => {
        setIsEditViewVisible(true);
        e.stopPropagation();
        if (renderEditForm) {
            renderEditForm(
                model,
                model?.position,
                { formType: "ServiceDesign", isLoading: false },
                handleEditBtnCancel,
                handleEditBtnCancel
            );
        }
    };

    const optionMenu = (
        <div ref={catMenu} className={"rectangle-menu"}>
            <>
                {!isFunction &&
                    (
                        <div
                            onClick={handleOnClickDesign}
                            className={classNames("menu-option", "line-vertical", "middle")}
                            id="design-button"
                        >
                            <div className="icon">
                                <LabelTryIcon />
                            </div>
                            <div className="other">Design</div>
                        </div>
                    )
                }
                {onClickRun &&
                    (
                        <div
                            onClick={handleOnClickRun}
                            className={classNames("menu-option", "line-vertical", "left")}
                            id="run-button"
                        >
                            <div className="icon">
                                <LabelRunIcon />
                            </div>
                            <div className="other">Run</div>
                        </div>
                    )
                }
                {!isFunction &&
                    (
                        <div
                            onClick={handleOnClickTryIt}
                            className={classNames("menu-option", "line-vertical", "middle")}
                            id="try-button"
                        >
                            <div className="icon">
                                <LabelTryIcon />
                            </div>
                            <div className="other">Try It</div>
                        </div>
                    )
                }
                <div
                    onClick={handleEditBtnClick}
                    className={classNames("menu-option", "line-vertical", "middle")}
                    id="edit-button"
                >
                    <div className={classNames("icon", "icon-adjust")}>
                        <LabelEditIcon />
                    </div>
                    <div className="other">Edit</div>
                </div>
                <div
                    onClick={handleDeleteBtnClick}
                    className={classNames("menu-option", "right")}
                    id="delete-button"
                >
                    <div className={classNames("icon", "icon-adjust")}>
                        <LabelDeleteIcon />
                    </div>
                    <div className="delete">Delete</div>
                </div>
            </>
        </div>
    );

    const resourceOptionMenu = (
        <div ref={catMenu} className={"rectangle-menu-resource"}>
            <>
                <div
                    onClick={handleEditBtnClick}
                    className={classNames("menu-option", "line-vertical", "left")}
                    id="edit-button"
                >
                    <div className={classNames("icon", "icon-adjust")}>
                        <LabelEditIcon />
                    </div>
                    <div className="other">Edit</div>
                </div>
                <div
                    onClick={handleDeleteBtnClick}
                    className={classNames("menu-option", "right")}
                    id="delete-button"
                >
                    <div className={classNames("icon", "icon-adjust")}>
                        <LabelDeleteIcon />
                    </div>
                    <div className="delete">Delete</div>
                </div>
            </>
        </div>
    );

    return (
        <>
            {isMenuVisible && (!isResource ? optionMenu : resourceOptionMenu)}
            <div ref={catMenu} className={"header-amendment-options"}>
                {!isReadOnly && (
                    <>
                        <div className={classNames("amendment-option", "margin-top-5")}>
                            <ShowMenuIcon onClick={showMenuClick} />
                        </div>
                    </>
                )}
                <div className={classNames("amendment-option")}>
                    <ComponentExpandButton
                        isExpanded={isExpanded}
                        onClick={onExpandClick}
                    />
                </div>
            </div>
        </>
    );
}
