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
import styled from "@emotion/styled";
import { Icon } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { MACHINE_VIEW } from "@wso2/ballerina-core";

const NavContainer = styled.div`
    display: flex;
    align-items: center;
    min-height: 48px;
    padding: 0 16px;
    gap: 8px;
    background-color: var(--vscode-editor-background);
    z-index: 1000;
`;

const BreadcrumbContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 4px;
    color: var(--vscode-foreground);
`;

const BreadcrumbSeparator = styled.span`
    color: var(--vscode-descriptionForeground);
`;

const IconButton = styled.div`
    padding: 4px;
    cursor: pointer;
    border-radius: 4px;

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }

    & > div:first-child {
        width: 20px;
        height: 20px;
        font-size: 20px;
    }
`;

const BreadcrumbItem = styled.span<{ clickable?: boolean }>`
    ${({ clickable }: { clickable?: boolean }) =>
        clickable &&
        `
        cursor: pointer;
        &:hover {
            text-decoration: underline;
        }
    `}
`;

interface TopNavigationBarProps {
    onBack?: () => void;
    onHome?: () => void;
}

export function TopNavigationBar(props: TopNavigationBarProps) {
    const { onBack, onHome } = props;
    const { rpcClient } = useRpcContext();
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        rpcClient
            .getVisualizerRpcClient()
            .getHistory()
            .then((history) => {
                console.log(">>> history", history);
                setHistory(history);
            });
    }, []);

    const handleBack = () => {
        rpcClient.getVisualizerRpcClient()?.goBack();
        onBack?.();
    };

    const handleHome = () => {
        rpcClient.getVisualizerRpcClient()?.goHome();
        onHome?.();
    };

    const handleCrumbClick = (index: number) => {
        if (index < history.length - 1) {
            rpcClient.getVisualizerRpcClient().goSelected(index);
        }
    };
    // HACK: To remove forms from breadcrumb. Will have to fix from the state machine side
    const hackToSkipForms = ["overview", "automation", "service", "function", "add natural function", "data mapper", "connection"];
    const existingLabels = new Set<string>();
    return (
        <NavContainer>
            {onBack && (
                <IconButton onClick={handleBack}>
                    <Icon name="bi-arrow-back" iconSx={{ color: "var(--vscode-foreground)" }} />
                </IconButton>
            )}
            <IconButton onClick={handleHome}>
                <Icon name="bi-home" iconSx={{ color: "var(--vscode-foreground)" }} />
            </IconButton>
            <BreadcrumbContainer>
                {history.map((crumb, index) => {
                    const shortName = getShortNames(crumb.location.view);
                    if (index === history.length - 1 || !existingLabels.has(shortName) && !hackToSkipForms.includes(shortName.toLowerCase())) {
                        existingLabels.add(shortName);
                        return (
                            <React.Fragment key={index}>
                                {index > 0 && <BreadcrumbSeparator>/</BreadcrumbSeparator>}
                                <BreadcrumbItem
                                    clickable={index < history.length - 1}
                                    onClick={() => index < history.length - 1 && handleCrumbClick(index)}
                                >
                                    {shortName}
                                </BreadcrumbItem>
                            </React.Fragment>
                        );
                    }
                    return null;
                })}
            </BreadcrumbContainer>
        </NavContainer>
    );
}

function getShortNames(name: string) {
    switch (name) {
        case MACHINE_VIEW.BIDiagram:
            return "Diagram";
        case MACHINE_VIEW.BIComponentView:
            return "Artifacts";
        case MACHINE_VIEW.BIWelcome:
            return "Welcome";
        case MACHINE_VIEW.BIProjectForm:
            return "Project";
        case MACHINE_VIEW.BIMainFunctionForm:
            return "Automation";
        case MACHINE_VIEW.BIFunctionForm:
            return "Function";
        case MACHINE_VIEW.BINPFunctionForm:
            return "Natural Function";
        case MACHINE_VIEW.BITestFunctionForm:
            return "Test Function";
        case MACHINE_VIEW.BIServiceWizard:
        case MACHINE_VIEW.BIServiceConfigView:
            return "Service";
        case MACHINE_VIEW.ServiceDesigner:
            return "Service Designer";
        case MACHINE_VIEW.BIListenerConfigView:
            return "Listener";
        case MACHINE_VIEW.BIDataMapperForm:
            return "Data Mapper";
        case MACHINE_VIEW.AddConnectionWizard:
        case MACHINE_VIEW.EditConnectionWizard:
            return "Connection";
        case MACHINE_VIEW.ViewConfigVariables:
        case MACHINE_VIEW.EditConfigVariables:
            return "Configurable Variables";
        case MACHINE_VIEW.TypeDiagram:
        case "Edit Type":
        case "Add Type":
            return "Types";

        default:
            return name;
    }
}
