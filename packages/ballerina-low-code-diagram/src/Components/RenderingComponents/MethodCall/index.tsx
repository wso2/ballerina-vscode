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
import React, { useEffect, useState } from "react";

import { filterComments } from "../../../Utils";

import "./style.scss";

export let METHODCALL_TEXT_WIDTH = 125;

export function MethodCall(props: { x: number, y: number, methodCall: string, key_id: number  }) {
    const { key_id, methodCall, ...xyProps } = props;
    const [textWidth, setTextWidth] = useState(METHODCALL_TEXT_WIDTH);

    useEffect(() => {
        setTextWidth(document.getElementById("textLegnth_" + key_id)?.getBoundingClientRect().width);
    }, []);

    const methodCallText = filterComments(methodCall);
    const methodCallMaxWidth = methodCallText?.length >= 16;

    return (
        <svg {...xyProps} width="150" height="24" className="method-call-wrapper">
            <g>
                <text
                    className={"method-name"}
                    transform="translate(4 13.5)"
                >
                    <tspan x="0" y="0">{methodCallMaxWidth ? methodCallText.slice(0, 16) + "..." : methodCallText}</tspan>
                </text>
            </g>
        </svg >
    );
}
