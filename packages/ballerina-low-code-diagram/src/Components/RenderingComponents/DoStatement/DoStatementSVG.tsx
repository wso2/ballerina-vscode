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
import * as React from "react";

import { STNode } from "@wso2/syntax-tree";

import { ErrorSnippet } from "../../../Types/type";

import { DoStatementRectSVG } from "./DoStatementRectSVG";

export const DO_STATEMENT_SVG_WIDTH_WITH_SHADOW = 66.686;
export const DO_STATEMENT_SVG_HEIGHT_WITH_SHADOW = 62.686;
export const DO_STATEMENT_SVG_WIDTH = 54.845;
export const DO_STATEMENT_SVG_HEIGHT = 52.845;
export const DO_STATEMENT_SHADOW_OFFSET = DO_STATEMENT_SVG_HEIGHT_WITH_SHADOW - DO_STATEMENT_SVG_HEIGHT;

export function DoStatementSVG(props: { x: number, y: number, text: string, openInCodeView?: () => void, codeSnippet?: string, diagnostics?: ErrorSnippet, componentSTNode?: STNode }) {
    const { text, openInCodeView, diagnostics, componentSTNode, codeSnippet, ...xyProps } = props;

    return (
        <svg {...xyProps} width={DO_STATEMENT_SVG_WIDTH_WITH_SHADOW} height={DO_STATEMENT_SVG_HEIGHT_WITH_SHADOW}>
            <defs>
                <linearGradient id="DoStatementLinearGradient" x1="0.5" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
                    <stop offset="0" stopColor="#fcfcfd" />
                    <stop offset="1" stopColor="#f7f8fb" />
                </linearGradient>
                <filter id="DoStatementFilterDefault" x="-20" y="-20" width="113.824" height="113.822" filterUnits="userSpaceOnUse">
                    <feOffset dy="1" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feFlood floodColor="#a9acb6" floodOpacity="0.388" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
                <filter id="DoStatementFilterHover" x="-20" y="-20" width="146.824" height="146.822" filterUnits="userSpaceOnUse">
                    <feOffset dy="1" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="7.5" result="blur" />
                    <feFlood floodColor="#a9acb6" floodOpacity="0.388" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
            </defs>
            <g>
                <DoStatementRectSVG
                    onClick={openInCodeView}
                    model={componentSTNode}
                    diagnostic={diagnostics}
                    type={text}
                    text={{ code: codeSnippet }}
                />
            </g>
        </svg>
    )
}
