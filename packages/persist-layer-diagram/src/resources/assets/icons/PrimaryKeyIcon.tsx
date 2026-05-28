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

import React, { CSSProperties } from 'react';

export function PrimaryKeyIcon(props: { styles?: CSSProperties }) {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ ...props.styles }}>
            <path fillRule="evenodd" clipRule="evenodd" d="M4.66675 7C6.3236 7 7.66675 5.65685 7.66675 4C7.66675 2.34315 6.3236 1 4.66675 1C3.00989 1 1.66675 2.34315 1.66675 4C1.66675 5.65685 3.00989 7 4.66675 7ZM4.66675 8C5.5911 8 6.44223 7.68646 7.11957 7.15993L10.9596 11L6.81319 15.1464C6.61793 15.3417 6.61793 15.6583 6.81319 15.8536C7.00846 16.0488 7.32504 16.0488 7.5203 15.8536L11.6667 11.7071L13.9596 14L12.8132 15.1464C12.6179 15.3417 12.6179 15.6583 12.8132 15.8536C13.0085 16.0488 13.325 16.0488 13.5203 15.8536L15.0203 14.3536L15.3739 14L15.0203 13.6464L12.0206 10.6467C12.0205 10.6466 12.0204 10.6465 12.0203 10.6464C12.0202 10.6464 12.0201 10.6463 12.02 10.6462L7.82668 6.45282C8.35321 5.77548 8.66675 4.92436 8.66675 4C8.66675 1.79086 6.87589 0 4.66675 0C2.45761 0 0.666748 1.79086 0.666748 4C0.666748 6.20914 2.45761 8 4.66675 8Z" fill="#40404B" />
        </svg>
    );
}
