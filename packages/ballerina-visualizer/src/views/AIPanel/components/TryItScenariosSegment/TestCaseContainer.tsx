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

import { keyframes } from "@emotion/css";
import styled from "@emotion/styled";
import React, { useState } from "react";
import TestCaseDetails from "./TestCaseDetails";
import { HTTPErrorResponse, HTTPResponse, ParsedHTTPRequest, TestCase } from "./types";

const spin = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`;

const Spinner = styled.span`
    display: inline-block;
    margin-right: 8px;
    font-size: 14px;
    animation: ${spin} 1s linear infinite;
`;

const CheckIcon = styled.span`
    display: inline-block;
    margin-right: 8px;
    font-size: 14px;
`;

const TryItTestCaseWrapper = styled.pre`
    background-color: var(--vscode-textCodeBlock-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 8px 12px;
    margin: 8px 0;
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
    color: var(--vscode-editor-foreground);
    white-space: pre-wrap;
    overflow-x: auto;
`;

const TryItTestCaseLine = styled.div`
    display: flex;
    align-items: center;
`;

const METHOD_COLORS: Record<string, string> = {
    GET: "#3498DB",
    POST: "#2ECC71",
    PUT: "#F39C12",
    DELETE: "#E74C3C",
    PATCH: "#9B59B6",
    HEAD: "#95A5A6",
    OPTIONS: "#1ABC9C",
};

const MethodIndicator = styled.span<{ method: string }>`
    display: inline-block;
    margin-right: 8px;
    padding: 1px 6px;
    border-radius: 5px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: #fff;
    background-color: ${(props: { method: string }) => METHOD_COLORS[props.method.toUpperCase()] ?? "#666"};
    min-width: 32px;
    text-align: center;
`;

const UrlLabel = styled.span`
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const LineActions = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    flex-shrink: 0;
`;

const STATUS_COLOR_RANGES: { max: number; color: string }[] = [
    { max: 199, color: "#95A5A6" },
    { max: 299, color: "#2ECC71" },
    { max: 399, color: "#3498DB" },
    { max: 499, color: "#F39C12" },
    { max: 599, color: "#E74C3C" },
];

const getStatusColor = (status: number): string => {
    for (const range of STATUS_COLOR_RANGES) {
        if (status <= range.max) {
            return range.color;
        }
    }
    return "#95A5A6";
};

const StatusCodeBadge = styled.span<{ status: number }>`
    display: inline-block;
    padding: 1px 2px;
    font-size: 10px;
    font-weight: 700;
    color: ${(props: { status: number }) => getStatusColor(props.status)};
    min-width: 28px;
    text-align: center;
`;

const ActionButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    padding: 2px;
    border-radius: 3px;
    font-size: 14px;

    &:hover {
        color: var(--vscode-foreground);
        background-color: var(--vscode-toolbar-hoverBackground);
    }
`;

export type { ParsedHTTPRequest, TestCase, HTTPResponse, HTTPErrorResponse } from "./types";

const getStatusCode = (output: HTTPResponse | HTTPErrorResponse): number | undefined => {
    if ("error" in output && output.error) {
        return output.response?.status;
    }
    return (output as HTTPResponse).status;
};

interface TestCaseContainerProps {
    testCase: TestCase;
}

const TestCaseContainer: React.FC<TestCaseContainerProps> = ({ testCase }) => {
    const statusCode = testCase.isResult && testCase.output ? getStatusCode(testCase.output) : undefined;
    const [expanded, setExpanded] = useState(false);
    const failed = testCase.output && "error" in testCase.output && testCase.output.error;

    return (
        <TryItTestCaseWrapper>
            <TryItTestCaseLine>
                {testCase.isResult ? (
                    <CheckIcon
                        className={`codicon ${failed ? "codicon-chrome-close" : "codicon-check"}`}
                        role="img"
                    ></CheckIcon>
                ) : (
                    <Spinner className="codicon codicon-loading spin" role="img"></Spinner>
                )}
                <MethodIndicator method={testCase.request.method}>{testCase.request.method}</MethodIndicator>
                <UrlLabel>{testCase.request.url}</UrlLabel>
                {testCase.isResult && (
                    <LineActions>
                        {statusCode !== undefined && (
                            <StatusCodeBadge status={statusCode}>{statusCode}</StatusCodeBadge>
                        )}
                        <ActionButton
                            onClick={() => setExpanded((prev) => !prev)}
                            title={expanded ? "Collapse details" : "Expand details"}
                        >
                            <span
                                className={`codicon ${expanded ? "codicon-chevron-up" : "codicon-chevron-down"}`}
                                role="img"
                            />
                        </ActionButton>
                    </LineActions>
                )}
            </TryItTestCaseLine>
            {expanded && <TestCaseDetails testCase={testCase} />}
        </TryItTestCaseWrapper>
    );
};

export default TestCaseContainer;
