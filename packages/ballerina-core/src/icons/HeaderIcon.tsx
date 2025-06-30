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

export function HeaderIcon(props: any) {
    const { onClick, ...restProps } = props;

    const handleOnClick = (evt: React.MouseEvent) => {
        evt.stopPropagation();
        if (props && onClick) {
            onClick();
        }
    }

    return (
        <svg width="14px" height="14px" viewBox="0 0 14 14" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
            <g id="VSC" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <g id="VSC-icons" transform="translate(-965.000000, -613.000000)" fill="#000000" fillRule="nonzero">
                    <path d="M976.5,613 C977.880712,613 979,614.119288 979,615.5 L979,615.5 L979,624.5 C979,625.880712 977.880712,627 976.5,627 L976.5,627 L967.5,627 C966.119288,627 965,625.880712 965,624.5 L965,624.5 L965,615.5 C965,614.119288 966.119288,613 967.5,613 L967.5,613 Z M976.5,614 L967.5,614 C966.671573,614 966,614.671573 966,615.5 L966,615.5 L966,624.5 C966,625.328427 966.671573,626 967.5,626 L967.5,626 L976.5,626 C977.328427,626 978,625.328427 978,624.5 L978,624.5 L978,615.5 C978,614.671573 977.328427,614 976.5,614 L976.5,614 Z M976,615 C976.552285,615 977,615.447715 977,616 L977,616 L977,618 C977,618.552285 976.552285,619 976,619 L976,619 L968,619 C967.447715,619 967,618.552285 967,618 L967,618 L967,616 C967,615.447715 967.447715,615 968,615 L968,615 Z M976,616 L968,616 L968,618 L976,618 L976,616 Z" id="Header-Shape"/>
                </g>
            </g>
        </svg>
    )
}
