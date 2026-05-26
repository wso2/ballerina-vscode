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
import React, { ReactNode } from "react";

import { STNode } from "@wso2/syntax-tree";

import { ErrorSnippet } from "../../../Types/type";

import { IfElseRectSVG } from "./IfElseRectSVG";

export const IFELSE_SVG_WIDTH_WITH_SHADOW = 66.686;
export const IFELSE_SVG_HEIGHT_WITH_SHADOW = 66.686;
export const IFELSE_SVG_WIDTH = 54.845;
export const IFELSE_SVG_HEIGHT = 54.845;
export const IFELSE_SHADOW_OFFSET = IFELSE_SVG_HEIGHT_WITH_SHADOW - IFELSE_SVG_HEIGHT;

export function IfElseSVG(props: {
    x: number,
    y: number,
    text: string,
    codeSnippet: string,
    conditionType: string,
    openInCodeView?: () => void,
    codeSnippetOnSvg: string,
    diagnostics?: ErrorSnippet,
    componentSTNode: STNode
}) {
    const { text, codeSnippet, openInCodeView, conditionType, codeSnippetOnSvg, diagnostics, componentSTNode, ...xyProps } = props;
    const ifXPosition = (text === "IF") ? "45%" : "44%";

    let icon: ReactNode = null;
    if (conditionType === "If") {
        icon = (
            <g id="Develop" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="develop-UI-kit" fillRule="nonzero">
                    <g id="Logo/Plus/If" transform="translate(17, 15)" className="if-else-icon">
                        <path className="if-icon-light-path" d="M15.6105458,12.2073509 L15.7047531,12.2905396 L19.4142136,16 L15.7047531,19.7094604 C15.3142288,20.0999847 14.6810638,20.0999847 14.2905396,19.7094604 C13.9300556,19.3489765 13.9023261,18.7817454 14.2073509,18.3894542 L14.2905396,18.2952469 L15.587,16.997 L15.0534608,16.9976473 C13.4749803,16.9976473 11.9728621,16.4806152 10.7482527,15.5433396 C10.3096809,15.2076712 10.2262613,14.5800256 10.5619296,14.1414538 C10.897598,13.702882 11.5252436,13.6194623 11.9638154,13.9551307 C12.7745901,14.575671 13.7535464,14.9388966 14.7931556,14.9911058 L15.0542593,14.9976476 L15.584,14.998 L14.2905396,13.7047531 C13.9300556,13.3442692 13.9023261,12.7770381 14.2073509,12.3847469 L14.2905396,12.2905396 C14.6510235,11.9300556 15.2182546,11.9023261 15.6105458,12.2073509 Z M3,3 C4.79392302,3 6.41433377,3.50108367 7.64715199,4.48045689 C8.07958887,4.82399261 8.15165749,5.45304269 7.80812177,5.88547957 C7.46458605,6.31791645 6.83553597,6.38998507 6.40309909,6.04644935 C5.60687545,5.4139148 4.53153854,5.05379166 3.28952587,5.00557271 L3,5 L1,5 C0.44771525,5 -1.77635684e-13,4.55228475 -1.77635684e-13,4 C-1.77635684e-13,3.48716416 0.38604019,3.06449284 0.883378875,3.00672773 L1,3 L3,3 Z" id="Combined-Shape" />
                        <path className="if-icon-dark-path" d="M15.6105458,0.207350944 L15.7047531,0.290539551 L19.4142136,4 L15.7047531,7.70946045 C15.3142288,8.09998474 14.6810638,8.09998474 14.2905396,7.70946045 C13.9300556,7.34897649 13.9023261,6.78174543 14.2073509,6.38945422 L14.2905396,6.29524689 L15.583,5.00164633 L15.0542593,5.00235211 L14.8158658,5.00424885 C11.4438222,5.05885009 10,6.30209244 10,9.99999968 L10,9.99999968 L9.99681597,10.2817741 C9.89709842,14.6532102 7.45744548,16.9999997 3,16.9999997 L3,16.9999997 L1,16.9999997 L0.883378875,16.9932719 C0.38604019,16.9355068 -1.77635684e-13,16.5128355 -1.77635684e-13,15.9999997 C-1.77635684e-13,15.4477149 0.44771525,14.9999997 1,14.9999997 L1,14.9999997 L3,14.9999997 L3.25503007,14.9970838 C6.52435931,14.9212008 8,13.3615221 8,9.99999968 L8,9.99999968 L8.00287096,9.70950726 C8.09851654,4.92531653 10.5813234,3.00235243 15.0534608,3.00235243 L15.0534608,3.00235243 L15.587,3.00164633 L14.2905396,1.70475311 C13.9300556,1.34426915 13.9023261,0.777038095 14.2073509,0.384746888 L14.2905396,0.290539551 C14.6510235,-0.069944411 15.2182546,-0.0976739465 15.6105458,0.207350944 Z" id="Combined-Shape" />
                    </g>
                </g>
            </g>
        );
    } else if (conditionType === "ForEach") {
        icon = (
            <g id="Develop" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="develop-UI-kit" fillRule="nonzero">
                    <g id="Logo/Plus/For-each" transform="translate(17, 15)">
                        <path d="M6,3 C6.55228475,3 7,3.44771525 7,4 C7,4.51283584 6.61395981,4.93550716 6.11662113,4.99327227 L6,5 C3.790861,5 2,6.790861 2,9 C2,11.1421954 3.68396847,12.8910789 5.80035966,12.9951047 L6,13 L7.586,13 L6.29053955,11.7047531 C5.93005559,11.3442692 5.90232605,10.7770381 6.20735094,10.3847469 L6.29053955,10.2905396 C6.65102351,9.93005559 7.21825457,9.90232605 7.61054578,10.2073509 L7.70475311,10.2905396 L10.6985438,13.284432 C10.7042862,13.2900387 10.7099613,13.2957138 10.715568,13.3014562 L11.4142136,14 L7.70475311,17.7094604 C7.31422882,18.0999847 6.68106384,18.0999847 6.29053955,17.7094604 C5.93005559,17.3489765 5.90232605,16.7817454 6.20735094,16.3894542 L6.29053955,16.2952469 L7.584,15 L6,15 C2.6862915,15 0,12.3137085 0,9 C0,5.76160306 2.56557489,3.12242824 5.77506174,3.00413847 L6,3 Z" id="Combined-Shape" fill="#5567D5" />
                        <path d="M14.5,0 C15.0522847,0 15.5,0.44771525 15.5,1 C15.5,1.51283584 15.1139598,1.93550716 14.6166211,1.99327227 L14.5,2 C12.290861,2 10.5,3.790861 10.5,6 C10.5,8.14219539 12.1839685,9.89107888 14.3003597,9.99510469 L14.5,10 L16.086,10 L14.7905396,8.70475311 C14.4300556,8.34426915 14.4023261,7.7770381 14.7073509,7.38474689 L14.7905396,7.29053955 C15.1510235,6.93005559 15.7182546,6.90232605 16.1105458,7.20735094 L16.2047531,7.29053955 L19.1985438,10.284432 C19.2042862,10.2900387 19.2099613,10.2957138 19.215568,10.3014562 L19.9142136,11 L16.2047531,14.7094604 C15.8142288,15.0999847 15.1810638,15.0999847 14.7905396,14.7094604 C14.4300556,14.3489765 14.4023261,13.7817454 14.7073509,13.3894542 L14.7905396,13.2952469 L16.084,12 L14.5,12 C11.1862915,12 8.5,9.3137085 8.5,6 C8.5,2.76160306 11.0655749,0.122428238 14.2750617,0.00413847206 L14.5,0 Z" id="Combined-Shape" fill="#CCD1F2" transform="translate(14.207107, 7.501177) scale(-1, -1) translate(-14.207107, -7.501177) " />
                    </g>
                </g>
            </g>
        );
    } else if (conditionType === "While") {
        icon = (
            <g id="Develop" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="develop-UI-kit" fillRule="nonzero">
                    <g id="Logo/Plus/For-each" transform="translate(17, 15)">
                        <path
                            d="M19,12 C19.5522847,12 20,12.4477153 20,13 C20,13.5128358 19.6139598,13.9355072 19.1166211,13.9932723 L19,14 L11,14 C10.4477153,14 10,13.5522847 10,13 C10,12.4871642 10.3860402,12.0644928 10.8833789,12.0067277 L11,12 L19,12 Z"
                            id="Path-23"
                            fill="#5567D5"
                        />
                        <path
                            d="M8,-2.38742359e-12 C12.418278,-2.38661197e-12 16,3.581722 16,8 L15.994,8.09 L18.2928932,5.79289322 C18.6834175,5.40236893 19.3165825,5.40236893 19.7071068,5.79289322 C20.0675907,6.15337718 20.0953203,6.72060824 19.7902954,7.11289944 L19.7071068,7.20710678 L15.0006268,11.9135867 L10.2935206,7.2148224 C9.90265013,6.82464462 9.90208859,6.19147989 10.2922664,5.8006094 C10.6524305,5.43980587 11.2196367,5.41157328 11.6121983,5.71625013 L11.7064794,5.79935516 L14.0044334,8.0947841 C14.0015,8.0635841 14,8.03196722 14,8 C14,4.6862915 11.3137085,2 8,2 C4.6862915,2 2,4.6862915 2,8 C2,11.3137085 4.6862915,14 8,14 C8.55228475,14 9,14.4477153 9,15 C9,15.5522847 8.55228475,16 8,16 C3.581722,16 -3.55271368e-15,12.418278 0,8 C0,3.581722 3.581722,-2.38823522e-12 8,-2.38742359e-12 Z"
                            id="Combined-Shape"
                            fill="#CCD1F2"
                        />
                    </g>
                </g>
            </g>
        )
    }

    const ItalicComp = () => (
        <text className="condition-text condition-text-italic" id="IfElseText" >
            <tspan x={ifXPosition} y="50%" width="71" textAnchor="middle" data-testid={"condition"} >
                {text !== "Draft" ? (codeSnippetOnSvg.length >= 7 ? codeSnippetOnSvg.slice(0, 6) + "..." : codeSnippetOnSvg) : text}
            </tspan>
        </text>
    )
    const NonItalicComp = () => (
        <text className="condition-text" id="IfElseText" >
            <tspan x={ifXPosition} y="50%" width="71" textAnchor="middle" data-testid={"condition"} >
                {text !== "Draft" ? (codeSnippetOnSvg.length >= 7 ? codeSnippetOnSvg.slice(0, 6) + "..." : codeSnippetOnSvg) : text}
            </tspan>
        </text>
    )
    return (
        <svg {...xyProps} width={IFELSE_SVG_WIDTH_WITH_SHADOW} height={IFELSE_SVG_HEIGHT_WITH_SHADOW} >
            <defs>
                <linearGradient id="IfElseLinearGradient" x1="0.5" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
                    <stop offset="0" stopColor="#fcfcfd" />
                    <stop offset="1" stopColor="#f7f8fb" />
                </linearGradient>
                <filter id="IfElseFilterDefault" x="-20" y="-20" width="113.824" height="113.822" filterUnits="userSpaceOnUse">
                    <feOffset dy="1" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feFlood floodColor="#a9acb6" floodOpacity="0.388" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
                <filter id="IfElseFilterHover" x="-20" y="-20" width="146.824" height="146.822" filterUnits="userSpaceOnUse">
                    <feOffset dy="1" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="7.5" result="blur" />
                    <feFlood floodColor="#a9acb6" floodOpacity="0.388" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
            </defs>

            <IfElseRectSVG
                onClick={openInCodeView}
                model={componentSTNode}
                icon={icon}
                className="if-else-group if-else-group-active"
            />
        </svg>
    )
}
