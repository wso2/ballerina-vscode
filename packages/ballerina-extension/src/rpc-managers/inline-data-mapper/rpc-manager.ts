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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */
import {
    AddArrayElementRequest,
    AddClausesRequest,
    AddSubMappingRequest,
    ConvertToQueryRequest,
    EVENT_TYPE,
    GetInlineDataMapperCodedataRequest,
    GetInlineDataMapperCodedataResponse,
    GetSubMappingCodedataRequest,
    InitialIDMSourceRequest,
    InitialIDMSourceResponse,
    InlineAllDataMapperSourceRequest,
    InlineDataMapperAPI,
    InlineDataMapperModelRequest,
    InlineDataMapperModelResponse,
    InlineDataMapperSourceRequest,
    InlineDataMapperSourceResponse,
    MACHINE_VIEW,
    PropertyRequest,
    PropertyResponse,
    VisualizableFieldsRequest,
    VisualizableFieldsResponse
} from "@wso2/ballerina-core";

import { openView, StateMachine } from "../../stateMachine";
import { updateSourceCode } from "../../utils";
import {
    buildSourceRequests,
    consolidateTextEdits,
    fetchDataMapperCodeData,
    getHasStopped,
    processSourceRequests,
    setHasStopped,
    updateAndRefreshDataMapper,
    updateInlineDataMapperViewWithParams,
    updateSourceCodeWithEdits
} from "./utils";

export class InlineDataMapperRpcManager implements InlineDataMapperAPI {
    async getInitialIDMSource(params: InitialIDMSourceRequest): Promise<InitialIDMSourceResponse> {
        console.log(">>> requesting inline data mapper initial source from ls", params);
        return new Promise((resolve) => {
            StateMachine
                .langClient()
                .getSourceCode(params)
                .then(async (model) => {
                    console.log(">>> inline data mapper initial source from ls", model);
                    await updateSourceCode({ textEdits: model.textEdits });

                    let modelCodeData = params.flowNode.codedata;
                    if (modelCodeData.isNew) {
                        // Clone the object to avoid mutating the original reference
                        const clonedModelCodeData = { ...modelCodeData };
                        clonedModelCodeData.lineRange.startLine.line+=1;
                        clonedModelCodeData.lineRange.endLine.line+=1;
                        modelCodeData = clonedModelCodeData;
                    }

                    const varName = params.flowNode.properties?.variable?.value as string ?? null;
                    const codeData = await fetchDataMapperCodeData(params.filePath, modelCodeData, varName);

                    openView(EVENT_TYPE.OPEN_VIEW, {
                        view: MACHINE_VIEW.InlineDataMapper,
                        documentUri: params.filePath,
                        position: {
                            startLine: codeData.lineRange.startLine.line,
                            startColumn: codeData.lineRange.startLine.offset,
                            endLine: codeData.lineRange.endLine.line,
                            endColumn: codeData.lineRange.endLine.offset
                        },
                        dataMapperMetadata: {
                            name: varName,
                            codeData: codeData
                        }
                    });
                    resolve({ textEdits: model.textEdits });
                })
                .catch((error) => {
                    console.log(">>> error fetching inline data mapper initial source from ls", error);
                    return new Promise((resolve) => {
                        resolve({ artifacts: [], error: error });
                    });
                });
        });
    }

    async getDataMapperModel(params: InlineDataMapperModelRequest): Promise<InlineDataMapperModelResponse> {
        return new Promise(async (resolve) => {
            const dataMapperModel = await StateMachine
                .langClient()
                .getInlineDataMapperMappings(params);

            resolve(dataMapperModel as InlineDataMapperModelResponse);
        });
    }

    async getDataMapperSource(params: InlineDataMapperSourceRequest): Promise<InlineDataMapperSourceResponse> {
        return new Promise(async (resolve) => {
            StateMachine
                .langClient()
                .getInlineDataMapperSource(params)
                .then(async (resp) => {
                    console.log(">>> inline data mapper initial source from ls", resp);
                    await updateAndRefreshDataMapper(resp.textEdits, params.filePath, params.codedata, params.varName);
                    resolve({ textEdits: resp.textEdits });
                });
        });
    }

