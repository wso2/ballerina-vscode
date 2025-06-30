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

export const AWSS3_LOGO_WIDTH = 20;
export const AWSS3_LOGO_HEIGHT = 20;

export function AwsS3Logo(props: { cx?: number, cy?: number, scale?: number }) {
    const { cx, cy, scale } = props;
    return (
        <svg transform={scale ? `scale(${scale})` : ''} x={!cx ? 0 : cx - (AWSS3_LOGO_WIDTH / 2)} y={!cy ? 0 : cy - (AWSS3_LOGO_HEIGHT / 2)} width={AWSS3_LOGO_WIDTH} height={AWSS3_LOGO_HEIGHT}>
            <g id="Aws-S3" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="develop-UI-kit" transform="translate(-696.000000, -2561.000000)" fillRule="nonzero">
                    <g id="Logo/AWSS3" transform="translate(696.000000, 2561.000000)">
                        <g id="AWSS3" transform="translate(1.666667, 0.000000)">
                            <polyline id="XMLID_2_" fill="#8C3123" points="1.32786885 3.4863388 0 4.15300546 0 15.8196721 1.32786885 16.4808743 1.33879781 16.4699454 1.33879781 3.49726776 1.32786885 3.4863388"/>
                            <polyline id="XMLID_3_" fill="#E05243" points="8.44262295 14.7868852 1.32786885 16.4808743 1.32786885 3.4863388 8.44262295 5.1420765 8.44262295 14.7868852"/>
                            <polyline id="XMLID_4_" fill="#8C3123" points="5.23497268 12.136612 8.25136612 12.5191257 8.26775956 12.4754098 8.28961749 7.53005464 8.25136612 7.49180328 5.23497268 7.86885246 5.23497268 12.136612"/>
                            <polyline id="XMLID_5_" fill="#8C3123" points="8.25136612 14.8087432 15.1693989 16.4863388 15.1803279 16.4699454 15.1803279 3.49726776 15.1693989 3.4863388 8.25136612 5.16393443 8.25136612 14.8087432"/>
                            <polyline id="XMLID_6_" fill="#E05243" points="11.2677596 12.136612 8.25136612 12.5191257 8.25136612 7.49180328 11.2677596 7.86885246 11.2677596 12.136612"/>
                            <polyline id="XMLID_7_" fill="#5E1F18" points="11.2677596 5.80327869 8.25136612 6.35519126 5.23497268 5.80327869 8.24590164 5.01639344 11.2677596 5.80327869"/>
                            <polyline id="XMLID_8_" fill="#F2B0A9" points="11.2677596 14.1967213 8.25136612 13.6393443 5.23497268 14.1967213 8.24590164 15.0382514 11.2677596 14.1967213"/>
                            <polyline id="XMLID_9_" fill="#8C3123" points="5.23497268 5.80327869 8.25136612 5.06010929 8.27322404 5.04918033 8.27322404 0.0491803279 8.25136612 0.0273224044 5.23497268 1.53551913 5.23497268 5.80327869"/>
                            <polyline id="XMLID_10_" fill="#E05243" points="11.2677596 5.80327869 8.25136612 5.06010929 8.25136612 0.0273224044 11.2677596 1.53551913 11.2677596 5.80327869"/>
                            <polyline id="XMLID_11_" fill="#8C3123" points="8.25136612 19.9726776 5.23497268 18.4644809 5.23497268 14.1967213 8.25136612 14.9398907 8.29508197 14.9945355 8.28415301 19.8852459 8.25136612 19.9726776"/>
                            <polyline id="XMLID_12_" fill="#E05243" points="8.25136612 19.9726776 11.2677596 18.4644809 11.2677596 14.1967213 8.25136612 14.9398907 8.25136612 19.9726776"/>
                            <polyline id="XMLID_13_" fill="#E05243" points="15.1693989 3.4863388 16.5027322 4.15300546 16.5027322 15.8196721 15.1693989 16.4863388 15.1693989 3.4863388"/>
                        </g>
                    </g>
                </g>
            </g>
        </svg>
    )
}
