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
import React, { useContext, useEffect, useRef, useState } from "react";

import { BallerinaConnectorInfo } from "@wso2/ballerina-core";
import { BlockStatement, FunctionBodyBlock, LocalVarDecl, NodePosition } from "@wso2/syntax-tree";
import cn from "classnames";

import { Context } from "../../../Context/diagram";
import { useFunctionContext } from "../../../Context/Function";
import { BlockViewState } from "../../../ViewState";
import { PlusViewState } from "../../../ViewState/plus";
import { DefaultConfig } from "../../../Visitors/default";

import { PlusCircleSVG, PLUSCIRCLE_SVG_HEIGHT_WITH_SHADOW, PLUSCIRCLE_SVG_WIDTH_WITH_SHADOW } from "./Circle";
import { SmallPlusSVG, SMALLPLUS_SVG_HEIGHT_WITH_SHADOW, SMALLPLUS_SVG_WIDTH_WITH_SHADOW } from "./Default";
import "./style.scss";

export interface PlusProps {
    viewState: PlusViewState,
    model: BlockStatement | FunctionBodyBlock,
    initPlus: boolean
}

export interface PlusStates {
    isSmallPlusShown?: boolean,
    isCollapsePlusDuoShown?: boolean,
    isPlusHolderShown?: boolean
}

export const PlusButton = (props: PlusProps) => {
    const diagramContext = useContext(Context);
    const functionContext = useFunctionContext();
    const { syntaxTree, isReadOnly } = diagramContext.props;
    const renderPlusWidget = diagramContext?.api?.edit?.renderPlusWidget;
    const { diagramCleanDraw, diagramRedraw } = diagramContext.actions;
    const hasWorkerDecl: boolean = functionContext?.hasWorker;

    const { overlayId, overlayNode } = useFunctionContext();

    const { viewState, model, initPlus } = props;
    const plusRef = useRef(null);

    const [states, setStates] = useState<PlusStates>({
        isCollapsePlusDuoShown: false,
        isSmallPlusShown: false,
        // check if the app is in initial state and has no statements, and has no drafted component in the diagram
        isPlusHolderShown: initPlus && !(model?.statements.length > 0) && !viewState.draftSubType,
    });

    const [plusHolder, setPlusHolder] = useState(undefined);

    const classes = states.isSmallPlusShown ? cn("holder-show") : cn("holder-hide");
    const x = viewState.bBox.cx;
    const y = viewState.bBox.cy;

    // On mouse enter the small plus button.
    const onMouseEnter = () => {
        if (!states.isCollapsePlusDuoShown && !states.isPlusHolderShown) {
            setStates({
                isSmallPlusShown: true,
                isCollapsePlusDuoShown: states.isCollapsePlusDuoShown,
                isPlusHolderShown: states.isPlusHolderShown
            });
        }
    };

    // On mouse leave the small plus button.
    const onMouseLeave = () => {
        setStates({
            isSmallPlusShown: false,
            isCollapsePlusDuoShown: states.isCollapsePlusDuoShown,
            isPlusHolderShown: states.isPlusHolderShown
        });
    };

    // On click for the plus button in plus collapse button.
    const handlePlusClick = () => {
        // TODO: need to wire this with diagram
        diagramContext.props.onAddComponent(viewState.targetPosition);
        return;
        // setStates({
        //     isPlusHolderShown: true
        // });
        // viewState.expanded = true;
        // viewState.selectedComponent = "STATEMENT";
        // viewState.collapsedClicked = false;
        // viewState.collapsedPlusDuoExpanded = false;
        // viewState.selected = true;
        // diagramRedraw(syntaxTree);
        // setPlusHolder(renderPlusWidget("PlusElements", {
        //     position: { x: (x - (DefaultConfig.plusHolder.width / 2)), y: (y) },
        //     onClose: handleOnClose,
        //     onChange: handlePlusHolderItemClick,
        //     initPlus: initPlus,
        //     isCallerAvailable: (model.viewState as BlockViewState)?.isCallerAvailable,
        //     isResource: (model.viewState as BlockViewState)?.isResource,
        //     overlayId: overlayId,
        //     overlayNode: overlayNode,
        //     hasWorkerDecl: hasWorkerDecl
        // }, viewState as PlusViewState));
    };

    const handleOnClose = () => {
        setStates({
            ...states,
            isPlusHolderShown: false
        });
        viewState.selectedComponent = undefined;
        viewState.expanded = false;
        viewState.collapsedClicked = false;
        viewState.collapsedPlusDuoExpanded = false;
        viewState.selected = false;
        diagramCleanDraw(syntaxTree);
        setPlusHolder(undefined);
    }

    const handlePlusHolderItemClick = (type: string, subType: string,
        connectorType: BallerinaConnectorInfo = undefined, isExisting?: boolean, selectedConnector?: LocalVarDecl) => {
        setStates({
            isPlusHolderShown: false,
            isSmallPlusShown: false,
            isCollapsePlusDuoShown: false
        });
        viewState.expanded = false;
        viewState.collapsedClicked = false;
        viewState.collapsedPlusDuoExpanded = false;
        viewState.draftAdded = type;
        viewState.draftSubType = subType;
        viewState.draftSelectedConnector = selectedConnector;
        viewState.draftConnector = connectorType;
        viewState.draftForExistingConnector = isExisting;
        viewState.selected = false;
        diagramRedraw(syntaxTree);
        setPlusHolder(undefined);
    };

    // !initPlus && !states.isPlusHolderShown &&
    const plusCircle = !states.isCollapsePlusDuoShown && viewState.visible ?
        (
            <PlusCircleSVG
                x={x - (PLUSCIRCLE_SVG_WIDTH_WITH_SHADOW / 2)}
                y={y - (PLUSCIRCLE_SVG_HEIGHT_WITH_SHADOW / 2)}
                selected={viewState.selected}
            />
        ) : null;
    // && !initPlus !states.isPlusHolderShown &&
    const smallPlus = viewState.visible ?
        (
            <g
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                data-testid="plus-button"
                className={classes}
                x={x}
            >
                <g>
                    <SmallPlusSVG
                        x={x - (SMALLPLUS_SVG_WIDTH_WITH_SHADOW / 2)}
                        y={y - (SMALLPLUS_SVG_HEIGHT_WITH_SHADOW / 2)}
                        handlePlusClick={handlePlusClick}
                    />
                </g>
            </g>
        ) : null;

    return (
        <g ref={plusRef}>
            {
                (!isReadOnly) && (<g className="main-plus-wrapper" data-plus-index={viewState.index}>
                    {plusCircle}
                    <g>
                        {smallPlus}
                    </g>
                </g>)
            }
        </g>
    );
};
