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

import React, { ReactElement, ReactNode, useContext, useEffect, useState } from "react";

import { STNode } from "@wso2/syntax-tree";

import { Context } from "../../../Context/diagram";
import { DefaultTooltip } from "../DefaultTooltip";
interface IfElseRectSVGProps {
    type?: string,
    className?: string,
    onClick?: () => void,
    text?: { heading?: string, content?: string, example?: string, code?: string },
    icon?: ReactNode;
    model: STNode
}

export function IfElseRectSVG(props: IfElseRectSVGProps) {
    const { onClick, icon, className, model } = props;
    const diagramContext = useContext(Context);
    const showTooltip = diagramContext?.api?.edit?.showTooltip;
    const [tooltipComp, setTooltipComp] = useState(undefined);
    let sourceSnippet;
    if (model) {
        sourceSnippet = model?.source?.trim().split(')')[0];
    }

    const component = (
        <g id="IfElse" className={className} transform="translate(7 6)">
            <g transform="matrix(1, 0, 0, 1, -7, -6)" >
                <g id="IfElsePolygon" transform="translate(33.5, 3) rotate(45)">
                    <rect width="40.903" height="40.903" className="if-else-rect" rx="6" stroke="none" />
                    <rect x="0.5" y="0.5" width="39.903" className="if-else-rect click-effect" height="39.903" rx="5.5" fill="none" />
                </g>
            </g>
            {icon}
        </g>
    );

    const defaultTooltip = (
        <DefaultTooltip text={sourceSnippet}>{component}</DefaultTooltip>
    );

    useEffect(() => {
        if (model && showTooltip) {
            setTooltipComp(showTooltip(component, undefined, onClick, model));
        }
    }, [model]);

    return (
        <>
            {tooltipComp ? tooltipComp : defaultTooltip}
        </>
    );
}
