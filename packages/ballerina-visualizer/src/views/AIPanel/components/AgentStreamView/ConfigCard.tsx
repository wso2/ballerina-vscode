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

import React from "react";
import {
    InlineButton,
    InlineCard,
    InlineCardActions,
    InlineCardHeader,
    InlineCardIcon,
    InlineCardTitle,
    InlineStatusRow,
} from "./styles";

interface ConfigCardProps {
    data: Record<string, any>;
    rpcClient: any;
}

const ConfigCard: React.FC<ConfigCardProps> = ({ data, rpcClient }) => {
    const stage: string = data.stage;

    const handleConfigure = () => {
        rpcClient?.getVisualizerRpcClient().reopenApprovalView({ requestId: data.requestId });
    };

    const handleSkip = async () => {
        try {
            await rpcClient?.getAiPanelRpcClient().cancelConfiguration({ requestId: data.requestId });
        } catch (e) {
            console.error("[ConfigCard] skip error:", e);
        }
    };

    if (stage === "collecting") {
        return (
            <InlineCard status="active">
                <InlineCardHeader>
                    <InlineCardIcon><span className="codicon codicon-key" /></InlineCardIcon>
                    <InlineCardTitle>{data.message || "Configure values"}</InlineCardTitle>
                </InlineCardHeader>
                <InlineCardActions>
                    <InlineButton variant="secondary" onClick={handleSkip}>Skip</InlineButton>
                    <InlineButton variant="primary" onClick={handleConfigure}>Configure</InlineButton>
                </InlineCardActions>
            </InlineCard>
        );
    }

    if (stage === "done") {
        return (
            <InlineCard status="done">
                <InlineCardHeader>
                    <InlineCardIcon><span className="codicon codicon-pass" /></InlineCardIcon>
                    <InlineCardTitle>{data.message || "Configuration done"}</InlineCardTitle>
                </InlineCardHeader>
            </InlineCard>
        );
    }

    if (stage === "skipped") {
        return (
            <InlineCard status="done">
                <InlineCardHeader>
                    <InlineCardIcon><span className="codicon codicon-circle-slash" /></InlineCardIcon>
                    <InlineCardTitle>{data.message || "Configuration skipped"}</InlineCardTitle>
                </InlineCardHeader>
            </InlineCard>
        );
    }

    if (stage === "error" && data.error) {
        return (
            <InlineCard status="error">
                <InlineCardHeader>
                    <InlineCardIcon><span className="codicon codicon-warning" /></InlineCardIcon>
                    <InlineCardTitle>Configuration failed</InlineCardTitle>
                </InlineCardHeader>
                <InlineStatusRow>{data.error.message}</InlineStatusRow>
            </InlineCard>
        );
    }

    return null;
};

export default ConfigCard;
