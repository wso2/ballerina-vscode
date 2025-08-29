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

import { Codicon, Typography } from "@wso2/ui-toolkit";
import React, { useEffect, useRef } from "react";
import {
    CardAction,
    CollapsibleHeader,
    LogEntry,
    LogsContainer,
    StepWrapper,
} from "../styles";


interface MigrationLogsProps {
    migrationLogs: string[];
    migrationCompleted: boolean;
    isLogsOpen: boolean;
    onToggleLogs: () => void;
    showHeader?: boolean;
}

const getColourizedLog = (log: string, index: number) => {
    if (log.startsWith("[SEVERE]")) {
        return (
            <LogEntry key={index} style={{ color: "var(--vscode-terminal-ansiRed)" }}>
                {log}
            </LogEntry>
        );
    } else if (log.startsWith("[WARN]")) {
        return (
            <LogEntry key={index} style={{ color: "var(--vscode-terminal-ansiYellow)" }}>
                {log}
            </LogEntry>
        );
    }
    return <LogEntry key={index}>{log}</LogEntry>;
};

export const MigrationLogs: React.FC<MigrationLogsProps> = ({
    migrationLogs,
    migrationCompleted,
    isLogsOpen,
    onToggleLogs,
    showHeader = true,
}) => {
    const logsContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new logs are added
    useEffect(() => {
        if (logsContainerRef.current && isLogsOpen && !migrationCompleted) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    }, [migrationLogs, isLogsOpen, migrationCompleted]);

    if (migrationLogs.length === 0) {
        return null;
    }

    return (
        <StepWrapper>
            {/* Only show header when migration is completed and showHeader is true */}
            {migrationCompleted && showHeader && (
                <CollapsibleHeader onClick={onToggleLogs}>
                    <Typography variant="h4">View Detailed Logs</Typography>
                    <CardAction>
                        {isLogsOpen ? <Codicon name={"chevron-down"} /> : <Codicon name={"chevron-right"} />}
                    </CardAction>
                </CollapsibleHeader>
            )}
            {/* Show logs container when open OR when migration is in progress OR when showHeader is false */}
            {(isLogsOpen || !migrationCompleted || !showHeader) && (
                <LogsContainer ref={logsContainerRef}>
                    {migrationLogs.map(getColourizedLog)}
                </LogsContainer>
            )}
        </StepWrapper>
    );
};
