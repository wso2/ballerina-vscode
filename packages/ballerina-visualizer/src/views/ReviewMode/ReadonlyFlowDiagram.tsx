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

import React, { useEffect, useState } from "react";
import { Flow, NodePosition } from "@wso2/ballerina-core";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { ProgressRing, ThemeColors } from "@wso2/ui-toolkit";
import { Diagram } from "@wso2/bi-diagram";

const SpinnerContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

const Container = styled.div`
    height: 100%;
    pointer-events: auto;
`;

interface ItemMetadata {
    type: string;
    name: string;
    accessor?: string;
}

interface ReadonlyFlowDiagramProps {
    projectPath: string;
    filePath: string;
    position: NodePosition;
    onModelLoaded?: (metadata: ItemMetadata) => void;
    useFileSchema?: boolean;
}

export function ReadonlyFlowDiagram(props: ReadonlyFlowDiagramProps): JSX.Element {
    const { filePath, position, onModelLoaded, useFileSchema } = props;
    const { rpcClient } = useRpcContext();
    const [flowModel, setFlowModel] = useState<Flow | null>(null);

    useEffect(() => {
        setFlowModel(null);
        fetchFlowModel();
    }, [filePath, position, useFileSchema]);

    const fetchFlowModel = () => {
        // First resolve the full function range using getEnclosedFunction,
        // since the position from semantic diff may only cover the changed statement
        rpcClient
            .getBIDiagramRpcClient()
            .getEnclosedFunction({
                filePath: filePath,
                position: { line: position.startLine, offset: position.startColumn },
                useFileSchema,
            })
            .then((enclosedFn) => {
                const startLine = enclosedFn?.startLine ?? { line: position.startLine, offset: position.startColumn };
                const endLine = enclosedFn?.endLine ?? { line: position.endLine, offset: position.endColumn };

                return rpcClient
                    .getBIDiagramRpcClient()
                    .getFlowModel({
                        filePath: filePath,
                        startLine,
                        endLine,
                        useFileSchema,
                    });
            })
            .then((response) => {
                if (response?.flowModel) {
                    setFlowModel(response.flowModel);

                    // Extract metadata from EVENT_START node
                    if (onModelLoaded && response.flowModel.nodes) {
                        const eventStartNode = response.flowModel.nodes.find(
                            (node: any) => node.codedata?.node === 'EVENT_START'
                        );

                        if (eventStartNode?.metadata?.data) {
                            const data = eventStartNode.metadata.data as any;
                            onModelLoaded({
                                type: data.kind || 'Function',
                                name: data.label || 'Unknown',
                                accessor: data.accessor
                            });
                        }
                    }
                }
            });
    };

    if (!flowModel) {
        return (
            <SpinnerContainer>
                <ProgressRing color={ThemeColors.PRIMARY} />
            </SpinnerContainer>
        );
    }

    return (
        <Container>
            <Diagram model={flowModel} readOnly={true} />
        </Container>
    );
}
