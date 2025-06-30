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
  CommaToken,
  DefaultableParam,
  IncludedRecordParam,
  RequiredParam,
  RestParam,
  STKindChecker,
} from "@wso2/syntax-tree";

import "./style.scss";

interface ResourceOtherParamsProps {
  parameters: (
    | CommaToken
    | DefaultableParam
    | IncludedRecordParam
    | RequiredParam
    | RestParam
  )[];
}

export function ResourceOtherParams(props: ResourceOtherParamsProps) {
  const { parameters } = props;

  const otherParamComponents = parameters
    .filter((param) => !STKindChecker.isCommaToken(param))
    .filter(
      (param) =>
        STKindChecker.isRequiredParam(param) &&
        !(
          STKindChecker.isStringTypeDesc(param.typeName) ||
          STKindChecker.isIntTypeDesc(param.typeName) ||
          STKindChecker.isBooleanTypeDesc(param.typeName) ||
          STKindChecker.isFloatTypeDesc(param.typeName) ||
          STKindChecker.isDecimalTypeDesc(param.typeName)
        )
    )
    .map((param: RequiredParam, i) => (
      <span key={i} className={"signature-param"}>
        {param.source}
      </span>
    ));

  return (
    <div className={"param-container"}>
      <p className={"path-text"}>{otherParamComponents}</p>
    </div>
  );
}
