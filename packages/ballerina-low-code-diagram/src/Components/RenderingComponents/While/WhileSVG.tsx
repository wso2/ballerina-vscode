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

import { STNode } from "@wso2/syntax-tree";

import { ErrorSnippet } from "../../../Types/type";

import { WhileRectSVG } from "./WhileRectSVG";

export const WHILE_SVG_WIDTH_WITH_SHADOW = 66.686;
export const WHILE_SVG_HEIGHT_WITH_SHADOW = 66.686;
export const WHILE_SVG_WIDTH = 54.845;
export const WHILE_SVG_HEIGHT = 54.845;
export const WHILE_SHADOW_OFFSET = WHILE_SVG_HEIGHT_WITH_SHADOW - WHILE_SVG_HEIGHT;

export function WhileSVG(props: {
    x: number, y: number,
    openInCodeView?: () => void,
    codeSnippetOnSvg?: string,
    codeSnippet?: string,
    diagnostics?: ErrorSnippet,
    componentSTNode: STNode
}) {
    const { codeSnippet, openInCodeView, codeSnippetOnSvg, diagnostics, componentSTNode, ...xyProps } = props;
    return (
        <svg {...xyProps} width={WHILE_SVG_WIDTH_WITH_SHADOW} height={WHILE_SVG_HEIGHT_WITH_SHADOW}>
            <defs>
                <linearGradient id="WhileLinearGradient" x1="0.5" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
                    <stop offset="0" stopColor="#fcfcfd" />
                    <stop offset="1" stopColor="#f7f8fb" />
                </linearGradient>
                <filter id="WhileFilterDefault" x="-20" y="-20" width="113.824" height="113.822" filterUnits="userSpaceOnUse">
                    <feOffset dy="1" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feFlood floodColor="#a9acb6" floodOpacity="0.388" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
                <filter id="WhileFilterHover" x="-20" y="-20" width="146.824" height="146.822" filterUnits="userSpaceOnUse">
                    <feOffset dy="1" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="7.5" result="blur" />
                    <feFlood floodColor="#a9acb6" floodOpacity="0.388" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
            </defs>
            (
            <WhileRectSVG
                onClick={openInCodeView}
                model={componentSTNode}
                diagnostic={diagnostics}
            />
            )
        </svg>
    )
}
