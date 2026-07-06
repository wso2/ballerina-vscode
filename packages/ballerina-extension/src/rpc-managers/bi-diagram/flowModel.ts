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

// Flow-model handler extracted from the bi-diagram rpc-manager. That manager is a "god
// module" whose ~26 imports transitively pull the whole extension activation graph
// (core/extension.ts, ai/tracing/debugger features), so it cannot be loaded headlessly
// for testing. This module has a NARROW import graph (StateMachine + vscode Uri only),
// so the real handler can run against the real LS with no VSCode — see
// test-support/ls-integration/biDiagramHeadless.test.ts. The manager re-uses these, so
// behaviour is unchanged. This is the decoupling template for the manager's other
// LS-facing handlers.

import { Uri } from "vscode";
import { BIFlowModelRequest, BIFlowModelResponse } from "@wso2/ballerina-core";
import { StateMachine } from "../../stateMachine";

export function convertAiToFileScheme(uri: string): string {
    if (uri.startsWith("ai://")) {
        return Uri.parse(uri).with({ scheme: "file" }).toString();
    }
    return uri;
}

export async function getFlowModel(params: BIFlowModelRequest): Promise<BIFlowModelResponse> {
    return new Promise((resolve) => {
        let request: BIFlowModelRequest;

        // If params has all required fields, use them directly
        if (params?.filePath && params?.startLine && params?.endLine) {
            let filePath = params.filePath;
            // When useFileSchema is set, use file:// scheme to show original content
            if (params.useFileSchema) {
                filePath = convertAiToFileScheme(filePath);
            }
            request = {
                filePath,
                startLine: params.startLine,
                endLine: params.endLine,
                forceAssign: params.forceAssign ?? true,
            };
        } else {
            // Fall back to context if params are not complete
            const context = StateMachine.context();

            if (!context.position) {
                resolve(undefined);
                return;
            }

            request = {
                filePath: params?.filePath || context.documentUri,
                startLine: params?.startLine || {
                    line: context.position.startLine ?? 0,
                    offset: context.position.startColumn ?? 0,
                },
                endLine: params?.endLine || {
                    line: context.position.endLine ?? 0,
                    offset: context.position.endColumn ?? 0,
                },
                forceAssign: params?.forceAssign ?? true,
            };
        }

        StateMachine.langClient()
            .getFlowModel(request)
            .then((model) => resolve(model))
            .catch(() => resolve(undefined));
    });
}
