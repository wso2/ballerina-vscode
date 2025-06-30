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

export function CallerIcon(props: any) {
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
                <g id="VSC-icons" transform="translate(-677.000000, -613.000000)" fill="#000000" fillRule="nonzero">
                    <path d="M687,616 L687,619.5 L686,619.5 L686,617.706 L681,622.706 L681,627 L677,627 L677,622 L680.292,622 L685.292,617 L683.5,617 L683.5,616 L687,616 Z M680,623 L678,623 L678,626 L680,626 L680,623 Z M691,613 L691,623 L685.706,623 L682.853553,625.853553 L682.146447,625.146447 L685.292893,622 L690,622 L690,614 L681,614 L681,618.5 L680,618.5 L680,613 L691,613 Z" id="caller-icon"/>
                </g>
            </g>
        </svg>
    )
}
