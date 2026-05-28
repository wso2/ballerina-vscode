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
// tslint:disable: jsx-no-multiline-js jsx-wrap-multiline object-literal-shorthand align
import React, { ReactElement, useContext, useEffect, useRef, useState } from "react";

import { Margin, TopLevelPlusIcon } from "@wso2/ballerina-core";
import { NodePosition } from "@wso2/syntax-tree";

import { Context } from "../../../Context/diagram";

import { InitialPlusTooltipBubble } from "./InitialPlusTooltipBubble";
import "./style.scss";

export const PLUS_WIDTH = 16;
export const PLUS_AND_OPTIONS_GAP = 6;

export interface PlusProps {
    kind: string,
    initPlus?: boolean;
    margin?: Margin;
    targetPosition?: NodePosition;
    isTriggerType?: boolean;
    isDocumentEmpty?: boolean;
    isModuleLevel?: boolean;
    isLastMember?: boolean;
    showCategorized?: boolean;
}

export const TopLevelPlus = (props: PlusProps) => {
    const { targetPosition, kind, isTriggerType, isDocumentEmpty, isModuleLevel, isLastMember, showCategorized } = props;
    const containerElement = useRef(null);
    const diagramContext = useContext(Context);
    const renderPlusWidget = diagramContext?.api?.edit?.renderPlusWidget;
    const showTooltip = diagramContext?.api?.edit?.showTooltip;
    const [tooltip, setTooltip] = useState(undefined);

    const [plusOptions, setPlusOptions] = useState(undefined);
    const [isPlusClicked, setPlusClicked] = useState(false);

    const handlePlusClick = () => {
        setPlusClicked(true);
        // setIsPlusOptionsVisible(true);
        setPlusOptions(renderPlusWidget("TopLevelOptionRenderer", {
            position: (containerElement.current ?
                {
                    x: containerElement.current.offsetLeft,
                    y: 0
                } : {
                    x: 0,
                    y: 0
                }),
            onClose: handlePlusOptionsClose,
            offset: containerElement?.current?.offsetTop,
            kind,
            targetPosition,
            isTriggerType,
            isLastMember,
            showCategorized
        }));
    };

    const handlePlusOptionsClose = () => {
        setPlusClicked(false);
        setPlusOptions(undefined);
    };

    // TODO:Check the rendering issue in this tooltip
    useEffect(() => {
        if (!isDocumentEmpty && showTooltip) {
            setTooltip(showTooltip(<TopLevelPlusIcon selected={isPlusClicked}/>, "Add Construct"));
        }
        return () => {
            setTooltip(undefined);
        };
    }, [isDocumentEmpty, isPlusClicked]);

    return (
        <div className="plus-container" ref={containerElement} target-line={targetPosition.startLine}>
            <div className={'plus-btn-wrapper'} onClick={handlePlusClick}>
                {
                    !isDocumentEmpty && tooltip ?
                        tooltip
                        :
                            <TopLevelPlusIcon selected={isPlusClicked}/>
                }
            </div>
            {
                isModuleLevel && isDocumentEmpty && !isPlusClicked && (
                    <InitialPlusTooltipBubble />
                )
            }
            {isPlusClicked && plusOptions}
        </div>
    );
};
