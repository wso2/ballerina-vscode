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
    BuildMode,
    WorkspaceDevantMetadata
} from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { useQuery } from "@tanstack/react-query";
import { IOpenInConsoleCmdParams, CommandIds as PlatformExtCommandIds } from "@wso2/wso2-platform-core";
import { Typography, Codicon, ProgressRing, Button, Icon, Divider } from "@wso2/ui-toolkit";
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
    secondaryAction?: {
        description: string;
        buttonText: string;
        onClick: () => void;
    };
}

function DeploymentOption({
    title,
    description,
    buttonText,
    isExpanded,
    onToggle,
    onDeploy,
    learnMoreLink,
    hasDeployableIntegration,
    secondaryAction
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
                {secondaryAction && (
                    <>
                        <p>{secondaryAction.description}</p>
                        <Button
                            appearance="primary"
                            onClick={(e) => {
                                e.stopPropagation();
                                secondaryAction.onClick();
                            }}
                            sx={{ marginTop: 8 }}
                        >
                            {secondaryAction.buttonText}
                        </Button>
                    </>
                )}
            </DeploymentBody>
        </DeploymentOptionContainer>
    );
}

interface DeploymentOptionsProps {
    handleDockerBuild: () => void;
    handleJarBuild: () => void;
    handleDeploy: () => Promise<void>;
    goToDevant: () => void;
    devantMetadata: WorkspaceDevantMetadata | undefined;
    hasDeployableIntegration: boolean;
    hasUndeployedIntegrations: boolean;
    deployableProjectPaths: Set<string>;
}

function DeploymentOptions({
    handleDockerBuild,
    handleJarBuild,
    handleDeploy,
    goToDevant,
    devantMetadata,
    hasDeployableIntegration,
    hasUndeployedIntegrations,
    deployableProjectPaths
}: DeploymentOptionsProps) {
    const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set(['cloud']));
    const { rpcClient } = useRpcContext();

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

    // Calculate deployment states
    const deployedProjects = devantMetadata?.projectsMetadata?.filter(p => p.hasComponent) || [];
    const undeployedProjects = devantMetadata?.projectsMetadata?.filter(p => !p.hasComponent) || [];
    const deployedWithChanges = deployedProjects.filter(p => p.hasLocalChanges);
    
    const hasDeployedProjects = deployedProjects.length > 0;
    const hasUndeployedProjects = undeployedProjects.length > 0;
    const hasDeployedWithChanges = deployedWithChanges.length > 0;

    // Determine title, description, button text, and whether deployment is allowed
    let title = "Deploy to Devant";
    let description = "Deploy your workspace integrations to the cloud using Devant by WSO2.";
    let buttonText = "Deploy";
    let primaryAction: () => void | Promise<void> = handleDeploy;
    let secondaryAction = undefined;
    let isDeploymentDisabled = false;
    let disabledTooltip = "";

    if (hasDeployedProjects && !hasUndeployedProjects) {
        // All projects are deployed - disable deployment button
        title = "Deployed in Devant";
        description = "All workspace integrations are deployed in Devant.";
        buttonText = "View in Devant";
        primaryAction = goToDevant;
        isDeploymentDisabled = false; // View action is always enabled
        
        if (hasDeployedWithChanges) {
            secondaryAction = {
                description: "To redeploy in Devant, please commit and push your changes.",
                buttonText: "Open Source Control",
                onClick: () => rpcClient.getCommonRpcClient().executeCommand({ commands: ["workbench.scm.focus"] })
            };
        }
    } else if (hasDeployedProjects && hasUndeployedProjects) {
        // Mixed state: some deployed, some not - show clear message about remaining
        title = "Partially Deployed in Devant";
        
        // Separate deployable and non-deployable undeployed projects
        const deployableUndeployed = undeployedProjects.filter(p => deployableProjectPaths.has(p.projectPath));
        const nonDeployableUndeployed = undeployedProjects.filter(p => !deployableProjectPaths.has(p.projectPath));
        
        const deployableNames = deployableUndeployed.map(p => p.projectName).filter(Boolean).join(", ");
        const nonDeployableNames = nonDeployableUndeployed.map(p => p.projectName).filter(Boolean).join(", ");
        
        if (hasUndeployedIntegrations) {
            // There are undeployed projects that CAN be deployed
            const baseMessage = deployableUndeployed.length === 1 ? "You have an undeployed integration" : "You have undeployed integrations";
            description = `${baseMessage}: ${deployableNames || deployableUndeployed.length + " integration(s)"}`;
            buttonText = "Deploy Remaining";
        } else {
            // There are undeployed projects but they CANNOT be deployed (no entry point found)
            description = `Some integration(s) (${nonDeployableNames || nonDeployableUndeployed.length + " integration(s)"}) cannot be deployed. No entry point found within these integration(s).`;
            buttonText = "Deploy Remaining";
        }
        
        primaryAction = handleDeploy;
        isDeploymentDisabled = !hasUndeployedIntegrations;
        disabledTooltip = hasUndeployedIntegrations ? "" : "No entry point found in the remaining integration(s)";
        
        if (hasDeployedWithChanges) {
            const baseMessage = deployedWithChanges.length === 1
                ? `A deployed integration has uncommitted changes (${deployedWithChanges[0].projectName})`
                : `Some deployed integrations have uncommitted changes (${deployedWithChanges.map(p => p.projectName).filter(Boolean).join(", ")})`;
            secondaryAction = {
                description: `${baseMessage}. Commit and push to redeploy.`,
                buttonText: "Open Source Control",
                onClick: () => rpcClient.getCommonRpcClient().executeCommand({ commands: ["workbench.scm.focus"] })
            };
        }
    } else {
        // No deployments yet
        isDeploymentDisabled = !hasDeployableIntegration;
        disabledTooltip = hasDeployableIntegration ? "" : "No deployable integration(s) found";
    }

    return (
        <>
            <div>
                <Title variant="h3">Deployment Options</Title>

                <DeploymentOption
                    title={title}
                    description={description}
                    buttonText={buttonText}
                    isExpanded={expandedOptions.has("cloud")}
                    onToggle={() => toggleOption("cloud")}
                    onDeploy={primaryAction}
                    learnMoreLink={"https://wso2.com/devant/docs"}
                    hasDeployableIntegration={!isDeploymentDisabled}
                    secondaryAction={secondaryAction}
                />

                <DeploymentOption
                    title="Deploy with Docker"
                    description="Create Docker image(s) of your integration(s) and deploy them to any Docker-enabled system."
                    buttonText="Create Docker Image"
                    isExpanded={expandedOptions.has('docker')}
                    onToggle={() => toggleOption('docker')}
                    onDeploy={handleDockerBuild}
                    hasDeployableIntegration={hasDeployableIntegration}
                />

                <DeploymentOption
                    title="Deploy on a VM"
                    description="Create self-contained Ballerina executable(s) and run them on any system with Java installed."
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
    icpState: "all" | "partial" | "none";
    enabledCount: number;
    totalCount: number;
    onEnableAll: () => void;
    onDisableAll: () => void;
    onEnableRemaining: () => void;
}

