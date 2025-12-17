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
import { SemanticDiffResponse, SemanticDiff, ChangeTypeEnum } from "@wso2/ballerina-core";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { ReadonlyComponentDiagram } from "./ReadonlyComponentDiagram";
import { ReadonlyFlowDiagram } from "./ReadonlyFlowDiagram";
import { ReviewNavigation } from "./ReviewNavigation";
import { Icon, ThemeColors } from "@wso2/ui-toolkit";
import { TitleBar } from "../../components/TitleBar";
import { getTitleBarSubEl } from "../BI/DiagramWrapper";

const ReviewContainer = styled.div`
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: var(--vscode-editor-background);
    position: relative;
`;

const DiagramContainer = styled.div`
    flex: 1;
    overflow: hidden;
    position: relative;
`;

const ReviewModeBadge = styled.div`
    padding: 4px 12px;
    background: ${ThemeColors.PRIMARY};
    color: white;
    border-radius: 2px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
`;


const CloseButton = styled.button`
    background: transparent;
    border: none;
    color: var(--vscode-foreground);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
        background: var(--vscode-toolbar-hoverBackground);
    }

    &:active {
        background: var(--vscode-toolbar-activeBackground);
    }

    & > div:first-child {
        width: 20px;
        height: 20px;
        font-size: 20px;
    }
`;

interface ReviewView {
    type: "component" | "flow";
    filePath: string;
    position: {
        startLine: number;
        endLine: number;
        startColumn: number;
        endColumn: number;
    };
    projectPath: string;
    label?: string;
}

// NodeKind enum mapping (based on backend enum values)
// Reference: https://github.com/ballerina-platform/ballerina-lang/blob/master/compiler/ballerina-lang/src/main/java/org/wso2/ballerinalang/compiler/tree/BLangNodeVisitor.java
enum NodeKindEnum {
    AUTOMATION = 0,
    SERVICE = 1,
    LISTENER = 2,
    MODULE_LEVEL = 3,
    FUNCTION = 4,
    CLASS_INIT = 5,
    RESOURCE_FUNCTION = 6,
    REMOTE_FUNCTION = 7,
}

// Map numeric changeType to string
function getChangeTypeString(changeType: number): string {
    switch (changeType) {
        case ChangeTypeEnum.ADDITION:
            return "addition";
        case ChangeTypeEnum.MODIFICATION:
            return "modification";
        case ChangeTypeEnum.DELETION:
            return "deletion";
        default:
            return "change";
    }
}

// Map numeric nodeKind to string
function getNodeKindString(nodeKind: number): string {
    switch (nodeKind) {
        case NodeKindEnum.AUTOMATION:
            return "automation";
        case NodeKindEnum.SERVICE:
            return "service";
        case NodeKindEnum.LISTENER:
            return "listener";
        case NodeKindEnum.MODULE_LEVEL:
            return "module level";
        case NodeKindEnum.FUNCTION:
            return "function";
        case NodeKindEnum.CLASS_INIT:
            return "class init";
        case NodeKindEnum.RESOURCE_FUNCTION:
            return "resource function";
        case NodeKindEnum.REMOTE_FUNCTION:
            return "remote function";
        default:
            return "component";
    }
}

// Utility function to convert SemanticDiff to ReviewView
function convertToReviewView(diff: SemanticDiff, projectPath: string): ReviewView {
    const fileName = diff.uri.split("/").pop() || diff.uri;
    const changeTypeStr = getChangeTypeString(diff.changeType);
    const nodeKindStr = getNodeKindString(diff.nodeKind);
    const changeLabel = `${changeTypeStr}: ${nodeKindStr} in ${fileName}`;

    return {
        type: "flow",
        filePath: diff.uri,
        position: {
            startLine: diff.lineRange.startLine.line,
            endLine: diff.lineRange.endLine.line,
            startColumn: diff.lineRange.startLine.offset,
            endColumn: diff.lineRange.endLine.offset,
        },
        projectPath,
        label: changeLabel,
    };
}

// Utility function to fetch semantic diff data
async function fetchSemanticDiff(rpcClient: any, projectPath: string): Promise<SemanticDiffResponse> {
    return await rpcClient.getAiPanelRpcClient().getSemanticDiff({ projectPath });
}

interface ReviewModeProps {
    projectPath: string;
}

interface ItemMetadata {
    type: string; // "Resource", "Function", "Automation", etc.
    name: string; // e.g., "todos", "processData"
    accessor?: string; // e.g., "get", "post" (for resources)
}

