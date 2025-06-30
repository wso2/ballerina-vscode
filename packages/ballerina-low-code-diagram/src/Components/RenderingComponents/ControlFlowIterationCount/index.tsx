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
// tslint:disable: jsx
import React from 'react';

export const CONTROL_FLOW_ITERATION_COUNT_PADDING = 8.5;
export const ITERATION_LABEL_SVG_WIDTH_WITH_SHADOW = 50;
export const ITERATION_LABEL_SVG_HEIGHT_WITH_SHADOW = 29;

export interface ControlFlowIterationCountProp {
    x: number;
    y: number;
    count: number
}

export function ControlFlowIterationCount(props: ControlFlowIterationCountProp) {
    const { count, ...xyProps } = props;

    return (
        <svg {...xyProps} width={ITERATION_LABEL_SVG_WIDTH_WITH_SHADOW} height={ITERATION_LABEL_SVG_HEIGHT_WITH_SHADOW}>
            <g id="iteration_control_Flow" transform="translate(3 2)">
                <g id="Rectangle_Copy_8">
                    <rect id="Rectangle_Copy_8-2" width="14" height="14" rx="2" fill="#fff" />
                    <g id="Rectangle_Copy_8-3" fill="none" stroke="#36B475" strokeMiterlimit="10" strokeWidth="1">
                        <rect width="44" height="27" rx="2" stroke="none" />
                        <rect x="-0.5" y="-0.5" width="42" height="25" rx="2.5" fill="none" />
                    </g>
                </g>
                <g id="loop" fill="#36B475" fillRule="nonzero">
                    <path d="M12.5,6.5 C15.7383969,6.5 18.3775718,9.06557489 18.4958615,12.2750617 L18.5,12.484 L19.6359098,11.3494466 C19.8094762,11.1758803 20.0789006,11.1565951 20.2737687,11.2915912 L20.3430166,11.3494466 C20.516583,11.523013 20.5358681,11.7924374 20.4008721,11.9873055 L20.3430166,12.0565534 L17.9897488,14.4098212 L15.6329608,12.056839 C15.4375409,11.8617347 15.4372851,11.5451523 15.6323894,11.3497324 C15.8058154,11.1760259 16.0752242,11.156523 16.2702013,11.2913616 L16.3394959,11.349161 L17.4844632,12.493 L17.5,12.493 L17.4953805,12.2831104 C17.3818181,9.62230671 15.1887547,7.5 12.5,7.5 C9.73857625,7.5 7.5,9.73857625 7.5,12.5 C7.5,15.1887547 9.62230671,17.3818181 12.2831104,17.4953805 L12.5,17.5 L12.5,18.5 C9.1862915,18.5 6.5,15.8137085 6.5,12.5 C6.5,9.1862915 9.1862915,6.5 12.5,6.5 Z" id="Combined-Shape" />
                </g>
                <text
                    className="iteration-count"
                    id="iteration_count"
                    transform="translate(30.5 16)"
                    fill="#36B475"
                >
                    <tspan x="0" y="0" textAnchor="middle">
                        {count}
                    </tspan>
                </text>
            </g>
        </svg>
    );

}
