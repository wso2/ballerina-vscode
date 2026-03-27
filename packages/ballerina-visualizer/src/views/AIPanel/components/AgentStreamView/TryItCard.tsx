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
import React, { useState } from "react";
import { HurlToolOutput } from "../TryItScenariosSegment/types";
import {
    InlineCard,
    InlineCardHeader,
    InlineCardIcon,
    InlineCardTitle,
    InlineCardSubtitle
} from "./styles";

const HURL_IMPORT_VSCODE_COMMAND = "HTTPClient.importHurlString";
// ── Styled components ─────────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
    GET: "#3498DB",
    POST: "#2ECC71",
    PUT: "#F39C12",
    DELETE: "#E74C3C",
    PATCH: "#9B59B6",
    HEAD: "#95A5A6",
    OPTIONS: "#1ABC9C",
};

const STATUS_COLOR_RANGES: { max: number; color: string }[] = [
    { max: 399, color: "var(--vscode-descriptionForeground)" },
    { max: 499, color: "var(--vscode-charts-orange, #F39C12)" },
    { max: 599, color: "var(--vscode-errorForeground)" },
];

const getStatusColor = (status: number): string => {
    for (const range of STATUS_COLOR_RANGES) {
        if (status <= range.max) return range.color;
    }
    return "#95A5A6";
};

const RequestRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 0 2px;
    min-height: 22px;
`;

const MethodBadge = styled.span<{ method: string }>`
    display: inline-block;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: #fff;
    background-color: ${(props: { method: string }) => METHOD_COLORS[props.method?.toUpperCase()] ?? "#666"};
    flex-shrink: 0;
`;

const UrlLabel = styled.span`
    flex: 1;
    font-size: 12px;
    color: var(--vscode-textLink-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const StatusBadge = styled.span<{ status: number }>`
    font-size: 11px;
    font-weight: 700;
    color: ${(props: { status: number }) => getStatusColor(props.status)};
    flex-shrink: 0;
`;

const ExpandButton = styled.button`
    background: none;
    border: none;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    padding: 2px;
    border-radius: 3px;
    font-size: 11px;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    &:hover {
        color: var(--vscode-foreground);
        background-color: var(--vscode-toolbar-hoverBackground);
    }
`;

const DetailsBlock = styled.div`
    border-top: 1px solid var(--vscode-panel-border);
    margin-top: 4px;
    padding-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

const SectionLabel = styled.div`
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--vscode-descriptionForeground);
`;

const CodeBlock = styled.pre`
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 3px;
    padding: 5px 8px;
    margin: 0;
    font-family: var(--vscode-editor-font-family);
    font-size: 11px;
    color: var(--vscode-editor-foreground);
    white-space: pre-wrap;
    word-break: break-all;
    overflow-x: auto;
    max-height: 200px;
    overflow-y: auto;
`;

const InnerSection = styled.div`
    padding: 3px 0;
    & + & { border-top: 1px dashed var(--vscode-panel-border); }
`;

const HeaderRow = styled.div`
    display: flex;
    line-height: 1.6;
`;

const HeaderKey = styled.span`
    color: var(--vscode-debugTokenExpression-name, #9cdcfe);
    font-size: 11px;
`;

const HeaderSep = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
`;

const HeaderVal = styled.span`
    color: var(--vscode-debugTokenExpression-string, #ce9178);
    font-size: 11px;
    word-break: break-all;
`;

const SubHeader = styled.div`
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 2px;
`;

const BodyContent = styled.span`
    color: var(--vscode-editor-foreground);
    font-size: 11px;
    line-height: 1.5;
`;

const StatusLine = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const SummaryStatusLine = styled(StatusLine)`
    justify-content: space-between;
`;

const SummaryDetails = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
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

const ErrorMessage = styled.span`
    color: var(--vscode-errorForeground);
    font-size: 11px;
    font-weight: 600;
`;

const ScenarioGroup = styled.div`
    background-color: var(--vscode-input-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    margin: 4px 0 2px;
    overflow: hidden;
`;

const ScenarioHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--vscode-foreground);
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const EditButton = styled.button`
    background: none;
    border: none;
    outline: none;
    color: var(--vscode-foreground);
    cursor: pointer;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 7px;
    font-weight: 600;
    &:focus,
    &:focus-visible {
        outline: none;
    }
    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
        color: var(--vscode-foreground);
    }
`;

const ScenarioContent = styled.div`
    padding: 2px 8px 4px;
`;

const HoverableInlineCardHeader = styled(InlineCardHeader)`
    &:hover .header-actions,
    &:focus-within .header-actions {
        max-width: 28px;
        opacity: 1;
        transform: translateX(0);
        pointer-events: auto;
    }
`;

const HeaderRightStack = styled.div`
    margin-left: auto;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    min-width: 0;
    gap: 2px;
`;

