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

import { useState } from "react";
import styled from "@emotion/styled";
import { EvaluationRunDataPoint } from "./types";
import { useRpcContext } from "@wso2/ballerina-rpc-client";

function formatDate(isoDate: string): string {
    return new Date(isoDate).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

const Details = styled.details`
    border-top: none;
`;

const Summary = styled.summary`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 18px;
    cursor: pointer;
    user-select: none;
    list-style: none;
    gap: 8px;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;

    &::-webkit-details-marker {
        display: none;
    }

    &::before {
        content: "\u203A";
        display: inline-block;
        transition: transform 0.15s;
        margin-right: 6px;
        font-size: 14px;
        color: var(--vscode-descriptionForeground);
    }

    details[open] > &::before {
        transform: rotate(90deg);
    }

    &:hover {
        background: var(--vscode-list-hoverBackground);
    }
`;

const SummaryLabel = styled.span`
    font-weight: 500;
    color: var(--vscode-editor-foreground);
`;

const SummaryCount = styled.span`
    margin-left: auto;
`;

const TableWrap = styled.div`
    overflow-x: auto;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;

    th {
        text-align: left;
        padding: 8px 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        color: var(--vscode-descriptionForeground);
        background: var(--vscode-editor-background);
        border-bottom: 1px solid var(--vscode-panel-border);
    }

    td {
        padding: 8px 12px;
        border-bottom: 1px solid var(--vscode-panel-border);
        vertical-align: top;
    }

    tr:last-child td {
        border-bottom: none;
    }

    tr:hover td {
        background: var(--vscode-list-hoverBackground);
    }
`;

const RunDate = styled.td`
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
`;

const RateBadge = styled.span<{ isPassed: boolean }>`
    font-weight: 600;
    font-size: 12px;
    color: ${(p: { isPassed: boolean }) =>
        p.isPassed
            ? "var(--vscode-testing-iconPassed, #4caf50)"
            : "var(--vscode-testing-iconFailed, #f44336)"};
`;

const RateTarget = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
`;

const StatusChip = styled.span<{ isPassed: boolean }>`
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
    white-space: nowrap;
    background: ${(p: { isPassed: boolean }) =>
        p.isPassed ? "rgba(76, 175, 80, 0.15)" : "rgba(244, 67, 54, 0.12)"};
    color: ${(p: { isPassed: boolean }) =>
        p.isPassed
            ? "var(--vscode-testing-iconPassed, #4caf50)"
            : "var(--vscode-testing-iconFailed, #f44336)"};
`;

const OutcomesCell = styled.td`
    max-width: 360px;
`;

const OutcomesSummary = styled.summary`
    cursor: pointer;
    list-style: none;
    color: var(--vscode-descriptionForeground);
    font-size: 11px;

    &::-webkit-details-marker {
        display: none;
    }
`;

const EvalRunOutcomes = styled.div`
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 4px;
`;

const EvalRunLabel = styled.span`
    font-size: 10px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase;
    margin-right: 4px;
    white-space: nowrap;
`;

const OutcomesRate = styled.span`
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
`;

const OutcomesPills = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin-top: 4px;
    width: 100%;
`;

const OutcomePill = styled.span<{ passed: boolean }>`
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 8px;
    cursor: default;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: ${(p: { passed: boolean }) =>
        p.passed ? "rgba(76, 175, 80, 0.15)" : "rgba(244, 67, 54, 0.1)"};
    color: ${(p: { passed: boolean }) =>
        p.passed
            ? "var(--vscode-testing-iconPassed, #4caf50)"
            : "var(--vscode-testing-iconFailed, #f44336)"};
    border: 1px solid
        ${(p: { passed: boolean }) =>
        p.passed ? "rgba(76, 175, 80, 0.25)" : "rgba(244, 67, 54, 0.25)"};
`;

const ViewBtn = styled.button`
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 4px;
    border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
    background: var(--vscode-button-secondaryBackground, transparent);
    color: var(
        --vscode-button-secondaryForeground,
        var(--vscode-editor-foreground)
    );
    cursor: pointer;
    white-space: nowrap;

    &:hover {
        background: var(
            --vscode-button-secondaryHoverBackground,
            var(--vscode-list-hoverBackground)
        );
    }
`;

const NoReport = styled.span`
    color: var(--vscode-descriptionForeground);
`;

interface RunHistoryTableProps {
    runs: EvaluationRunDataPoint[];
}

export function RunHistoryTable({ runs }: RunHistoryTableProps) {
    const { rpcClient } = useRpcContext();
    const [expandedOutcomes, setExpandedOutcomes] = useState<Set<number>>(new Set());
    const reversedRuns = [...runs].reverse();

    const handleViewReport = (reportPath: string) => {
        rpcClient.getTestManagerRpcClient().openEvaluationReport({ reportPath });
    };

    const toggleOutcomes = (index: number) => {
        setExpandedOutcomes((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    return (
        <Details open={runs.length <= 3}>
            <Summary>
                <SummaryLabel>Run history</SummaryLabel>
                <SummaryCount>{runs.length} entries</SummaryCount>
            </Summary>
            <TableWrap>
                <Table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Pass Rate</th>
                            <th>Status</th>
                            <th>Outcomes</th>
                            <th>Report</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reversedRuns.map((run, i) => {
                            const pct = (run.passRate * 100).toFixed(0);
                            const targetPct = (run.targetPassRate * 100).toFixed(0);
                            const isPassed = run.status === "PASSED";
                            const totalOutcomes = run.evaluationRuns.reduce(
                                (s, r) => s + r.outcomes.length,
                                0
                            );

                            return (
                                <tr key={i}>
                                    <RunDate>{formatDate(run.date)}</RunDate>
                                    <td>
                                        <RateBadge isPassed={isPassed}>
                                            {pct}%
                                        </RateBadge>{" "}
                                        <RateTarget>/ {targetPct}%</RateTarget>
                                    </td>
                                    <td>
                                        <StatusChip isPassed={isPassed}>
                                            {isPassed ? "Passed" : "Failed"}
                                        </StatusChip>
                                    </td>
                                    <OutcomesCell>
                                        <details
                                            open={expandedOutcomes.has(i)}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                toggleOutcomes(i);
                                            }}
                                        >
                                            <OutcomesSummary>
                                                {totalOutcomes} outcomes
                                            </OutcomesSummary>
                                        </details>
                                        {expandedOutcomes.has(i) &&
                                            run.evaluationRuns.map((er, erIndex) => {
                                                const passedCount =
                                                    er.outcomes.filter(
                                                        (o) => o.passed
                                                    ).length;
                                                return (
                                                    <EvalRunOutcomes
                                                        key={`${i}-${erIndex}`}
                                                    >
                                                        <EvalRunLabel>
                                                            Run {er.id}
                                                        </EvalRunLabel>
                                                        <OutcomesRate>
                                                            {passedCount}/
                                                            {
                                                                er.outcomes
                                                                    .length
                                                            }
                                                        </OutcomesRate>
                                                        <OutcomesPills>
                                                            {er.outcomes.map(
                                                                (o) => (
                                                                    <OutcomePill
                                                                        key={
                                                                            o.id
                                                                        }
                                                                        passed={
                                                                            o.passed
                                                                        }
                                                                        title={
                                                                            o.passed
                                                                                ? "Passed"
                                                                                : o.errorMessage?.substring(
                                                                                    0,
                                                                                    120
                                                                                ) ??
                                                                                "Failed"
                                                                        }
                                                                    >
                                                                        {o.id}
                                                                    </OutcomePill>
                                                                )
                                                            )}
                                                        </OutcomesPills>
                                                    </EvalRunOutcomes>
                                                );
                                            })}
                                    </OutcomesCell>
                                    <td>
                                        {run.jsonReportPath ? (
                                            <ViewBtn
                                                onClick={() =>
                                                    handleViewReport(
                                                        run.jsonReportPath!
                                                    )
                                                }
                                            >
                                                View Report
                                            </ViewBtn>
                                        ) : (
                                            <NoReport>&mdash;</NoReport>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
            </TableWrap>
        </Details>
    );
}
