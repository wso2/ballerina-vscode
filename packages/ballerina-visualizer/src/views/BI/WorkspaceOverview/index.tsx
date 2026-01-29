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

import React, { useEffect, useMemo, useState } from "react";
import {
    ProjectStructureResponse,
    SHARED_COMMANDS,
    BI_COMMANDS,
    BuildMode
} from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Typography, Codicon, ProgressRing, Button, Icon, Divider, CheckBox } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { ThemeColors } from "@wso2/ui-toolkit";
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import ReactMarkdown from "react-markdown";
import { AlertBoxWithClose } from "../../AIPanel/AlertBoxWithClose";
import { UndoRedoGroup } from "../../../components/UndoRedoGroup";
import { PackageListView } from "./PackageListView";
import { getWorkspaceProjectScopes } from "../PackageOverview/utils";

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

const MainContent = styled.div<{ hasDeployment?: boolean }>`
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 24px;
    display: ${(props: { hasDeployment?: boolean }) => props.hasDeployment ? 'grid' : 'flex'};
    ${(props: { hasDeployment?: boolean }) => props.hasDeployment && `
        grid-template-columns: 3fr 1fr;
        gap: 24px;
    `}
    ${(props: { hasDeployment?: boolean }) => !props.hasDeployment && `
        flex-direction: column;
        gap: 24px;
    `}
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

const LeftContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 24px;
    min-height: 0;
`;

const SidePanel = styled.div`
    padding: 0px 10px 10px 10px;
`;

const Title = styled(Typography)`
    margin: 8px 0;
`;

interface DeploymentOptionContainerProps {
    isExpanded: boolean;
}

const DeploymentOptionContainer = styled.div<DeploymentOptionContainerProps>`
    cursor: pointer;
    border: ${(props: DeploymentOptionContainerProps) => props.isExpanded ? '1px solid var(--vscode-welcomePage-tileBorder)' : 'none'};
    background: ${(props: DeploymentOptionContainerProps) => props.isExpanded ? 'var(--vscode-welcomePage-tileBackground)' : 'transparent'};
    border-radius: 6px;
    display: flex;
    overflow: hidden;
    width: 100%;
    padding: 10px;
    flex-direction: column;
    margin-bottom: 8px;

    &:hover {
        background: var(--vscode-welcomePage-tileHoverBackground);
    }
`;

const DeploymentHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    h3 {
        font-size: 13px;
        font-weight: 600;
        margin: 0;
    }
`;

interface DeploymentBodyProps {
    isExpanded: boolean;
}

const DeploymentBody = styled.div<DeploymentBodyProps>`
    max-height: ${(props: DeploymentBodyProps) => props.isExpanded ? '200px' : '0'};
    overflow: hidden;
    transition: max-height 0.3s ease-in-out;
    margin-top: ${(props: DeploymentBodyProps) => props.isExpanded ? '8px' : '0'};
