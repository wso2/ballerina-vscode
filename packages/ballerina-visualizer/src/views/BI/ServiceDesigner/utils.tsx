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

import { responseCodes } from '@wso2/ballerina-core';

export enum HTTP_METHOD {
    "GET" = "GET",
    "PUT" = "PUT",
    "POST" = "POST",
    "DELETE" = "DELETE",
    "PATCH" = "PATCH"
}

export function getDefaultResponse(httpMethod: HTTP_METHOD): number {
    switch (httpMethod.toUpperCase()) {
        case HTTP_METHOD.GET:
            return 200;
        case HTTP_METHOD.PUT:
            return 200;
        case HTTP_METHOD.POST:
            return 201;
        case HTTP_METHOD.DELETE:
            return 200;
        case HTTP_METHOD.PATCH:
            return 200;
        default:
            return 200;
    }
}

export function getTitleFromResponseCode(code: number): string {
    const response = responseCodes.find((response) => response.code === code);
    return response ? response.title : "";
}
