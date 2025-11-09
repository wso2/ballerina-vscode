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

import { MACHINE_VIEW, EVENT_TYPE } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import styled from "@emotion/styled";
import { Button, Codicon, Icon } from "@wso2/ui-toolkit";

const Wrapper = styled.div`
    max-width: 100%;
    margin: 0;
    padding: 0;
    height: 100vh;
    overflow-y: auto;
    font-family: var(--vscode-font-family);
    background: var(--vscode-sideBar-background);
`;

const TopSection = styled.div`
    background: linear-gradient(135deg, #667eea 0%, #204377 100%);
    padding: 40px 60px 80px;
    position: relative;
    display: flex;
    flex-direction: column;
`;

const ConfigureButton = styled(Button)`
    position: absolute;
    top: 40px;
    right: 60px;
    height: 33px !important;
    font-size: 14px;
    font-weight: 500;
    border-radius: 8px;
    padding: 0 24px;
    background: var(--button-secondary-background);
    color: white;
    border: none;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;

    &:hover:not(:disabled) {
        background: var(--button-secondary-hover-background);
        transform: translateY(-1px);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const GetStartedBadge = styled.div`
    display: inline-block;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 20px;
    padding: 8px 16px;
    margin-bottom: 24px;
    font-size: 13px;
    color: white;
    font-weight: 500;
    width: 106px;
`;

const Headline = styled.h1`
    font-size: 48px;
    font-weight: 700;
    margin: 0;
    color: white;
    line-height: 1.2;
    letter-spacing: -0.5px;
`;

const Caption = styled.p`
    font-size: 16px;
    line-height: 1.6;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.9);
    margin: 16px 0 0 0;
    max-width: 800px;
`;

const CardsContainer = styled.div`
    padding: 0 60px 60px;
    margin-top: -40px;
    position: relative;
    z-index: 1;
`;

const CardsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;

    @media (max-width: 1200px) {
        grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: 768px) {
        grid-template-columns: 1fr;
    }
`;

interface ActionCardProps {
    isPrimary?: boolean;
    disabled?: boolean;
}

const ActionCard = styled.div<ActionCardProps>`
    background: var(--vscode-editor-background);
    border-radius: 12px;
    padding: 32px 24px;
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;
    cursor: ${(props: ActionCardProps) => (props.disabled ? "not-allowed" : "pointer")};
    opacity: ${(props: ActionCardProps) => (props.disabled ? 0.6 : 1)};
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--vscode-widget-border, rgba(255, 255, 255, 0.1));
    min-height: 280px;

    &:hover {
        ${(props: ActionCardProps) =>
            !props.disabled &&
            `
            transform: translateY(-4px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.25);
            background: var(--vscode-list-hoverBackground);
        `}
    }
`;

interface CardIconProps {
    bgColor?: string;
}

const CardIconContainer = styled.div`
    display: flex;
    justify-content: flex-start;
    margin-bottom: 20px;
`;

const CardIcon = styled.div<CardIconProps>`
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${(props: CardIconProps) => props.bgColor || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"};
    color: white;
    flex-shrink: 0;
`;

const CardContent = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
`;

const CardTitle = styled.h3`
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 12px 0;
    color: var(--vscode-foreground);
`;

const CardDescription = styled.p`
    font-size: 14px;
    line-height: 1.6;
    margin: 0 0 24px 0;
    color: var(--vscode-descriptionForeground);
    flex: 1;
`;

const StyledButton = styled(Button)<{ isPrimary?: boolean }>`
    height: 44px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 8px;
    align-self: flex-start;
    padding: 0 24px;
    background: ${(props: { isPrimary?: boolean }) => 
        props.isPrimary ? 'var(--button-primary-background)' : 'var(--button-secondary-background)'};
    color: white;
    border: none;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
        background: ${(props: { isPrimary?: boolean }) => 
            props.isPrimary ? 'var(--button-primary-hover-background)' : 'var(--button-secondary-hover-background)'};
        transform: translateY(-1px);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const ButtonContent = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
`;

const BottomSection = styled.div`
    padding: 60px 60px 60px;
    text-align: center;
`;

const AlreadyHaveText = styled.div`
    font-size: 14px;
    color: var(--vscode-foreground);
    opacity: 0.6;
    margin-bottom: 32px;
    
    a {
        color: var(--vscode-textLink-foreground);
        text-decoration: none;
        font-weight: 400;
        margin-left: 6px;
        cursor: pointer;
        
        &:hover {
            color: var(--vscode-textLink-activeForeground);
            text-decoration: underline;
        }
    }
`;

const RecentProjectsSection = styled.div`
    max-width: 900px;
    margin: 0 auto;
`;

const RecentProjectsHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 0 4px;
`;

const RecentProjectsTitle = styled.h3`
    font-size: 13px;
    font-weight: 400;
    color: var(--vscode-foreground);
    opacity: 0.6;
    margin: 0;
    text-transform: capitalize;
`;

const ViewAllLink = styled.a`
    font-size: 13px;
    color: var(--vscode-textLink-foreground);
    text-decoration: none;
    cursor: pointer;
    font-weight: 400;
    
    &:hover {
        color: var(--vscode-textLink-activeForeground);
        text-decoration: underline;
    }
`;

const ProjectsList = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px 16px;
    text-align: left;
