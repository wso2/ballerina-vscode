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
import { FlowNode } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Codicon, ThemeColors } from "@wso2/ui-toolkit";
import { RelativeLoader } from "../../../components/RelativeLoader";
import { addToolToAgentNode, findAgentNodeFromAgentCallNode, getAgentFilePath } from "./utils";

const Container = styled.div`
    padding: 16px;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 100%;
    box-sizing: border-box;
`;

const LoaderContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

const Description = styled.div`
    font-size: var(--vscode-font-size);
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin-bottom: 8px;
`;

const Column = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    overflow-y: auto;
`;

const Row = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
`;

const Title = styled.div`
    font-size: 14px;
    font-family: GilmerBold;
`;

const ToolItem = styled.div<{ isSelected?: boolean }>`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;
    padding: 5px;
    border: 1px solid
        ${(props: { isSelected: boolean }) => (props.isSelected ? ThemeColors.PRIMARY : ThemeColors.OUTLINE_VARIANT)};
    border-radius: 5px;
    height: 36px;
    cursor: "pointer";
    font-size: 14px;
    &:hover {
        background-color: ${ThemeColors.PRIMARY_CONTAINER};
        border: 1px solid ${ThemeColors.PRIMARY};
    }
`;

const PrimaryButton = styled(Button)`
    appearance: "primary";
`;

const HighlightedButton = styled.div`
    margin-top: 10px;
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 2px;
    color: ${ThemeColors.PRIMARY};
    border: 1px dashed ${ThemeColors.PRIMARY};
    border-radius: 5px;
    cursor: pointer;
    &:hover {
        border: 1px solid ${ThemeColors.PRIMARY};
        background-color: ${ThemeColors.PRIMARY_CONTAINER};
    }
`;

const Footer = styled.div`
    position: fixed;
    bottom: 0;
    left: 0;

    width: 100%;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px;
    background-color: ${ThemeColors.SURFACE_DIM};
    margin-top: auto;
`;

interface AddToolProps {
    agentCallNode: FlowNode;
    onAddNewTool: () => void;
    onSave?: () => void;
}

export function AddTool(props: AddToolProps): JSX.Element {
    const { agentCallNode, onAddNewTool, onSave } = props;
    console.log(">>> AddTool props", props);
    const { rpcClient } = useRpcContext();

    const [agentNode, setAgentNode] = useState<FlowNode | null>(null);
    const [existingTools, setExistingTools] = useState<string[]>([]);
    const [selectedTool, setSelectedTool] = useState<string | null>(null);

    const [loading, setLoading] = useState<boolean>(false);
    const [savingForm, setSavingForm] = useState<boolean>(false);

    const agentFilePath = useRef<string>("");

    useEffect(() => {
        initPanel();
    }, [agentCallNode]);

    const initPanel = async () => {
        setLoading(true);
        // get agent file path
        agentFilePath.current = await getAgentFilePath(rpcClient);
        // fetch tools and agent node
        await fetchExistingTools();
        await fetchAgentNode();
        setLoading(false);
    };

    const fetchAgentNode = async () => {
        // get agent node
        const agentNode = await findAgentNodeFromAgentCallNode(agentCallNode, rpcClient);
        setAgentNode(agentNode);
    };

    const fetchExistingTools = async () => {
        const existingTools = await rpcClient.getAIAgentRpcClient().getTools({ filePath: agentFilePath.current });
        console.log(">>> existing tools", existingTools);
        setExistingTools(existingTools.tools);
    };

    const handleToolSelection = (tool: string) => {
        setSelectedTool(tool);
    };

    const handleAddNewTool = () => {
        onAddNewTool();
    };

    const handleOnSave = async () => {
        console.log(">>> save value", { selectedTool });
        setSavingForm(true);
        // update the agent node
        const updatedAgentNode = await addToolToAgentNode(agentNode, selectedTool);
        // generate the source code
        const agentResponse = await rpcClient
            .getBIDiagramRpcClient()
            .getSourceCode({ filePath: agentFilePath.current, flowNode: updatedAgentNode });
        console.log(">>> response getSourceCode with template ", { agentResponse });

        onSave?.();
        setSavingForm(false);
    };

    const hasExistingTools = existingTools.length > 0;
    const isToolSelected = selectedTool !== null;

    console.log(">>> rendering conditions", { hasExistingTools, isToolSelected });

    return (
        <Container>
            {loading && (
                <LoaderContainer>
                    <RelativeLoader />
                </LoaderContainer>
            )}
            {!loading && hasExistingTools && (
                <>
                    <Column>
                        <Description>Choose a tool to add to the Agent or create a new one.</Description>
                        <Row>
                            <Title>Tools</Title>
                            <Button appearance="icon" tooltip={"Create New Tool"} onClick={handleAddNewTool}>
                                <Codicon name="add" />
                            </Button>
                        </Row>
                        {existingTools.map((tool) => (
                            <ToolItem
                                onClick={() => handleToolSelection(tool)}
                                key={tool}
                                isSelected={selectedTool === tool}
                            >
                                {tool}
                            </ToolItem>
                        ))}
                    </Column>
                    <Footer>
                        <PrimaryButton onClick={handleOnSave} disabled={!isToolSelected || savingForm}>
                            {"Add to Agent"}
                        </PrimaryButton>
                    </Footer>
                </>
            )}
            {!loading && !hasExistingTools && !selectedTool && (
                <Column>
                    <Description>
                        No tools are currently available in your integration. Add a new tool to improve your agent's
                        capabilities.
                    </Description>
                    <HighlightedButton onClick={handleAddNewTool}>
                        <Codicon name="add" iconSx={{ fontSize: 12 }} sx={{ display: "flex", alignItems: "center" }} />
                        Create New Tool
                    </HighlightedButton>
                </Column>
            )}
        </Container>
    );
}
