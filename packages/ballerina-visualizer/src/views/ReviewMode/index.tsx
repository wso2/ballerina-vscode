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
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
`;

const ItemType = styled.span`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 500;
    margin-right: 4px;
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
    type: 'component' | 'flow';
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
            return 'addition';
        case ChangeTypeEnum.MODIFICATION:
            return 'modification';
        case ChangeTypeEnum.DELETION:
            return 'deletion';
        default:
            return 'change';
    }
}

// Map numeric nodeKind to string
function getNodeKindString(nodeKind: number): string {
    switch (nodeKind) {
        case NodeKindEnum.AUTOMATION:
            return 'automation';
        case NodeKindEnum.SERVICE:
            return 'service';
        case NodeKindEnum.LISTENER:
            return 'listener';
        case NodeKindEnum.MODULE_LEVEL:
            return 'module level';
        case NodeKindEnum.FUNCTION:
            return 'function';
        case NodeKindEnum.CLASS_INIT:
            return 'class init';
        case NodeKindEnum.RESOURCE_FUNCTION:
            return 'resource function';
        case NodeKindEnum.REMOTE_FUNCTION:
            return 'remote function';
        default:
            return 'component';
    }
}

// Utility function to determine diagram type based on NodeKind
function getDiagramType(nodeKind: number): 'component' | 'flow' {
    const componentKinds = [
        NodeKindEnum.SERVICE,
        NodeKindEnum.LISTENER,
        NodeKindEnum.AUTOMATION,
        NodeKindEnum.MODULE_LEVEL
    ];
    const flowKinds = [
        NodeKindEnum.FUNCTION,
        NodeKindEnum.CLASS_INIT,
        NodeKindEnum.RESOURCE_FUNCTION,
        NodeKindEnum.REMOTE_FUNCTION
    ];
    
    if (componentKinds.includes(nodeKind)) {
        return 'component';
    }
    if (flowKinds.includes(nodeKind)) {
        return 'flow';
    }
    // Default to component view for other kinds
    return 'component';
}

