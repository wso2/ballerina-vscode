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
import React, { ReactElement } from "react";

import { NodePosition, STKindChecker, STNode } from "@wso2/syntax-tree";

import { ErrorSnippet } from "../../../Types/type";

import { ProcessRectSVG } from "./ProcessRectSVG";
import "./style.scss";

export const PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW = 62;
export const PROCESS_SVG_HEIGHT_WITH_HOVER_SHADOW = 62;
export const PROCESS_SVG_WIDTH_WITH_SHADOW = 62;
export const PROCESS_SVG_HEIGHT_WITH_SHADOW = 62;
export const PROCESS_SVG_WIDTH = 48;
export const PROCESS_STROKE_HEIGHT = 1;
export const PROCESS_SVG_HEIGHT = 48 + PROCESS_STROKE_HEIGHT;
export const PROCESS_SVG_SHADOW_OFFSET = PROCESS_SVG_HEIGHT_WITH_SHADOW - PROCESS_SVG_HEIGHT;


export function ProcessSVG(props: {
    x: number, y: number, varName: any,
    position: NodePosition,
    openInCodeView?: () => void,
    processType: string,
    diagnostics?: ErrorSnippet,
    componentSTNode: STNode,
    haveFunctionExpand?: boolean
}) {
    const { varName, processType, openInCodeView, diagnostics, componentSTNode, haveFunctionExpand, ...xyProps } = props;
    const processTypeIndicator: JSX.Element[] = [];
    const logIcon: ReactElement = (
        <g className="log-icon" transform="translate(242 522)">
            <path className="log-icon-dark-path" id="Path_23" d="M7.2,0a.8.8,0,0,1,.093,1.595L7.2,1.6H.8A.8.8,0,0,1,.707.005L.8,0Z" transform="translate(8 11.2)" fill="#5567d5" />
            <path className="log-icon-light-path" id="Combined_Shape" d="M0,6.4a6.4,6.4,0,0,1,12.8,0c0,.024,0,.047,0,.071l1.837-1.836a.8.8,0,0,1,1.2,1.056l-.066.076L12,9.531,8.235,5.772a.8.8,0,0,1,1.055-1.2l.076.067L11.2,6.476c0-.025,0-.05,0-.076a4.8,4.8,0,1,0-4.8,4.8.8.8,0,1,1,0,1.6A6.4,6.4,0,0,1,0,6.4Zm12,.869L12.07,7.2c-.023,0-.046,0-.07,0s-.05,0-.075,0Z" transform="translate(0 1.6)" fill="#ccd1f2" />
        </g>
    );
    const callIcon: ReactElement = (
        <g className="call-icon" transform="translate(242 522)">
            <path className="call-icon-dark-path" id="Combined-Shape" d="M17.189,1V5.094a.819.819,0,0,1-1.632.1l-.006-.1v-1.3L10.4,8.948A.819.819,0,0,1,9.172,7.867L9.24,7.79l5.151-5.152h-1.3a.818.818,0,0,1-.813-.723l-.006-.1A.818.818,0,0,1,13,1.006l.1-.006Z" transform="translate(-2.006 -0.181)" fill="#5567d5" />
            <path className="call-icon-light-path" id="Path" d="M8,0A.8.8,0,1,1,8,1.6,6.4,6.4,0,1,0,14.4,8,.8.8,0,1,1,16,8,8,8,0,1,1,8,0Z" fill="#ccd1f2" />
        </g>
    );

    const sendIcon: ReactElement = (
        <g id="send-copy" transform="translate(242 522)">
            <path d="M13.8787307,2.29053955 C14.2392146,1.93005559 14.8064457,1.90232605 15.1987369,2.20735094 L15.2929442,2.29053955 L20.0024047,7 L15.2929442,11.7094604 C14.9024199,12.0999847 14.269255,12.0999847 13.8787307,11.7094604 C13.5182467,11.3489765 13.4905172,10.7817454 13.7955421,10.3894542 L13.8787307,10.2952469 L17.1731911,6.999 L13.8787307,3.70475311 C13.5182467,3.34426915 13.4905172,2.7770381 13.7955421,2.38474689 L13.8787307,2.29053955 Z M5,5.99764633 L17.5858375,5.99764633 L17.5858375,5.99764633 L17.5858375,7.99764633 L5,7.99764633 C4.44771525,7.99764633 4,7.54993108 4,6.99764633 C4,6.44536158 4.44771525,5.99764633 5,5.99764633 Z" id="Combined-Shape" fill="#CCD1F2" fill-rule="nonzero" />
            <path d="M1,0 C1.55228475,-1.01453063e-16 2,0.44771525 2,1 L2,13 C2,13.5522847 1.55228475,14 1,14 C0.44771525,14 6.76353751e-17,13.5522847 0,13 L0,1 C-6.76353751e-17,0.44771525 0.44771525,1.01453063e-16 1,0 Z" id="Rectangle" fill="#5567D5" />
        </g>
    );

    switch (processType) {
        case 'Log':
        case 'Call':
            processTypeIndicator.push(
                <g>
                    {processType === 'Log' ? logIcon : (!haveFunctionExpand && callIcon)}
                    <text id="new" transform="translate(242 548)" className="process-icon-text">
                        <tspan x="1" y="1">{processType.toLowerCase()}</tspan>
                    </text>
                </g>
            );
            break;
        case 'AsyncSend':
            processTypeIndicator.push(
                <g>
                    {sendIcon}
                    <text id="new" transform="translate(242 548)" className="process-icon-text">
                        <tspan x="-2" y="1">send</tspan>
                    </text>
                </g>
            );
            break;
        default:
            processTypeIndicator.push(
                <path
                    id="Icon"
                    className="process-icon"
                    d="M136.331,276.637h7.655v1.529h-7.655Zm.017,3.454H144v1.529h-7.655Z"
                    transform="translate(112 258)"
                />
            );
    }

    return (
        <svg {...xyProps} width={haveFunctionExpand ? PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW * 2 : PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW} height={PROCESS_SVG_HEIGHT_WITH_HOVER_SHADOW} className="process-rect" >
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
                <ProcessRectSVG
                    onClick={openInCodeView}
                    model={componentSTNode}
                    diagnostic={diagnostics}
                    processTypeIndicator={processTypeIndicator}
                    haveFunctionExpand={haveFunctionExpand}
                />
                )
            </g>
        </svg>
    )
}
