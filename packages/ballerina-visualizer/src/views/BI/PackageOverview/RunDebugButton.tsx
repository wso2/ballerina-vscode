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
import { Codicon, Popover, ThemeColors, VSCodeColors, Button, Divider } from "@wso2/ui-toolkit";
import { usePlatformExtContext } from "../../../providers/platform-ext-ctx-provider";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

const PopupContainer = styled.div`
    min-width: 150px;
    font-family: "GilmerRegular";
    font-size: 12px;
    text-overflow: ellipsis;
    color: ${ThemeColors.ON_SURFACE};
    display: flex;
    flex-direction: column;
`;

const PanelItem = styled.div<{ active?: boolean }>`
    padding: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: ${(props: { active?: boolean }) =>
        props.active ? "var(--vscode-button-secondaryHoverBackground)" : "transparent"};
    cursor: pointer;
    color: ${(props: { active?: boolean }) =>
        props.active ? "var(--vscode-banner-iconForeground)" : ThemeColors.ON_SURFACE};
    &:hover {
        background-color: var(--vscode-button-secondaryHoverBackground);
        transition: background-color 0.2s ease;
    }
`;

const PanelItemContent = styled.div`
    flex: 1;
`;

const PanelItemVal = styled.div`
    font-size: 12px;
    line-height: 12px;
`;

const ButtonContent = styled.div`
    display: flex;
    align-items: center;
`;

interface Props {
    onClick: () => void;
    text: string;
    icon: string;
    devantMode: "runInDevant" | "debugInDevant"
}

export function RunDebugButton(props: Props) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | SVGSVGElement | null>(null);
    const { text, icon, onClick } = props;
    const { platformExtState, platformRpcClient } = usePlatformExtContext();

    const hasDevantConnections =
        platformExtState?.isLoggedIn && platformExtState?.devantConns?.list?.some((item) => item.isUsed);

    const { mutate: onOptionSelect } = useMutation({
        mutationFn: async (value: boolean) => {
            await platformRpcClient.setConnectedToDevant({mode: props.devantMode, value});
            onClick();
        },
        onSuccess: () => setAnchorEl(null),
    });

    if (!hasDevantConnections) {
        return (
            <Button appearance="icon" onClick={onClick} buttonSx={{ padding: "4px 8px" }}>
                <Codicon name={icon} sx={{ marginRight: 5 }} /> {text}
            </Button>
        );
    }

    return (
        <>
            <Button appearance="icon" onClick={onClick} buttonSx={{ padding: "1px 8px" }}>
                <ButtonContent>
                    <Codicon name={icon} sx={{ marginRight: 5 }} /> {platformExtState?.devantConns?.[props.devantMode] ? `${text} in Devant` : text}
                    <Button
                        appearance="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            setAnchorEl(e.currentTarget);
                        }}
                        sx={{ marginLeft: 5 }}
                    >
                        <Codicon name="chevron-down" />
                    </Button>
                </ButtonContent>
            </Button>
            <Popover
                open={!!anchorEl}
                anchorEl={anchorEl}
                handleClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                sx={{
                    backgroundColor: ThemeColors.SURFACE_DIM,
                    padding: 0,
                    borderRadius: 2,
                    marginTop: 4,
                    border: `1px solid ${VSCodeColors.PANEL_BORDER}`,
                    zIndex: 1100
                }}
            >
                <PopupContainer>
                    <>
                        <PanelItem active={platformExtState?.devantConns?.[props.devantMode]} onClick={() => onOptionSelect(true)}>
                            <Codicon name="vm-active" />
                            <PanelItemContent>
                                <PanelItemVal>{text} in Devant</PanelItemVal>
                            </PanelItemContent>
                        </PanelItem>
                        <Divider sx={{ margin: 0 }} />
                        <PanelItem active={!platformExtState?.devantConns?.[props.devantMode]} onClick={() => onOptionSelect(false)}>
                            <Codicon name="vm" />
                            <PanelItemContent>
                                <PanelItemVal>{text}</PanelItemVal>
                            </PanelItemContent>
                        </PanelItem>
                    </>
                </PopupContainer>
            </Popover>
        </>
    );
}
