/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import React, { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { Codicon, Overlay, ProgressRing, ThemeColors, Typography } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { CodeData, FlowNode } from "@wso2/ballerina-core";

import { Form } from "../../Form";
import { FormField, FormValues } from "../../Form/types";
import { useFormContext } from "../../../context";
import { convertConfig } from "../../../utils/convertConfig";

interface CreateConnectionOverlayProps {
    connector: CodeData;
    title: string;
    onClose: () => void;
    onSaved: (variableName: string) => void;
}

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 2000;
`;

const PanelContainer = styled.div`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(560px, 100%);
    background: var(--vscode-sideBar-background);
    border-left: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    z-index: 2001;
    display: flex;
    flex-direction: column;
    box-shadow: -2px 0 12px rgba(0, 0, 0, 0.2);
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid ${ThemeColors.OUTLINE_VARIANT};
`;

const CloseButton = styled.button`
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: var(--vscode-editor-foreground);
    display: flex;
    align-items: center;

    &:hover { color: var(--vscode-button-hoverBackground); }
`;

const Body = styled.div`
    flex: 1;
    overflow-y: auto;
`;

const Centered = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px;
`;

export const CreateConnectionOverlay: React.FC<CreateConnectionOverlayProps> = ({ connector, title, onClose, onSaved }) => {
    const { rpcClient } = useRpcContext();
    const { targetLineRange, fileName } = useFormContext();
    const flowNodeRef = useRef<FlowNode | null>(null);
    const [fields, setFields] = useState<FormField[] | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        rpcClient.getBIDiagramRpcClient().getNodeTemplate({
            position: targetLineRange?.startLine,
            filePath: fileName,
            id: { ...connector, node: "NEW_CONNECTION" } as CodeData,
        }).then((res) => {
            if (cancelled) return;
            flowNodeRef.current = res.flowNode;
            // Skip hidden auto-managed props from the form view.
            setFields(convertConfig(res.flowNode.properties, ["checkError"]));
        }).catch((e) => {
            if (!cancelled) setError(`Failed to load connector form: ${e?.message ?? e}`);
        });
        return () => { cancelled = true; };
    }, [rpcClient, connector, fileName]);

    const handleSubmit = async (data: FormValues) => {
        const flowNode = flowNodeRef.current;
        if (!flowNode) return;
        setSaving(true);
        setError(null);
        try {
            // Write form values back onto the flowNode template.
            for (const key of Object.keys(data)) {
                const prop = (flowNode.properties as any)[key];
                if (prop) {
                    prop.value = data[key];
                }
            }

            const visualizerLocation = await rpcClient.getVisualizerLocation();
            const connectionsFilePath = visualizerLocation.documentUri || visualizerLocation.projectPath || fileName;

            const response: any = await rpcClient.getBIDiagramRpcClient().getSourceCode({
                filePath: connectionsFilePath,
                flowNode,
                isConnector: true,
            });

            const artifacts = response?.artifacts as Array<{ name: string; isNew: boolean }> | undefined;
            const newConnection = artifacts?.find((a) => a.isNew) ?? artifacts?.[0];
            if (!newConnection?.name) {
                setError("Connection saved but no new artifact was returned");
                setSaving(false);
                return;
            }
            onSaved(newConnection.name);
        } catch (e: any) {
            setError(e?.message ?? String(e));
            setSaving(false);
        }
    };

    return (
        <>
            <Overlay sx={{ background: ThemeColors.SURFACE_CONTAINER, opacity: 0.4, zIndex: 2000 }} />
            <Backdrop onClick={onClose} />
            <PanelContainer onClick={(e) => e.stopPropagation()}>
                <Header>
                    <Typography variant="h3">{title}</Typography>
                    <CloseButton aria-label="Close" onClick={onClose}>
                        <Codicon name="close" />
                    </CloseButton>
                </Header>
                <Body>
                    {error && (
                        <div style={{ padding: "12px 16px", color: "var(--vscode-errorForeground)" }}>{error}</div>
                    )}
                    {!fields ? (
                        <Centered><ProgressRing /></Centered>
                    ) : (
                        <Form
                            formFields={fields}
                            targetLineRange={targetLineRange}
                            fileName={fileName}
                            submitText={saving ? "Saving..." : "Save"}
                            cancelText="Cancel"
                            onSubmit={handleSubmit}
                            onCancelForm={onClose}
                            nestedForm
                            disableSaveButton={saving}
                        />
                    )}
                </Body>
            </PanelContainer>
        </>
    );
};
