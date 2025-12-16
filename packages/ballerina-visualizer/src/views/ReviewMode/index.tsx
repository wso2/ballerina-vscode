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
import { ThemeColors } from "@wso2/ui-toolkit";

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

const ReviewBadge = styled.div`
    position: absolute;
    top: 16px;
    right: 16px;
    background: ${ThemeColors.PRIMARY};
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    z-index: 100;
    font-family: var(--vscode-font-family);
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

export function ReviewMode(props: ReviewModeProps): JSX.Element {
    const { projectPath } = props;
    const { rpcClient } = useRpcContext();
    
    const [semanticDiffData, setSemanticDiffData] = useState<SemanticDiffResponse | null>(null);
    const [views, setViews] = useState<ReviewView[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    
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
                    const firstDiff = semanticDiffResponse.semanticDiffs[0];
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
            console.log('[Review Mode] Moving to index:', currentIndex - 1);
        } else {
            console.log('[Review Mode] Already at first view');
        }
    };

    const handleNext = () => {
        console.log('[Review Mode] Next clicked. Current index:', currentIndex, 'Total views:', views.length);
        if (currentIndex < views.length - 1) {
            setCurrentIndex(currentIndex + 1);
            console.log('[Review Mode] Moving to index:', currentIndex + 1);
        } else {
            console.log('[Review Mode] Already at last view');
        }
    };

    const handleAccept = () => {
        console.log("Accepting changes...");
        rpcClient.getVisualizerRpcClient().reviewAccepted();
    };

    const handleReject = () => {
        console.log("Rejecting changes...");
        rpcClient.getVisualizerRpcClient().reviewRejected();
    };

    const renderDiagram = () => {
        if (!currentView) {
            return <div>No view to display</div>;
        }

        switch (currentView.type) {
            case 'component':
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
                    />
                );
            default:
                return <div>Unknown diagram type</div>;
        }
    };

    if (isLoading) {
        return (
            <ReviewContainer>
                <ReviewBadge>Review Mode</ReviewBadge>
                <DiagramContainer style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ color: 'var(--vscode-foreground)' }}>Loading semantic diff...</div>
                </DiagramContainer>
            </ReviewContainer>
        );
    }

    if (!semanticDiffData || views.length === 0) {
        return (
            <ReviewContainer>
                <ReviewBadge>Review Mode</ReviewBadge>
                <DiagramContainer style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ color: 'var(--vscode-foreground)' }}>No changes to review</div>
                </DiagramContainer>
            </ReviewContainer>
        );
    }

    const canGoPrevious = currentIndex > 0;
    const canGoNext = currentIndex < views.length - 1;

    console.log('[Review Mode] ==========RENDER==========');
    console.log('[Review Mode] Current index:', currentIndex);
    console.log('[Review Mode] Total views:', views.length);
    console.log('[Review Mode] Current view:', currentView?.label, `(type: ${currentView?.type})`);
    console.log('[Review Mode] Can go previous:', canGoPrevious);
    console.log('[Review Mode] Can go next:', canGoNext);
    console.log('[Review Mode] ================================');

    return (
        <ReviewContainer>
            <ReviewBadge>Review Mode</ReviewBadge>
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


