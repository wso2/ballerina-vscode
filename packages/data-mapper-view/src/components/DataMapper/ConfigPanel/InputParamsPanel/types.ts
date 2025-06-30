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

export interface DataMapperInputParam {
    name: string;
    type: string;
    isUnsupported?: boolean;
    typeNature?: TypeNature;
    isArray?: boolean;
}

export interface DataMapperOutputParam {
    type: string;
    isUnsupported?: boolean;
    typeNature?: TypeNature;
    isArray?: boolean;
}

export enum TypeNature {
    BLACKLISTED,
    WHITELISTED,
    YET_TO_SUPPORT,
    INVALID,
    NOT_FOUND,
    TYPE_UNAVAILABLE,
    PARAM_NAME_UNAVAILABLE,
    DUMMY
}

export interface WarningBannerProps {
    message: React.ReactNode | string;
}

