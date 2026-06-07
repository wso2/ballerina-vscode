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

export default function ScheduleIcon(props: any) {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" {...props}>
            <g fill="none" fillRule="evenodd">
                <path fill="#5567D5" d="M11.555 0v1.667c0 .49.399.889.89.889.49 0 .888-.398.888-.89V.019C14.834.184 16 1.456 16 3v4.889c0 .888-.651 1.624-1.502 1.756L14.5 9.5C14.5 5.91 11.59 3 8 3S1.5 5.91 1.5 9.5l.002.145C.652 9.513 0 8.777 0 7.89V3C0 1.456 1.166.184 2.666.018v1.649c0 .49.399.889.89.889.49 0 .888-.398.888-.89V0h7.111z" />
                <path fill="#5668D5" fill-opacity=".3" d="M8 4.5c3.038 0 5.5 2.462 5.5 5.5s-2.462 5.5-5.5 5.5-5.5-2.462-5.5-5.5S4.962 4.5 8 4.5zM8 6c-.552 0-1 .448-1 1v3h.112c-.042.238.031.491.218.671l1.079 1.042c.298.288.773.28 1.06-.018.288-.298.28-.773-.018-1.06L8.793 10H9V7c0-.552-.448-1-1-1z" />
            </g>
        </svg>
    )
}