// Utility function to convert SemanticDiff to ReviewView
function convertToReviewView(diff: SemanticDiff, projectPath: string): ReviewView {
    const fileName = diff.uri.split('/').pop() || diff.uri;
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
    type: string;      // "Resource", "Function", "Automation", etc.
    name: string;      // e.g., "todos", "processData"
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
    const currentView = views.length > 0 && currentIndex >= 0 && currentIndex < views.length 
        ? views[currentIndex] 
        : null;

    // Fetch semantic diff data on mount
    useEffect(() => {
        const loadSemanticDiff = async () => {
            try {
                setIsLoading(true);
                const semanticDiffResponse = await fetchSemanticDiff(rpcClient, projectPath);
                console.log('[Review Mode] Opening review mode with data:', semanticDiffResponse);
                
                setSemanticDiffData(semanticDiffResponse);
                
                const allViews: ReviewView[] = [];
                
                // If loadDesignDiagrams is true, add component diagram as first view
                if (semanticDiffResponse.loadDesignDiagrams && semanticDiffResponse.semanticDiffs.length > 0) {
                    // Component diagram shows the entire project design, not a specific file/position
                    // We use the first diff's file just as a reference, but the actual diagram
                    // loads the entire design model for the project
                    allViews.push({
                        type: 'component',
                        filePath: projectPath, // Use project path instead of specific file
                        position: {
                            startLine: 0,
                            endLine: 0,
                            startColumn: 0,
                            endColumn: 0,
                        },
                        projectPath,
                        label: 'Design Diagram',
                    });
                    console.log('[Review Mode] Added component diagram as first view');
                }
                
                // Convert all semantic diffs to flow diagram views
                const flowViews = semanticDiffResponse.semanticDiffs.map((diff, index) => {
                    const view = convertToReviewView(diff, projectPath);
                    console.log(`[Review Mode] Created flow view ${index + 1}:`, view.label);
                    return view;
                });
                allViews.push(...flowViews);
                
                console.log('[Review Mode] Total views created:', allViews.length);
                console.log('[Review Mode] All views:', allViews.map((v, i) => `${i}: ${v.label} (${v.type})`));
                
                setViews(allViews);
                setCurrentIndex(0);
                console.log('[Review Mode] Set initial index to 0');
            } catch (error) {
                console.error('[Review Mode] Error fetching semantic diff:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSemanticDiff();
    }, [projectPath, rpcClient]);

    const handlePrevious = () => {
        console.log('[Review Mode] Previous clicked. Current index:', currentIndex, 'Total views:', views.length);
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setCurrentItemMetadata(null); // Clear metadata when navigating
            console.log('[Review Mode] Moving to index:', currentIndex - 1);
        } else {
            console.log('[Review Mode] Already at first view');
        }
    };

    const handleNext = () => {
        console.log('[Review Mode] Next clicked. Current index:', currentIndex, 'Total views:', views.length);
        if (currentIndex < views.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setCurrentItemMetadata(null); // Clear metadata when navigating
            console.log('[Review Mode] Moving to index:', currentIndex + 1);
        } else {
            console.log('[Review Mode] Already at last view');
        }
    };

    const handleClose = () => {
        console.log("[Review Mode] Close button clicked");
        // Just navigate back without accepting or rejecting
        rpcClient.getVisualizerRpcClient().reviewRejected();
    };

    const handleModelLoaded = (metadata: ItemMetadata) => {
        console.log("[Review Mode] Model loaded with metadata:", metadata);
        setCurrentItemMetadata(metadata);
    };

    const handleAccept = async () => {
        console.log("[Review Mode] Accepting changes...");
        try {
            // Accept the changes (integrate code to workspace and hide review actions)
            await rpcClient.getAiPanelRpcClient().acceptChanges();
            console.log("[Review Mode] Changes accepted successfully");
            
            // Navigate back to previous view
            rpcClient.getVisualizerRpcClient().reviewAccepted();
        } catch (error) {
            console.error("[Review Mode] Error accepting changes:", error);
            // Still navigate back even if there's an error
            rpcClient.getVisualizerRpcClient().reviewAccepted();
        }
    };

    const handleReject = async () => {
        console.log("[Review Mode] Rejecting changes...");
        try {
            // Decline the changes (cleanup without integrating and hide review actions)
            await rpcClient.getAiPanelRpcClient().declineChanges();
            console.log("[Review Mode] Changes declined successfully");
            
            // Navigate back to previous view
            rpcClient.getVisualizerRpcClient().reviewRejected();
        } catch (error) {
            console.error("[Review Mode] Error declining changes:", error);
            // Still navigate back even if there's an error
            rpcClient.getVisualizerRpcClient().reviewRejected();
        }
    };

    const renderDiagram = () => {
        if (!currentView) {
            return <div>No view to display</div>;
        }

        switch (currentView.type) {
            case 'component':
                // For component diagram, set metadata directly
                if (!currentItemMetadata) {
                    setCurrentItemMetadata({
                        type: 'Design',
                        name: 'Overview'
                    });
                }
                return (
                    <ReadonlyComponentDiagram
                        projectPath={currentView.projectPath || projectPath}
                        filePath={currentView.filePath}
                        position={currentView.position}
                    />
                );
            case 'flow':
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
                />
                <DiagramContainer style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ color: 'var(--vscode-foreground)' }}>Loading semantic diff...</div>
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
                />
                <DiagramContainer style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ color: 'var(--vscode-foreground)' }}>No changes to review</div>
                </DiagramContainer>
            </ReviewContainer>
        );
    }

    const canGoPrevious = currentIndex > 0;
    const canGoNext = currentIndex < views.length - 1;

    // Format the display text for the header
    const getHeaderText = () => {
        if (!currentItemMetadata) {
            return { type: '', name: 'Loading...', fullName: 'Loading...' };
        }
        
        const type = currentItemMetadata.type;
        let name = currentItemMetadata.name;
        
        // For resources, prepend accessor (e.g., "get todos")
        if (currentItemMetadata.accessor) {
            name = `${currentItemMetadata.accessor} ${name}`;
        }
        
        return { type, name, fullName: name };
    };

    const headerText = getHeaderText();

    // Create subtitle element with type badge
    const subtitleElement = headerText.type ? (
        <ItemType>{headerText.type}</ItemType>
    ) : undefined;

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
                title={headerText.fullName}
                subtitleElement={subtitleElement}
                actions={headerActions}
                hideBack={true}
                hideUndoRedo={true}
            />
            <DiagramContainer>
                {renderDiagram()}
            </DiagramContainer>
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