    async getVisualizableFields(params: VisualizableFieldsRequest): Promise<VisualizableFieldsResponse> {
        return new Promise(async (resolve) => {
            const fieldIds = await StateMachine
                .langClient()
                .getVisualizableFields(params) as VisualizableFieldsResponse;

            resolve(fieldIds);
        });
    }

    async addNewArrayElement(params: AddArrayElementRequest): Promise<InlineDataMapperSourceResponse> {
        return new Promise(async (resolve) => {
            await StateMachine
                .langClient()
                .addArrayElement({
                    filePath: params.filePath,
                    codedata: params.codedata,
                    targetField: params.targetField,
                    propertyKey: params.propertyKey
                })
                .then(async (resp) => {
                    console.log(">>> inline data mapper add array element response", resp);
                    await updateAndRefreshDataMapper(resp.textEdits, params.filePath, params.codedata, params.varName);
                    resolve({ textEdits: resp.textEdits });
                });
        });
    }

    async convertToQuery(params: ConvertToQueryRequest): Promise<InlineDataMapperSourceResponse> {
        return new Promise(async (resolve) => {
            await StateMachine
                .langClient()
                .convertToQuery(params)
                .then(async (resp) => {
                    console.log(">>> inline data mapper convert to query response", resp);
                    await updateAndRefreshDataMapper(resp.textEdits, params.filePath, params.codedata, params.varName);
                    resolve({ textEdits: resp.textEdits });
                });
        });
    }

    async addClauses(params: AddClausesRequest): Promise<InlineDataMapperSourceResponse> {
        return new Promise(async (resolve) => {
            await StateMachine
                .langClient()
                .addClauses(params)
                .then(async (resp) => {
                    console.log(">>> inline data mapper add clauses response", resp);
                    await updateAndRefreshDataMapper(resp.textEdits, params.filePath, params.codedata, params.varName);
                    resolve({ textEdits: resp.textEdits });
                });
        });
    }

    async addSubMapping(params: AddSubMappingRequest): Promise<InlineDataMapperSourceResponse> {
        return new Promise(async (resolve) => {
            await StateMachine
                .langClient()
                .addSubMapping(params)
                .then(async (resp) => {
                    console.log(">>> inline data mapper add sub mapping response", resp);
                    await updateAndRefreshDataMapper(resp.textEdits, params.filePath, params.codedata, params.varName);
                    resolve({ textEdits: resp.textEdits });
                });
        });
    }

    async getDataMapperCodedata(params: GetInlineDataMapperCodedataRequest): Promise<GetInlineDataMapperCodedataResponse> {
        return new Promise(async (resolve) => {
            const dataMapperCodedata = await StateMachine
                .langClient()
                .getDataMapperCodedata(params) as GetInlineDataMapperCodedataResponse;

            resolve(dataMapperCodedata);
        });
    }

    async getSubMappingCodedata(params: GetSubMappingCodedataRequest): Promise<GetInlineDataMapperCodedataResponse> {
        return new Promise(async (resolve) => {
            const dataMapperCodedata = await StateMachine
                .langClient()
                .getSubMappingCodedata(params) as GetInlineDataMapperCodedataResponse;

            resolve(dataMapperCodedata);
        });
    }

    async getAllDataMapperSource(params: InlineAllDataMapperSourceRequest): Promise<InlineDataMapperSourceResponse> {
        return new Promise(async (resolve) => {
            setHasStopped(false);

            const sourceRequests = buildSourceRequests(params);
            const responses = await processSourceRequests(sourceRequests);
            const allTextEdits = consolidateTextEdits(responses, params.mappings.length);

            await updateSourceCodeWithEdits({ textEdits: allTextEdits })
                .then(async () => {
                    await updateInlineDataMapperViewWithParams(params);
                    resolve({ textEdits: allTextEdits });
                })
                .catch((error) => {
                    console.error(">>> error in fetching text edit from mappings", error);
                    resolve({
                        error: error instanceof Error ? error.message : "Unknown error occurred",
                        userAborted: getHasStopped()
                    });
                });
        });
    }

    async getProperty(params: PropertyRequest): Promise<PropertyResponse> {
        return new Promise(async (resolve) => {
            const property = await StateMachine
                .langClient()
                .getProperty(params) as PropertyResponse;

            resolve(property);
        });
    }

}
