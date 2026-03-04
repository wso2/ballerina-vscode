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

import styled from "@emotion/styled";
import { AIMachineEventType, LoginMethod } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";

import { AlertBox } from "../AlertBox";
import { useState } from "react";
import { Codicon } from "@wso2/ui-toolkit";
import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 10px;
    gap: 8px;
`;

// AlertBox-style container for consistency
const AlertContainer = styled.div<{ variant: "primary" | "secondary" }>`
    border-left: 0.3rem solid
        var(
            ${(props: { variant: string }) =>
                props.variant === "secondary" ? "--vscode-editorWidget-border" : "--vscode-focusBorder"}
        );
    background: var(
        ${(props: { variant: string }) =>
            props.variant === "secondary" ? "transparent" : "--vscode-inputValidation-infoBackground"}
    );
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 1rem;
    gap: 12px;
    margin-bottom: 15px;
    width: -webkit-fill-available;
`;

const Title = styled.div`
    color: var(--vscode-foreground);
    font-weight: 500;
`;

const SubTitle = styled.div`
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
`;

const InputContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 2px 4px;
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 4px;
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    width: 100%;
    box-sizing: border-box;
    min-height: 32px;
    &:focus-within {
        border-color: var(--vscode-button-background);
    }
`;

const InputRow = styled.div`
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 28px;
    gap: 8px;
`;

const StyledTextField = styled(VSCodeTextField)`
    flex: 1;
    border: none;
    background: transparent;
    height: 28px;
    min-height: 28px;
    display: flex;
    align-items: center;
    width: 100%;
    &::part(control) {
        border: none !important;
        background: transparent !important;
        padding: 0 4px;
        outline: none !important;
        box-shadow: none !important;
        height: 28px !important;
        min-height: 28px !important;
        line-height: 28px !important;
        display: flex !important;
        align-items: center !important;
        width: 100% !important;
        flex: 1 !important;
    }
    &::part(control):focus {
        outline: none !important;
        box-shadow: none !important;
        border: none !important;
    }
    &::part(root) {
        border: none !important;
        background: transparent !important;
        height: 28px !important;
        min-height: 28px !important;
        display: flex !important;
        align-items: center !important;
        width: 100% !important;
        flex: 1 !important;
    }
`;

const EyeButton = styled.button`
    width: 24px;
    height: 24px;
    background-color: transparent;
    color: var(--vscode-icon-foreground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
    box-sizing: border-box;
    flex-shrink: 0;
    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }
    &:active {
        background-color: var(--vscode-toolbar-activeBackground);
    }
`;

const ButtonContainer = styled.div`
    display: flex;
    gap: 8px;
    align-self: flex-start;
`;

const ErrorMessage = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    color: var(--vscode-errorForeground);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
    width: 100%;