function IntegrationControlPlane({
    icpState,
    enabledCount,
    totalCount,
    onEnableAll,
    onDisableAll,
    onEnableRemaining
}: IntegrationControlPlaneProps) {
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
            <Description variant="body3" sx={{ marginBottom: "8px" }}>
                {totalCount > 0 ? `${enabledCount}/${totalCount} packages are ICP-enabled` : "No ICP-eligible packages found"}
            </Description>
            {icpState === "all" && (
                <Button appearance="secondary" onClick={onDisableAll}>
                    Disable ICP for all packages
                </Button>
            )}
            {icpState === "none" && (
                <Button appearance="secondary" onClick={onEnableAll}>
                    Enable ICP for all packages
                </Button>
            )}
            {icpState === "partial" && (
                <Button appearance="secondary" onClick={onEnableRemaining}>
                    Enable ICP for remaining packages
                </Button>
            )}
        </div>
    );
}

export function WorkspaceOverview() {
    const { rpcClient } = useRpcContext();
    const [readmeContent, setReadmeContent] = React.useState<string>("");
    const [workspaceStructure, setWorkspaceStructure] = React.useState<ProjectStructureResponse>();
    const [icpStatusByProjectPath, setIcpStatusByProjectPath] = React.useState<Record<string, boolean>>({});

    const [showAlert, setShowAlert] = React.useState(false);

    const { data: devantMetadata } = useQuery({
        queryKey: ["workspace-devant-metadata"],
        queryFn: () => rpcClient.getBIDiagramRpcClient().getWorkspaceDevantMetadata(),
        refetchInterval: 5000
    });

    const getICPProjectPaths = (projects: ProjectStructureResponse["projects"]) => {
        return projects
            .filter((project) => !(project?.isLibrary ?? false))
            .map((project) => project.projectPath);
    };

    const syncWorkspaceICPStatus = async (projectPaths: string[]) => {
        if (projectPaths.length === 0) {
            setIcpStatusByProjectPath({});
            return;
        }

        try {
            const icpStatus = await Promise.all(
                projectPaths.map((projectPath) =>
                    rpcClient.getICPRpcClient().isIcpEnabled({ projectPath })
                )
            );
            const nextStatusMap = projectPaths.reduce<Record<string, boolean>>((acc, projectPath, index) => {
                acc[projectPath] = Boolean(icpStatus[index]?.enabled);
                return acc;
            }, {});
            setIcpStatusByProjectPath(nextStatusMap);
        } catch (error) {
            console.error("Failed to sync ICP status:", error);
        }
    };

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

                syncWorkspaceICPStatus(getICPProjectPaths(res.projects));
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

    const icpProjectPaths = useMemo(() => {
        return workspaceStructure ? getICPProjectPaths(workspaceStructure.projects) : [];
    }, [workspaceStructure]);

    const icpEnabledCount = useMemo(() => {
        return icpProjectPaths.filter((projectPath) => Boolean(icpStatusByProjectPath[projectPath])).length;
    }, [icpProjectPaths, icpStatusByProjectPath]);

    const icpState = useMemo<"all" | "partial" | "none">(() => {
        if (icpProjectPaths.length === 0 || icpEnabledCount === 0) {
            return "none";
        }
        if (icpEnabledCount === icpProjectPaths.length) {
            return "all";
        }
        return "partial";
    }, [icpProjectPaths, icpEnabledCount]);

    const projectScopes = useMemo(() => {
        return getWorkspaceProjectScopes(workspaceStructure);
    }, [workspaceStructure]);

    // Calculate which projects need deployment
    const undeployedProjectScopes = useMemo(() => {
        if (!devantMetadata?.projectsMetadata || !workspaceStructure) {
            return projectScopes;
        }

        const deployedPaths = new Set(
            devantMetadata.projectsMetadata
                .filter(p => p.hasComponent)
                .map(p => p.projectPath)
        );

        return projectScopes.filter(scope => !deployedPaths.has(scope.projectPath));
    }, [projectScopes, devantMetadata, workspaceStructure]);

    const deployableProjectPaths = useMemo(() => {
        return new Set(projectScopes.map(scope => scope.projectPath));
    }, [projectScopes]);

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
        // Only deploy undeployed projects
        await rpcClient.getBIDiagramRpcClient().deployWorkspace({
            projectScopes: undeployedProjectScopes,
            rootDirectory: workspaceStructure?.workspacePath || ''
        });
    };

    const handleDockerBuild = () => {
        rpcClient.getBIDiagramRpcClient().buildProject(BuildMode.DOCKER);
    };

    const handleJarBuild = () => {
        rpcClient.getBIDiagramRpcClient().buildProject(BuildMode.JAR);
    };

    const updateICPForProjectPaths = async (projectPaths: string[], enableICP: boolean) => {
        if (projectPaths.length === 0) {
            return;
        }

        for (const projectPath of projectPaths) {
            try {
                if (enableICP) {
                    await rpcClient.getICPRpcClient().addICP({ projectPath });
                } else {
                    await rpcClient.getICPRpcClient().disableICP({ projectPath });
                }
            } catch (error) {
                console.error("Failed to update ICP for project:", projectPath, error);
            }
        }
    };

    const handleEnableAllICP = async () => {
        await updateICPForProjectPaths(icpProjectPaths, true);
        await syncWorkspaceICPStatus(icpProjectPaths);
    };

    const handleDisableAllICP = async () => {
        await updateICPForProjectPaths(icpProjectPaths, false);
        await syncWorkspaceICPStatus(icpProjectPaths);
    };

    const handleEnableRemainingICP = async () => {
        const remainingProjectPaths = icpProjectPaths.filter((projectPath) => !icpStatusByProjectPath[projectPath]);
        await updateICPForProjectPaths(remainingProjectPaths, true);
        await syncWorkspaceICPStatus(icpProjectPaths);
    };

    const goToDevant = () => {
        // For workspace, open the Devant console at the project level
        // If there are deployed projects, open the first one
        if (devantMetadata?.projectsMetadata && devantMetadata.projectsMetadata.length > 0) {
            const firstDeployedProject = devantMetadata.projectsMetadata.find(p => p.hasComponent);
            if (firstDeployedProject) {
                rpcClient.getCommonRpcClient().executeCommand({
                    commands: [
                        PlatformExtCommandIds.OpenInConsole,
                        {
                            extName: "Devant",
                            componentFsPath: firstDeployedProject.projectPath,
                            newComponentParams: { buildPackLang: "ballerina" }
                        } as IOpenInConsoleCmdParams
                    ]
                });
                return;
            }
        }
        // Fallback: open console without specific component
        rpcClient.getCommonRpcClient().executeCommand({
            commands: [PlatformExtCommandIds.OpenInConsole, {
                extName: "Devant",
                newComponentParams: { buildPackLang: "ballerina" }
            } as IOpenInConsoleCmdParams]
        });
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
                                <PackageListView
                                    workspaceStructure={workspaceStructure}
                                    icpStatusByProjectPath={icpStatusByProjectPath}
                                    showICPBadge={icpState !== "none"}
                                />
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
                            goToDevant={goToDevant}
                            devantMetadata={devantMetadata}
                            hasDeployableIntegration={projectScopes.length > 0}
                            hasUndeployedIntegrations={undeployedProjectScopes.length > 0}
                            deployableProjectPaths={deployableProjectPaths}
                        />
                        <Divider sx={{ margin: "16px 0" }} />
                        <IntegrationControlPlane
                            icpState={icpState}
                            enabledCount={icpEnabledCount}
                            totalCount={icpProjectPaths.length}
                            onEnableAll={handleEnableAllICP}
                            onDisableAll={handleDisableAllICP}
                            onEnableRemaining={handleEnableRemainingICP}
                        />
                    </SidePanel>
                )}
            </MainContent>
        </PageLayout>
    );
}
