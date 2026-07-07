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
import { ChangeTypeEnum, Flow, NodePosition, ParentMetadata } from "@wso2/ballerina-core";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { ProgressRing, ThemeColors } from "@wso2/ui-toolkit";
import { Diagram, mergeFlowModelsForDiff, stampDiffState } from "@wso2/bi-diagram";

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

export type ReviewViewMode = "diff" | "new" | "old";

interface ReadonlyFlowDiagramProps {
    projectPath: string;
    filePath: string;
    position: NodePosition;
    onModelLoaded?: (metadata: ItemMetadata) => void;
    viewMode: ReviewViewMode;
    changeType: number;
    onDiffUnavailable?: () => void;
}

function getEventStartData(flow: Flow): ParentMetadata | undefined {
    const eventStartNode = flow?.nodes?.find((node) => node.codedata?.node === "EVENT_START");
    return eventStartNode?.metadata?.data as ParentMetadata | undefined;
}

// The old-version lookup reuses the new version's position, so line shifts in the old file
// can land on a different function. Reject the pair when the resolved functions differ.
function isSameFunction(oldFlow: Flow, newFlow: Flow): boolean {
    const oldData = getEventStartData(oldFlow);
    const newData = getEventStartData(newFlow);
    if (!oldData || !newData) {
        return true; // cannot verify; let the merge proceed
    }
    return oldData.label === newData.label && oldData.accessor === newData.accessor;
}

export function ReadonlyFlowDiagram(props: ReadonlyFlowDiagramProps): JSX.Element {
    const { filePath, position, onModelLoaded, viewMode, changeType, onDiffUnavailable } = props;
    const { rpcClient } = useRpcContext();
    const [flowModel, setFlowModel] = useState<Flow | null>(null);

    useEffect(() => {
        setFlowModel(null);
        let cancelled = false;
        loadFlowModel()
            .then((model) => {
                if (cancelled || !model) {
                    return;
                }
                setFlowModel(model);

                // Extract metadata from EVENT_START node
                const data = getEventStartData(model);
                if (onModelLoaded && data) {
                    onModelLoaded({
                        type: (data as any).kind || "Function",
                        name: data.label || "Unknown",
                        accessor: data.accessor,
                    });
                }
            })
            .catch((error) => {
                console.error("[Reviewing Changes] Error loading flow model:", error);
            });
        return () => {
            cancelled = true;
        };
    }, [filePath, position, viewMode]);

    // Fetch one version of the enclosing function's flow model.
    // useFileSchema=true reads the frozen original (file://); false reads the modified temp content (ai://).
    const fetchFlowModelVersion = async (useFileSchema: boolean): Promise<Flow | null> => {
        // First resolve the full function range using getEnclosedFunction,
        // since the position from semantic diff may only cover the changed statement
        const enclosedFn = await rpcClient.getBIDiagramRpcClient().getEnclosedFunction({
            filePath: filePath,
            position: { line: position.startLine, offset: position.startColumn },
            useFileSchema,
        });
        const startLine = enclosedFn?.startLine ?? { line: position.startLine, offset: position.startColumn };
        const endLine = enclosedFn?.endLine ?? { line: position.endLine, offset: position.endColumn };

        const response = await rpcClient.getBIDiagramRpcClient().getFlowModel({
            filePath: filePath,
            startLine,
            endLine,
            useFileSchema,
        });
        return response?.flowModel ?? null;
    };

    const loadFlowModel = async (): Promise<Flow | null> => {
        if (viewMode === "old") {
            return fetchFlowModelVersion(true);
        }
        if (viewMode === "new") {
            return fetchFlowModelVersion(false);
        }

        // unified diff mode
        if (changeType === ChangeTypeEnum.ADDITION) {
            const newFlow = await fetchFlowModelVersion(false);
            return newFlow ? stampDiffState(newFlow, "added") : null;
        }
        if (changeType === ChangeTypeEnum.DELETION) {
            const oldFlow = await fetchFlowModelVersion(true);
            return oldFlow ? stampDiffState(oldFlow, "removed") : null;
        }

        // modification: merge old and new into a single diagram
        const [oldFlow, newFlow] = await Promise.all([
            fetchFlowModelVersion(true).catch((error): Flow | null => {
                console.error("[Reviewing Changes] Error fetching old flow model:", error);
                return null;
            }),
            fetchFlowModelVersion(false),
        ]);
        if (!newFlow) {
            return oldFlow;
        }
        if (!oldFlow || !isSameFunction(oldFlow, newFlow)) {
            onDiffUnavailable?.();
            return newFlow;
        }
        try {
            return mergeFlowModelsForDiff(oldFlow, newFlow);
        } catch (error) {
            console.error("[Reviewing Changes] Error merging flow models for diff:", error);
            onDiffUnavailable?.();
            return newFlow;
        }
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
