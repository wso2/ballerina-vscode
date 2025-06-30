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
import React, { useContext } from "react";

import { Context } from "../../../../Context/diagram"
import "../style.scss";

import { ColapseButtonSVG, COLLAPSE_BUTTON_SHADOW_OFFSET, COLLAPSE_BUTTON_SVG_HEIGHT_WITH_SHADOW, COLLAPSE_BUTTON_SVG_WIDTH, COLLAPSE_BUTTON_SVG_WIDTH_WITH_SHADOW } from "./CollapseButtonSVG";
import { CollapseSVG, COLLAPSE_ICON_SVG_WIDTH_WITH_SHADOW } from "./CollapseIconSVG";
import { PlusSVG, PLUS_SVG_HEIGHT_WITH_SHADOW, PLUS_SVG_SHADOW_OFFSET, PLUS_SVG_WIDTH, PLUS_SVG_WIDTH_WITH_SHADOW } from "./PlusSVG";

export const PLUS_COLLAPSE_WIDTH = PLUS_SVG_WIDTH_WITH_SHADOW + COLLAPSE_ICON_SVG_WIDTH_WITH_SHADOW;
export const PLUS_COLLAPSE_HEIGHT = PLUS_SVG_HEIGHT_WITH_SHADOW;

export interface PlusCollapseProps {
    x: number;
    y: number;
    handlePlusClick: () => void;
    handleCollapseClick: () => void;
    collapseDisabled?: boolean;
}

export function PlusAndCollapseSVG(props: PlusCollapseProps) {
    const { props: { isReadOnly } } = useContext(Context);

    const { x, y, handlePlusClick, handleCollapseClick, collapseDisabled } = props;
    const collapseClassName: string = collapseDisabled ? "disabled" : "";
    const plusHolder = (
        <svg
            x={x - PLUS_SVG_WIDTH_WITH_SHADOW + (PLUS_SVG_SHADOW_OFFSET / 2)}
            y={y - (PLUS_SVG_SHADOW_OFFSET / 2)}
            height={PLUS_SVG_HEIGHT_WITH_SHADOW}
            width={PLUS_SVG_WIDTH_WITH_SHADOW + COLLAPSE_ICON_SVG_WIDTH_WITH_SHADOW}
        >
            <g className="holder-show">
                <g className="show-container">
                    <g onClick={handlePlusClick}>
                        <PlusSVG x={0} y={0} />
                    </g>
                    <g onClick={handleCollapseClick} className={collapseClassName}>
                        <CollapseSVG x={PLUS_SVG_WIDTH} y={0} />
                    </g>
                </g>
            </g>
        </svg>
    );

    const plusHolderReadOnly = (
        <svg
            x={x - COLLAPSE_BUTTON_SVG_WIDTH + (COLLAPSE_BUTTON_SHADOW_OFFSET / 2)}
            y={y}
            height={COLLAPSE_BUTTON_SVG_HEIGHT_WITH_SHADOW}
            width={COLLAPSE_BUTTON_SVG_WIDTH_WITH_SHADOW}
        >
            <g className="holder-show">
                <g className="show-container">
                    <g className="collaspe" onClick={handleCollapseClick}>
                        <ColapseButtonSVG x={0} y={0} />
                    </g>
                </g>
            </g>
        </svg>
    );

    return (
        <g>
            {isReadOnly ? plusHolderReadOnly : plusHolder}
        </g>
    );
}
