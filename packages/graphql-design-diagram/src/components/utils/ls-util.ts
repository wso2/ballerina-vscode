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

import {
    ExtendedLangClientInterface,
    GraphqlDesignService, GraphqlDesignServiceParams,
    SyntaxTree,
} from "@wso2/ballerina-core";
import { STNode } from "@wso2/syntax-tree";
import { URI } from "vscode-uri";

export async function getModelForGraphqlService(
    graphqlDesignRequest: GraphqlDesignServiceParams,
    langClientPromise: Promise<ExtendedLangClientInterface>): Promise<GraphqlDesignService> {
    const langClient: ExtendedLangClientInterface = await langClientPromise;
    const resp = await langClient.getGraphqlModel(graphqlDesignRequest) as GraphqlDesignService;
    return resp;
}

export async function getSyntaxTree(filePath: string, langClientPromise: Promise<ExtendedLangClientInterface>): Promise<STNode> {
    const langClient: ExtendedLangClientInterface = await langClientPromise;
    const resp = await langClient.getSyntaxTree({
        documentIdentifier: {
            uri: URI.file(filePath).toString()
        }
    }) as SyntaxTree;
    return resp.syntaxTree;
}
