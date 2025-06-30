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
    JsonToRecord,
    JsonToRecordParams,
    RecordCreatorAPI,
    XMLToRecord,
    XMLToRecordParams,
    TypeDataWithReferences
} from "@wso2/ballerina-core";
import { StateMachine } from "../../stateMachine";
import path from "path";

export class RecordCreatorRpcManager implements RecordCreatorAPI {
    async convertJsonToRecord(params: JsonToRecordParams): Promise<JsonToRecord> {
        return new Promise(async (resolve) => {
            const response = await StateMachine.langClient().convertJsonToRecord(params) as JsonToRecord;
            resolve(response);
        });
    }

    async convertXMLToRecord(params: XMLToRecordParams): Promise<XMLToRecord> {
        return new Promise(async (resolve) => {
            const response = await StateMachine.langClient().convertXMLToRecord(params) as XMLToRecord;
            resolve(response);
        });
    }

    async convertJsonToRecordType(params: JsonToRecordParams): Promise<TypeDataWithReferences> {
        const projectUri = StateMachine.context().projectUri;
        const filePathUri = path.join(projectUri, 'types.bal');
        return new Promise(async (resolve) => {
            const response = await StateMachine.langClient().convertJsonToRecordType({
                ...params,
                filePathUri
            }) as TypeDataWithReferences;
            resolve(response);
        });
    }

    async convertXmlToRecordType(params: XMLToRecordParams): Promise<TypeDataWithReferences> {
        const projectUri = StateMachine.context().projectUri;
        const filePath = path.join(projectUri, 'types.bal');
        return new Promise(async (resolve) => {
            const response = await StateMachine.langClient().convertXmlToRecordType({
                ...params,
                filePath
            }) as TypeDataWithReferences;
            resolve(response);
        });
    }

}
