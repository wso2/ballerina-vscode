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

import React, { useMemo, useState } from "react";
import styled from "@emotion/styled";
import { Button, Icon, Popover, ThemeColors, Tooltip } from "@wso2/ui-toolkit";
import { DiagnosticMessage, FlowNode, LineRange, NodeProperties, Property } from "@wso2/ballerina-core";
import { NODE_WIDTH } from "../../resources/constants";
import { useDiagramContext } from "../DiagramContext";

const IconBtn = styled.div<{ color: string }>`
    width: 20px;
    height: 20px;
    font-size: 20px;
    color: ${(props: { color: string }) => props.color};
`;

const PopupContainer = styled.div`
    max-width: ${NODE_WIDTH}px;
    font-family: "GilmerMedium";
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;

    background-color: ${ThemeColors.SURFACE_DIM};
    color: ${ThemeColors.ON_SURFACE};
    padding: 8px;
    ul {
        margin: 0;
        padding: 0;
        list-style: none;
    }

    li {
        margin-bottom: 4px;
        white-space: pre-wrap;
        word-break: break-word;
    }
`;

const DiagnosticListItem = styled.li`
    display: flex;
    align-items: flex-start;
    gap: 6px;
`;

const DiagnosticIcon = styled.span<{ color: string }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${(props: { color: string }) => props.color};
    flex-shrink: 0;
    margin-top: 1px;
`;

const DiagnosticMessageText = styled.span`
    flex: 1;
`;

const Footer = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
`;

const FixButton = styled(Button)`
    display: flex;
    align-items: center;
    gap: 4px;
`;

export interface DiagnosticsPopUpProps {
    node: FlowNode;
}

