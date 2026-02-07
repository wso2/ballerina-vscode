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

import styled from "@emotion/styled";
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { Codicon, Dropdown, Popover, ThemeColors, VSCodeColors, Button } from "@wso2/ui-toolkit";
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import { usePlatformExtContext } from "../../../providers/platform-ext-ctx-provider";
import {
    ICmdParamsBase,
    IManageDirContextCmdParams,
    CommandIds as PlatformExtCommandIds,
} from "@wso2/wso2-platform-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";

const PopupContainer = styled.div`
    min-width: 200px;
    font-family: "GilmerRegular";
    font-size: 12px;
    text-overflow: ellipsis;
    color: ${ThemeColors.ON_SURFACE};
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    ul {
        padding: 0 12px;
        margin: 0;
    }
`;

const PanelItem = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
`;

const PanelItemContent = styled.div`
    flex: 1;
`;

const PanelItemTitle = styled.div`
    font-size: 10px;
    opacity: 60%;
    line-height: 10px;
    margin-bottom: 2px;
`;

const PanelItemVal = styled.div`
    font-size: 12px;
    line-height: 12px;
`;

const PanelItemValButton = styled(PanelItemVal)`
    cursor: pointer;
    &:hover {
        text-decoration: underline;
    }
`;

const ButtonGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 2px;
    padding-top: 8px;
`;

const PanelItemVSCodeLink = styled(VSCodeLink)`
    font-size: 11px;
    line-height: 11px;
`;

export interface DiagnosticsPopUpProps {
    isVisible: boolean;
    anchorEl: HTMLElement;
    onClose: () => void;
}