`;

const ProjectItem = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 4px;
    font-size: 13px;
    color: var(--vscode-foreground);
    cursor: pointer;
    transition: all 0.15s ease;
    border-radius: 4px;
    
    &:hover {
        background: var(--vscode-list-hoverBackground);
    }
`;

const ProjectPath = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    margin-left: 12px;
`;

type WelcomeViewProps = {
    isBISupported: boolean;
};

export function WelcomeView(props: WelcomeViewProps) {
    const { rpcClient } = useRpcContext();

    const goToCreateProject = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIProjectForm,
            },
        });
    };

    const openSamples = () => {
        rpcClient.getCommonRpcClient().openExternalUrl({
            url: "https://bi.docs.wso2.com/integration-guides/integration-as-api/message-transformation/",
        });
    };

    const importExternalIntegration = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIImportIntegration,
            },
        });
    };

    const openConfigure = () => {
        // Add configure action here
        console.log("Configure clicked");
    };

    const openProject = () => {
        // Add open existing project action here
        console.log("Open existing project");
    };

    const viewAllProjects = () => {
        // Add view all projects action here
        console.log("View all projects");
    };

    // Sample recent projects data - replace with actual data
    const recentProjects = [
        { name: "vscode-extensions", path: "~/Documents/vscode-extension" },
        { name: "evox-esports-site", path: "~/Documents" },
        { name: "iso-consultancy-portal", path: "~/Documents/ISOWeb" },
        { name: "ISOWeb", path: "~/Documents" },
        { name: "Documents", path: "~" },
    ];

    return (
        <Wrapper>
            <TopSection>
                <ConfigureButton appearance="secondary" onClick={openConfigure}>
                    <ButtonContent>
                        <Codicon name="settings-gear" iconSx={{ fontSize: 16 }} />
                        Configure
                    </ButtonContent>
                </ConfigureButton>
                <GetStartedBadge>Get Started</GetStartedBadge>
                <Headline>WSO2 Integrator</Headline>
                <Caption>
                    A comprehensive integration solution that simplifies your digital transformation journey. Streamlines connectivity among applications, services, data, and cloud using a user-friendly low-code graphical designing experience.
                </Caption>
            </TopSection>

            <CardsContainer>
                <CardsGrid>
                    <ActionCard onClick={goToCreateProject}>
                        <CardIconContainer>
                            <CardIcon bgColor="linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
                                <Icon name="bi-plus-fill" iconSx={{ fontSize: 24 }} />
                            </CardIcon>
                        </CardIconContainer>
                        <CardContent>
                            <CardTitle>Create New Project</CardTitle>
                            <CardDescription>
                                Ready to build? Start a new integration project using our intuitive graphical designer.
                            </CardDescription>
                            <StyledButton
                                isPrimary={true} 
                                appearance="primary"
                                onClick={(e) => { e.stopPropagation(); goToCreateProject(); }}>
                                <ButtonContent>Create</ButtonContent>
                            </StyledButton>
                        </CardContent>
                    </ActionCard>

                    <ActionCard onClick={openSamples}>
                        <CardIconContainer>
                            <CardIcon bgColor="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
                                <Icon name="bi-bookmark" iconSx={{ fontSize: 24 }} />
                            </CardIcon>
                        </CardIconContainer>
                        <CardContent>
                            <CardTitle>Explore Samples</CardTitle>
                            <CardDescription>
                                Need inspiration? Browse through sample projects to see how WSO2 Integrator works in real-world scenarios.
                            </CardDescription>
                            <StyledButton 
                                appearance="secondary" 
                                onClick={(e) => { e.stopPropagation(); openSamples(); }}>
                                <ButtonContent>Explore</ButtonContent>
                            </StyledButton>
                        </CardContent>
                    </ActionCard>

                    <ActionCard onClick={importExternalIntegration}>
                        <CardIconContainer>
                            <CardIcon bgColor="linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)">
                                <Icon name="bi-convert" iconSx={{ fontSize: 24 }} />
                            </CardIcon>
                        </CardIconContainer>
                        <CardContent>
                            <CardTitle>Import External Integration</CardTitle>
                            <CardDescription>
                                Have an integration from another platform? Import your MuleSoft or TIBCO integration project and continue building.
                            </CardDescription>
                            <StyledButton 
                                appearance="secondary"
                                onClick={(e) => { e.stopPropagation(); importExternalIntegration(); }}>
                                <ButtonContent>Import</ButtonContent>
                            </StyledButton>
                        </CardContent>
                    </ActionCard>
                </CardsGrid>
            </CardsContainer>

            <BottomSection>
                <AlreadyHaveText>
                    Already have a project?
                    <a onClick={openProject}>Open</a>
                </AlreadyHaveText>

                <RecentProjectsSection>
                    <RecentProjectsHeader>
                        <RecentProjectsTitle>Recent projects</RecentProjectsTitle>
                        <ViewAllLink onClick={viewAllProjects}>View all (11)</ViewAllLink>
                    </RecentProjectsHeader>
                    <ProjectsList>
                        {recentProjects.map((project, index) => (
                            <ProjectItem key={index} onClick={() => console.log(`Open project: ${project.name}`)}>
                                <span>{project.name}</span>
                                <ProjectPath>{project.path}</ProjectPath>
                            </ProjectItem>
                        ))}
                    </ProjectsList>
                </RecentProjectsSection>
            </BottomSection>
        </Wrapper>
    );
}
