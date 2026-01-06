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
import styled from "@emotion/styled";

const Container = styled.div<{ variant: string }>`
    padding: 16px;
    border-radius: 8px;
    margin: 12px 0;
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);

    ${(props: { variant: string }) =>
        props.variant === "requesting-input" &&
        `
        background-color: var(--vscode-editor-background);
        border: 2px solid var(--vscode-focusBorder);
    `}

    ${(props: { variant: string }) =>
        props.variant === "error" &&
        `
        background-color: var(--vscode-inputValidation-errorBackground);
        border: 1px solid var(--vscode-inputValidation-errorBorder);
    `}

    ${(props: { variant: string }) =>
        props.variant === "provided" &&
        `
        background-color: var(--vscode-editorWidget-background);
        border: 1px solid var(--vscode-testing-iconPassed);
        opacity: 0.95;
    `}

    ${(props: { variant: string }) =>
        props.variant === "skipped" &&
        `
        background-color: var(--vscode-editorWidget-background);
        border: 1px solid var(--vscode-testing-iconFailed);
        opacity: 0.95;
    `}

    ${(props: { variant: string }) =>
        props.variant === "generating" &&
        `
        background-color: var(--vscode-editorWidget-background);
        border: 1px solid var(--vscode-focusBorder);
    `}
`;

const Header = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
`;

const TitleSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
`;

const Title = styled.span`
    font-weight: 600;
    font-size: 15px;
    color: var(--vscode-foreground);
`;

const Subtitle = styled.span`
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
    font-style: italic;
`;

const Icon = styled.span`
    font-size: 20px;
    flex-shrink: 0;
`;

const Message = styled.div`
    margin-bottom: 16px;
    padding: 12px;
    background-color: var(--vscode-editorWidget-background);
    border-radius: 4px;
    font-size: 13px;
    color: var(--vscode-foreground);
`;

const InputMethods = styled.div`
    margin-bottom: 16px;
`;

const InputMethodTabs = styled.div`
    display: flex;
    gap: 4px;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

const MethodTab = styled.button<{ active: boolean }>`
    padding: 8px 16px;
    background: transparent;
    border: none;
    border-bottom: 2px solid
        ${(props: { active: boolean }) => (props.active ? "var(--vscode-focusBorder)" : "transparent")};
    color: ${(props: { active: boolean }) => (props.active ? "var(--vscode-focusBorder)" : "var(--vscode-foreground)")};
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
`;

const InputMethodContent = styled.div`
    padding: 16px;
    background-color: var(--vscode-input-background);
    border-radius: 4px;
    border: 1px solid var(--vscode-input-border);
`;

const PasteInputSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const SpecPasteInput = styled.textarea`
    width: 100%;
    padding: 12px;
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
    resize: vertical;
    min-height: 150px;

    &:focus {
        outline: none;
        border-color: var(--vscode-focusBorder);
    }
`;

const FileInputSection = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 24px;
`;

const FileUploadLabel = styled.label`
    cursor: pointer;
`;

const FileInputHidden = styled.input`
    display: none;
`;

const FileUploadButton = styled.span`
    display: inline-block;
    padding: 10px 24px;
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;

    &:hover {
        background-color: var(--vscode-button-hoverBackground);
    }
`;

const FileInputHelp = styled.p`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin: 0;
`;

const UrlInputSection = styled.div`
    display: flex;
    gap: 12px;
`;

const SpecUrlInput = styled.input`
    flex: 1;
    padding: 8px 12px;
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    font-family: var(--vscode-font-family);
    font-size: 13px;

    &:focus {
        outline: none;
        border-color: var(--vscode-focusBorder);
    }
`;

