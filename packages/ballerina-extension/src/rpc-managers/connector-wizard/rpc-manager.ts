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
    Connector,
    ConnectorRequest,
    ConnectorResponse,
    ConnectorWizardAPI,
    ConnectorsRequest,
    ConnectorsResponse
} from "@wso2/ballerina-core";
import { StateMachine } from "../../stateMachine";


export class ConnectorWizardRpcManager implements ConnectorWizardAPI {
    async getConnector(params: ConnectorRequest): Promise<ConnectorResponse> {
        return new Promise((resolve) => {
            StateMachine.langClient()
                .getConnector(params)
                .then((connector) => {
                    console.log(">>> received connector", connector);
                    resolve(connector as Connector);
                })
                .catch((error) => {
                    console.log(">>> error fetching connector", error);
                    return new Promise((resolve) => {
                        resolve(undefined);
                    });
                });
        });
    }

    async getConnectors(params: ConnectorsRequest): Promise<ConnectorsResponse> {
        return new Promise((resolve) => {
            StateMachine.langClient()
                .getConnectors(params)
                .then((connectors) => {
                    console.log(">>> received connectors", connectors);
                    resolve(connectors as ConnectorsResponse);
                })
                .catch((error) => {
                    console.log(">>> error fetching connectors", error);
                    return new Promise((resolve) => {
                        resolve(undefined);
                    });
                });
        });
    }
}
