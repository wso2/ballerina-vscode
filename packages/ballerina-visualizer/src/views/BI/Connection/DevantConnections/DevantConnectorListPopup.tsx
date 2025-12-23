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

import { useState } from "react";
import styled from "@emotion/styled";
import { Button, Codicon, ThemeColors, Typography, Stepper } from "@wso2/ui-toolkit";
import { DIRECTORY_MAP, LinePosition, ParentPopupData } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import {
    PopupOverlay,
    PopupContainer,
    PopupHeader,
    BackButton,
    HeaderTitleContainer,
    PopupTitle,
    PopupSubtitle,
    CloseButton,
} from "../styles";
import {
    MarketplaceItem,
    CommandIds as PlatformExtCommandIds,
    ICmdParamsBase as PlatformExtICmdParamsBase,
    ICreateDirCtxCmdParams,
} from "@wso2/wso2-platform-core";
import { BodyTinyInfo } from "../../../styles";
import { usePlatformExtContext } from "../../../../providers/platform-ext-ctx-provider";
import { DevantConnectorMarketplaceInfo } from "./DevantConnectorMarketplaceInfo";
import { DevantConnectorCreateForm, useDevantConnectorForm } from "./DevantConnectorCreateForm";
import { DevantMarketplaceList } from "./DevantMarketplaceList";

const ContentContainer = styled.div<{ hasFooterButton?: boolean }>`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: ${(props: { hasFooterButton?: boolean }) => (props.hasFooterButton ? "hidden" : "auto")};
    padding: 24px 32px;
    padding-bottom: ${(props: { hasFooterButton?: boolean }) => (props.hasFooterButton ? "0" : "24px")};
    min-height: 0;
`;

const FooterContainer = styled.div`
    position: sticky;
    bottom: 0;
    padding: 20px 32px;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10;
`;

const ActionButton = styled(Button)`
    width: 100% !important;
    min-width: 0 !important;
    display: flex !important;
    justify-content: center;
    align-items: center;
`;

const StepperContainer = styled.div`
    padding: 20px 32px 18px 32px;
    border-bottom: 1px solid ${ThemeColors.OUTLINE_VARIANT};
`;

const EmptyWrap = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    gap: 12px;
    padding: 0 10%;