const Actions = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 16px;
`;

const ActionButton = styled.button<{ variant: string }>`
    padding: 8px 20px;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;

    ${(props: { variant: string }) =>
        props.variant === "submit" &&
        `
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);

        &:hover:not(:disabled) {
            background-color: var(--vscode-button-hoverBackground);
        }
    `}

    ${(props: { variant: string }) =>
        props.variant === "skip" &&
        `
        background-color: transparent;
        color: var(--vscode-button-foreground);
        border: 1px solid var(--vscode-button-border);

        &:hover:not(:disabled) {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
    `}

    ${(props: { variant: string }) =>
        props.variant === "skip-confirm" &&
        `
        background-color: var(--vscode-inputValidation-warningBackground);
        color: var(--vscode-inputValidation-warningForeground);
        border: 1px solid var(--vscode-inputValidation-warningBorder);

        &:hover {
            opacity: 0.9;
        }
    `}

    ${(props: { variant: string }) =>
        props.variant === "cancel" &&
        `
        background-color: transparent;
        color: var(--vscode-button-foreground);
        border: 1px solid var(--vscode-button-border);

        &:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
    `}

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const SkipForm = styled.div`
    margin-top: 16px;
    padding: 12px;
    background-color: var(--vscode-editorWidget-background);
    border-radius: 4px;
`;

const SkipCommentInput = styled.textarea`
    width: 100%;
    padding: 8px;
    border: 1px solid var(--vscode-input-border);
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border-radius: 4px;
    font-family: var(--vscode-font-family);
    font-size: 13px;
    resize: vertical;
    margin-bottom: 8px;

    &:focus {
        outline: none;
        border-color: var(--vscode-focusBorder);
    }
`;

const Details = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
`;

const DetailRow = styled.div`
    display: flex;
    gap: 8px;
    font-size: 13px;
`;

const DetailLabel = styled.span`
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    min-width: 80px;
`;

const DetailValue = styled.span`
    color: var(--vscode-foreground);
    flex: 1;
`;

const MethodsValue = styled(DetailValue)`
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
`;

const MethodBadge = styled.span<{ method: string }>`
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;

    ${(props: { method: string }) => {
        const method = props.method.toLowerCase();
        if (method === "get") return "background-color: #61affe; color: #fff;";
        if (method === "post") return "background-color: #49cc90; color: #fff;";
        if (method === "put") return "background-color: #fca130; color: #fff;";
        if (method === "patch") return "background-color: #50e3c2; color: #fff;";
        if (method === "delete") return "background-color: #f93e3e; color: #fff;";
        return "background-color: #9012fe; color: #fff;";
    }}
`;

const ErrorContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ErrorMessage = styled.div`
    color: var(--vscode-inputValidation-errorForeground);
    font-weight: 500;
`;

const ErrorCode = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
`;

