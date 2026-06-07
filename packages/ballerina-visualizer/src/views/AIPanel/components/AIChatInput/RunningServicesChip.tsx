/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import React, { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { RunningServiceInfo } from "@wso2/ballerina-core";

const TOOLTIP_SHOW_MS = 150;
const TOOLTIP_HIDE_MS = 200;

export interface RunningServicesPanel {
    services: RunningServiceInfo[];
    onStopService: (taskId: string) => void;
    onStopAll: () => void;
}

type RunningServicesChipProps = RunningServicesPanel;

const ChipWrapper = styled.div`
    position: relative;
    display: inline-flex;
    align-items: center;
    margin-right: 4px;
`;

const Chip = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 20px;
    padding: 0 8px;
    background: var(--vscode-editor-background);
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 10px;
    font-size: 11px;
    font-family: var(--vscode-font-family);
    cursor: pointer;
    transition: background-color 0.15s;

    &:hover {
        background: var(--vscode-toolbar-hoverBackground);
    }
`;

const RunningDot = styled.span<{ exited: boolean }>`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${(p: { exited: boolean }) =>
        p.exited
            ? "var(--vscode-descriptionForeground)"
            : "var(--vscode-charts-green, #388a34)"};
    flex-shrink: 0;
`;

const Popup = styled.div`
    position: absolute;
    bottom: calc(100% + 8px);
    right: 0;
    z-index: 1000;
    min-width: 240px;
    max-width: 320px;
    padding: 8px;
    background: var(--vscode-editorHoverWidget-background);
    border: 1px solid var(--vscode-editorHoverWidget-border);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    color: var(--vscode-editorHoverWidget-foreground);
    font-size: 12px;

    /* Bridge the 8px gap so the popup stays open while moving the mouse to it */
    &::after {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 0;
        right: 0;
        height: 8px;
    }
`;

const PopupTitle = styled.div`
    font-weight: 600;
    padding: 0 4px 6px;
    border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    margin-bottom: 4px;
`;

const ServiceRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px;
    border-radius: 3px;

    &:hover {
        background: var(--vscode-list-hoverBackground);
    }
`;

const ServiceMeta = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
`;

const ServiceName = styled.div`
    font-size: 12px;
    color: var(--vscode-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const ServiceSubline = styled.div`
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
`;

const StopButton = styled.button`
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 3px;
    color: var(--vscode-icon-foreground);
    cursor: pointer;
    flex-shrink: 0;

    &:hover:not(:disabled) {
        background: var(--vscode-toolbar-hoverBackground);
        color: var(--vscode-errorForeground);
    }

    &:disabled {
        opacity: 0.4;
        cursor: default;
    }
`;

const StopAllRow = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
`;

const StopAllButton = styled.button`
    background: transparent;
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    color: var(--vscode-foreground);
    border-radius: 3px;
    padding: 2px 8px;
    font-size: 11px;
    font-family: var(--vscode-font-family);
    cursor: pointer;

    &:hover {
        background: var(--vscode-toolbar-hoverBackground);
        color: var(--vscode-errorForeground);
    }
`;

function packageBasename(packagePath: string): string {
    if (!packagePath) return "service";
    const parts = packagePath.split(/[\\/]/).filter(Boolean);
    return parts[parts.length - 1] ?? packagePath;
}

function formatUptime(startedAt: number, now: number): string {
    const elapsedSec = Math.max(0, Math.floor((now - startedAt) / 1000));
    if (elapsedSec < 60) return `${elapsedSec}s`;
    const min = Math.floor(elapsedSec / 60);
    const sec = elapsedSec % 60;
    if (min < 60) return `${min}m ${sec.toString().padStart(2, "0")}s`;
    const hr = Math.floor(min / 60);
    const remMin = min % 60;
    return `${hr}h ${remMin.toString().padStart(2, "0")}m`;
}

const RunningServicesChip: React.FC<RunningServicesChipProps> = ({ services, onStopService, onStopAll }) => {
    const [visible, setVisible] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Tick every second so uptime stays fresh while the popup is visible.
    useEffect(() => {
        if (!visible) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [visible]);

    if (!services || services.length === 0) {
        return null;
    }

    const activeCount = services.filter((s) => !s.exited).length;

    const scheduleShow = () => {
        if (hideTimer.current) {
            clearTimeout(hideTimer.current);
            hideTimer.current = null;
        }
        showTimer.current = setTimeout(() => setVisible(true), TOOLTIP_SHOW_MS);
    };

    const scheduleHide = () => {
        if (showTimer.current) {
            clearTimeout(showTimer.current);
            showTimer.current = null;
        }
        hideTimer.current = setTimeout(() => setVisible(false), TOOLTIP_HIDE_MS);
    };

    const toggleVisible = () => setVisible((v) => !v);

    return (
        <ChipWrapper onMouseEnter={scheduleShow} onMouseLeave={scheduleHide}>
            <Chip
                type="button"
                title={`${activeCount} running service${activeCount === 1 ? "" : "s"}`}
                onClick={toggleVisible}
            >
                <span className="codicon codicon-play" style={{ fontSize: 11 }} />
                <span>{activeCount}</span>
            </Chip>

            {visible && (
                <Popup onMouseEnter={scheduleShow} onMouseLeave={scheduleHide}>
                    <PopupTitle>Running services</PopupTitle>
                    {services.map((service) => {
                        const uptime = formatUptime(service.startedAt, now);
                        const status = service.exited
                            ? `Exited (${service.exitCode})`
                            : `Running · ${uptime}`;
                        return (
                            <ServiceRow key={service.taskId}>
                                <RunningDot exited={service.exited} />
                                <ServiceMeta>
                                    <ServiceName title={service.packagePath}>
                                        {packageBasename(service.packagePath)}
                                    </ServiceName>
                                    <ServiceSubline>{status}</ServiceSubline>
                                </ServiceMeta>
                                <StopButton
                                    type="button"
                                    title={service.exited ? "Already exited" : "Stop service"}
                                    disabled={service.exited}
                                    onClick={() => onStopService(service.taskId)}
                                >
                                    <span className="codicon codicon-debug-stop" style={{ fontSize: 14 }} />
                                </StopButton>
                            </ServiceRow>
                        );
                    })}
                    {activeCount > 1 && (
                        <StopAllRow>
                            <StopAllButton type="button" onClick={onStopAll}>
                                Stop all
                            </StopAllButton>
                        </StopAllRow>
                    )}
                </Popup>
            )}
        </ChipWrapper>
    );
};

export default RunningServicesChip;
