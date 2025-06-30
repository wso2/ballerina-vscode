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

import { DisplayAnnotation } from "./ballerina";
import { DiagnosticMessage, Imports, PropertyTypeMemberInfo } from "./bi";
import { LineRange } from "./common";


export type ListenerModel = {
    id: number;
    displayAnnotation?: DisplayAnnotation;
    name: string;
    type: string;
    displayName: string;
    documentation: string;
    moduleName: string;
    orgName: string;
    version: string;
    packageName: string;
    listenerProtocol: string;
    icon: string;
    properties?: ConfigProperties;
};


export interface ServiceModel {
    id: number;
    name: string;
    type: string;
    displayName?: string;
    documentation?: string;
    moduleName: string;
    orgName: string;
    version: string;
    packageName: string;
    listenerProtocol: string;
    icon: string;
    properties?: ConfigProperties;
    functions?: FunctionModel[];
    displayAnnotation?: DisplayAnnotation;
    codedata?: CodeData;
}

export interface ServiceClassModel { // for Ballerina Service Classes
    id: number;
    name: string;
    type: string;
    properties?: ConfigProperties;
    functions?: FunctionModel[];
    displayAnnotation?: DisplayAnnotation;
    codedata?: CodeData;
    fields?: FieldType[];
}


export interface FieldType extends ParameterModel {
    codedata: CodeData;
    isPrivate: boolean;
    isFinal: boolean;
}

export interface FunctionModel {
    metadata?: MetaData;
    kind: "REMOTE" | "RESOURCE" | "QUERY" | "MUTATION" | "SUBSCRIPTION" | "DEFAULT" | "INIT";
    enabled: boolean;
    optional: boolean;
    editable: boolean;
    codedata?: CodeData;

    canAddParameters?: boolean;

    // accessor will be used by resource functions
    accessor?: PropertyModel;

    name: PropertyModel;
    parameters: ParameterModel[];
    schema?: ConfigProperties;
    returnType: ReturnTypeModel;
    qualifiers?: string[];
}


export interface ReturnTypeModel extends PropertyModel {
    responses?: StatusCodeResponse[];
    schema?: ConfigProperties;
}
export interface StatusCodeResponse extends PropertyModel {
    statusCode: PropertyModel;
    body: PropertyModel;
    name: PropertyModel;
    type: PropertyModel;
    headers: PropertyModel;
}

interface MetaData {
    label: string;
    description: string;
    groupNo?: number;
    groupName?: string;
}

interface CodeData {
    label?: string;
    description?: string;
    groupNo?: number;
    groupName?: string;
    lineRange?: LineRange;
    inListenerInit: boolean;
    isBasePath: boolean;
    inDisplayAnnotation: boolean;
    type?: string;
}

export interface PropertyModel {
    metadata?: MetaData;
    codedata?: CodeData;
    enabled?: boolean;
    editable?: boolean;
    isHttpResponseType?: boolean;
    value?: string;
    values?: string[];
    valueType?: string;
    valueTypeConstraint?: string;
    isType?: boolean;
    placeholder?: string;
    defaultValue?: string | PropertyModel;
    optional?: boolean;
    advanced?: boolean;
    items?: string[];
    choices?: PropertyModel[];
    properties?: ConfigProperties;
    addNewButton?: boolean;
    typeMembers?: PropertyTypeMemberInfo[];
    httpParamType?: "QUERY" | "Header" | "PAYLOAD";
    diagnostics?: DiagnosticMessage[];
    imports?: Imports;
}

export interface ParameterModel extends PropertyModel {
    kind?: "REQUIRED" | "OPTIONAL",
    type?: PropertyModel;
    name?: PropertyModel;
}


export interface ConfigProperties {
    [key: string]: PropertyModel | ParameterModel;
}
