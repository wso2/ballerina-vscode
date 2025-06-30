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
// tslint:disable: jsx-no-multiline-js align  jsx-wrap-multiline
import React, { ReactElement, useContext, useEffect, useState } from "react";

import classNames from "classnames";

import { Context } from "../../../Context/diagram";
import { DefaultTooltip } from "../DefaultTooltip";

import "./style.scss";

export let ASSIGNMENT_NAME_WIDTH = 125;

export function Assignment(props: { x: number, y: number, assignment: string, className?: string, key_id: number, textAnchor?: string }) {
    const { assignment, className, key_id, textAnchor, ...xyProps } = props;
    const [textWidth, setTextWidth] = useState(ASSIGNMENT_NAME_WIDTH);
    const diagramContext = useContext(Context);
    const showTooltip = diagramContext?.api?.edit?.showTooltip;
    const [tooltip, setTooltip] = useState(undefined);
    useEffect(() => {
        setTextWidth(document.getElementById("textLegnth_" + key_id)?.getBoundingClientRect().width);
    }, []);

    const assignmentMaxWidth = assignment?.length >= 16;

    const assignmentComponent: ReactElement = (
        <text
            className={classNames("assignment-text", className)}
            id="Assignment_text"
            transform="translate(4 13.5)"
            textAnchor={textAnchor}
        >
            <tspan x="0" y="0">{assignmentMaxWidth ? assignment.slice(0, 16) + "..." : assignment}</tspan>
        </text>
    );

    const defaultTooltip = (
        <DefaultTooltip text={{ heading: assignment }}>{assignmentComponent}</DefaultTooltip>
    );

    useEffect(() => {

        if (assignmentMaxWidth && showTooltip) {
            setTooltip(showTooltip(assignmentComponent, assignment));
        }
    }, [assignment]);

    return (
        <svg {...xyProps} className="assignment-expression">
            {assignmentMaxWidth && tooltip ? tooltip : defaultTooltip}
        </svg>
    );
}