`;

interface WaitingForLoginProps {
    loginMethod?: LoginMethod;
    isValidating?: boolean;
    errorMessage?: string;
}

const WaitingForLogin = ({ loginMethod, isValidating = false, errorMessage }: WaitingForLoginProps) => {
    const { rpcClient } = useRpcContext();
    const [apiKey, setApiKey] = useState("");
    const [showApiKey, setShowApiKey] = useState(false);
    const [awsCredentials, setAwsCredentials] = useState({
        accessKeyId: "",
        secretAccessKey: "",
        region: "",
        sessionToken: ""
    });
    const [showAccessKey, setShowAccessKey] = useState(false);
    const [showSecretKey, setShowSecretKey] = useState(false);
    const [showSessionToken, setShowSessionToken] = useState(false);
    const [vertexAiCredentials, setVertexAiCredentials] = useState({
        projectId: "",
        location: "",
        clientEmail: "",
        privateKey: ""
    });
    const [showClientEmail, setShowClientEmail] = useState(false);
    const [showPrivateKey, setShowPrivateKey] = useState(false);

    const cancelLogin = () => {
        rpcClient.sendAIStateEvent(AIMachineEventType.CANCEL_LOGIN);
    };

    const connectWithKey = () => {
        if (apiKey.trim()) {
            // Send the API key to the state machine for validation
            rpcClient.sendAIStateEvent({
                type: AIMachineEventType.SUBMIT_API_KEY,
                payload: { apiKey: apiKey.trim() },
            });
        }
    };

    const connectWithAwsCredentials = () => {
        if (awsCredentials.accessKeyId.trim() && awsCredentials.secretAccessKey.trim() && awsCredentials.region.trim()) {
            rpcClient.sendAIStateEvent({
                type: AIMachineEventType.SUBMIT_AWS_CREDENTIALS,
                payload: {
                    accessKeyId: awsCredentials.accessKeyId.trim(),
                    secretAccessKey: awsCredentials.secretAccessKey.trim(),
                    region: awsCredentials.region.trim(),
                    sessionToken: awsCredentials.sessionToken.trim() || undefined
                },
            });
        }
    };

    const handleApiKeyChange = (e: any) => {
        setApiKey(e.target.value);
    };

    const handleAwsCredentialChange = (field: keyof typeof awsCredentials) => (e: any) => {
        setAwsCredentials(prev => ({
            ...prev,
            [field]: e.target.value
        }));
    };

    const toggleApiKeyVisibility = () => {
        setShowApiKey(!showApiKey);
    };

    const toggleAccessKeyVisibility = () => {
        setShowAccessKey(!showAccessKey);
    };

    const toggleSecretKeyVisibility = () => {
        setShowSecretKey(!showSecretKey);
    };

    const toggleSessionTokenVisibility = () => {
        setShowSessionToken(!showSessionToken);
    };

    const connectWithVertexAi = () => {
        if (vertexAiCredentials.projectId.trim() && vertexAiCredentials.location.trim() &&
            vertexAiCredentials.clientEmail.trim() && vertexAiCredentials.privateKey.trim()) {
            rpcClient.sendAIStateEvent({
                type: AIMachineEventType.SUBMIT_VERTEX_AI_CREDENTIALS,
                payload: {
                    projectId: vertexAiCredentials.projectId.trim(),
                    location: vertexAiCredentials.location.trim(),
                    clientEmail: vertexAiCredentials.clientEmail.trim(),
                    privateKey: vertexAiCredentials.privateKey.trim()
                },
            });
        }
    };

    const handleVertexAiCredentialChange = (field: keyof typeof vertexAiCredentials) => (e: any) => {
        setVertexAiCredentials(prev => ({
            ...prev,
            [field]: e.target.value
        }));
    };

    const toggleClientEmailVisibility = () => {
        setShowClientEmail(!showClientEmail);
    };

    const togglePrivateKeyVisibility = () => {
        setShowPrivateKey(!showPrivateKey);
    };

    if (loginMethod === LoginMethod.ANTHROPIC_KEY) {
        return (
            <Container>
                <AlertContainer variant="primary">
                    <Title>Connect with Anthropic API Key</Title>
                    <SubTitle>
                        Enter your Anthropic API key to connect to BI Copilot. Your API key will be securely stored
                        and used for authentication.
                    </SubTitle>

                    <InputContainer>
                        <InputRow>
                            <StyledTextField
                                type={showApiKey ? "text" : "password"}
                                placeholder="Enter your Anthropic API key"
                                value={apiKey}
                                onInput={handleApiKeyChange}
                                {...(isValidating ? { disabled: true } : {})}
                            />
                            <EyeButton
                                type="button"
                                onClick={toggleApiKeyVisibility}
                                title={showApiKey ? "Hide API key" : "Show API key"}
                                {...(isValidating ? { disabled: true } : {})}
                            >
                                <Codicon name={showApiKey ? "eye-closed" : "eye"} />
                            </EyeButton>
                        </InputRow>
                    </InputContainer>

                    {errorMessage && (
                        <ErrorMessage>
                            <Codicon name="error" />
                            <span>{errorMessage}</span>
                        </ErrorMessage>
                    )}

                    <ButtonContainer>
                        <VSCodeButton
                            appearance="primary"
                            onClick={connectWithKey}
                            {...(isValidating || !apiKey || apiKey.trim().length === 0 ? { disabled: true } : {})}
                        >
                            {isValidating ? "Validating..." : "Connect with Key"}
                        </VSCodeButton>
                        <VSCodeButton
                            appearance="secondary"
                            onClick={cancelLogin}
                            {...(isValidating ? { disabled: true } : {})}
                        >
                            Cancel
                        </VSCodeButton>
                    </ButtonContainer>
                </AlertContainer>
            </Container>
        );
    }

    if (loginMethod === LoginMethod.AWS_BEDROCK) {
        const isFormValid = awsCredentials.accessKeyId.trim() && 
                           awsCredentials.secretAccessKey.trim() && 
                           awsCredentials.region.trim();

        return (
            <Container>
                <AlertContainer variant="primary">
                    <Title>Connect with AWS Bedrock</Title>
                    <SubTitle>
                        Enter your AWS credentials to connect to BI Copilot via AWS Bedrock. Your credentials will be securely stored
                        and used for authentication.
                    </SubTitle>

                    <InputContainer>
                        <InputRow>
                            <StyledTextField
                                type={showAccessKey ? "text" : "password"}
                                placeholder="AWS Access Key ID"
                                value={awsCredentials.accessKeyId}
                                onInput={handleAwsCredentialChange('accessKeyId')}
                                {...(isValidating ? { disabled: true } : {})}
                            />
                            <EyeButton
                                type="button"
                                onClick={toggleAccessKeyVisibility}
                                title={showAccessKey ? "Hide access key" : "Show access key"}
                                {...(isValidating ? { disabled: true } : {})}
                            >
                                <Codicon name={showAccessKey ? "eye-closed" : "eye"} />
                            </EyeButton>
                        </InputRow>
                    </InputContainer>

                    <InputContainer>
                        <InputRow>
                            <StyledTextField
                                type={showSecretKey ? "text" : "password"}
                                placeholder="AWS Secret Access Key"
                                value={awsCredentials.secretAccessKey}
                                onInput={handleAwsCredentialChange('secretAccessKey')}
                                {...(isValidating ? { disabled: true } : {})}
                            />
                            <EyeButton
                                type="button"
                                onClick={toggleSecretKeyVisibility}
                                title={showSecretKey ? "Hide secret key" : "Show secret key"}
                                {...(isValidating ? { disabled: true } : {})}
                            >
                                <Codicon name={showSecretKey ? "eye-closed" : "eye"} />
                            </EyeButton>
                        </InputRow>
                    </InputContainer>

                    <InputContainer>
                        <InputRow>
                            <StyledTextField
                                type="text"
                                placeholder="AWS Region (e.g., us-east-1)"
                                value={awsCredentials.region}
                                onInput={handleAwsCredentialChange('region')}
                                {...(isValidating ? { disabled: true } : {})}
                            />
                        </InputRow>
                    </InputContainer>

                    <InputContainer>
                        <InputRow>
                            <StyledTextField
                                type={showSessionToken ? "text" : "password"}
                                placeholder="Session Token (optional)"
                                value={awsCredentials.sessionToken}
                                onInput={handleAwsCredentialChange('sessionToken')}
                                {...(isValidating ? { disabled: true } : {})}
                            />
                            <EyeButton
                                type="button"
                                onClick={toggleSessionTokenVisibility}
                                title={showSessionToken ? "Hide session token" : "Show session token"}
                                {...(isValidating ? { disabled: true } : {})}
                            >
                                <Codicon name={showSessionToken ? "eye-closed" : "eye"} />
                            </EyeButton>
                        </InputRow>
                    </InputContainer>

                    {errorMessage && (
                        <ErrorMessage>
                            <Codicon name="error" />
                            <span>{errorMessage}</span>
                        </ErrorMessage>
                    )}

                    <ButtonContainer>
                        <VSCodeButton
                            appearance="primary"
                            onClick={connectWithAwsCredentials}
                            {...(isValidating || !isFormValid ? { disabled: true } : {})}
                        >
                            {isValidating ? "Validating..." : "Connect with AWS Bedrock"}
                        </VSCodeButton>
                        <VSCodeButton
                            appearance="secondary"
                            onClick={cancelLogin}
                            {...(isValidating ? { disabled: true } : {})}
                        >
                            Cancel
                        </VSCodeButton>
                    </ButtonContainer>
                </AlertContainer>
            </Container>
        );
    }

    if (loginMethod === LoginMethod.VERTEX_AI) {
        const isFormValid = vertexAiCredentials.projectId.trim() &&
                           vertexAiCredentials.location.trim() &&
                           vertexAiCredentials.clientEmail.trim() &&
                           vertexAiCredentials.privateKey.trim();

        return (
            <Container>
                <AlertContainer variant="primary">
                    <Title>Connect with Google Vertex AI</Title>
                    <SubTitle>
                        Enter your GCP service account credentials to connect to BI Copilot via Google Vertex AI. Your credentials will be securely stored
                        and used for authentication.
                    </SubTitle>

                    <InputContainer>
                        <InputRow>
                            <StyledTextField
                                type="text"
                                placeholder="GCP Project ID"
                                value={vertexAiCredentials.projectId}
                                onInput={handleVertexAiCredentialChange('projectId')}
                                {...(isValidating ? { disabled: true } : {})}
                            />
                        </InputRow>
                    </InputContainer>

                    <InputContainer>
                        <InputRow>
                            <StyledTextField
                                type="text"
                                placeholder="Location (e.g., us-central1)"
                                value={vertexAiCredentials.location}
                                onInput={handleVertexAiCredentialChange('location')}
                                {...(isValidating ? { disabled: true } : {})}
                            />
                        </InputRow>
                    </InputContainer>

                    <InputContainer>
                        <InputRow>
                            <StyledTextField
                                type={showClientEmail ? "text" : "password"}
                                placeholder="Service Account Client Email"
                                value={vertexAiCredentials.clientEmail}
                                onInput={handleVertexAiCredentialChange('clientEmail')}
                                {...(isValidating ? { disabled: true } : {})}
                            />
                            <EyeButton
                                type="button"
                                onClick={toggleClientEmailVisibility}
                                title={showClientEmail ? "Hide client email" : "Show client email"}
                                {...(isValidating ? { disabled: true } : {})}
                            >
                                <Codicon name={showClientEmail ? "eye-closed" : "eye"} />
                            </EyeButton>
                        </InputRow>
                    </InputContainer>

                    <InputContainer>
                        <InputRow>
                            <StyledTextField
                                type={showPrivateKey ? "text" : "password"}
                                placeholder="Service Account Private Key"
                                value={vertexAiCredentials.privateKey}
                                onInput={handleVertexAiCredentialChange('privateKey')}
                                {...(isValidating ? { disabled: true } : {})}
                            />
                            <EyeButton
                                type="button"
                                onClick={togglePrivateKeyVisibility}
                                title={showPrivateKey ? "Hide private key" : "Show private key"}
                                {...(isValidating ? { disabled: true } : {})}
                            >
                                <Codicon name={showPrivateKey ? "eye-closed" : "eye"} />
                            </EyeButton>
                        </InputRow>
                    </InputContainer>

                    {errorMessage && (
                        <ErrorMessage>
                            <Codicon name="error" />
                            <span>{errorMessage}</span>
                        </ErrorMessage>
                    )}

                    <ButtonContainer>
                        <VSCodeButton
                            appearance="primary"
                            onClick={connectWithVertexAi}
                            {...(isValidating || !isFormValid ? { disabled: true } : {})}
                        >
                            {isValidating ? "Validating..." : "Connect with Vertex AI"}
                        </VSCodeButton>
                        <VSCodeButton
                            appearance="secondary"
                            onClick={cancelLogin}
                            {...(isValidating ? { disabled: true } : {})}
                        >
                            Cancel
                        </VSCodeButton>
                    </ButtonContainer>
                </AlertContainer>
            </Container>
        );
    }

    // Default: BI_INTEL login method

    return (
        <Container>
            <AlertBox
                buttonTitle="Cancel"
                onClick={cancelLogin}
                subTitle={
                    "Waiting for the login credentials. Please sign in to your BI Copilot account in the browser window to continue."
                }
                title={"Waiting for Login"}
            />
        </Container>
    );
};

export default WaitingForLogin;
