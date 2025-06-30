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
import { MACHINE_VIEW, EVENT_TYPE, DownloadProgress } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import styled from "@emotion/styled";
import { Button, Codicon } from "@wso2/ui-toolkit";
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";

const Wrapper = styled.div`
    max-width: 660px;
    margin: 80px 120px;
    height: calc(100vh - 160px);
    overflow-y: auto;
`;

const Headline = styled.div`
    font-size: 2.7em;
    font-weight: 400;
    font-size: 2.7em;
    white-space: nowrap;
    margin-bottom: 20px;
`;

const StyledButton = styled(Button)`
    margin-top: 10px;
    width: 100%;
`;

const ButtonContent = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    height: 28px;
`;

//

const TitleContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 20px;
`;

const Caption = styled.div`
    font-size: 1.1em;
    line-height: 1.5em;
    font-weight: 400;
    margin-top: 0;
    margin-bottom: 5px;
`;

const StepContainer = styled.div`
    margin-top: 60px;
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 48px;
`;

const Row = styled.div`
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 10px;
`;

const Column = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
`;

const StepTitle = styled.div<{ color?: string }>`
    font-size: 1.5em;
    font-weight: 400;
    margin-top: 0;
    margin-bottom: 5px;
    color: ${(props: { color?: string }) => props.color || "inherit"};
`;

const StepDescription = styled.div<{ color?: string }>`
    font-size: 1em;
    font-weight: 400;
    margin-top: 0;
    margin-bottom: 5px;
    color: ${(props: { color?: string }) => props.color || "inherit"};
`;

const Option = styled.div`
  display: flex;
  flex-direction: column;
  padding: 14px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.05);
  width: 100%;
  box-sizing: border-box;
  border-left: 3px solid #4a86e8;
`;

const OptionTitle = styled.div`
  font-weight: 500;
  font-size: 1.1em;
  margin-bottom: 8px;
`;

const StepDescriptionContainer = styled.div`
  display: flex;
  justify-content: space-between;
`;

const ProgressBarWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: 5px;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 4px;
  background-color: var(--vscode-editorWidget-border, rgba(127, 127, 127, 0.3));
  border-radius: 2px;
  overflow: hidden;
  position: relative;
`;

const ProgressIndicator = styled.div<{ percentage: number }>`
  position: absolute;
  width: ${(props: { percentage: number }) => `${props.percentage}%`};
  height: 100%;
  background-color: var(--vscode-progressBar-background);
  border-radius: 2px;
  animation: progressAnimation 1.5s infinite ease-in-out;
`;

type WelcomeViewProps = {
    isBISupported: boolean;
};


export function WelcomeView(props: WelcomeViewProps) {
    const { rpcClient } = useRpcContext();
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState<DownloadProgress>(null);

    const goToCreateProject = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIProjectForm,
            },
        });
    };

    const openGettingStartedGuide = () => {
        rpcClient.getCommonRpcClient().openExternalUrl({
            url: "https://bi.docs.wso2.com/get-started/quick-start-guide/"
        })
    };

    const openSamples = () => {
        rpcClient.getCommonRpcClient().openExternalUrl({
            url: "https://bi.docs.wso2.com/learn/samples/message-transformation/"
        })
    };

    const updateBallerina = () => {
        setIsLoading(true);
        rpcClient.getCommonRpcClient().executeCommand({ commands: ["ballerina.update-ballerina-visually"] });
    };

    rpcClient?.onDownloadProgress((response: DownloadProgress) => {
        setIsLoading(true);
        setProgress(response);
    });

    return (
        <Wrapper>
            <TitleContainer>
                <Headline>WSO2 Integrator: BI for VS Code</Headline>
                <Caption>
                    A comprehensive integration solution that simplifies your digital transformation journey.
                    Streamlines connectivity among applications, services, data, and cloud using a user-friendly
                    low-code graphical designing experience.
                </Caption>
            </TitleContainer>

            <StepContainer>
                <Row>
                    <Column>
                        <StepTitle>Get Started Quickly</StepTitle>
                        <StepDescription>
                            New to WSO2 Integrator? Start here! Explore step-by-step tutorials to help you get up and running with
                            ease. <VSCodeLink onClick={openGettingStartedGuide}>Read the guide</VSCodeLink>.
                        </StepDescription>
                    </Column>
                </Row>
                <Row>
                    <Column>
                        {props.isBISupported &&
                            <>
                                <StepTitle>Create Your First Integration</StepTitle>
                                <StepDescription>
                                    Ready to build? Start a new integration project using our intuitive graphical designer.
                                </StepDescription>
                                <StyledButton disabled={!props.isBISupported} appearance="primary" onClick={() => goToCreateProject()}>
                                    <ButtonContent>
                                        <Codicon name="add" iconSx={{ fontSize: 16 }} />
                                        Create New Integration
                                    </ButtonContent>
                                </StyledButton>
                            </>
                        }
                        {!props.isBISupported &&
                            <>
                                <Option>
                                    <OptionTitle>Update to latest Ballerina distribution</OptionTitle>
                                    <StepDescription>
                                        Your current Ballerina distribution is not supported. Please update to version 2201.12.3 or above.
                                    </StepDescription>
                                    <StyledButton appearance="primary" onClick={updateBallerina} disabled={isLoading}>
                                        <ButtonContent>
                                            Update Now
                                        </ButtonContent>
                                    </StyledButton>

                                    {isLoading && (
                                        <div style={{ marginTop: 10 }}>
                                            {!progress && <StepDescription>
                                                Updating Ballerina... This may take a few minutes.
                                            </StepDescription>
                                            }
                                            {progress && (
                                                <>
                                                    <StepDescriptionContainer>
                                                        <StepDescription>{progress.message}</StepDescription>
                                                        <StepDescription>{progress.percentage || 0}%</StepDescription>
                                                    </StepDescriptionContainer>
                                                    <ProgressBarWrapper>
                                                        <ProgressBarContainer>
                                                            <ProgressIndicator percentage={progress.percentage} />
                                                        </ProgressBarContainer>
                                                    </ProgressBarWrapper>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    <StepDescription style={{ marginTop: 10 }}>
                                        Please restart VS Code after updating the Ballerina distribution
                                    </StepDescription>
                                </Option>
                            </>
                        }
                    </Column>
                </Row>
                <Row>
                    <Column>
                        <StepTitle>Explore Pre-Built Samples</StepTitle>
                        <StepDescription>
                            Need inspiration? Browse through sample projects to see how WSO2 Integrator: BI handles real-world
                            integrations. <VSCodeLink onClick={openSamples}>Explore Samples</VSCodeLink>.
                        </StepDescription>
                    </Column>
                </Row>
            </StepContainer>
        </Wrapper>
    );
}