export function ReviewMode(props: ReviewModeProps): JSX.Element {
    const { projectPath } = props;
    const { rpcClient } = useRpcContext();

    const [semanticDiffData, setSemanticDiffData] = useState<SemanticDiffResponse | null>(null);
    const [views, setViews] = useState<ReviewView[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [currentItemMetadata, setCurrentItemMetadata] = useState<ItemMetadata | null>(null);

    // Derive current view from views array and currentIndex - no separate state needed
    const currentView =
        views.length > 0 && currentIndex >= 0 && currentIndex < views.length ? views[currentIndex] : null;

    // Fetch semantic diff data on mount
    useEffect(() => {
        const loadSemanticDiff = async () => {
            try {
                setIsLoading(true);
                const semanticDiffResponse = await fetchSemanticDiff(rpcClient, projectPath);

                setSemanticDiffData(semanticDiffResponse);

                const allViews: ReviewView[] = [];

                // If loadDesignDiagrams is true, add component diagram as first view
                if (semanticDiffResponse.loadDesignDiagrams && semanticDiffResponse.semanticDiffs.length > 0) {
                    // Component diagram shows the entire project design, not a specific file/position
                    // We use the first diff's file just as a reference, but the actual diagram
                    // loads the entire design model for the project
                    allViews.push({
                        type: "component",
                        filePath: projectPath, // Use project path instead of specific file
                        position: {
                            startLine: 0,
                            endLine: 0,
                            startColumn: 0,
                            endColumn: 0,
                        },
                        projectPath,
                        label: "Design Diagram",
                    });
                }

                // Convert all semantic diffs to flow diagram views
                const flowViews = semanticDiffResponse.semanticDiffs.map((diff) => {
                    const view = convertToReviewView(diff, projectPath);
                    return view;
                });
                allViews.push(...flowViews);

                setViews(allViews);
                setCurrentIndex(0);
            } catch (error) {
                console.error("[Review Mode] Error fetching semantic diff:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSemanticDiff();
    }, [projectPath, rpcClient]);

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setCurrentItemMetadata(null); // Clear metadata when navigating
        } else {
            console.log("[Review Mode] Already at first view");
        }
    };

    const handleNext = () => {
        if (currentIndex < views.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setCurrentItemMetadata(null); // Clear metadata when navigating
        } else {
            console.log("[Review Mode] Already at last view");
        }
    };

    const handleClose = () => {
        rpcClient.getVisualizerRpcClient().goBack();
    };

    const handleModelLoaded = (metadata: ItemMetadata) => {
        setCurrentItemMetadata(metadata);
    };

    const handleAccept = async () => {
        try {
            // Accept the changes (integrate code to workspace and hide review actions)
            await rpcClient.getAiPanelRpcClient().acceptChanges();

            // Navigate back to previous view
            rpcClient.getVisualizerRpcClient().reviewAccepted();
        } catch (error) {
            console.error("[Review Mode] Error accepting changes:", error);
            // Still navigate back even if there's an error
            rpcClient.getVisualizerRpcClient().reviewAccepted();
        }
    };

    const handleReject = async () => {
        try {
            // Decline the changes (cleanup without integrating and hide review actions)
            await rpcClient.getAiPanelRpcClient().declineChanges();

            // Navigate back to previous view
            rpcClient.getVisualizerRpcClient().goBack();
        } catch (error) {
            console.error("[Review Mode] Error declining changes:", error);
            // Still navigate back even if there's an error
            rpcClient.getVisualizerRpcClient().goBack();
        }
    };

    const renderDiagram = () => {
        if (!currentView) {
            return <div>No view to display</div>;
        }

        switch (currentView.type) {
            case "component":
                // For component diagram, set metadata directly
                if (!currentItemMetadata) {
                    setCurrentItemMetadata({
                        type: "Design",
                        name: "",
                    });
                }
                return (
                    <ReadonlyComponentDiagram
                        projectPath={currentView.projectPath || projectPath}
                        filePath={currentView.filePath}
                        position={currentView.position}
                    />
                );
            case "flow":
                return (
                    <ReadonlyFlowDiagram
                        projectPath={currentView.projectPath || projectPath}
                        filePath={currentView.filePath}
                        position={currentView.position}
                        onModelLoaded={handleModelLoaded}
                    />
                );
            default:
                return <div>Unknown diagram type</div>;
        }
    };

    if (isLoading) {
        return (
            <ReviewContainer>
                <TitleBar
                    title="Loading..."
                    actions={<ReviewModeBadge>Review Mode</ReviewModeBadge>}
                    hideBack={true}
                    hideUndoRedo={true}
                />
                <DiagramContainer style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <div style={{ color: "var(--vscode-foreground)" }}>Loading semantic diff...</div>
                </DiagramContainer>
            </ReviewContainer>
        );
    }

    if (!semanticDiffData || views.length === 0) {
        return (
            <ReviewContainer>
                <TitleBar
                    title="No Changes"
                    actions={<ReviewModeBadge>Review Mode</ReviewModeBadge>}
                    hideBack={true}
                    hideUndoRedo={true}
                />
                <DiagramContainer style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <div style={{ color: "var(--vscode-foreground)" }}>No changes to review</div>
                </DiagramContainer>
            </ReviewContainer>
        );
    }

    const canGoPrevious = currentIndex > 0;
    const canGoNext = currentIndex < views.length - 1;
    const isAutomation = currentItemMetadata?.type === "Function" && currentItemMetadata?.name === "main";
    const isResource = currentItemMetadata?.type === "Resource";
    // Format the display text for the header
    const getHeaderText = () => {
        if (!currentItemMetadata) {
            return { type: "", name: "Loading..." };
        }

        let type = currentItemMetadata.type;
        let name = currentItemMetadata.name;

        if (isAutomation) {
            type = "Automation";
        }

        return { type, name };
    };
    const headerText = getHeaderText();
    const subtitleElement = getTitleBarSubEl(
        headerText.name,
        currentItemMetadata?.accessor || "",
        isResource,
        isAutomation
    );

    // Create actions for the right side
    const headerActions = (
        <>
            <ReviewModeBadge>Review Mode</ReviewModeBadge>
            <CloseButton onClick={handleClose} title="Close Review Mode">
                <Icon name="bi-close" />
            </CloseButton>
        </>
    );

    return (
        <ReviewContainer>
            <TitleBar
                title={headerText.type}
                subtitleElement={subtitleElement}
                actions={headerActions}
                hideBack={true}
                hideUndoRedo={true}
            />
            <DiagramContainer>{renderDiagram()}</DiagramContainer>
            <ReviewNavigation
                key={`nav-${currentIndex}-${views.length}`}
                currentIndex={currentIndex}
                totalViews={views.length}
                currentLabel={currentView?.label}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onAccept={handleAccept}
                onReject={handleReject}
                canGoPrevious={canGoPrevious}
                canGoNext={canGoNext}
            />
        </ReviewContainer>
    );
}
