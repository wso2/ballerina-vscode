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
import React from 'react';

export interface ListenerIconProps {
    className?: string
}

export default function ListenerIcon(props: ListenerIconProps) {
    return (
        <svg width="16px" height="16px" viewBox="0 0 16 16" version="1.1" className={props?.className ? props.className : "sub-menu-dark-fill"}>
            <g id="listener-icon" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="listener-body" className="svg-sub-menu-plus-option-icon" transform="translate(-114.000000, -152.000000)" fillRule="nonzero">
                    <g id="listener" transform="translate(114.000000, 152.000000)">
                        <path d="M8,8.00001563 C11.8659932,8.00001563 15,10.5072171 15,13.6000069 C15,14.769405 13.3526877,15.5046804 10.9734205,15.8206462 L10.4710145,15.8800403 C10.3002646,15.8978472 10.1263337,15.9136646 9.94952187,15.9274975 L9.41074416,15.9630469 C9.31960753,15.9679812 9.22782575,15.9724204 9.13543636,15.9763654 L8.57410884,15.9941079 L8,16.0000156 L7.42589116,15.9943326 C7.04721221,15.9867441 6.67705413,15.9715337 6.31781895,15.9485679 L5.78745859,15.9082861 L5.2752841,15.8562712 L4.78309698,15.792423 C2.53566331,15.4666985 1,14.7511524 1,13.6000069 C1,10.5072171 4.13400675,8.00001563 8,8.00001563 Z M8,9.50001563 C4.98190449,9.50001563 2.63013947,11.3161687 2.50522163,13.4237345 L2.50290409,13.5130936 L2.52343674,13.5274616 C2.69585616,13.6745049 3.026787,13.8383537 3.49620306,13.9845203 C4.56504705,14.3173367 6.150007,14.5000156 8,14.5000156 C9.83545343,14.5000156 11.4241314,14.3122352 12.4997402,13.9739658 C12.9118796,13.8443517 13.2188973,13.7013352 13.4063529,13.5681946 L13.4793288,13.5118069 L13.4960013,13.5 L13.4947784,13.4237345 C13.3733305,11.3747122 11.1470309,9.60113788 8.24993208,9.50418701 L8,9.50001563 Z M8,0 C10.209139,0 12,1.790861 12,4 C12,6.209139 10.209139,8 8,8 C5.790861,8 4,6.209139 4,4 C4,1.790861 5.790861,0 8,0 Z M8,1.5 C6.61928813,1.5 5.5,2.61928813 5.5,4 C5.5,5.38071187 6.61928813,6.5 8,6.5 C9.38071187,6.5 10.5,5.38071187 10.5,4 C10.5,2.61928813 9.38071187,1.5 8,1.5 Z" id="listener-path"/>
                    </g>
                </g>
            </g>
        </svg>
    )
}
