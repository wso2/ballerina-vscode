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

import React, { useState } from "react";
import { Button } from "@wso2/ui-toolkit";
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/ballerina-core";
import styled from "@emotion/styled";

const ReviewActionsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 16px;
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    margin: 12px 0 0;
`;

const ActionsTitle = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
`;

const ActionsDescription = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 8px;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

interface ReviewActionsProps {
    rpcClient: any;
    onReviewActionsChange?: (show: boolean) => void;
}

export const ReviewActions: React.FC<ReviewActionsProps> = ({ rpcClient, onReviewActionsChange }) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleReview = async () => {

        try {
            setIsProcessing(true);
            // Open Review Mode
            await rpcClient.getVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: {
                    view: MACHINE_VIEW.ReviewMode
                }
            });
            // Don't dismiss when opening review mode
        } catch (error) {
            console.error("[Review Actions] Error opening review mode:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAcceptAll = async () => {
        try {
            setIsProcessing(true);
            // Accept all changes (integrate code to workspace and hide review actions)
            await rpcClient.getAiPanelRpcClient().acceptChanges();

            onReviewActionsChange?.(false);

            // Navigate back to previous view
            rpcClient.getVisualizerRpcClient().reviewAccepted();
        } catch (error) {
            console.error("[ReviewActions] Error accepting changes:", error);
            // Still navigate back even if there's an error
            rpcClient.getVisualizerRpcClient().reviewAccepted();
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeclineAll = async () => {
        try {
            setIsProcessing(true);
            // Decline all changes (cleanup without integrating and hide review actions)
            await rpcClient.getAiPanelRpcClient().declineChanges();

            onReviewActionsChange?.(false);

            // Navigate back to previous view
            rpcClient.getVisualizerRpcClient().goBack();
        } catch (error) {
            console.error("[ReviewActions] Error declining changes:", error);
            // Still navigate back even if there's an error
            rpcClient.getVisualizerRpcClient().goBack();
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <ReviewActionsContainer>
            <ActionsTitle>Review Changes</ActionsTitle>
            <ActionsDescription>
                You can review the changes, accept them to apply to your workspace, or decline them.
            </ActionsDescription>
            <ButtonGroup>
                <Button appearance="secondary" onClick={handleDeclineAll} disabled={isProcessing}>
                    Discard
                </Button>
                <Button appearance="primary" onClick={handleAcceptAll} disabled={isProcessing}>
                    Keep
                </Button>
                <Button onClick={handleReview}>
                    Review
                </Button>
            </ButtonGroup>
        </ReviewActionsContainer>
    );
};

export default ReviewActions;

