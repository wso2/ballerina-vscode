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
import styled from "@emotion/styled";
import { EvaluationReportData } from "./types";

const Bar = styled.div`
    display: flex;
    align-items: center;
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 12px 20px;
    margin: 0 24px;
    margin-bottom: 24px;
    flex-wrap: wrap;
`;

const Stat = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 20px;
    gap: 2px;
`;

const StatValue = styled.span`
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    color: var(--vscode-editor-foreground);
`;

const StatValuePass = styled(StatValue)`
    color: var(--vscode-editorGutter-addedBackground, #2ea043);
`;

const StatValueFail = styled(StatValue)`
    color: var(--vscode-editorGutter-deletedBackground, #f85149);
`;

const StatLabel = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
`;

const Divider = styled.div`
    width: 1px;
    height: 36px;
    background: var(--vscode-panel-border);
`;

interface ReportSummaryBarProps {
    data: EvaluationReportData;
}

export function ReportSummaryBar({ data }: ReportSummaryBarProps) {
    return (
        <Bar>
            <Stat>
                <StatValue>{data.totalTests}</StatValue>
                <StatLabel>total tests</StatLabel>
            </Stat>
            <Divider />
            <Stat>
                <StatValuePass>{data.passed}</StatValuePass>
                <StatLabel>passed</StatLabel>
            </Stat>
            <Divider />
            <Stat>
                <StatValueFail>{data.failed}</StatValueFail>
                <StatLabel>failed</StatLabel>
            </Stat>
            {data.skipped > 0 && (
                <>
                    <Divider />
                    <Stat>
                        <StatValue>{data.skipped}</StatValue>
                        <StatLabel>skipped</StatLabel>
                    </Stat>
                </>
            )}
        </Bar>
    );
}