export function PlatformExtPopover(props: DiagnosticsPopUpProps) {
    const { isVisible, onClose, anchorEl } = props;
    const { platformExtState, platformRpcClient } = usePlatformExtContext();
    const { rpcClient } = useRpcContext();

    const handleSignOut = () => {
        rpcClient
            .getCommonRpcClient()
            .showInformationModal({
                message: "Are you sure you want to sign out of your Devant account?",
                items: ["Yes"],
            })
            .then((res) => {
                if (res === "Yes") {
                    rpcClient.getCommonRpcClient().executeCommand({
                        commands: [PlatformExtCommandIds.SignOut],
                    });
                }
            });
    };

    const handleSwitchProject = () => {
        rpcClient.getCommonRpcClient().executeCommand({
            commands: [
                PlatformExtCommandIds.ManageDirectoryContext,
                {
                    extName: "Devant",
                    onlyShowSwitchProject: true,
                } as IManageDirContextCmdParams,
            ],
        });
    };

    const handleLogin = () => {
        rpcClient.getCommonRpcClient().executeCommand({
            commands: [PlatformExtCommandIds.SignIn, { extName: "Devant" } as ICmdParamsBase],
        });
    };

    const nonCriticalEnvs = platformExtState?.envs?.filter((env) => !env.critical) || [];

    const handleEnvSelect = () => {
        rpcClient
            .getCommonRpcClient()
            .showQuickPick({
                items: nonCriticalEnvs.map((env) => env.name) || [],
                options: { title: "Select Environment to Connect" },
            })
            .then((resp) => {
                const selectedEnv = nonCriticalEnvs.find((env) => env.name === resp);
                if (selectedEnv) {
                    platformRpcClient.setSelectedEnv(selectedEnv.id);
                }
            });
    };

    const handleIntegrationSelect = () => {
        rpcClient
            .getCommonRpcClient()
            .showQuickPick({
                items: platformExtState?.components.map((item) => item?.metadata?.name) || [],
                options: { title: "Select Integration" },
            })
            .then((resp) => {
                const selectedIntegration = platformExtState?.components.find((env) => env.metadata.name === resp);
                if (selectedIntegration) {
                    platformRpcClient.setSelectedComponent(selectedIntegration.metadata?.id || "");
                }
            });
    };

    return (
        <>
            <Popover
                open={isVisible}
                anchorEl={anchorEl}
                handleClose={onClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                sx={{
                    backgroundColor: ThemeColors.SURFACE_DIM,
                    padding: 4,
                    borderRadius: 2,
                    marginTop: 4,
                    border: `1px solid ${VSCodeColors.PANEL_BORDER}`,
                    zIndex: 1000,
                }}
            >
                <PopupContainer>
                    {platformExtState?.userInfo ? (
                        <>
                            <PanelItem>
                                <PanelItemContent>
                                    <PanelItemTitle>Account</PanelItemTitle>
                                    <PanelItemVal>{platformExtState?.userInfo?.userEmail}</PanelItemVal>
                                </PanelItemContent>
                                <ButtonGroup>
                                    <Button appearance="icon" tooltip="Sign Out" onClick={handleSignOut}>
                                        <Codicon name="sign-out" iconSx={{ color: ThemeColors.ERROR }} />
                                    </Button>
                                </ButtonGroup>
                            </PanelItem>
                            <PanelItem>
                                <PanelItemContent>
                                    <PanelItemTitle>Organization</PanelItemTitle>
                                    <PanelItemVal>{platformExtState?.selectedContext?.org?.name}</PanelItemVal>
                                </PanelItemContent>
                            </PanelItem>
                            <PanelItem>
                                <PanelItemContent>
                                    <PanelItemTitle>Project</PanelItemTitle>
                                    <PanelItemValButton
                                        onClick={handleSwitchProject}
                                        title="Link with a different Devant project"
                                    >
                                        {platformExtState?.selectedContext?.project?.name}
                                    </PanelItemValButton>
                                </PanelItemContent>
                            </PanelItem>
                            {platformExtState?.selectedComponent && (
                                <PanelItem>
                                    <PanelItemContent>
                                        <PanelItemTitle>Integration</PanelItemTitle>
                                        {platformExtState?.components?.length > 1 ? (
                                            <PanelItemValButton
                                                onClick={handleIntegrationSelect}
                                                title="Switch to another Devant integration"
                                            >
                                                {platformExtState?.selectedComponent?.metadata?.name}
                                            </PanelItemValButton>
                                        ) : (
                                            <PanelItemVal>
                                                {platformExtState?.selectedComponent?.metadata?.name}
                                            </PanelItemVal>
                                        )}
                                    </PanelItemContent>
                                </PanelItem>
                            )}
                            {platformExtState?.devantConns?.list?.length > 0 && platformExtState?.selectedEnv && (
                                <PanelItem>
                                    <PanelItemContent>
                                        <PanelItemTitle>Connected Environment</PanelItemTitle>
                                        {nonCriticalEnvs?.length > 1 ? (
                                            <PanelItemValButton
                                                onClick={handleEnvSelect}
                                                title="Select a different Devant Environment"
                                            >
                                                {platformExtState?.selectedEnv?.name}
                                            </PanelItemValButton>
                                        ) : (
                                            <PanelItemVal>{platformExtState?.selectedEnv?.name}</PanelItemVal>
                                        )}
                                    </PanelItemContent>
                                </PanelItem>
                            )}
                            {platformExtState?.devantConns?.list?.length > 0 && (
                                <PanelItem>
                                    <PanelItemContent>
                                        <PanelItemTitle style={{ marginBottom: 0 }}>
                                            Using {platformExtState?.devantConns?.list?.length} Devant{" "}
                                            {platformExtState?.devantConns?.list?.length < 2
                                                ? "Connection"
                                                : "Connections"}
                                        </PanelItemTitle>

                                        <PanelItemVal>
                                            Connect to Devant <br />
                                            while running or debugging
                                        </PanelItemVal>
                                    </PanelItemContent>
                                    <ButtonGroup>
                                        <VSCodeCheckbox
                                            checked={platformExtState?.devantConns?.connectedToDevant}
                                            onChange={() => {
                                                platformRpcClient.setConnectedToDevant(
                                                    !!!platformExtState?.devantConns?.connectedToDevant,
                                                );
                                            }}
                                        />
                                    </ButtonGroup>
                                </PanelItem>
                            )}
                        </>
                    ) : (
                        <PanelItem>
                            <PanelItemVal style={{ textAlign: "center" }}>
                                <PanelItemVSCodeLink onClick={handleLogin}>Login</PanelItemVSCodeLink> to your Devant
                                account
                                <br /> to manage your project in the cloud
                            </PanelItemVal>
                        </PanelItem>
                    )}
                </PopupContainer>
            </Popover>
        </>
    );
}
