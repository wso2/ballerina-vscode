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
import React from "react";

import { BlockViewState, CollapseViewState } from "../../../ViewState";
import { DefaultConfig } from "../../../Visitors";
import { COLLAPSE_SVG_HEIGHT, COLLAPSE_SVG_WIDTH } from "../ForEach/ColapseButtonSVG";

import { CollapseButtonSVG } from "./CollapseButtonSVG";
import { CollapsedComponentSVG } from "./CollapsedComponentSVG";
import { ExpandedContainer } from "./ExpandedContainer";

interface CollapseProps {
    collapseVS: CollapseViewState;
    onExpandClick?: () => void;
    onCollapseClick?: () => void;
}


export default function CollapseComponent(props: CollapseProps) {
    const { collapseVS, onExpandClick, onCollapseClick } = props;
    const x = collapseVS.bBox.cx;
    const y = collapseVS.bBox.cy;
    return (
        <g >
            {collapseVS.collapsed && <CollapsedComponentSVG x={x} y={y} onExpandClick={onExpandClick} />}
            {!collapseVS.collapsed && <ExpandedContainer collapseVS={collapseVS} onCollapseClick={onCollapseClick} />}
        </g>
    )
}