`;

interface DeploymentOptionProps {
    title: string;
    description: string;
    buttonText: string;
    isExpanded: boolean;
    onToggle: () => void;
    onDeploy: () => void;
    learnMoreLink?: string;
    hasDeployableIntegration?: boolean;
}

function DeploymentOption({
    title,
    description,
    buttonText,
    isExpanded,
    onToggle,
    onDeploy,
    learnMoreLink,
    hasDeployableIntegration
}: DeploymentOptionProps) {
    const { rpcClient } = useRpcContext();

    const openLearnMoreURL = () => {
        rpcClient.getCommonRpcClient().openExternalUrl({
            url: learnMoreLink
        })
    };

    return (
        <DeploymentOptionContainer
            isExpanded={isExpanded}
            onClick={onToggle}
        >
            <DeploymentHeader>
                {isExpanded ? (
                    <Codicon
                        name={'triangle-down'}
                        sx={{ color: 'var(--vscode-textLink-foreground)' }}
                    />
                ) : (
                    <Codicon
                        name={'triangle-right'}
                        sx={{ color: 'inherit' }}
                    />
                )}
                <h3>{title}</h3>
            </DeploymentHeader>
            <DeploymentBody isExpanded={isExpanded}>
                <p style={{ marginTop: 8 }}>
                    {description}
                    {learnMoreLink && (
                        <VSCodeLink onClick={openLearnMoreURL} style={{ marginLeft: '4px' }}>Learn more</VSCodeLink>
                    )}
                </p>
                <Button
                    appearance="secondary"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeploy();
                    }}
                    disabled={!hasDeployableIntegration}
                    tooltip={hasDeployableIntegration ? "" : "No deployable integration found"}
                >
                    {buttonText}
                </Button>
            </DeploymentBody>
        </DeploymentOptionContainer>
    );
}

interface DeploymentOptionsProps {
    handleDockerBuild: () => void;
    handleJarBuild: () => void;
    handleDeploy: () => Promise<void>;
    hasDeployableIntegration: boolean;
}

function DeploymentOptions({
    handleDockerBuild,
    handleJarBuild,
    handleDeploy,
    hasDeployableIntegration
}: DeploymentOptionsProps) {
    const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set(['cloud']));

    const toggleOption = (option: string) => {
        setExpandedOptions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(option)) {
                newSet.delete(option);
            } else {
                newSet.add(option);
            }
            return newSet;
        });
    };

    return (
        <>
            <div>
                <Title variant="h3">Deployment Options</Title>

                <DeploymentOption
                    title="Deploy to Devant"
                    description="Deploy your workspace integrations to the cloud using Devant by WSO2."
                    buttonText="Deploy"
                    isExpanded={expandedOptions.has("cloud")}
                    onToggle={() => toggleOption("cloud")}
                    onDeploy={handleDeploy}
                    learnMoreLink={"https://wso2.com/devant/docs"}
                    hasDeployableIntegration={hasDeployableIntegration}
                />

                <DeploymentOption
                    title="Deploy with Docker"
                    description="Create a Docker image of your integrations and deploy it to any Docker-enabled system."
                    buttonText="Create Docker Image"
                    isExpanded={expandedOptions.has('docker')}
                    onToggle={() => toggleOption('docker')}
                    onDeploy={handleDockerBuild}
                    hasDeployableIntegration={hasDeployableIntegration}
                />

                <DeploymentOption
                    title="Deploy on a VM"
                    description="Create a self-contained Ballerina executable and run it on any system with Java installed."
                    buttonText="Create Executable"
                    isExpanded={expandedOptions.has('vm')}
                    onToggle={() => toggleOption('vm')}
                    onDeploy={handleJarBuild}
                    hasDeployableIntegration={hasDeployableIntegration}
                />
            </div>
        </>
    );
}

interface IntegrationControlPlaneProps {
    enabled: boolean;
    handleICP: (checked: boolean) => void;
}

function IntegrationControlPlane({ enabled, handleICP }: IntegrationControlPlaneProps) {
    const { rpcClient } = useRpcContext();

    const openLearnMoreURL = () => {
        rpcClient.getCommonRpcClient().openExternalUrl({
            url: "https://wso2.com/integrator/integration-control-plane/"
        })
    };

    return (
        <div>
            <Title variant="h3">Integration Control Plane</Title>
            <p>
                {"Monitor the deployment runtime using WSO2 Integration Control Plane."}
                <VSCodeLink onClick={openLearnMoreURL} style={{ marginLeft: '4px' }}> Learn More </VSCodeLink>
            </p>
            <CheckBox
                checked={enabled}
                onChange={handleICP}
                label="Enable WSO2 Integrator: ICP"
            />
        </div>
    );
}

export function WorkspaceOverview() {
    const { rpcClient } = useRpcContext();
    const [readmeContent, setReadmeContent] = React.useState<string>("");
    const [workspaceStructure, setWorkspaceStructure] = React.useState<ProjectStructureResponse>();
    const [enabled, setEnableICP] = React.useState(false);

    const [showAlert, setShowAlert] = React.useState(false);

    const fetchContext = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .getProjectStructure()
            .then((res) => {
                setWorkspaceStructure(res);

                rpcClient
                    .getBIDiagramRpcClient()
                    .handleReadmeContent({ projectPath: res.workspacePath, read: true })
                    .then((res) => {
                        setReadmeContent(res.content);
                    });
        
                rpcClient
                    .getBIDiagramRpcClient()
                    .getReadmeContent({ projectPath: res.workspacePath })
                    .then((res) => {
                        setReadmeContent(res.content);
                    });

                rpcClient
                    .getICPRpcClient()
                    .isIcpEnabled({ projectPath: '' })
                    .then((res) => {
                        setEnableICP(res.enabled);
                    });
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

    const hasStandardIntegrations = useMemo(() => {
        return (workspaceStructure?.projects ?? []).some((project) => !(project?.isLibrary ?? false));
    }, [workspaceStructure?.projects]);

    const projectScopes = useMemo(() => {
        return getWorkspaceProjectScopes(workspaceStructure);
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
            planMode: true,
            readme: false,
        });
    };

    const handleGenerateWithReadme = () => {
        rpcClient.getBIDiagramRpcClient().openAIChat({
            planMode: true,
            readme: true,
        });
    };

    const handleEditReadme = () => {
        rpcClient.getBIDiagramRpcClient().openReadme({
            projectPath: workspaceStructure?.workspacePath,
            isWorkspaceReadme: true
        });
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

    const handleDeploy = async () => {
        await rpcClient.getBIDiagramRpcClient().deployWorkspace({
            projectScopes: projectScopes,
            rootDirectory: workspaceStructure?.workspacePath || ''
        });
    };

    const handleDockerBuild = () => {
        rpcClient.getBIDiagramRpcClient().buildProject(BuildMode.DOCKER);
    };

    const handleJarBuild = () => {
        rpcClient.getBIDiagramRpcClient().buildProject(BuildMode.JAR);
    };

    const handleICP = (icpEnabled: boolean) => {
        if (icpEnabled) {
            rpcClient.getICPRpcClient().addICP({ projectPath: '' })
                .then((res) => {
                    setEnableICP(true);
                }
                );
        } else {
            rpcClient.getICPRpcClient().disableICP({ projectPath: '' })
                .then((res) => {
                    setEnableICP(false);
                }
                );
        }
    };

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

            <MainContent hasDeployment={hasStandardIntegrations}>
                <LeftContent>
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
                                        Document your workspace and integrations
                                    </Description>
                                    <VSCodeLink onClick={handleEditReadme}>Add a README</VSCodeLink>
                                </EmptyReadmeContainer>
                            )}
                        </ContentPanel>
                    </Section>
                </LeftContent>
                {hasStandardIntegrations && (
                    <SidePanel>
                        <DeploymentOptions
                            handleDockerBuild={handleDockerBuild}
                            handleJarBuild={handleJarBuild}
                            handleDeploy={handleDeploy}
                            hasDeployableIntegration={projectScopes.length > 0}
                        />
                        <Divider sx={{ margin: "16px 0" }} />
                        <IntegrationControlPlane enabled={enabled} handleICP={handleICP} />
                    </SidePanel>
                )}
            </MainContent>
        </PageLayout>
    );
}
