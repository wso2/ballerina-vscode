/*
 * Copyright (c) 2023, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein is strictly forbidden, unless permitted by WSO2 in accordance with
 * the WSO2 Commercial License available at http://wso2.com/licenses.
 * For specific language governing the permissions and limitations under
 * this license, please see the license as well as any agreement you’ve
 * entered into with WSO2 governing the purchase of this software and any
 * associated services.
 */
import React from "react";

export interface FilterIconProps {
    height?: string,
    width?: string,
    color?: string,
    filled?: boolean
}

export default function FilterIcon(props: FilterIconProps) {
    const { height, width, color } = props;
    const iconHeight = height ? height : "16px";
    const iconWidth = width ? width : "16px";
    const iconColor = color ? color : "#000000";
    return (
        <svg width={iconWidth} height={iconHeight} viewBox="0 0 16 16" version="1.1" xmlns="http://www.w3.org/2000/svg">
            <g id="UI-kit" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g id="Icons" transform="translate(-1082.000000, -542.000000)" fill={iconColor} fill-rule="nonzero">
                    <g id="Icon/Add-Copy-90" transform="translate(1082.000000, 542.000000)">
                        {props.filled && (<path d="M14.504357,0.5 L1.49572037,0.5 C1.28820549,0.5 1.08587642,0.564179196 0.917014611,0.683566658 L0.819895281,0.761667387 C0.456120195,1.09359335 0.390507353,1.64948929 0.685532307,2.05831867 L6.00775695,8.06149452 L6.00875259,14.5142788 C6.00875259,14.6672737 6.0447402,14.8181674 6.11386542,14.9550102 C6.35977855,15.4418286 6.95783448,15.6391508 7.44966073,15.3957416 L9.16575784,14.053677 L9.28828878,13.9857522 C9.7227678,13.7176272 9.99132475,13.2447455 9.99132475,12.7314829 L9.9903291,8.06346553 L15.314545,2.05831867 C15.4351606,1.89117623 15.5,1.69090729 15.5,1.48550533 C15.5,0.941225767 15.0542354,0.5 14.504357,0.5 Z" id="Combined-Shape"/>)}
                        {!props.filled && (<path d="M14.504357,0.5 L1.49572037,0.5 C1.28820549,0.5 1.08587642,0.564179196 0.917014611,0.683566658 L0.819895281,0.761667387 C0.456120195,1.09359335 0.390507353,1.64948929 0.685532307,2.05831867 L6.00775695,8.06149452 L6.00875259,14.5142788 C6.00875259,14.6672737 6.0447402,14.8181674 6.11386542,14.9550102 C6.35977855,15.4418286 6.95783448,15.6391508 7.44966073,15.3957416 L9.16575784,14.053677 L9.28828878,13.9857522 C9.7227678,13.7176272 9.99132475,13.2447455 9.99132475,12.7314829 L9.9903291,8.06346553 L15.314545,2.05831867 C15.4351606,1.89117623 15.5,1.69090729 15.5,1.48550533 C15.5,0.941225767 15.0542354,0.5 14.504357,0.5 Z M1.49572037,1.48550533 L14.504357,1.48550533 L8.99568171,7.74787466 L8.99568171,12.7314829 C8.99568171,12.9181238 8.88914672,13.0887459 8.72049274,13.1722143 L7.00439563,14.5142788 L7.00439563,7.74787466 L1.49572037,1.48550533 Z" id="Combined-Shape"/>)}
                    </g>
                </g>
            </g>
        </svg>
    );
}
