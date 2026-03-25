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
import { Icon } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { DIRECTORY_MAP, EVENT_TYPE, HistoryEntry, MACHINE_VIEW, VisualizerLocation, WorkspaceTypeResponse } from "@wso2/ballerina-core";

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

/**
 * A single item in the dedicated breadcrumb trail.
 *
 * `historyIndex` is the index into the raw history array for this item.
 * When it is `null` the item was synthesised from a `parentIdentifier` that is
 * not directly present in the history (e.g. a direct tree-view jump to a
 * function inside a service).  Clicking a virtual item triggers a fresh
 * navigation to the parent service via a project-structure lookup.
 */
interface BreadcrumbDisplayItem {
    label: string;
    historyIndex: number | null;
    /**
     * Set on virtual parent entries (historyIndex === null).
     * Holds the service identifier to look up in the project structure when
     * the user clicks this breadcrumb segment.
     */
    virtualServiceName?: string;
    /**
     * Set on synthetic workspace package entries (historyIndex === null).
     * Holds a documentUri from the package so we can open its PackageOverview.
     */
    virtualPackageUri?: string;
}

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
        ]).then(([historyResult, workspaceTypeResult]) => {
            setHistory(historyResult);
            setWorkspaceType(workspaceTypeResult);
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

    const handleCrumbClick = async (item: BreadcrumbDisplayItem) => {
        if (item.historyIndex !== null) {
            rpcClient.getVisualizerRpcClient().goSelected(item.historyIndex);
            return;
        }

        // Synthetic workspace package item: navigate directly to that package's overview.
        if (item.virtualPackageUri) {
            rpcClient.getVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: {
                    view: MACHINE_VIEW.PackageOverview,
                    documentUri: item.virtualPackageUri,
                },
                resetHistory: true,
            });
            return;
        }

        // Virtual parent: synthesised from parentIdentifier, not present in history.
        // Look up the service location in the project structure and navigate to it,
        // clearing history so the ServiceDesigner becomes the starting point.
        if (item.virtualServiceName) {
            try {
                const projectStructure = await rpcClient.getBIDiagramRpcClient().getProjectStructure();
                const project =
                    projectStructure.projects.find((p) => p.projectPath === projectPath) ??
                    projectStructure.projects[0];

                const service = project?.directoryMap[DIRECTORY_MAP.SERVICE]?.find(
                    (s) => s.name === item.virtualServiceName
                );

                if (service) {
                    rpcClient.getVisualizerRpcClient().openView({
                        type: EVENT_TYPE.OPEN_VIEW,
                        location: {
                            view: MACHINE_VIEW.ServiceDesigner,
                            identifier: service.name,
                            documentUri: service.path,
                            position: service.position,
                            artifactType: DIRECTORY_MAP.SERVICE,
                            projectPath: project.projectPath,
                        },
                        resetHistory: true,
                    });
                    return;
                }
            } catch {
                // fall through to home
            }
        }

        handleHome();
    };

    const hasMultiplePackages = useMemo(() => {
        return (
            workspaceType?.type === "BALLERINA_WORKSPACE" ||
            workspaceType?.type === "MULTIPLE_PROJECTS" ||
            workspaceType?.type === "VSCODE_WORKSPACE"
        );
    }, [workspaceType]);

    // Views that should be hidden from the breadcrumb trail (forms/wizards)
    const skippedViews = useMemo(() => {
        const views = new Set<string>([
            MACHINE_VIEW.WorkspaceOverview,
            MACHINE_VIEW.BIMainFunctionForm,
            MACHINE_VIEW.BIFunctionForm,
            MACHINE_VIEW.BINPFunctionForm,
            MACHINE_VIEW.BITestFunctionForm,
            MACHINE_VIEW.BIAgentToolForm,
            MACHINE_VIEW.BIAIEvaluationForm,
            MACHINE_VIEW.BIServiceWizard,
            MACHINE_VIEW.BIDataMapperForm,
            MACHINE_VIEW.AddConnectionWizard,
            MACHINE_VIEW.EditConnectionWizard,
            MACHINE_VIEW.BIWelcome,
            MACHINE_VIEW.BIProjectForm,
            MACHINE_VIEW.BIAddProjectForm,
            MACHINE_VIEW.BIImportIntegration,
            MACHINE_VIEW.ReviewMode,
            MACHINE_VIEW.EvalsetViewer,
        ]);
        if (workspaceType?.type !== "BALLERINA_WORKSPACE") {
            views.add(MACHINE_VIEW.PackageOverview);
        }
        return views;
    }, [workspaceType]);

    // Build the dedicated breadcrumb trail from the history.
    const breadcrumbItems = useMemo(
        () => buildBreadcrumbItems(history, skippedViews, hasMultiplePackages),
        [history, skippedViews, hasMultiplePackages]
    );

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
                {breadcrumbItems.map((item, idx) => {
                    const isLast = idx === breadcrumbItems.length - 1;

                    return (
                        <React.Fragment key={idx}>
                            {idx > 0 && (
                                <Icon
                                    name="wide-chevron"
                                    iconSx={{
                                        color: "var(--vscode-foreground)",
                                        fontSize: "15px",
                                        opacity: 0.5
                                    }}
                                    sx={{ alignSelf: "center" }}
                                />
                            )}
                            <BreadcrumbItem>
                                <BreadcrumbText
                                    clickable={!isLast}
                                    title={item.label}
                                    onClick={() => !isLast && handleCrumbClick(item)}
                                >
                                    {item.label}
                                </BreadcrumbText>
                            </BreadcrumbItem>
                        </React.Fragment>
                    );
                })}
            </BreadcrumbContainer>
            {/** TODO: Uncomment if want to show popup icon */}
            {/* <Button tooltip="Manage WSO2 Cloud" appearance="icon" onClick={(e)=>setDevantBtnAnchor(e.currentTarget as HTMLElement)}>
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

/**
 * Builds the dedicated breadcrumb trail from the raw navigation history.
 *
 * The algorithm walks the history array and, for every diagram-level entry
 * (BIDiagram, DataMapper, TypeDiagram) that carries a `parentIdentifier`,
 * injects a synthetic parent segment if no matching ServiceDesigner entry is
 * already present earlier in the trail.  This ensures the logical tree-view
 * hierarchy is always visible — even when the user navigated directly to a
 * function from the project explorer without passing through the service view.
 *
 * Views after the diagram boundary (forms, wizards) continue to appear in the
 * trail using the history stack so that clicking them navigates correctly via
 * `goSelected`.
 */
function buildBreadcrumbItems(
    history: HistoryEntry[],
    skippedViews: Set<string>,
    hasMultiplePackages: boolean
): BreadcrumbDisplayItem[] {
    const items: BreadcrumbDisplayItem[] = [];
    const seenLabels = new Set<string>();

    // In workspace mode, ensure the package name always appears as the first
    // breadcrumb item.  When the user navigates directly from the tree view to
    // a service or function the state machine pushes only that view to history
    // (no preceding PackageOverview entry).  Detect this case and synthesise a
    // virtual package item from whichever history entry carries a package name.
    if (hasMultiplePackages) {
        const hasPackageOverview = history.some(
            (h) => h.location.view === MACHINE_VIEW.PackageOverview && !skippedViews.has(h.location.view)
        );

        if (!hasPackageOverview) {
            const firstWithPkg = history.find((h) => h.location.package);
            const pkg = firstWithPkg?.location.package;
            if (pkg) {
                items.push({
                    label: pkg,
                    historyIndex: null,
                    virtualPackageUri: firstWithPkg.location.documentUri,
                });
                seenLabels.add(pkg);
            }
        }
    }

    for (let i = 0; i < history.length; i++) {
        const entry = history[i];
        const isLast = i === history.length - 1;
        const { view, parentIdentifier, package: pkg } = entry.location;

        // Skip form/wizard views unless this is the current (active) view.
        if (!isLast && skippedViews.has(view)) {
            continue;
        }

        // In workspace mode show the package name in place of the generic
        // "Overview" label so users immediately see which project they're in.
        const displayLabel =
            hasMultiplePackages && view === MACHINE_VIEW.PackageOverview && pkg
                ? pkg
                : getDisplayLabel(entry.location);

        // For diagram-level views that carry a parentIdentifier, inject the
        // parent segment if it has not already appeared in the breadcrumb trail.
        const isDiagramView =
            view === MACHINE_VIEW.BIDiagram ||
            view === MACHINE_VIEW.DataMapper ||
            view === MACHINE_VIEW.InlineDataMapper;

        if (isDiagramView && parentIdentifier && !seenLabels.has(parentIdentifier)) {
            // Check whether the parent already exists as a real history entry
            // (e.g. the user navigated through ServiceDesigner first).
            const parentHistoryIndex = history.findIndex(
                (h) =>
                    h.location.view === MACHINE_VIEW.ServiceDesigner &&
                    h.location.identifier === parentIdentifier
            );

            const isVirtual = parentHistoryIndex < 0;
            items.push({
                label: parentIdentifier,
                historyIndex: isVirtual ? null : parentHistoryIndex,
                virtualServiceName: isVirtual ? parentIdentifier : undefined,
            });
            seenLabels.add(parentIdentifier);
        }

        // Add this entry — always include the last item even if the label was seen.
        if (isLast || !seenLabels.has(displayLabel)) {
            seenLabels.add(displayLabel);
            items.push({ label: displayLabel, historyIndex: i });
        }
    }

    return items;
}

/**
 * Returns the display label for a history entry.
 *
 * Tree-view anchored views (ServiceDesigner, BIDiagram, DataMapper, TypeDiagram)
 * use the actual artifact name stored in `location.identifier` so that the
 * breadcrumb reflects the real name rather than a generic view label.
 *
 * Post-diagram views (forms, wizards) keep their generic labels because they
 * represent navigation steps rather than project artefacts.
 */
function getDisplayLabel(location: VisualizerLocation): string {
    switch (location.view) {
        case MACHINE_VIEW.ServiceDesigner:
            return location.identifier || "Service Designer";
        case MACHINE_VIEW.BIDiagram:
            return location.identifier || "Diagram";
        case MACHINE_VIEW.DataMapper:
        case MACHINE_VIEW.InlineDataMapper:
            return location.identifier || "Data Mapper";
        case MACHINE_VIEW.TypeDiagram:
            return location.identifier || "Types";

        case MACHINE_VIEW.BIComponentView:
            return "Artifacts";
        case MACHINE_VIEW.BIServiceConfigView:
            return "Service";
        case MACHINE_VIEW.BIListenerConfigView:
            return "Listener";
        case MACHINE_VIEW.BIMainFunctionForm:
            return "Automation";
        case MACHINE_VIEW.BIFunctionForm:
            return "Function";
        case MACHINE_VIEW.BINPFunctionForm:
            return "Natural Function";
        case MACHINE_VIEW.BITestFunctionForm:
            return "Test Function";
        case MACHINE_VIEW.BIAgentToolForm:
            return "Agent Tool";
        case MACHINE_VIEW.BIAIEvaluationForm:
            return "AI Evaluation";
        case MACHINE_VIEW.BIServiceWizard:
            return "Service";
        case MACHINE_VIEW.BIDataMapperForm:
            return "Data Mapper";
        case MACHINE_VIEW.AddConnectionWizard:
        case MACHINE_VIEW.EditConnectionWizard:
            return "Connection";
        case MACHINE_VIEW.ViewConfigVariables:
        case MACHINE_VIEW.EditConfigVariables:
            return "Configurable Variables";
        case MACHINE_VIEW.EvalsetViewer:
            return "Evalset Viewer";

        default:
            return location.view || "";
    }
}
