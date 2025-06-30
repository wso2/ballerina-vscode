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

export function ParamIcon(props: any) {
    const { onClick, ...restProps } = props;

    const handleOnClick = (evt: React.MouseEvent) => {
        evt.stopPropagation();
        if (props && onClick) {
            onClick();
        }
    }

    return (
        <svg width="14px" height="14px" viewBox="0 0 14 14" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" onClick={handleOnClick}>
            <g id="VSC" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="VSC-icons" transform="translate(-245.000000, -613.000000)" fill="#000000" fillRule="nonzero">
                    <path d="M248.936728,615.501022 C248.714351,616.363117 247.931552,617 247,617 C245.895431,617 245,616.104569 245,615 C245,613.895431 245.895431,613 247,613 C247.931913,613 248.714958,613.637377 248.936986,614.499981 L255,614.5 C256.656854,614.5 258,615.843146 258,617.5 C258,619.097681 256.75108,620.403661 255.176273,620.494907 L255,620.5 L249,620.5 C247.895431,620.5 247,621.395431 247,622.5 C247,623.554362 247.815878,624.418165 248.850738,624.494514 L249,624.5 L255.063014,624.499981 C255.285042,623.637377 256.068087,623 257,623 C258.104569,623 259,623.895431 259,625 C259,626.104569 258.104569,627 257,627 C256.068448,627 255.285649,626.363117 255.063272,625.501022 L249,625.5 C247.343146,625.5 246,624.156854 246,622.5 C246,620.902319 247.24892,619.596339 248.823727,619.505093 L249,619.5 L255,619.5 C256.104569,619.5 257,618.604569 257,617.5 C257,616.445638 256.184122,615.581835 255.149262,615.505486 L255,615.5 Z M257,624 C256.447715,624 256,624.447715 256,625 C256,625.552285 256.447715,626 257,626 C257.552285,626 258,625.552285 258,625 C258,624.447715 257.552285,624 257,624 Z M247,614 C246.447715,614 246,614.447715 246,615 C246,615.552285 246.447715,616 247,616 C247.552285,616 248,615.552285 248,615 C248,614.447715 247.552285,614 247,614 Z" id="param-icon"/>
                </g>
            </g>
        </svg>
    )
}
