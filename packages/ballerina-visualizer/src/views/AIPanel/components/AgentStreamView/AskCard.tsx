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
import {
    InlineCard,
    InlineCardHeader,
    InlineCardIcon,
    InlineCardTitle,
} from "./styles";

// ── Locally scoped styled components ─────────────────────────────────────────

const AnswerSummary = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px 0 2px;
`;

const AnswerRow = styled.div`
    font-size: 12px;
    font-family: var(--vscode-font-family);
    color: var(--vscode-descriptionForeground);
`;

const ChevronIcon = styled.span`
    margin-left: auto;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    opacity: 0.7;
`;

// ── Component ─────────────────────────────────────────────────────────────────

interface AskCardProps {
    data: Record<string, any>;
    rpcClient?: any;
}

const AskCard: React.FC<AskCardProps> = ({ data }) => {
    const stage: string = data.stage;
    const [expanded, setExpanded] = useState(false);

    if (stage === "asking") {
        return null;
    }

    if (stage === "answered") {
        const answers: Array<{ question: string; answers: string[] }> = data.answers ?? [];
        return (
            <InlineCard status="done">
                <InlineCardHeader
                    onClick={() => setExpanded(e => !e)}
                    style={{ cursor: answers.length > 0 ? "pointer" : "default" }}
                >
                    <InlineCardIcon>
                        <span className="codicon codicon-pass" />
                    </InlineCardIcon>
                    <InlineCardTitle>Clarification provided</InlineCardTitle>
                    {answers.length > 0 && (
                        <ChevronIcon className={`codicon codicon-chevron-${expanded ? "up" : "down"}`} />
                    )}
                </InlineCardHeader>
                {expanded && answers.length > 0 && (
                    <AnswerSummary>
                        {answers.map((a, i) => (
                            <AnswerRow key={i}>
                                <strong>{a.question}:</strong> {a.answers.join(", ")}
                            </AnswerRow>
                        ))}
                    </AnswerSummary>
                )}
            </InlineCard>
        );
    }

    if (stage === "skipped") {
        return (
            <InlineCard status="done">
                <InlineCardHeader>
                    <InlineCardIcon>
                        <span className="codicon codicon-circle-slash" />
                    </InlineCardIcon>
                    <InlineCardTitle>Clarification skipped</InlineCardTitle>
                </InlineCardHeader>
            </InlineCard>
        );
    }

    return null;
};

export default AskCard;
