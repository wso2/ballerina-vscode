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

import React, { useEffect, useMemo } from "react";
import {
    ProjectStructureResponse,
    SHARED_COMMANDS,
    BI_COMMANDS
} from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Typography, Codicon, ProgressRing, Button, Icon } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { ThemeColors } from "@wso2/ui-toolkit";
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import ReactMarkdown from "react-markdown";
import { AlertBoxWithClose } from "../../AIPanel/AlertBoxWithClose";
import { UndoRedoGroup } from "../../../components/UndoRedoGroup";
import { PackageListView } from "./PackageListView";

const SpinnerContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

const Description = styled(Typography)`
    color: var(--vscode-descriptionForeground);
`;

const ButtonContainer = styled.div`
    display: flex;
    align-items: flex-end;
    gap: 8px;
`;

const EmptyStateContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 24px 64px 24px;
    text-align: center;
    min-height: 300px;
`;

const PageLayout = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
`;

const HeaderRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    background: var(--vscode-editor-background);
    border-bottom: 1px solid var(--vscode-dropdown-border);
    flex-shrink: 0;
    margin: 16px 16px 0 16px;
`;

const HeaderControls = styled.div`
    display: flex;
    gap: 12px;
    align-items: center;
`;

const MainContent = styled.div`
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const SectionHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 20px 0 20px;
    margin-bottom: 16px;
`;

const SectionTitle = styled.h2`
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
    color: var(--vscode-foreground);
`;

const SectionActions = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

const ContentPanel = styled.div<{ isEmpty?: boolean }>`
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    overflow: hidden;
    ${(props: { isEmpty?: boolean }) => !props.isEmpty && `
        min-height: 200px;
    `}
`;

const EmptyReadmeContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    justify-content: center;
    padding: 32px 24px 48px 24px;
    text-align: center;
`;

const ReadmeContent = styled.div`
    padding: 0 20px 20px 20px;
    text-wrap: pretty;
    overflow-wrap: break-word;
    line-height: 1.6;

    p, li, td, th, blockquote {
        overflow-wrap: break-word;
    }

    pre {
        overflow-x: auto;
        overflow-wrap: break-word;
        background: var(--vscode-textCodeBlock-background);
        padding: 12px;
        border-radius: 4px;
    }
    
    code {
        white-space: pre-wrap;
        overflow-wrap: break-word;
    }

    h1, h2, h3, h4, h5, h6 {
        margin-top: 24px;
        margin-bottom: 12px;
        &:first-child {
            margin-top: 0;
        }
    }

    p {
        margin-bottom: 12px;
    }
`;

const TitleContainer = styled.div`
    display: flex;
    align-items: flex-end;
    gap: 8px;
`;

const ProjectTitle = styled.h1`
    font-weight: bold;
    font-size: 1.5rem;
    margin-bottom: 0;
    margin-top: 0;
    @media (min-width: 768px) {
        font-size: 1.875rem;
    }
`;

const ProjectSubtitle = styled.h2`
    display: none;
    font-weight: 200;
    font-size: 1.5rem;
    opacity: 0.3;
    margin-bottom: 0;
    margin-top: 0;
    @media (min-width: 640px) {
        display: block;
    }

    @media (min-width: 768px) {
        font-size: 1.875rem;
    }
`;

