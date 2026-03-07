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

import React, { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { EvaluationHistoryData } from "./types";
import { SummaryBar } from "./SummaryBar";
import { TestCard } from "./TestCard";

const Page = styled.div`
    font-family: var(
        --vscode-font-family,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif
    );
    font-size: var(--vscode-font-size, 13px);
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    height: 100vh;
    overflow-y: auto;
    padding-bottom: 12px;
`;

const PageHeader = styled.header`
    padding: 24px 24px 0;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

const PageTitle = styled.div`
    font-size: 20px;
    font-weight: 600;
    color: var(--vscode-editor-foreground);
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
`;

const PageSubtitle = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
`;

const EmptyState = styled.div`
    text-align: center;
    padding: 64px 24px;
    color: var(--vscode-descriptionForeground);
`;

const EmptyTitle = styled.p`
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--vscode-editor-foreground);
`;

const EmptySub = styled.p`
    font-size: 13px;
`;

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100%;
`;

const Loader = styled.div`
    width: 32px;
    aspect-ratio: 1;
    border-radius: 50%;
    border: 4px solid var(--vscode-button-background);
    animation: l20-1 0.8s infinite linear alternate,
        l20-2 1.6s infinite linear;

    @keyframes l20-1 {
        0% {
            clip-path: polygon(
                50% 50%,
                0 0,
                50% 0%,
                50% 0%,
                50% 0%,
                50% 0%,
                50% 0%
            );
        }
        12.5% {
            clip-path: polygon(
                50% 50%,
                0 0,
                50% 0%,
                100% 0%,
                100% 0%,
                100% 0%,
                100% 0%
            );
        }
        25% {
            clip-path: polygon(
                50% 50%,
                0 0,
                50% 0%,
                100% 0%,
                100% 100%,
                100% 100%,
                100% 100%
            );
        }
        50% {
            clip-path: polygon(
                50% 50%,
                0 0,
                50% 0%,
                100% 0%,
                100% 100%,
                50% 100%,
                0% 100%
            );
        }
        62.5% {
            clip-path: polygon(
                50% 50%,
                100% 0,
                100% 0%,
                100% 0%,
                100% 100%,
                50% 100%,
                0% 100%
            );
        }
        75% {
            clip-path: polygon(
                50% 50%,
                100% 100%,
                100% 100%,
                100% 100%,
                100% 100%,
                50% 100%,
                0% 100%
            );
        }
        100% {
            clip-path: polygon(
                50% 50%,
                50% 100%,
                50% 100%,
                50% 100%,
                50% 100%,
                50% 100%,
                0% 100%
            );
        }
    }

    @keyframes l20-2 {
        0% {
            transform: scaleY(1) rotate(0deg);
        }
        49.99% {
            transform: scaleY(1) rotate(135deg);
        }
        50% {
            transform: scaleY(-1) rotate(0deg);
        }
        100% {
            transform: scaleY(-1) rotate(-135deg);
        }
    }
`;

export function EvaluationHistory() {
    const { rpcClient } = useRpcContext();
    const [data, setData] = useState<EvaluationHistoryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [projectPath, setProjectPath] = useState("");

    useEffect(() => {
        const container = document.getElementById("webview-container");
        const projectPath = container?.getAttribute("data-project-path") ?? "";
        setProjectPath(projectPath);

        rpcClient
            .getTestManagerRpcClient()
            .getEvaluationHistory({ projectPath })
            .then((response) => {
                setData(response.data);
                setLoading(false);
            })
            .catch(() => {
                setData({ tests: [], totalRunFiles: 0, projectNames: [] });
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <LoadingContainer>
                <Loader />
            </LoadingContainer>
        );
    }

    if (!data) return null;

    const projectLabel = data.projectNames.join(", ") || "Unknown";

    return (
        <Page>
            <PageHeader>
                <PageTitle>Evaluation History</PageTitle>
                <PageSubtitle>Project: {projectLabel}</PageSubtitle>
            </PageHeader>

            {data.tests.length > 0 ? (
                <>
                    <SummaryBar data={data} />
                    {data.tests.map((test, i) => (
                        <TestCard key={i} history={test} projectPath={projectPath} />
                    ))}
                </>
            ) : (
                <EmptyState>
                    <EmptyTitle>No evaluation results found</EmptyTitle>
                    <EmptySub>
                        Run an evaluation test to see history here.
                    </EmptySub>
                </EmptyState>
            )}
        </Page>
    );
}