`;

interface APIConnectionPopupProps {
    projectPath: string;
    fileName: string;
    target?: LinePosition;
    onClose?: (parent?: ParentPopupData) => void;
    onBack?: () => void;
}

export function DevantConnectorListPopup(props: APIConnectionPopupProps) {
    const { onBack, onClose } = props;
    const { rpcClient } = useRpcContext();
    const { platformExtState, platformRpcClient, devantConsoleUrl, deployableArtifacts, workspacePath, projectPath } =
        usePlatformExtContext();
    const [searchText, _] = useState<string>("");
    const [selectedDevantConnector, setSelectedDevantConnector] = useState<MarketplaceItem>();
    const [currentStep, setCurrentStep] = useState<"info" | "create">("info");
    const steps = ["Connection Details", "Create Connection"];
    const stepIndex = currentStep === "create" ? 1 : 0;

    // Use the custom hook for form management
    const { form, visibilities, isCreatingConnection, onSubmit } = useDevantConnectorForm(
        selectedDevantConnector,
        (data) => {
            if (data.connectionNode) {
                // todo: handle 3rd party api service connection creation
                // handleOnSelectConnector(data.connectionNode);
            } else if (data.connectionName) {
                setCurrentStep("info");
                setSelectedDevantConnector(undefined);
                if (onClose) {
                    onClose({ recentIdentifier: data.connectionName, artifactType: DIRECTORY_MAP.CONNECTION });
                }
            }
        }
    );

    const onSelectDevantConnector = (item: MarketplaceItem) => {
        setSelectedDevantConnector(item);
    };

    const openRegisterNew3rdPartySvc = (isNew?: boolean) => {
        rpcClient.getCommonRpcClient().openExternalUrl({
            url: `${devantConsoleUrl}/organizations/${platformExtState?.selectedContext?.org?.handle}/projects/${
                platformExtState?.selectedContext?.project?.id
            }/admin/third-party-services${isNew ? "/new" : ""}`,
        });
    };

    const handleOnBackClick = () => {
        if (selectedDevantConnector) {
            if (currentStep === "create") {
                setCurrentStep("info");
                return;
            }
            setSelectedDevantConnector(undefined);
            return;
        }
        if (onBack) {
            onBack();
        }
    };

    const renderContent = () => {
        if (!platformExtState.isLoggedIn) {
            return (
                <EmptyWrap>
                    <Typography variant="body3" sx={{ textAlign: "center" }}>
                        You need to be signed into Devant in order connect with dependencies in Devant
                    </Typography>
                    <Button
                        onClick={() =>
                            rpcClient.getCommonRpcClient().executeCommand({
                                commands: [
                                    PlatformExtCommandIds.SignIn,
                                    { extName: "Devant" } as PlatformExtICmdParamsBase,
                                ],
                            })
                        }
                        buttonSx={{ minWidth: "160px" }}
                    >
                        Sign In
                    </Button>
                </EmptyWrap>
            );
        }

        if (!platformExtState?.selectedContext?.project) {
            return (
                <EmptyWrap>
                    <BodyTinyInfo style={{ textAlign: "center" }}>
                        To connect with dependencies in Devant, you can either deploy your source code now (recommended
                        for full integration) or associate this directory with an existing Devant project where you plan
                        to deploy later.
                    </BodyTinyInfo>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <Button
                            onClick={() => platformRpcClient.deployIntegrationInDevant()}
                            disabled={!deployableArtifacts?.exists}
                            buttonSx={{ minWidth: "160px" }}
                            tooltip={
                                deployableArtifacts?.exists
                                    ? ""
                                    : "Please add a deployable artifact to your project in order to deploy it"
                            }
                        >
                            Deploy Now
                        </Button>
                        <Button
                            appearance="secondary"
                            buttonSx={{ minWidth: "160px" }}
                            onClick={() =>
                                rpcClient.getCommonRpcClient().executeCommand({
                                    commands: [
                                        PlatformExtCommandIds.CreateDirectoryContext,
                                        {
                                            extName: "Devant",
                                            skipComponentExistCheck: true,
                                            fsPath: workspacePath || projectPath,
                                        } as ICreateDirCtxCmdParams,
                                    ],
                                })
                            }
                        >
                            Associate Project
                        </Button>
                    </div>
                </EmptyWrap>
            );
        }

        if (selectedDevantConnector) {
            if (currentStep === "info") {
                return (
                    <DevantConnectorMarketplaceInfo
                        onCloseClick={() => setSelectedDevantConnector(undefined)}
                        item={selectedDevantConnector}
                    />
                );
            }
            if (currentStep === "create") {
                return (
                    <DevantConnectorCreateForm
                        item={selectedDevantConnector}
                        visibilities={visibilities}
                        form={form}
                    />
                );
            }
        }
        
        return (
            <DevantMarketplaceList
                searchText={searchText}
                onSelectItem={onSelectDevantConnector}
                onRegisterNew3rdPartySvc={openRegisterNew3rdPartySvc}
            />
        );
    };

    return (
        <>
            <PopupOverlay sx={{ background: `${ThemeColors.SURFACE_CONTAINER}`, opacity: `0.5` }} />
            <PopupContainer>
                <PopupHeader>
                    <BackButton appearance="icon" onClick={handleOnBackClick}>
                        <Codicon name="chevron-left" />
                    </BackButton>
                    <HeaderTitleContainer>
                        <PopupTitle variant="h2">Connect via Devant</PopupTitle>
                        <PopupSubtitle variant="body2">
                            Select APIs deployed in Devant or third party dependencies with managed configurations
                        </PopupSubtitle>
                    </HeaderTitleContainer>
                    <CloseButton appearance="icon" onClick={() => onClose?.()}>
                        <Codicon name="close" />
                    </CloseButton>
                </PopupHeader>
                {selectedDevantConnector && (
                    <StepperContainer>
                        <Stepper steps={steps} currentStep={stepIndex} alignment="center" />
                    </StepperContainer>
                )}
                <ContentContainer>{renderContent()}</ContentContainer>

                {selectedDevantConnector && (
                    <FooterContainer>
                        {currentStep === "info" && (
                            <ActionButton
                                appearance="primary"
                                onClick={() => setCurrentStep("create")}
                                buttonSx={{ width: "100%", height: "35px" }}
                            >
                                Continue
                            </ActionButton>
                        )}
                        {currentStep === "create" && (
                            <ActionButton
                                appearance="primary"
                                disabled={isCreatingConnection}
                                onClick={form.handleSubmit(onSubmit)}
                                buttonSx={{ width: "100%", height: "35px" }}
                            >
                                {isCreatingConnection ? "Creating Connection..." : "Create Connection"}
                            </ActionButton>
                        )}
                    </FooterContainer>
                )}
            </PopupContainer>
        </>
    );
}
