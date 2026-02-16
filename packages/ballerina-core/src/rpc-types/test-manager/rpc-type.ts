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
import { GetTestFunctionRequest, GetTestFunctionResponse, AddOrUpdateTestFunctionRequest } from "../../interfaces/extended-lang-client";
import { RequestType } from "vscode-messenger-common";
import { SourceUpdateResponse } from "../service-designer/interfaces";

const _preFix = "test-manager";
export const getTestFunction: RequestType<GetTestFunctionRequest, GetTestFunctionResponse> =
{ method: `${_preFix}/getTestFunction` };
export const addTestFunction: RequestType<AddOrUpdateTestFunctionRequest, SourceUpdateResponse> =
{ method: `${_preFix}/addTestFunction` };
export const updateTestFunction: RequestType<AddOrUpdateTestFunctionRequest, SourceUpdateResponse> =
{ method: `${_preFix}/updateTestFunction` };

export interface EvalsetItem {
    id: string;
    name: string;
    filePath: string;
    threadCount: number;
    description?: string;
}

export interface GetEvalsetsRequest {
    projectPath?: string;
}

export interface GetEvalsetsResponse {
    evalsets: EvalsetItem[];
}

export const getEvalsets: RequestType<GetEvalsetsRequest, GetEvalsetsResponse> =
{ method: `${_preFix}/getEvalsets` };