export function WorkspaceOverview() {
    const { rpcClient } = useRpcContext();
    const [readmeContent, setReadmeContent] = React.useState<string>("");
    const [workspaceStructure, setWorkspaceStructure] = React.useState<ProjectStructureResponse>();

    const [showAlert, setShowAlert] = React.useState(false);

    const fetchContext = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .getProjectStructure()
            .then((res) => {
                setWorkspaceStructure(res);
            });

        rpcClient
            .getBIDiagramRpcClient()
            .handleReadmeContent({ read: true })
            .then((res) => {
                setReadmeContent(res.content);
            });

        rpcClient
            .getBIDiagramRpcClient()
            .getReadmeContent()
            .then((res) => {
                setReadmeContent(res.content);
            });
    };

    rpcClient?.onProjectContentUpdated((state: boolean) => {
        if (state) {
            fetchContext();
        }
    });

    useEffect(() => {
        fetchContext();
        showLoginAlert().then((status) => {
            setShowAlert(status);
        });
    }, []);

    const isEmptyWorkspace = useMemo(() => {
        return workspaceStructure?.projects.length === 0;
    }, [workspaceStructure]);

    if (!workspaceStructure) {
        return (
            <SpinnerContainer>
                <ProgressRing color={ThemeColors.PRIMARY} />
            </SpinnerContainer>
        );
    }

    const handleGenerate = () => {
        rpcClient.getBIDiagramRpcClient().openAIChat({
            scafold: true,
            readme: false,
        });
    };

    const handleGenerateWithReadme = () => {
        rpcClient.getBIDiagramRpcClient().openAIChat({
            scafold: true,
            readme: true,
        });
    };

    const handleEditReadme = () => {
        rpcClient.getBIDiagramRpcClient().openReadme();
    };

    const handleAddIntegration = () => {
        rpcClient.getCommonRpcClient().executeCommand({ commands: [BI_COMMANDS.ADD_PROJECT] })
    };

    async function handleSettings() {
        rpcClient.getCommonRpcClient().executeCommand({ commands: [SHARED_COMMANDS.OPEN_AI_PANEL] });
    }

    async function handleClose() {
        await rpcClient.getAiPanelRpcClient().markAlertShown();
        setShowAlert(false);
    }

    async function showLoginAlert() {
        const resp = await rpcClient.getAiPanelRpcClient().showSignInAlert();
        setShowAlert(resp);
        return resp;
    }

    return (
        <PageLayout>
            <HeaderRow>
                <TitleContainer>
                    <ProjectTitle>{workspaceStructure?.workspaceTitle || workspaceStructure?.workspaceName}</ProjectTitle>
                    <ProjectSubtitle>Workspace</ProjectSubtitle>
                </TitleContainer>
                <HeaderControls>
                    <UndoRedoGroup key={Date.now()} />
                    <Button appearance="primary" onClick={handleAddIntegration}>
                        <Codicon name="add" sx={{ marginRight: 8 }} />
                        Add Integration
                    </Button>
                </HeaderControls>
            </HeaderRow>

            <MainContent>
                {showAlert && (
                    <AlertBoxWithClose
                        subTitle={
                            "Please log in to WSO2 AI Platform to access AI features. You won't be able to use AI features until you log in."
                        }
                        title={"Login to WSO2 AI Platform"}

                        btn1Title="Manage Accounts"
                        btn1IconName="settings-gear"
                        btn1OnClick={() => handleSettings()}
                        btn1Id="settings"

                        btn2Title="Close"
                        btn2IconName="close"
                        btn2OnClick={() => handleClose()}
                        btn2Id="Close"
                    />
                )}

                <Section>
                    <ContentPanel isEmpty={isEmptyWorkspace}>
                        <SectionHeader>
                            <SectionTitle>Integrations</SectionTitle>
                            {/* TODO: Add generate with AI button once AI is implemented (https://github.com/wso2/product-ballerina-integrator/issues/1899) */}
                            {/* {!isEmptyWorkspace && (
                                <SectionActions>
                                    <Button appearance="icon" onClick={handleGenerate} buttonSx={{ padding: "6px 12px" }}>
                                        <Codicon name="wand" sx={{ marginRight: 8 }} /> Generate with AI
                                    </Button>
                                </SectionActions>
                            )} */}
                        </SectionHeader>
                        {isEmptyWorkspace ? (
                            <EmptyStateContainer>
                                <Typography variant="h3" sx={{ marginBottom: "16px" }}>
                                    Your workspace is empty
                                </Typography>
                                <Typography
                                    variant="body1"
                                    sx={{ marginBottom: "24px", color: "var(--vscode-descriptionForeground)" }}
                                >
                                    Start by adding integrations to your workspace
                                </Typography>
                                <ButtonContainer>
                                    <Button appearance="secondary" onClick={handleAddIntegration}>
                                        <Codicon name="add" sx={{ marginRight: 8 }} /> Add Integration
                                    </Button>
                                    {/* TODO: Add generate with AI button once AI is implemented (https://github.com/wso2/product-ballerina-integrator/issues/1899) */}
                                    {/* <Button appearance="primary" onClick={handleGenerate}>
                                        <Codicon name="wand" sx={{ marginRight: 8 }} /> Generate with AI
                                    </Button> */}
                                </ButtonContainer>
                            </EmptyStateContainer>
                        ) : (
                            <PackageListView workspaceStructure={workspaceStructure} />
                        )}
                    </ContentPanel>
                </Section>

                <Section>
                    <ContentPanel isEmpty={!readmeContent}>
                        <SectionHeader>
                            <SectionTitle>README</SectionTitle>
                            <SectionActions>
                                {/* TODO: Add generate with AI button once AI is implemented (https://github.com/wso2/product-ballerina-integrator/issues/1899) */}
                                {/* {readmeContent && isEmptyWorkspace && (
                                    <Button appearance="icon" onClick={handleGenerateWithReadme} buttonSx={{ padding: "4px 8px" }}>
                                        <Codicon name="wand" sx={{ marginRight: 4, fontSize: 16 }} /> Generate with Readme
                                    </Button>
                                )} */}
                                <Button appearance="icon" onClick={handleEditReadme} buttonSx={{ padding: "4px 8px" }}>
                                    <Icon name="bi-edit" sx={{ marginRight: 8, fontSize: 16 }} /> Edit
                                </Button>
                            </SectionActions>
                        </SectionHeader>
                        {readmeContent ? (
                            <ReadmeContent>
                                <ReactMarkdown>{readmeContent}</ReactMarkdown>
                            </ReadmeContent>
                        ) : (
                            <EmptyReadmeContainer>
                                <Description variant="body2">
                                    Describe your integration and generate your integrations with AI
                                </Description>
                                <VSCodeLink onClick={handleEditReadme}>Add a README</VSCodeLink>
                            </EmptyReadmeContainer>
                        )}
                    </ContentPanel>
                </Section>
            </MainContent>
        </PageLayout>
    );
}