const HeaderScenario = styled(InlineCardSubtitle)`
    flex: 1 1 auto;
    min-width: 0;
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: right;
`;

const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    overflow: hidden;
    white-space: nowrap;
    flex: 0 0 auto;
    max-width: 0;
    opacity: 0;
    transform: translateX(4px);
    pointer-events: none;
    transition: max-width 180ms ease, opacity 120ms ease, transform 180ms ease;
    will-change: max-width, opacity, transform;
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatJson = (value: unknown): string => {
    if (value === undefined || value === null) return "";
    if (typeof value === "string") {
        try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
    }
    return JSON.stringify(value, null, 2);
};

const renderHeaders = (headers: Array<{ key?: string; name?: string; value?: string }>) => {
    if (!headers.length) return null;
    return (
        <InnerSection>
            {headers.map((header, idx) => {
                const headerName = header.key ?? header.name ?? "";
                const headerValue = header.value ?? "";
                return (
                <HeaderRow key={`${headerName}-${idx}`}>
                    <HeaderKey>{headerName}</HeaderKey>
                    <HeaderSep>:&nbsp;</HeaderSep>
                    <HeaderVal>{headerValue}</HeaderVal>
                </HeaderRow>
                );
            })}
        </InnerSection>
    );
};

const renderBody = (data: unknown) => {
    if (data === undefined || data === null || data === "") return null;
    return (
        <InnerSection>
            <SubHeader>Body</SubHeader>
            <BodyContent>{formatJson(data)}</BodyContent>
        </InnerSection>
    );
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface HTTPTestScenarioDetailProps {
    loading:boolean;
    input?: HurlToolOutput["input"];
    output?: HurlToolOutput["output"];
}

interface HTTPEntryRowProps {
    entry: HurlToolOutput["output"]["entries"][number];
    request?: HurlToolOutput["input"]["requests"][number];
}

const HTTPEntryRow: React.FC<HTTPEntryRowProps> = ({ entry, request }) => {
    const [expanded, setExpanded] = useState(false);
    const isPassed = entry.status === "passed";

    return (
        <>
            <RequestRow>
                <InlineCardIcon style={{ fontSize: 12, color: isPassed ? "var(--vscode-charts-green, #388a34)" : "var(--vscode-errorForeground)" }}>
                    <span className={`codicon ${isPassed ? "codicon-check" : "codicon-chrome-close"}`} />
                </InlineCardIcon>
                {entry.method && <MethodBadge method={entry.method}>{entry.method}</MethodBadge>}
                <UrlLabel>{entry.url ?? entry.name}</UrlLabel>
                {entry.statusCode !== undefined && <StatusBadge status={entry.statusCode}>{entry.statusCode}</StatusBadge>}
                <ExpandButton onClick={() => setExpanded(p => !p)} title={expanded ? "Collapse" : "Expand"}>
                    <span className={`codicon ${expanded ? "codicon-chevron-up" : "codicon-chevron-down"}`} />
                </ExpandButton>
            </RequestRow>

            {expanded && (
                <DetailsBlock>
                    {request && (
                        <Section>
                            <SectionLabel>Request</SectionLabel>
                            <CodeBlock>
                                <InnerSection>
                                    <StatusLine>
                                        <span style={{ color: METHOD_COLORS[request.method?.toUpperCase()] ?? "#666", fontWeight: 700, fontSize: 11 }}>
                                            {request.method}
                                        </span>
                                        <span style={{ color: "var(--vscode-textLink-foreground)", fontSize: 11 }}>{request.url}</span>
                                    </StatusLine>
                                </InnerSection>
                                {request.headers?.length > 0 && renderHeaders(request.headers)}
                                {renderBody(request.body)}
                            </CodeBlock>
                        </Section>
                    )}

                    <Section>
                        <SectionLabel>Response</SectionLabel>
                        <CodeBlock>
                            {entry.statusCode !== undefined && (
                                <InnerSection>
                                    <StatusLine>
                                        <StatusCode status={entry.statusCode}>{entry.statusCode}</StatusCode>
                                    </StatusLine>
                                </InnerSection>
                            )}
                            {entry.responseHeaders && entry.responseHeaders.length > 0 && renderHeaders(entry.responseHeaders)}
                            {renderBody(entry.responseBody)}
                        </CodeBlock>
                    </Section>

                    {entry.assertions && entry.assertions.length > 0 && (
                        <Section>
                            <SectionLabel>Assertions</SectionLabel>
                            {entry.assertions.map((assertion, aidx) => (
                                <CodeBlock key={aidx} style={{ borderColor: assertion.status === "passed" ? "var(--vscode-charts-green, #388a34)" : "var(--vscode-errorForeground)" }}>
                                    <span style={{ color: assertion.status === "passed" ? "var(--vscode-charts-green, #388a34)" : "var(--vscode-errorForeground)", fontWeight: 700 }}>
                                        {assertion.status.toUpperCase()}
                                    </span>
                                    {" "}{assertion.expression}
                                    {assertion.message && <span style={{ color: "var(--vscode-descriptionForeground)" }}> — {assertion.message}</span>}
                                    {assertion.expected !== undefined && assertion.actual !== undefined && (
                                        <span style={{ color: "var(--vscode-descriptionForeground)" }}> (Expected: {assertion.expected}, Actual: {assertion.actual})</span>
                                    )}
                                </CodeBlock>
                            ))}
                        </Section>
                    )}

                    {entry.errorMessage && (
                        <Section>
                            <SectionLabel>Error</SectionLabel>
                            <ErrorMessage>{entry.errorMessage}</ErrorMessage>
                        </Section>
                    )}
                </DetailsBlock>
            )}
        </>
    );
};

const HTTPTestScenarioDetail: React.FC<HTTPTestScenarioDetailProps> = ({ loading, input, output }) => {
    if (loading) {
        return (
            <StatusLine>
                <InlineCardIcon style={{ fontSize: 12, color: "var(--vscode-charts-blue)" }}>
                    <span className="codicon codicon-loading codicon-modifier-spin" />
                </InlineCardIcon>
                <span>Running test scenario...</span>
            </StatusLine>
        );
    }

    if (!output) return null;

    const showSummary = output.entries.length > 1;
    const hasNoEntries = output.entries.length === 0;

    return (
        <>
            {showSummary && <SubHeader>Summary</SubHeader>}
            {showSummary && (
                <SummaryStatusLine style={{ marginBottom: 6 }}>
                    <SummaryDetails>
                        <span>Total: {output.summary.totalEntries}</span>
                        <span style={{ color: "var(--vscode-charts-green, #388a34)" }}>Passed: {output.summary.passedEntries}</span>
                        <span style={{ color: "var(--vscode-errorForeground)" }}>Failed: {output.summary.failedEntries}</span>
                    </SummaryDetails>
                </SummaryStatusLine>
            )}

            {hasNoEntries ? (
                <Section>
                    <SummaryStatusLine style={{ marginBottom: 6 }}>
                        <SummaryDetails>
                            <StatusText>Issue</StatusText>
                            <StatusText>{output.status}</StatusText>
                        </SummaryDetails>
                    </SummaryStatusLine>
                    {output.warnings && output.warnings.length > 0 ? (
                        <ErrorMessage>{output.warnings[0]}</ErrorMessage>
                    ) : (
                        <StatusText>No request entries were produced for this scenario.</StatusText>
                    )}
                </Section>
            ) : (
                output.entries.map((entry, idx) => (
                    <HTTPEntryRow
                        key={idx}
                        entry={entry}
                        request={input?.requests[idx]}
                    />
                ))
            )}
        </>
    );
}

// ── TryItCard ─────────────────────────────────────────────────────────────────

interface TryItCardProps {
    input?: any;
    output?: {hurlScript: string; scenario?: string; runResult: HurlToolOutput};
    rpcClient?: any;
}

const TryItCard: React.FC<TryItCardProps> = ({ input, output, rpcClient }) => {
    if (!input?.hurlScript && !output?.hurlScript) return null;
    const hurlScript = input?.hurlScript ?? output?.hurlScript;
    const scenario = input?.scenario ?? output?.scenario;
    const handleEdit = async () => {
        try {
            await rpcClient?.getCommonRpcClient?.()?.executeCommand?.({
                commands: [
                    HURL_IMPORT_VSCODE_COMMAND,
                    hurlScript,
                ]
            });
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error("Failed to invoke edit command", e);
        }
    };

    const content = (
        <HTTPTestScenarioDetail
            loading={!output}
            input={output?.runResult?.input}
            output={output?.runResult?.output}
        />
    );

    const multipleEntries = output ? output?.runResult?.output.entries.length > 1 : false;

    return (
        <InlineCard>
            <HoverableInlineCardHeader>
                <InlineCardIcon>
                    <span className="codicon codicon-send" />
                </InlineCardIcon>
                <InlineCardTitle>HTTP Request{multipleEntries && `s`}</InlineCardTitle>
                <HeaderRightStack>
                    {scenario && <HeaderScenario>{scenario}</HeaderScenario>}
                    <HeaderActions className="header-actions">
                        <EditButton title="Edit in HTTP Client" onClick={handleEdit}>
                            <span className="codicon codicon-edit" />
                        </EditButton>
                    </HeaderActions>
                </HeaderRightStack>
            </HoverableInlineCardHeader>
            <ScenarioGroup>
                <ScenarioContent>{content}</ScenarioContent>
            </ScenarioGroup>
        </InlineCard>
    );
};

export default TryItCard;
