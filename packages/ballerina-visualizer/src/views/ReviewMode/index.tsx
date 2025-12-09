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
import { ReviewModeData, ReviewViewItem } from "@wso2/ballerina-core";
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

interface ReviewModeProps {
    reviewData: ReviewModeData;
    projectPath: string;
}

export function ReviewMode(props: ReviewModeProps): JSX.Element {
    const { reviewData, projectPath } = props;
    const { rpcClient } = useRpcContext();
    const [currentIndex, setCurrentIndex] = useState(reviewData.currentIndex || 0);
    const [currentView, setCurrentView] = useState<ReviewViewItem>(reviewData.views[currentIndex]);

    useEffect(() => {
        setCurrentView(reviewData.views[currentIndex]);
    }, [currentIndex, reviewData.views]);

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < reviewData.views.length - 1) {
            setCurrentIndex(currentIndex + 1);
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

    return (
        <ReviewContainer>
            <ReviewBadge>Review Mode</ReviewBadge>
            <DiagramContainer>
                {renderDiagram()}
            </DiagramContainer>
            <ReviewNavigation
                currentIndex={currentIndex}
                totalViews={reviewData.views.length}
                currentLabel={currentView?.label}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onAccept={handleAccept}
                onReject={handleReject}
                canGoPrevious={currentIndex > 0}
                canGoNext={currentIndex < reviewData.views.length - 1}
            />
        </ReviewContainer>
    );
}


