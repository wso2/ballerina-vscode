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

import { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { FlowNode, ToolData } from "@wso2/ballerina-core";
import { FormField, FormValues } from "@wso2/ballerina-side-panel";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import ConfigForm from "./ConfigForm";
import { URI } from "vscode-uri";
import { Utils } from "vscode-uri";
import { RelativeLoader } from "../../../components/RelativeLoader";

const Container = styled.div`
    padding: 16px;
    height: 100%;
`;

const LoaderContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

const Row = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
`;

interface ToolConfigProps {
    agentCallNode: FlowNode;
    toolData: ToolData;
    onSave?: () => void;
}

export function ToolConfig(props: ToolConfigProps): JSX.Element {
    const { agentCallNode, toolData, onSave } = props;
    console.log(">>> ToolConfig props", props);

    const { rpcClient } = useRpcContext();
    const [loading, setLoading] = useState<boolean>(false);
    const [savingForm, setSavingForm] = useState<boolean>(false);

    const agentFilePath = useRef<string>("");

    useEffect(() => {
        initPanel();
    }, [agentCallNode]);

    const initPanel = async () => {
        setLoading(true);
        // get agent file path
        const filePath = await rpcClient.getVisualizerLocation();
        agentFilePath.current = Utils.joinPath(URI.file(filePath.projectUri), "agents.bal").fsPath;
        setLoading(false);
    };

    const handleOnSave = async (data: FormField[], rawData: FormValues) => {
        console.log(">>> save value", { data, rawData });
        setSavingForm(true);
        // TODO: implement the save logic
        onSave?.();
        setSavingForm(false);
    };

    const formFields: FormField[] = [
        {
            advanced: false,
            codedata: { lineRange: { fileName: "agents.bal", startLine: {}, endLine: {} } },
            diagnostics: [],
            documentation: "Name of the Tool",
            editable: false,
            enabled: true,
            items: undefined,
            key: "variable",
            label: "Name",
            optional: false,
            placeholder: undefined,
            type: "IDENTIFIER",
            value: toolData?.name,
            valueTypeConstraint: "string",
        },
        {
            key: "toolDescription",
            label: "Description",
            type: "TEXTAREA",
            optional: true,
            editable: true,
            documentation: "The description of the tool",
            value: toolData?.description,
            valueTypeConstraint: "string",
            enabled: true,
        },
    ];

    return (
        <Container>
            {loading && (
                <LoaderContainer>
                    <RelativeLoader />
                </LoaderContainer>
            )}
            {!loading && agentCallNode?.codedata?.lineRange && (
                <ConfigForm
                    formFields={formFields}
                    targetLineRange={agentCallNode.codedata.lineRange}
                    onSubmit={handleOnSave}
                    disableSaveButton={savingForm}
                />
            )}
        </Container>
    );
}
