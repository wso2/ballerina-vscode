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

import { AIMachineEventType } from "@wso2/ballerina-core";

interface FetchWithAuthParams {
    url: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    body?: any;
    rpcClient: any;
}

// Global controller for aborting requests
let controller: AbortController | null = null;

export const fetchWithAuth = async ({
    url,
    method,
    body,
    rpcClient,
}: FetchWithAuthParams): Promise<Response> => {
    controller?.abort();

    controller = new AbortController();

    const makeRequest = async (authToken: string): Promise<Response> =>
        fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller!.signal,
        });

    let finalToken;
    try {
        finalToken = await rpcClient.getAiPanelRpcClient().getAccessToken();
    } catch (error) {
        if (isErrorWithMessage(error) && error?.message === "TOKEN_EXPIRED") {
            rpcClient.sendAIStateEvent(AIMachineEventType.SILENT_LOGOUT);
            return;
        }
        throw error;
    }

    let response = await makeRequest(finalToken);

    if (response.status === 401) {
        finalToken = await rpcClient.getAiPanelRpcClient().getRefreshedAccessToken();
        if (finalToken) {
            response = await makeRequest(finalToken);
        }
    }

    return response;
}

// Function to abort the fetch request
export function abortFetchWithAuth() {
    if (controller) {
        controller.abort();
        controller = null;
    }
}

function isErrorWithMessage(error: unknown): error is { message: string } {
    return typeof error === 'object' && error !== null && 'message' in error;
}
