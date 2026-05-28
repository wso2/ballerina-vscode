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
import * as React from "react";

import { NodePosition, STNode } from "@wso2/syntax-tree";

import { ErrorSnippet } from "../../../../Types/type";

import { ActionProcessRectSVG } from "./ActionProcessRectSVG";
import "./style.scss";

export const PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW = 62;
export const PROCESS_SVG_HEIGHT_WITH_HOVER_SHADOW = 62;
export const PROCESS_SVG_WIDTH_WITH_SHADOW = 62;
export const PROCESS_SVG_HEIGHT_WITH_SHADOW = 62;
export const PROCESS_SVG_WIDTH = 48;
export const PROCESS_STROKE_HEIGHT = 1;
export const PROCESS_SVG_HEIGHT = 48 + PROCESS_STROKE_HEIGHT;
export const PROCESS_SVG_SHADOW_OFFSET = PROCESS_SVG_HEIGHT_WITH_SHADOW - PROCESS_SVG_HEIGHT;

interface ProcessSVGProps {
    x: number, y: number, varName: any,
    position: NodePosition,
    openInCodeView?: () => void,
    processType: string,
    diagnostics?: ErrorSnippet,
    componentSTNode: STNode
}

export function ProcessSVG(props: ProcessSVGProps) {
    const { varName, processType, openInCodeView, diagnostics, componentSTNode, ...xyProps } = props;
    return (
        <svg {...xyProps} width={PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW} height={PROCESS_SVG_HEIGHT_WITH_HOVER_SHADOW} className="process" >
            <defs>
                <linearGradient id="ProcessLinearGradient" x1=" " x2="0" y2="1" gradientUnits="objectBoundingBox">
                    <stop offset="0" stopColor="#fcfcfd" />
                    <stop offset="1" stopColor="#f7f8fb" />
                </linearGradient>
                <filter id="ProcessFilterDefault" x="0" y="0" width="142" height="94" filterUnits="userSpaceOnUse">
                    <feOffset dy="1" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feFlood floodColor="#a9acb6" floodOpacity="0.388" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
                <filter id="ProcessFilterHover" x="0" y="0" width="142" height="94" filterUnits="userSpaceOnUse">
                    <feOffset dy="3" dx="1" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feFlood floodColor="#a9acb6" floodOpacity="0.388" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
            </defs>
            <g>
                (
                <ActionProcessRectSVG
                    onClick={openInCodeView}
                    model={componentSTNode}
                    diagnostic={diagnostics}
                />
                )
            </g>
        </svg>
    )
}
