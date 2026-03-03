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

import styled from "@emotion/styled";
import React from "react";
import { HTTPErrorResponse, HTTPResponse, TestCase } from "./types";

// --- Layout ---

const DetailsWrapper = styled.div`
    border-top: 1px solid var(--vscode-panel-border);
    margin-top: 8px;
    padding-top: 8px;
`;

const Section = styled.div`
    margin-bottom: 8px;

    &:last-child {
        margin-bottom: 0;
    }
`;

const SectionLabel = styled.div`
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 4px;
`;

const CodeBlock = styled.pre`
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 3px;
    padding: 6px 8px;
    margin: 0;
    font-family: var(--vscode-editor-font-family);
    font-size: 11px;
    color: var(--vscode-editor-foreground);
    white-space: pre-wrap;
    word-break: break-all;
    overflow-x: auto;
    display: flex;
    flex-direction: column;
    gap: 0;
`;

const InnerSection = styled.div`
    padding: 4px 0;

    & + & {
        border-top: 1px dashed var(--vscode-panel-border);
    }
`;

// --- Request line ---

const METHOD_COLORS: Record<string, string> = {
    GET: "#3498DB",
    POST: "#2ECC71",
    PUT: "#F39C12",
    DELETE: "#E74C3C",
    PATCH: "#9B59B6",
    HEAD: "#95A5A6",
    OPTIONS: "#1ABC9C",
};

const RequestLine = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const MethodBadge = styled.span<{ method: string }>`
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: ${(props: { method: string }) => METHOD_COLORS[props.method.toUpperCase()] ?? "#666"};
`;

const UrlText = styled.span`
    color: var(--vscode-textLink-foreground);
    font-size: 11px;
    word-break: break-all;
`;

// --- Headers ---

const HeaderRow = styled.div`
    display: flex;
    gap: 0;
    line-height: 1.6;
`;

const HeaderKey = styled.span`
    color: var(--vscode-debugTokenExpression-name, #9cdcfe);
    font-size: 11px;
`;

const HeaderSeparator = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
`;

const HeaderValue = styled.span`
    color: var(--vscode-debugTokenExpression-string, #ce9178);
    font-size: 11px;
    word-break: break-all;
`;

// --- Body ---

const BodyContent = styled.span`
    color: var(--vscode-editor-foreground);
    font-size: 11px;
    line-height: 1.5;
`;

// --- Response status ---

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

const StatusLine = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const StatusCode = styled.span<{ status: number }>`
    font-size: 11px;
    font-weight: 700;
    color: ${(props: { status: number }) => getStatusColor(props.status)};
`;

const StatusText = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

// --- Error ---

const ErrorLine = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const ErrorMessage = styled.span`
    color: var(--vscode-errorForeground);
    font-size: 11px;
    font-weight: 600;
`;

const ErrorCode = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
`;

// --- Helpers ---

const formatJson = (value: unknown): string => {
    if (value === undefined || value === null) {
        return "";
    }
    if (typeof value === "string") {
        try {
            return JSON.stringify(JSON.parse(value), null, 2);
        } catch {
            return value;
        }
    }
    return JSON.stringify(value, null, 2);
};

const renderHeaders = (headers: Record<string, string>) => {
    const entries = Object.entries(headers);
    if (entries.length === 0) {
        return null;
    }
    return (
        <InnerSection>
            {entries.map(([key, value]) => (
                <HeaderRow key={key}>
                    <HeaderKey>{key}</HeaderKey>
                    <HeaderSeparator>:&nbsp;</HeaderSeparator>
                    <HeaderValue>{value}</HeaderValue>
                </HeaderRow>
            ))}
        </InnerSection>
    );
};

const SubHeader = styled.div`
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 3px;
`;

const renderBody = (data: unknown) => {
    if (data === undefined || data === null || data === "") {
        return null;
    }
    return (
        <InnerSection>
            <SubHeader>Body</SubHeader>
            <BodyContent>{formatJson(data)}</BodyContent>
        </InnerSection>
    );
};

// --- Component ---

interface TestCaseDetailsProps {
    testCase: TestCase;
}

const TestCaseDetails: React.FC<TestCaseDetailsProps> = ({ testCase }) => {
    const { output } = testCase;
    const isError = output && "error" in output && output.error;

    return (
        <DetailsWrapper>
            <Section>
                <SectionLabel>Request</SectionLabel>
                <CodeBlock>
                    <InnerSection>
                        <RequestLine>
                            <MethodBadge method={testCase.request.method}>
                                {testCase.request.method}
                            </MethodBadge>
                            <UrlText>{testCase.request.url}</UrlText>
                        </RequestLine>
                    </InnerSection>
                    {renderHeaders(testCase.request.headers)}
                    {renderBody(testCase.request.data)}
                </CodeBlock>
            </Section>
            {output && (
                <Section>
                    <SectionLabel>Response</SectionLabel>
                    {isError ? (
                        <CodeBlock>
                            <InnerSection>
                                <ErrorLine>
                                    <ErrorMessage>
                                        {(output as { message: string }).message}
                                    </ErrorMessage>
                                    {(output as { code?: string }).code && (
                                        <ErrorCode>
                                            Code: {(output as { code?: string }).code}
                                        </ErrorCode>
                                    )}
                                </ErrorLine>
                            </InnerSection>
                            {(output as { response?: { status: number; statusText: string } }).response && (
                                <InnerSection>
                                    <StatusLine>
                                        <StatusCode
                                            status={
                                                (output as { response: { status: number; statusText: string } })
                                                    .response.status
                                            }
                                        >
                                            {(output as { response: { status: number; statusText: string } })
                                                .response.status}
                                        </StatusCode>
                                        <StatusText>
                                            {(output as { response: { status: number; statusText: string } })
                                                .response.statusText}
                                        </StatusText>
                                    </StatusLine>
                                </InnerSection>
                            )}
                        </CodeBlock>
                    ) : (
                        <CodeBlock>
                            <InnerSection>
                                <StatusLine>
                                    <StatusCode status={(output as { status: number }).status}>
                                        {(output as { status: number }).status}
                                    </StatusCode>
                                    <StatusText>
                                        {(output as { statusText: string }).statusText}
                                    </StatusText>
                                </StatusLine>
                            </InnerSection>
                            {(output as { headers: Record<string, string> }).headers &&
                                renderHeaders(
                                    (output as { headers: Record<string, string> }).headers
                                )}
                            {(output as { data: unknown }).data !== undefined &&
                                (output as { data: unknown }).data !== null &&
                                renderBody((output as { data: unknown }).data)}
                        </CodeBlock>
                    )}
                </Section>
            )}
        </DetailsWrapper>
    );
};

export default TestCaseDetails;
