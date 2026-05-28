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

export const AWSSQS_LOGO_WIDTH = 20;
export const AWSSQS_LOGO_HEIGHT = 20;

export function AwsSQSLogo(props: { cx?: number, cy?: number, scale?: number }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (AWSSQS_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (AWSSQS_LOGO_HEIGHT / 2)} width={AWSSQS_LOGO_WIDTH} height={AWSSQS_LOGO_HEIGHT}>
            <g id="Aws-sqs" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="new-adding-new" transform="translate(-1048.000000, -674.000000)" fillRule="nonzero">
                    <g id="Dropdown/Select/Default-Copy-26" transform="translate(1038.000000, 664.000000)">
                        <g id="Icon/Connectro-logo" transform="translate(10.000000, 10.000000)">
                            <g id="AWSSQS" transform="translate(2.000000, 0.000000)">
                                <polyline id="XMLID_2_" fill="#D9A741" points="16 6.48767123 15.7407407 6.48219178 8.00529101 4.10958904 8 4 8 0 16 4.14246575 16 6.48767123"/>
                                <polyline id="XMLID_3_" fill="#876929" points="8 4.24109589 8 0 0 4.14246575 0 15.8575342 0.00529100529 15.8575342 0.00529100529 15.8575342 8 20 8.02645503 19.9616438 8.01587302 16.0219178 8 16 7.5026455 15.6328767 1.31216931 13.7205479 1.34391534 6.31232877 8 4.24109589"/>
                                <polyline id="XMLID_4_" fill="#D9A741" points="9.1957672 12.6410959 1.02116402 13.830137 1.02116402 6.16438356 9.1957672 7.35890411 9.1957672 12.6410959"/>
                                <polyline id="XMLID_5_" fill="#876929" points="5.05291005 12.1534247 8 12.5424658 8 7.45205479 5.05291005 7.84109589 5.05291005 12.1534247"/>
                                <polyline id="XMLID_6_" fill="#876929" points="2.08465608 11.7643836 4 12.0164384 4 7.97808219 2.08465608 8.23013699 2.08465608 11.7643836"/>
                                <polyline id="XMLID_7_" fill="#624A1E" points="1.02116402 6.16438356 8 4 16 6.48767123 9.2010582 7.35890411 1.02116402 6.16438356"/>
                                <polyline id="XMLID_8_" fill="#D9A741" points="15.994709 11.4794521 8 12.5260274 8 7.45205479 15.994709 8.50958904 15.994709 11.4794521"/>
                                <polyline id="XMLID_9_" fill="#D9A741" points="15.994709 13.5178082 15.8201058 13.5232877 8.02645503 15.9671233 8 16 8 20 15.994709 15.8630137 15.994709 13.5178082"/>
                                <polyline id="XMLID_10_" fill="#FAD791" points="1.02116402 13.830137 8 16 15.994709 13.5178082 9.1957672 12.6410959 1.02116402 13.830137"/>
                            </g>
                        </g>
                    </g>
                </g>
            </g>
        </svg>
    )
}
