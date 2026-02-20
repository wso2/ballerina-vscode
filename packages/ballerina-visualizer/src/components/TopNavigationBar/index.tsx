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
import styled from "@emotion/styled";
import { Button, Codicon, Icon } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { HistoryEntry, MACHINE_VIEW, WorkspaceTypeResponse } from "@wso2/ballerina-core";

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
    flex: 1;
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

const BreadcrumbItem = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
`;

const BreadcrumbText = styled.span<{ clickable?: boolean }>`
    ${({ clickable }: { clickable?: boolean }) =>
        clickable &&
        `
        cursor: pointer;
        &:hover {
            text-decoration: underline;
        }
    `}
`;

const PackageContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--vscode-foreground);
    background-color: var(--vscode-editor-inactiveSelectionBackground);
    max-width: 120px;
    overflow: hidden;
    padding: 3px 4px;
    font-size: 10px;
    border-radius: 5px;
    line-height: 1;
`;

const PackageName = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

interface TopNavigationBarProps {
    projectPath: string;
    onBack?: () => void;
    onHome?: () => void;
}

export function TopNavigationBar(props: TopNavigationBarProps) {
    const { projectPath, onBack, onHome } = props;
    const { rpcClient } = useRpcContext();
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [workspaceType, setWorkspaceType] = useState<WorkspaceTypeResponse>(null);

    useEffect(() => {
        Promise.all([
            rpcClient.getVisualizerRpcClient().getHistory(),
            rpcClient.getCommonRpcClient().getWorkspaceType()
        ]).then(([history, workspaceType]) => {
            console.log(">>> history", history);
            setHistory(history);
            setWorkspaceType(workspaceType);
        });
    }, [projectPath]);

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

    const hasMultiplePackages = useMemo(() => {
        return workspaceType?.type === "BALLERINA_WORKSPACE" ||
            workspaceType?.type === "MULTIPLE_PROJECTS" ||
            workspaceType?.type === "VSCODE_WORKSPACE";
    }, [workspaceType]);

    const isAtOverview = useMemo(() => {
        return history.length > 0 && history[history.length - 1].location.view === MACHINE_VIEW.PackageOverview;
    }, [history]);

    // HACK: To remove forms from breadcrumb. Will have to fix from the state machine side
    const hackToSkipForms = [
        "workspace overview",
        "automation",
        "service",
        "function",
        "add natural function",
        "data mapper",
        "connection",
        "add project",
        "bi add project skip",
        "welcome"
    ];

    if (workspaceType?.type !== "BALLERINA_WORKSPACE") {
        hackToSkipForms.push("package overview");
    }    

    const existingLabels = new Set<string>();
    let hasRenderedPreviousItem = false;
    
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
                        const shouldShowChevron = hasRenderedPreviousItem;
                        hasRenderedPreviousItem = true;
                        
                        return (
                            <React.Fragment key={index}>
                                {shouldShowChevron && (
                                    <Icon
                                        name="wide-chevron"
                                        iconSx={{
                                            color: "var(--vscode-foreground)",
                                            fontSize: hasMultiplePackages ? "20px" : "15px",
                                            opacity: 0.5
                                        }}
                                        sx={{ alignSelf: "center" }}
                                    />
                                )}
                                <BreadcrumbItem>
                                    <BreadcrumbText
                                        clickable={index < history.length - 1}
                                        onClick={() => index < history.length - 1 && handleCrumbClick(index)}
                                    >
                                        {shortName}
                                    </BreadcrumbText>
                                    {hasMultiplePackages && crumb.location.package && !(isAtOverview && index === history.length - 1) && (
                                        <PackageContainer>
                                            <Codicon
                                                name="project"
                                                sx={{ height: "10px", width: "10px", display: "flex", alignItems: "center" }}
                                                iconSx={{ fontSize: "10px", lineHeight: "1" }}
                                            />
                                            <PackageName>{crumb.location.package}</PackageName>
                                        </PackageContainer>
                                    )}
                                </BreadcrumbItem>
                            </React.Fragment>
                        );
                    }
                    return null;
                })}
            </BreadcrumbContainer>
            {/** TODO: Uncomment if want to show popup icon */}
            {/* <Button tooltip="Manage Devant" appearance="icon" onClick={(e)=>setDevantBtnAnchor(e.currentTarget as HTMLElement)}>
                <Icon name="Devant" sx={{ fontSize: "18px", width: "18px" }} />
            </Button>
            <PlatformExtPopover 
                anchorEl={devantBtnAnchor} 
                onClose={() => setDevantBtnAnchor(null)} 
                isVisible={!!devantBtnAnchor} 
                projectPath={projectPath} 
            /> */}
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
        case MACHINE_VIEW.BIAIEvaluationForm:
            return "AI Evaluation";
        case MACHINE_VIEW.EvalsetViewer:
            return "Evalset Viewer";
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
