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

import "../style.scss"

import { ConnectionErrorSVG } from "./ConnectionErrorSVG";
import { ConnectionFailedSVG } from "./ConnectionFailedSVG";
import { ConnectionSuccessSVG } from "./ConnectionSuccessSVG";

export interface StatusCodeProps {
    x: number,
    y: number,
    httpStatusCode: string
    errorStatus: string
    errorMsg: string
}

export function StatusCodeC(props: StatusCodeProps) {
    const { x, y, httpStatusCode, errorStatus, errorMsg } = props;
    if (httpStatusCode === "") {
        return errorStatus !== "false" ? <ConnectionErrorSVG x={x} y={y} text={"Failure"} errorMsg={errorMsg} /> : <ConnectionSuccessSVG x={x} y={y} text={"Success"} />
    }
    const statusMsg = httpStatusCode.charAt(0) === '2' ? <ConnectionSuccessSVG x={x} y={y} text={httpStatusCode}/> : <ConnectionFailedSVG x={x} y={y} text={httpStatusCode}/>

    if (errorStatus !== "false"){
        return (
            <g>
                <ConnectionErrorSVG x={x} y={y} text={"ERROR"} errorMsg={errorMsg}/>
            </g>
        );
    }else{
        return (
            <g>
                {statusMsg}
            </g>
        );
    }
}

export const StatusCode = StatusCodeC;