export function DiagnosticsPopUp(props: DiagnosticsPopUpProps) {
    const { node } = props;
    const { onAddNodePrompt, isUserAuthenticated, readOnly } = useDiagramContext();

    const [diagnosticsAnchorEl, setDiagnosticsAnchorEl] = useState<HTMLElement | SVGSVGElement>(null);
    const isDiagnosticsOpen = Boolean(diagnosticsAnchorEl);

    const handleOnDiagnosticsClick = (event: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
        setDiagnosticsAnchorEl(event.currentTarget);
    };

    const handleOnDiagnosticsClose = () => {
        setDiagnosticsAnchorEl(null);
    };

    const getPropertyDiagnostics = (properties: NodeProperties, diagnostics: DiagnosticMessageWithRange[]) => {
        for (const key in properties) {
            if (Object.prototype.hasOwnProperty.call(properties, key)) {
                const property = properties[key] as Property;
                if (property.diagnostics && property.diagnostics.hasDiagnostics) {
                    diagnostics.push(
                        ...(property.diagnostics.diagnostics || []).map((diagnostic) => ({
                            diagnostic,
                            range: property.codedata?.lineRange,
                        }))
                    );
                }
            }
        }
    };

    const diagnosticsWithRanges = useMemo(() => {
        const diagnostics: DiagnosticMessageWithRange[] = [];

        diagnostics.push(
            ...((node.diagnostics?.diagnostics || []).map((diagnostic) => ({
                diagnostic,
                range: node.codedata?.lineRange,
            })))
        );

        if (node.properties) {
            getPropertyDiagnostics(node.properties, diagnostics);
        }
        if (node.branches?.length > 0) {
            node.branches.forEach((branch) => {
                getPropertyDiagnostics(branch.properties, diagnostics);
            });
        }

        return diagnostics;
    }, [node]);

    const diagnosticMessages = useMemo(() => {
        const uniqueDiagnostics = new Map<string, DiagnosticMessage>();

        diagnosticsWithRanges.forEach(({ diagnostic }) => {
            const key = `${diagnostic.severity}:${diagnostic.message}`;
            if (!uniqueDiagnostics.has(key)) {
                uniqueDiagnostics.set(key, diagnostic);
            }
        });

        return Array.from(uniqueDiagnostics.values());
    }, [diagnosticsWithRanges]);

    const getDiagnosticIconName = (severity: DiagnosticMessage["severity"]) => {
        switch (severity) {
            case "WARNING":
                return "warning-outline-rounded";
            case "INFO":
                return "info-outline-rounded";
            case "ERROR":
            default:
                return "error-outline-rounded";
        }
    };

    const getDiagnosticColor = (severity: DiagnosticMessage["severity"]) => {
        switch (severity) {
            case "WARNING":
                return ThemeColors.WARNING;
            case "INFO":
                return ThemeColors.PRIMARY;
            case "ERROR":
            default:
                return ThemeColors.ERROR;
        }
    };

    const triggerSeverity: DiagnosticMessage["severity"] = diagnosticMessages.some((diagnostic) => diagnostic.severity === "ERROR")
        ? "ERROR"
        : diagnosticMessages.some((diagnostic) => diagnostic.severity === "WARNING")
            ? "WARNING"
            : "INFO";

    const targetRange: LineRange | undefined = node.codedata?.lineRange || diagnosticsWithRanges.find((entry) => entry.range)?.range;
    const canFix =
        !readOnly &&
        !!onAddNodePrompt &&
        !!isUserAuthenticated &&
        !!targetRange &&
        diagnosticMessages.length > 0;

    const handleOnFix = () => {
        if (!canFix || !onAddNodePrompt || !targetRange) {
            return;
        }

        const fixPrompt = [
            "Fix the following diagnostics at this code location:",
            ...diagnosticMessages.map((diagnostic, index) => `${index + 1}. [${diagnostic.severity}] ${diagnostic.message}`),
            "",
            "Apply the minimum required code changes to resolve these diagnostics.",
        ].join("\n");

        onAddNodePrompt(
            node,
            {
                fileName: targetRange.fileName,
                startLine: targetRange.startLine,
                endLine: targetRange.endLine,
            },
            fixPrompt,
            {
                planMode: false,
                autoSubmit: true,
            }
        );
        handleOnDiagnosticsClose();
    };

    const disabledFixTooltip = !isUserAuthenticated
        ? "You need to be logged into BI Copilot to fix diagnostics"
        : !targetRange
            ? "No source location available for diagnostics"
            : diagnosticMessages.length === 0
                ? "No diagnostics found to fix"
                : undefined;

    return (
        <>
            <IconBtn color={getDiagnosticColor(triggerSeverity)} onClick={handleOnDiagnosticsClick}>
                <Icon name={getDiagnosticIconName(triggerSeverity)} />
            </IconBtn>
            <Popover
                open={isDiagnosticsOpen}
                anchorEl={diagnosticsAnchorEl}
                handleClose={handleOnDiagnosticsClose}
                sx={{
                    backgroundColor: ThemeColors.SURFACE_DIM,
                }}
            >
                <PopupContainer>
                    <ul>
                        {diagnosticMessages?.map((diagnostic, index) => (
                            <DiagnosticListItem key={`${diagnostic.severity}-${diagnostic.message}-${index}`}>
                                <DiagnosticIcon color={getDiagnosticColor(diagnostic.severity)}>
                                    <Icon name={getDiagnosticIconName(diagnostic.severity)} />
                                </DiagnosticIcon>
                                <DiagnosticMessageText>{diagnostic.message}</DiagnosticMessageText>
                            </DiagnosticListItem>
                        ))}
                    </ul>
                    <Footer>
                        <Tooltip content={disabledFixTooltip}>
                            <span>
                                <FixButton appearance="primary" disabled={!canFix} onClick={handleOnFix}>
                                    <Icon name="bi-ai-agent" sx={{ width: 14, height: 14, fontSize: 14 }} />
                                    Fix with AI
                                </FixButton>
                            </span>
                        </Tooltip>
                    </Footer>
                </PopupContainer>
            </Popover>
        </>
    );
}

type DiagnosticMessageWithRange = {
    diagnostic: DiagnosticMessage;
    range?: LineRange;
};
