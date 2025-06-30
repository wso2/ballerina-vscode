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

import React, { ReactNode, useEffect, useState } from "react";
import styled from "@emotion/styled";
import { ExpressionFormField } from "@wso2/ballerina-side-panel";
import { FlowNode, LineRange, SubPanel } from "@wso2/ballerina-core";
import FormGenerator from "../../Forms/FormGenerator";
import { useRpcContext } from "@wso2/ballerina-rpc-client";

const Container = styled.div`
    max-width: 600px;
    height: calc(100% - 32px);
`;

export interface SidePanelProps {
    id?: string;
    className?: string;
    isOpen?: boolean;
    overlay?: boolean;
    children?: React.ReactNode;
    alignment?: "left" | "right";
    width?: number;
    sx?: any;
    onClose?: (event?: React.MouseEvent<HTMLElement, MouseEvent>) => void;
    subPanel?: ReactNode;
    subPanelWidth?: number;
    isSubPanelOpen?: boolean;
}

interface ConnectionConfigViewProps {
    fileName: string; // file path of `connection.bal`
    submitText?: string;
    isSaving?: boolean;
    selectedNode: FlowNode;
    onSubmit: (node?: FlowNode) => void;
    openSubPanel?: (subPanel: SubPanel) => void;
    updatedExpressionField?: ExpressionFormField;
    resetUpdatedExpressionField?: () => void;
    isActiveSubPanel?: boolean;
    isPullingConnector?: boolean;
}

export function ConnectionConfigView(props: ConnectionConfigViewProps) {
    const {
        fileName,
        selectedNode,
        onSubmit,
        openSubPanel,
        updatedExpressionField,
        resetUpdatedExpressionField,
        isPullingConnector,
        submitText,
        isSaving,
    } = props;
    const { rpcClient } = useRpcContext();
    const [targetLineRange, setTargetLineRange] = useState<LineRange>();

    useEffect(() => {
        if (selectedNode?.codedata?.lineRange) {
            setTargetLineRange(selectedNode.codedata.lineRange);
            return;
        }

        if (rpcClient && fileName) {
            rpcClient
                .getBIDiagramRpcClient()
                .getEndOfFile({ filePath: fileName })
                .then((res) => {
                    setTargetLineRange({
                        startLine: res,
                        endLine: res,
                    });
                });
        } else {
            setTargetLineRange({
                startLine: { line: 0, offset: 0 },
                endLine: { line: 0, offset: 0 },
            })
        }
    }, [fileName, selectedNode, rpcClient]);

    return (
        <Container>
            {targetLineRange && (
                <FormGenerator
                    showProgressIndicator={isSaving}
                    submitText={submitText}
                    fileName={fileName}
                    node={selectedNode}
                    targetLineRange={targetLineRange}
                    onSubmit={onSubmit}
                    openSubPanel={openSubPanel}
                    updatedExpressionField={updatedExpressionField}
                    resetUpdatedExpressionField={resetUpdatedExpressionField}
                    disableSaveButton={isPullingConnector}
                />
            )}
        </Container>
    );
}

export default ConnectionConfigView;
