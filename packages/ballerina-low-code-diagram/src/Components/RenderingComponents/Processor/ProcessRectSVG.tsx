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

import React, { useContext, useEffect, useState } from "react";

import { STNode } from "@wso2/syntax-tree";

import { Context } from "../../../Context/diagram";
import { ErrorSnippet } from "../../../Types/type";
import { DefaultTooltip } from "../DefaultTooltip";

import "./style.scss"

interface ProcessRectSVGProps {
    type?: string,
    className?: string,
    onClick?: () => void,
    text?: { heading?: string, content?: string, example?: string, code?: string },
    diagnostic?: ErrorSnippet,
    processTypeIndicator?: JSX.Element[];
    model: STNode,
    haveFunctionExpand?: boolean
}

export function ProcessRectSVG(props: ProcessRectSVGProps) {
    const { type, onClick, diagnostic, processTypeIndicator, text, className, model, haveFunctionExpand } = props;
    const diagramContext = useContext(Context);
    const showTooltip = diagramContext?.api?.edit?.showTooltip;
    const diagnosticStyles = diagnostic?.severity === "ERROR" ? "data-processor-error" : "data-processor-warning";
    const processRectStyles = diagnostic.diagnosticMsgs ? diagnosticStyles : "data-processor process-active"
    const [tooltipComp, setTooltipComp] = useState(undefined);
    let sourceSnippet;
    if (model) {
        sourceSnippet = model?.source?.trim();
    }

    const expandTranslateX = haveFunctionExpand ? -245.5 : -221.5;
    const expandWidth = haveFunctionExpand ? 96 : 48;

    const rectSVG = (
        <g id="Process" className={processRectStyles} transform={`translate(${expandTranslateX} -506)`}>
            <g transform="matrix(1, 0, 0, 1, 222, 509)">
                <g id="ProcessRect-2" transform="translate(5.5 4)">
                    <rect width={expandWidth} height="48" rx="4" />
                    <rect x="-0.5" y="-0.5" width={expandWidth + 1} height="49" rx="4.5" className="click-effect" />
                </g>
            </g>
            {processTypeIndicator}
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
