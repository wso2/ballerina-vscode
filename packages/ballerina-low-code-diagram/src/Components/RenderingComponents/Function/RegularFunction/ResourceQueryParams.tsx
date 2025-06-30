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
// tslint:disable: jsx-no-multiline-js
import React from "react";

import {
    AnyTypeDesc,
    CommaToken,
    DefaultableParam,
    DotToken,
    IdentifierToken,
    IncludedRecordParam,
    RequiredParam,
    ResourcePathRestParam,
    ResourcePathSegmentParam,
    RestParam,
    SlashToken,
    STKindChecker,
} from "@wso2/syntax-tree";

import "./style.scss";

interface ResourceQueryParamsProps {
    parameters: (
        | CommaToken
        | DefaultableParam
        | IncludedRecordParam
        | RequiredParam
        | RestParam
    )[];
    relativeResourcePath: (DotToken | IdentifierToken | ResourcePathRestParam | ResourcePathSegmentParam | SlashToken)[];
}

export function ResourceQueryParams(props: ResourceQueryParamsProps) {
    const { parameters, relativeResourcePath } = props;

    const pathElements = relativeResourcePath.map(relativePath => {
        switch (relativePath.kind) {
            case 'ResourcePathSegmentParam':
                return (
                    <>
                        [<span className={'type-descriptor'}>
                            {`${(relativePath as any).typeDescriptor?.name?.value} `}
                        </span>
                        {(relativePath as any).paramName?.value}]
                    </>
                );
            default:
                return relativePath.value
        }
    });

    const queryParamComponents = parameters
        .filter((param) => !STKindChecker.isCommaToken(param))
        .filter(
            (param) =>
                STKindChecker.isRequiredParam(param) &&
                (STKindChecker.isStringTypeDesc(param.typeName) ||
                    STKindChecker.isIntTypeDesc(param.typeName) ||
                    STKindChecker.isBooleanTypeDesc(param.typeName) ||
                    STKindChecker.isFloatTypeDesc(param.typeName) ||
                    STKindChecker.isDecimalTypeDesc(param.typeName))
        )
        .map((param: RequiredParam, i) => (
            <span key={i}>
                {i !== 0 ? "&" : ""}
                {param.paramName.value}
                <sub className={'type-descriptor'}>{(param.typeName as AnyTypeDesc)?.name?.value}</sub>
            </span>
        ));

    return (
        <div className={"param-container"}>
            <p className={"path-text"}>
                {pathElements.length === 1 && pathElements[0] === '.' ? "/" : pathElements}
                <span>&nbsp;</span>
                {queryParamComponents.length > 0 ? "?" : ""}
                <span>&nbsp;</span>
                {queryParamComponents}
            </p>
        </div>
    );
}
