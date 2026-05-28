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

interface DoStatementRectSVGProps {
    type?: string,
    className?: string,
    onClick?: () => void,
    text?: { heading?: string, content?: string, example?: string, code?: string },
    diagnostic?: ErrorSnippet,
    model: STNode
}

export function DoStatementRectSVG(props: DoStatementRectSVGProps) {
    const { text, onClick, diagnostic, model, type } = props;
    const diagnosticStyles = diagnostic?.severity === "ERROR" ? "do-statement-block-error" : "foreach-block-warning";
    const doStatementRectStyles = diagnostic?.diagnosticMsgs ? diagnosticStyles : "do-statement-block";
    const diagramContext = useContext(Context);
    const showTooltip = diagramContext?.api?.edit?.showTooltip;
    const [tooltipComp, setTooltipComp] = useState(undefined);
    const sourceSnippet = text.code;

    const doStatementIcon = (
        <>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M1.15181 7.21928L7.21928 1.15181C8.75503 -0.383937 11.245 -0.383937 12.7807 1.15181L18.8482 7.21928C20.3839 8.75503 20.3839 11.245 18.8482 12.7807L12.7807 18.8482C11.245 20.3839 8.75503 20.3839 7.21928 18.8482L1.15181 12.7807C-0.383937 11.245 -0.383937 8.75503 1.15181 7.21928ZM17.4578 8.60964L11.3904 2.54217C10.6225 1.7743 9.37751 1.7743 8.60964 2.54217L2.54217 8.60964C1.7743 9.37751 1.7743 10.6225 2.54217 11.3904L8.60964 17.4578C9.37751 18.2257 10.6225 18.2257 11.3904 17.4578L17.4578 11.3904C18.2257 10.6225 18.2257 9.37751 17.4578 8.60964Z" fill="#CCD1F2" />
            <path fill-rule="evenodd" clip-rule="evenodd" d="M10 4C9.44772 4 9 4.44772 9 5V12C9 12.5523 9.44772 13 10 13C10.5523 13 11 12.5523 11 12V5C11 4.44772 10.5523 4 10 4ZM10 14C9.44772 14 9 14.4477 9 15C9 15.5523 9.44772 16 10 16C10.5523 16 11 15.5523 11 15C11 14.4477 10.5523 14 10 14Z" fill="#5567D5" />
        </>
    );

    const onFailIcon = (
        <>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M20 10C20 4.47715 15.5228 0 10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20C15.5228 20 20 15.5228 20 10ZM2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10C18 14.4183 14.4183 18 10 18C5.58172 18 2 14.4183 2 10Z" fill="#CCD1F2" />
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12.7929 14.2071C13.1834 14.5976 13.8166 14.5976 14.2071 14.2071C14.5976 13.8166 14.5976 13.1834 14.2071 12.7929L11.4142 10L14.2071 7.20711C14.5976 6.81658 14.5976 6.18342 14.2071 5.79289C13.8166 5.40237 13.1834 5.40237 12.7929 5.79289L10 8.58579L7.20711 5.79289C6.81658 5.40237 6.18342 5.40237 5.79289 5.79289C5.40237 6.18342 5.40237 6.81658 5.79289 7.20711L8.58579 10L5.79289 12.7929C5.40237 13.1834 5.40237 13.8166 5.79289 14.2071C6.18342 14.5976 6.81658 14.5976 7.20711 14.2071L10 11.4142L12.7929 14.2071Z" fill="#5567D5" />
        </>
    );
    const svgElement = (
        <g id="DoStatement" className={doStatementRectStyles} transform="translate(7 6)">
            <g transform="matrix(1, 0, 0, 1, -7, -6)" >
                <g id="DoStatementPolygon" className="do-statement-polygon" transform="translate(33.5, 3) rotate(45)">
                    <rect width="40.903" height="40.903" className="do-statement-rect" rx="6" stroke="none" />
                    <rect x="0.5" y="0.5" width="39.903" className="do-statement-rect click-effect" height="39.903" rx="5.5" fill="none" />
                </g>
            </g>
            <g className="do-statement-icon" id="DoStatement_icon" transform="translate(17, 15)">
                {type === 'DO STATEMENT' ? doStatementIcon : onFailIcon}
            </g>
        </g>
    );

    // <path className="do-statement-rect-icon-shape-1" id="Combined_Shape" d="M6.29,14.71a1,1,0,0,1-.083-1.32l.083-.094L7.585,12H6A6,6,0,0,1,5.775,0L6,0a1,1,0,0,1,.116,1.993L6,2a4,4,0,0,0-.2,8L6,10H7.586L6.29,8.7a1,1,0,0,1-.083-1.32l.083-.094a1,1,0,0,1,1.32-.084l.095.084,3,3,.009.009.7.7-.692.693-.03.03L7.7,14.71a1,1,0,0,1-1.415,0Z" transform="translate(0 4)" />
    // <path className="do-statement-rect-icon-shape-2" id="Combined_Shape-2" d="M6.29,14.71a1,1,0,0,1-.083-1.32l.083-.094L7.585,12H6A6,6,0,0,1,5.775,0L6,0a1,1,0,0,1,.116,1.993L6,2a4,4,0,0,0-.2,8L6,10H7.586L6.29,8.7a1,1,0,0,1-.083-1.32l.083-.094a1,1,0,0,1,1.32-.084l.095.084,3,3,.009.009.7.7-.692.693-.03.03L7.7,14.71a1,1,0,0,1-1.415,0Z" transform="translate(19.914 16.002) rotate(-180)" />

    const defaultTooltip = (
        <DefaultTooltip text={sourceSnippet}>{svgElement}</DefaultTooltip>
    );

    useEffect(() => {
        if (model && showTooltip) {
            setTooltipComp(showTooltip(svgElement, undefined, onClick, model));
        }
    }, [model]);

    return (
        <>
            {tooltipComp ? tooltipComp : defaultTooltip}
        </>
    )
}
