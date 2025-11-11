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
import { useQuery } from "@tanstack/react-query";
import { BallerinaProjectComponents, SyntaxTreeResponse } from "@wso2/ballerina-core";
import { LangClientRpcClient } from "@wso2/ballerina-rpc-client";
import { URI } from "vscode-uri";

const RECORD_CREATOR_SUPPORTED_VERSION = {major: 2201, minor: 7, patch: 2};

export const useBallerinaVersion = (
    langServerRpcClient: LangClientRpcClient
): {
    ballerinaVersion: string;
    isFetching: boolean;
    isError: boolean;
    refetch: () => void;
} => {
    const fetchBallerinaVersion = async () => {
        try {
            const ballerinaVersion = await langServerRpcClient.getBallerinaVersion();
            return ballerinaVersion.version;
        } catch (networkError: any) {
            console.error("Error while fetching ballerina version", networkError);
        }
    };

    const {
        data: ballerinaVersion,
        isFetching,
        isError,
        refetch,
    } = useQuery({
        queryKey: ["fetchBallerinaVersion"],
        queryFn: fetchBallerinaVersion,
        networkMode: 'always'
    });

    return { ballerinaVersion, isFetching, isError, refetch };
};

export const useVersionCompatibility = (
    langServerRpcClient: LangClientRpcClient
): {
    isVersionCompatible: boolean;
    isFetching: boolean;
    isError: boolean;
    refetch: () => void;
} => {
    const checkVersionCompatibility = async () => {
        try {
            const isCompatible = await langServerRpcClient.isSupportedSLVersion(RECORD_CREATOR_SUPPORTED_VERSION);
            return isCompatible;
        } catch (networkError: any) {
            console.error("Error while checking version compatibility in record creator", networkError);
        }
    };

    const {
        data: isVersionCompatible,
        isFetching,
        isError,
        refetch,
    } = useQuery({
        queryKey: ["checkVersionCompatibility"],
        queryFn: checkVersionCompatibility,
        networkMode: 'always'
    });

    return { isVersionCompatible, isFetching, isError, refetch };
};

export const useFullST = (
    filePath: string,
    langServerRpcClient: LangClientRpcClient
): {
    fullST: SyntaxTreeResponse;
    isFetching: boolean;
    isError: boolean;
    refetch: any;
} => {
    const fetchFullST = async () => {
        try {
            const fullST = await langServerRpcClient.getST({
                documentIdentifier: { uri: URI.file(filePath).toString() },
            });
            return fullST;
        } catch (networkError: any) {
            console.error("Error while fetching full syntax tree", networkError);
        }
    };

    const {
        data: fullST,
        isFetching,
        isError,
        refetch,
    } = useQuery({
        queryKey: ["fetchFullST", filePath],
        queryFn: fetchFullST,
        networkMode: 'always'
    });

    return { fullST, isFetching, isError, refetch };
};

export const useBallerinaProjectComponent = (
    filePath: string,
    langServerRpcClient: LangClientRpcClient
): {
    ballerinaProjectComponents: BallerinaProjectComponents;
    isFetching: boolean;
    isError: boolean;
    refetch: any;
} => {
    const fetchBallerinaProjectComponents = async () => {
        try {
            const ballerinaProjectComponents = await langServerRpcClient.getBallerinaProjectComponents({
                documentIdentifiers: [
                    { uri: URI.file(filePath).toString() }
                ],
            });
            return ballerinaProjectComponents;
        } catch (networkError: any) {
            console.error("Error while fetching ballerina project components", networkError);
        }
    };

    const {
        data: ballerinaProjectComponents,
        isFetching,
        isError,
        refetch,
    } = useQuery({
        queryKey: ["fetchBallerinaProjectComponents", filePath],
        queryFn: fetchBallerinaProjectComponents,
        networkMode: 'always'
    });

    return { ballerinaProjectComponents, isFetching, isError, refetch };
};
