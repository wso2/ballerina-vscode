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

import React, { ReactNode, useContext, useEffect, useState } from "react";

import { STNode } from "@wso2/syntax-tree";

import { Context } from "../../../../Context/diagram";
import { ErrorSnippet } from "../../../../Types/type";
import { DefaultTooltip } from "../../DefaultTooltip";

interface ConnectorRectSVGProps {
    type?: string,
    className?: string,
    onClick?: () => void,
    text?: { heading?: string, content?: string, example?: string, code?: string },
    diagnostic?: ErrorSnippet,
    icon?: ReactNode;
    model: STNode
}

export function ConnectorRectSVG(props: ConnectorRectSVGProps) {
    const { onClick, diagnostic, model } = props;
    const diagnosticStyles = diagnostic?.severity === "ERROR" ? "connector-process-error " : "connector-process-warning";
    const connectorRectStyles = diagnostic?.diagnosticMsgs ? diagnosticStyles : "connector-process-default";
    const diagramContext = useContext(Context);
    const showTooltip = diagramContext?.api?.edit?.showTooltip;
    const [tooltipComp, setTooltipComp] = useState(undefined);
    let sourceSnippet;
    if (model) {
        sourceSnippet = model?.source?.trim();
    }

    const rectSVG = (
        <g id="Group_2_Copy_2" className={connectorRectStyles} transform="translate(5 1)" >
            <g transform="matrix(1, 0, 0, 1, -3, -5.5)">
                <g id="Rectangle_Copy_17-2" transform="translate(1 5.5)" className="connector-process">
                    <rect width="48" height="48" rx="4" />
                    <rect x="-0.5" y="-0.5" width="49" height="49" rx="4.5" />
                </g>
            </g>
            <text id="new" transform="translate(10.25 27.5)" className="connector-text">
                <tspan x="0" y="0">new</tspan>
            </text>
        </g>
    );

    const defaultTooltip = (
        <DefaultTooltip text={sourceSnippet}>{rectSVG}</DefaultTooltip>
    );

    useEffect(() => {
        if (model && showTooltip) {
            setTooltipComp(showTooltip(rectSVG, undefined, onClick, model));
        }
    }, [model]);

    return (
        <>
            {tooltipComp ? tooltipComp : defaultTooltip}
        </>
    );

}
