/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import styled from "@emotion/styled";
import { Icon } from "@wso2/ui-toolkit";
import { VSCodeLink, VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { useHoverWithDelay } from "./useHoverWithDelay";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { useQuery } from "@tanstack/react-query";

const Wrapper = styled.div`
    position: relative;
    display: inline-flex;
`;

const StyledButton = styled(VSCodeButton)`
    padding: 4px 8px;
`;

const TooltipBubble = styled.div`
    position: absolute;
    top: 100%;
    right: 0;
    left: auto;
    transform: translateY(4px);
    margin-top: 4px;
    padding: 10px 12px;
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-widget-border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    white-space: nowrap;
    display: flex;
    flex-direction: column;
    gap: 6px;
    z-index: 1000;
    pointer-events: auto;
    font-size: 12px;
    color: var(--vscode-editor-foreground);
    & a {
        color: var(--vscode-textLink-foreground);
        text-decoration: none;
    }
    & a:hover {
        text-decoration: underline;
    }
`;

export interface PublishToCentralButtonProps {
    disabled?: boolean;
}

export function PublishToCentralButton({
    disabled = false
}: PublishToCentralButtonProps) {
    const { rpcClient } = useRpcContext();
    const [isTooltipVisible, hoverHandlers] = useHoverWithDelay(200);
    const [isPublishing, setIsPublishing] = useState(false);

    const handlePublishToCentral = async () => {
        setIsPublishing(true);
        try {
            await rpcClient.getCommonRpcClient().publishToCentral();
        } finally {
            setIsPublishing(false);
        }
    };

    const handlePublishLearnMore = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const url = hasCentralPATConfigured
            ? "https://ballerina.io/learn/publish-packages-to-ballerina-central/"
            : "https://ballerina.io/learn/publish-packages-to-ballerina-central/#obtain-an-access-token";
        rpcClient.getCommonRpcClient().openExternalUrl({
            url: url,
        });
    };

    const { data: hasCentralPATConfigured } = useQuery({
        queryKey: ["has-central-pat-configured"],
        queryFn: () => rpcClient.getCommonRpcClient().hasCentralPATConfigured(),
        refetchInterval: 10000
    });

    const tooltipMessage = hasCentralPATConfigured
        ? "Publish this library to Ballerina Central."
        : "No Ballerina Central PAT configured. Please try again after configuring the PAT.";
    const learnMoreLabel = "Learn more";
    const publishingLabel = isPublishing ? "Publishing..." : "Publish";

    const isDisabled = disabled || !hasCentralPATConfigured || isPublishing;

    return (
        <Wrapper {...hoverHandlers}>
            <StyledButton appearance="icon" onClick={handlePublishToCentral} disabled={isDisabled || undefined}>
                <Icon name="ballerina" sx={{ marginRight: 5, fontSize: "16px" }} /> {publishingLabel}
            </StyledButton>
            {isTooltipVisible && (
                <TooltipBubble {...hoverHandlers}>
                    <span>{tooltipMessage}</span>
                    <VSCodeLink href="#" onClick={handlePublishLearnMore}>
                        {learnMoreLabel}
                    </VSCodeLink>
                </TooltipBubble>
            )}
        </Wrapper>
    );
}
