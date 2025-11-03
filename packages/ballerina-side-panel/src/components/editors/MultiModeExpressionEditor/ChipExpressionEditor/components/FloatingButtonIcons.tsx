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

export const OpenHelperButton = () => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path
                fill="currentColor"
                d="m12 11.5l4-4H8zM19 3q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21H5q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3zM5 16v3h14v-3zm14-2V5H5v9zM5 16v3z"
            />
        </svg>
    );
};

export const CloseHelperButton = () => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path
                fill="currentColor"
                d="M8 11.5h8l-4-4zM5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-7h14V5H5z"
            />
        </svg>
    );
};

export const ExpandButton = () => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path
                fill="currentColor"
                d="m12 15.15l-1.875-1.875q-.3-.3-.7-.3t-.7.3t-.3.713t.3.712l2.575 2.6q.3.3.7.3t.7-.3l2.6-2.6q.3-.3.3-.712t-.3-.713t-.712-.3t-.713.3zm0-6.3l1.875 1.875q.3.3.7.3t.7-.3t.3-.712t-.3-.713L12.7 6.7q-.3-.3-.7-.3t-.7.3L8.7 9.3q-.3.3-.287.7t.312.7t.713.3t.712-.3zM5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14V5H5zM5 5v14z"
            />
        </svg>
    );
};
