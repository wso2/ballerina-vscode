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

export interface VariableIconProps {
    className?: string
}

export default function VariableIcon(props: VariableIconProps) {
    return (
        <svg width="15px" height="16px" viewBox="0 0 15 16" version="1.1" className={props?.className ? props.className : "dark-fill"}>
        <g id="var-icon" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g id="var-icon-body" className="svg-plus-option-icon" transform="translate(-712.000000, -112.000000)" fill-rule="nonzero">
                <path d="M719.331115,128 C722.660481,125.085859 724.76567,122.827366 725.646681,121.224522 C727.605748,118.26028 726.884894,115.630132 726.662231,114.691679 C726.544874,114.197056 726.360729,113.713948 726.109797,113.242354 C725.817798,112.693559 725.136196,112.485395 724.587405,112.777404 C724.485098,112.831841 724.391812,112.901751 724.310844,112.984662 C723.769022,113.539488 723.661536,114.386642 724.047632,115.059199 C724.354733,115.594156 724.508283,115.984494 724.508283,116.230213 C724.508283,121.616986 721.780176,123.579427 719.918595,124.231551 C718.605712,116.313228 717.136267,112.876209 714.90783,112.876209 C712.713451,112.876209 712,116.019947 712,116.799471 C712,117.03538 712.148725,117.204618 712.446175,117.307187 C712.753882,115.758396 713.297497,114.984001 714.077021,114.984001 C714.77449,114.984001 715.69481,115.312814 716.576903,118.000121 C717.164965,119.791658 718.083036,123.124951 719.331115,128 Z" id="variable" />
            </g>
        </g>
    </svg>
    )
}
