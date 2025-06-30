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
import React from "react";

export default function SquareEditIcon(props: {color: string}) {
    const { color } = props;
    return (
        <svg width="13px" height="13px" viewBox="0 0 13 13" fill={color} version="1.1" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <path fillRule="evenodd" d="M5.5,0.395986235 C5.77614237,0.395986235 6,0.61984386 6,0.895986235 C6,1.14144612 5.82312484,1.3455946 5.58987563,1.38793057 L5.5,1.39598623 L2.5,1.39598623 C1.72030388,1.39598623 1.07955132,1.99087432 1.00686658,2.75152622 L1,2.89598623 L1,9.89598623 C1,10.6756824 1.59488808,11.3164349 2.35553999,11.3891197 L2.5,11.3959862 L9.5,11.3959862 C10.2796961,11.3959862 10.9204487,10.8010982 10.9931334,10.0404462 L11,9.89598623 L11,6.89598623 C11,6.61984386 11.2238576,6.39598623 11.5,6.39598623 C11.7454599,6.39598623 11.9496084,6.5728614 11.9919443,6.8061106 L12,6.89598623 L12,9.89598623 C12,11.2214696 10.9684641,12.3060249 9.66437569,12.3906686 L9.5,12.3959862 L2.5,12.3959862 C1.1745166,12.3959862 0.089961328,11.3644503 0.00531767968,10.0603619 L0,9.89598623 L0,2.89598623 C0,1.57050283 1.03153594,0.485947563 2.33562431,0.401303914 L2.5,0.395986235 L5.5,0.395986235 Z M9.19180465,0.556025946 C9.91874506,-0.179341475 11.1041798,-0.186172916 11.8395472,0.540767497 C12.5955682,1.28812479 12.6223059,2.50050757 11.8999681,3.28046834 L11.8999681,3.28046834 L7.46480412,8.06943845 L4.05021504,8.90938018 L4.76686995,5.3676207 Z M11.136527,1.25193739 C10.7939279,0.913264307 10.2416476,0.916446996 9.90928918,1.25254138 L9.90928918,1.25254138 L5.672,5.85998623 L5.202,7.65998623 L6.922,7.18198623 L11.1662787,2.6009834 C11.4946021,2.24646868 11.5086395,1.71052476 11.2160563,1.34072489 L11.2160563,1.34072489 Z" id="path-1"/>
            </defs>
            <g id="Tree-Editor" stroke="none" strokeWidth="1" fill={color} fillRule="evenodd">
                <g id="tree-editor-while" transform="translate(-1370.000000, -226.000000)">
                    <g id="Icon/docs-Copy-7" transform="translate(1370.000000, 226.604014)">
                        <mask id="mask-2" fill="white">
                            <use xlinkHref="#path-1"/>
                        </mask>
                        <use id="Combined-Shape" fill={color} fillRule="nonzero" xlinkHref="#path-1"/>
                    </g>
                </g>
            </g>
        </svg>

    );
}
