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
import React, { useContext } from "react";

import {
    FunctionBodyBlock,
    FunctionDefinition,
    ModulePart,
    ObjectMethodDefinition,
    ResourceAccessorDefinition,
    STKindChecker,
} from "@wso2/syntax-tree";

import { Context } from "../../../Context/diagram";
import { PlusButton } from "../../PlusButtons/Plus";

import {
    StartSVG,
    START_SVG_HEIGHT,
    START_SVG_WIDTH,
} from "./StartSVG";
import "./style.scss";

export interface StartButtonProps {
    model: FunctionDefinition | ModulePart | ObjectMethodDefinition | ResourceAccessorDefinition;
}

export function StartButton(props: StartButtonProps) {
    const diagramContext = useContext(Context);
    const { isReadOnly } = diagramContext.props;

    const { model } = props;

    const isFunctionKind = model && (STKindChecker.isResourceAccessorDefinition(model)
        || STKindChecker.isObjectMethodDefinition(model)
        || STKindChecker.isFunctionDefinition(model));

    const viewState = model.viewState;
    const cx = viewState.trigger.cx;
    const cy = viewState.trigger.cy;
    const plusView = viewState.initPlus;
    const initPlusAvailable = viewState.initPlus !== undefined;

    let block: FunctionBodyBlock;
    if (model && isFunctionKind) {
        block = model.functionBody as FunctionBodyBlock;
    }
    return (
        // hide edit button for triggers and expression bodied functions
        <g className="start-wrapper">
            <StartSVG
                x={cx - (START_SVG_WIDTH / 2)}
                y={cy - (START_SVG_HEIGHT / 2)}
                text="START"
            />
            {block && initPlusAvailable && !isReadOnly && <PlusButton viewState={plusView} model={block} initPlus={true} />}
        </g>
    );
}
