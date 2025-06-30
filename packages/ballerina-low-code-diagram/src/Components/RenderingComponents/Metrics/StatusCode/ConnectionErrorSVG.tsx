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

import { ErrorCopyIcon } from "@wso2/ballerina-core";

import { CopyToClipboard } from './CopyToClipboard';

export const ERROR_LABEL_SVG_WIDTH_WITH_SHADOW = 65;
export const ERROR_LABEL_SVG_HEIGHT_WITH_SHADOW = 31;
export const ERROR_LABEL_SVG_WIDTH = 59;
export const ERROR_LABEL_SVG_HEIGHT = 25;
export const ERROR_LABEL_SHADOW_OFFSET = ERROR_LABEL_SVG_HEIGHT_WITH_SHADOW - ERROR_LABEL_SVG_HEIGHT;

export const tooltipStyles = {
    tooltip: {
        width : 670,
        color: "#40404B",
        borderRadius: 4,
        backgroundColor: "#fff",
        boxShadow: "0 1px 10px 0 rgba(0,0,0,0.22)",
        padding: "1rem",
        fontSize: 12,
        letterSpacing: 0,
    },
    arrow: {
        color: "#ffffff"
    }
};

export function ConnectionErrorSVG(props: { x: number, y: number, text: string, errorMsg: string }) {
    const { text, errorMsg, ...xyProps } = props;

    const codeCopyBtn = (copy: any) => {
        const copyButtonClick = () => {
            copy(errorMsg);
        };
        return (
            <button
                aria-label="test invoke URL"
                onClick={copyButtonClick}
                className={"copy"}
            >
                {<ErrorCopyIcon />}
            </button>
        )
    };

    return (
        <svg {...xyProps} width={ERROR_LABEL_SVG_WIDTH_WITH_SHADOW} height={ERROR_LABEL_SVG_HEIGHT_WITH_SHADOW}>
            <defs>
                <filter
                    id="ConnectionErrorFilter"
                    x="0"
                    y="0"
                    width={ERROR_LABEL_SVG_WIDTH_WITH_SHADOW}
                    height={ERROR_LABEL_SVG_HEIGHT_WITH_SHADOW}
                    filterUnits="userSpaceOnUse"
                >
                    <feOffset dy="1" in="SourceAlpha" />
                    <feGaussianBlur stdDeviation="1" result="blur" />
                    <feFlood floodColor="#8a92ab" floodOpacity="0.373" />
                    <feComposite operator="in" in2="blur" />
                    <feComposite in="SourceGraphic" />
                </filter>
            </defs>
            <g id="ErrorComplete">
                {/* <TooltipComponent
                    title={
                        (
                        <Grid container={true} spacing={2} justify="flex-start" alignItems="flex-start">
                            <Grid item={true} xs={true} zeroMinWidth={true}>
                                {errorMsg}
                            </Grid>
                            <Grid item={true} >
                                <CopyToClipboard title={"Copied!"}>
                                    {({ copy }) => codeCopyBtn(copy)}
                                </CopyToClipboard>
                            </Grid>
                        </Grid>
                        )
                    }
                    placement="top-start"
                    arrow={true}
                    interactive={true}
                > */}

                    <g id="Error" transform="translate(3 2)">
                        <g transform="matrix(1, 0, 0, 1, -3, -2)" filter="url(#ConnectionErrorFilter)">
                            <rect
                                id="ErrorRect"
                                width={ERROR_LABEL_SVG_WIDTH}
                                height={ERROR_LABEL_SVG_HEIGHT}
                                rx="4"
                                transform="translate(3 2)"
                                fill="#ea4c4d"
                            />
                        </g>
                        <text
                            className="metrics-text"
                            id="Error_text"
                            transform="translate(30.5 16)"
                        >
                            <tspan x="0" y="0" textAnchor="middle">
                                {text}
                            </tspan>
                        </text>
                    </g>
                {/* </TooltipComponent> */}
            </g>
        </svg>
    )
};