const ErrorService = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
`;

const Status = styled.div`
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    margin-top: 8px;
`;

interface ConnectorGeneratorData {
    requestId: string;
    stage: "requesting_input" | "input_received" | "generating" | "generated" | "skipped" | "error";
    serviceName?: string;
    serviceDescription?: string;
    spec?: {
        version: string;
        title: string;
        description?: string;
        baseUrl?: string;
        endpointCount: number;
        methods: string[];
    };
    connector?: {
        moduleName: string;
        importStatement: string;
    };
    error?: {
        message: string;
        code: string;
    };
    message: string;
}

interface ConnectorGeneratorSegmentProps {
    data: ConnectorGeneratorData;
    rpcClient: any;
}

export const ConnectorGeneratorSegment: React.FC<ConnectorGeneratorSegmentProps> = ({ data, rpcClient }) => {
    const [inputMethod, setInputMethod] = useState<"file" | "paste" | "url">("file");
    const [specContent, setSpecContent] = useState("");
    const [specUrl, setSpecUrl] = useState("");
    const [skipComment, setSkipComment] = useState("");
    const [showSkipInput, setShowSkipInput] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            await handleSubmit("file", content, file.name);
        };
        reader.onerror = (error) => {
            console.error("[ConnectorGenerator UI] File read error:", error);
        };
        reader.readAsText(file);
    };

    const handleSubmit = async (method: "file" | "paste" | "url", content?: string, identifier?: string) => {
        setIsProcessing(true);

        let specData: any;
        let sourceId: string | undefined;

        try {
            if (method === "url") {
                const response = await fetch(specUrl);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                specData = await response.text();
                sourceId = specUrl;
            } else if (method === "paste") {
                specData = specContent;
                sourceId = "pasted-content";
            } else if (method === "file" && content) {
                specData = content;
                sourceId = identifier;
            }

            await rpcClient.getAiPanelRpcClient().provideConnectorSpec({
                requestId: data.requestId,
                spec: specData
            });

            // Success - the UI will update via connector_generation_notification event
            setIsProcessing(false);
        } catch (error: any) {
            console.error("[ConnectorGenerator UI] Error in handleSubmit:", error);
            setIsProcessing(false);
        }
    };

    const handleSkip = async () => {
        if (showSkipInput) {
            try {
                await rpcClient.getAiPanelRpcClient().cancelConnectorSpec({
                    requestId: data.requestId,
                    comment: skipComment.trim() || undefined
                });
                setShowSkipInput(false);
                setSkipComment("");
            } catch (error: any) {
                console.error("[ConnectorGenerator UI] Error in handleSkip:", error);
                // Still reset UI even on error
                setShowSkipInput(false);
                setSkipComment("");
            }
        } else {
            setShowSkipInput(true);
        }
    };

    const handleCancelSkip = () => {
        setShowSkipInput(false);
        setSkipComment("");
    };

    const currentStage = data.stage;

    if (currentStage === "requesting_input") {
        return (
            <Container variant="requesting-input">
                <Header>
                    <Icon>📋</Icon>
                    <TitleSection>
                        <Title>Generate Connector: {data.serviceName}</Title>
                        {data.serviceDescription && <Subtitle>{data.serviceDescription}</Subtitle>}
                    </TitleSection>
                </Header>

                <Message>{data.message}</Message>

                <InputMethods>
                    <InputMethodTabs>
                        <MethodTab active={inputMethod === "file"} onClick={() => setInputMethod("file")}>
                            Upload File
                        </MethodTab>
                        <MethodTab active={inputMethod === "url"} onClick={() => setInputMethod("url")}>
                            Fetch from URL
                        </MethodTab>
                        <MethodTab active={inputMethod === "paste"} onClick={() => setInputMethod("paste")}>
                            Paste Content
                        </MethodTab>
                    </InputMethodTabs>

                    <InputMethodContent>
                        {inputMethod === "paste" && (
                            <PasteInputSection>
                                <SpecPasteInput
                                    placeholder="Paste your OpenAPI/Swagger specification here (JSON or YAML format)..."
                                    value={specContent}
                                    onChange={(e) => setSpecContent(e.target.value)}
                                    rows={8}
                                />
                                <ActionButton
                                    variant="submit"
                                    onClick={() => handleSubmit("paste")}
                                    disabled={!specContent.trim() || isProcessing}
                                >
                                    {isProcessing ? "Processing..." : "Submit"}
                                </ActionButton>
                            </PasteInputSection>
                        )}

                        {inputMethod === "file" && (
                            <FileInputSection>
                                <FileUploadLabel>
                                    <FileInputHidden
                                        type="file"
                                        accept=".json,.yaml,.yml"
                                        onChange={handleFileUpload}
                                        disabled={isProcessing}
                                    />
                                    <FileUploadButton>
                                        {isProcessing ? "Processing..." : "Choose File (.json, .yaml)"}
                                    </FileUploadButton>
                                </FileUploadLabel>
                                <FileInputHelp>Select your OpenAPI specification file</FileInputHelp>
                            </FileInputSection>
                        )}

                        {inputMethod === "url" && (
                            <UrlInputSection>
                                <SpecUrlInput
                                    type="url"
                                    placeholder="https://api.example.com/openapi.json"
                                    value={specUrl}
                                    onChange={(e) => setSpecUrl(e.target.value)}
                                />
                                <ActionButton
                                    variant="submit"
                                    onClick={() => handleSubmit("url")}
                                    disabled={!specUrl.trim() || isProcessing}
                                >
                                    {isProcessing ? "Fetching..." : "Fetch & Submit"}
                                </ActionButton>
                            </UrlInputSection>
                        )}
                    </InputMethodContent>
                </InputMethods>

                {!showSkipInput ? (
                    <Actions>
                        <ActionButton variant="skip" onClick={handleSkip} disabled={isProcessing}>
                            Skip
                        </ActionButton>
                    </Actions>
                ) : (
                    <SkipForm>
                        <SkipCommentInput
                            placeholder="Why are you skipping this? (optional)"
                            value={skipComment}
                            onChange={(e) => setSkipComment(e.target.value)}
                            rows={2}
                        />
                        <Actions>
                            <ActionButton variant="skip-confirm" onClick={handleSkip}>
                                Confirm Skip
                            </ActionButton>
                            <ActionButton variant="cancel" onClick={handleCancelSkip}>
                                Cancel
                            </ActionButton>
                        </Actions>
                    </SkipForm>
                )}
            </Container>
        );
    }

    if (currentStage === "generating") {
        return (
            <Container variant="generating">
                <Header>
                    <Icon>⚙️</Icon>
                    <Title>Generating connector...</Title>
                </Header>
                <Status>
                    {data.spec ? `Generating connector for ${data.spec.title}` : "Processing specification..."}
                </Status>
            </Container>
        );
    }

    if (currentStage === "error" && data.error) {
        return (
            <Container variant="error">
                <Header>
                    <Icon>⚠️</Icon>
                    <Title>Failed to Generate Connector</Title>
                </Header>
                <ErrorContainer>
                    <ErrorMessage>{data.error.message}</ErrorMessage>
                    <ErrorCode>Error Code: {data.error.code}</ErrorCode>
                    {data.serviceName && <ErrorService>Service: {data.serviceName}</ErrorService>}
                </ErrorContainer>
            </Container>
        );
    }

    if (currentStage === "generated") {
        return (
            <Container variant="provided">
                <Header>
                    <Icon>✓</Icon>
                    <Title>Connector Generated: {data.spec?.title || data.serviceName}</Title>
                </Header>

                <Details>
                    {data.connector && (
                        <>
                            <DetailRow>
                                <DetailLabel>Module:</DetailLabel>
                                <DetailValue>{data.connector.moduleName}</DetailValue>
                            </DetailRow>

                            <DetailRow>
                                <DetailLabel>Import:</DetailLabel>
                                <DetailValue>{data.connector.importStatement}</DetailValue>
                            </DetailRow>
                        </>
                    )}

                    {data.spec && (
                        <>
                            <DetailRow>
                                <DetailLabel>API Version:</DetailLabel>
                                <DetailValue>{data.spec.version}</DetailValue>
                            </DetailRow>

                            {data.spec.baseUrl && (
                                <DetailRow>
                                    <DetailLabel>Base URL:</DetailLabel>
                                    <DetailValue>{data.spec.baseUrl}</DetailValue>
                                </DetailRow>
                            )}

                            <DetailRow>
                                <DetailLabel>Endpoints:</DetailLabel>
                                <DetailValue>{data.spec.endpointCount}</DetailValue>
                            </DetailRow>

                            <DetailRow>
                                <DetailLabel>Methods:</DetailLabel>
                                <MethodsValue>
                                    {data.spec.methods.map((method) => (
                                        <MethodBadge key={method} method={method}>
                                            {method}
                                        </MethodBadge>
                                    ))}
                                </MethodsValue>
                            </DetailRow>
                        </>
                    )}
                </Details>

                <Status>Connector Ready to Use</Status>
            </Container>
        );
    }

    if (currentStage === "skipped") {
        return (
            <Container variant="skipped">
                <Header>
                    <Icon>✗</Icon>
                    <Title>Connector Generation Skipped: {data.serviceName || "Service"}</Title>
                </Header>
                <Status>Skipped connector generation</Status>
            </Container>
        );
    }

    return null;
};
