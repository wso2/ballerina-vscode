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

import * as vscode from 'vscode';
import { AIUserToken, LoginMethod, AuthCredentials } from '@wso2/ballerina-core';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { createVertexAnthropic } from '@ai-sdk/google-vertex/anthropic';
import { generateText } from 'ai';
import { extension } from '../../BalExtensionContext';
import {
    getAccessToken,
    getLoginMethod,
    clearAuthCredentials,
    storeAuthCredentials,
    isPlatformExtensionAvailable,
    isDevantUserLoggedIn,
    getPlatformStsToken,
    exchangeStsToCopilotToken
} from '../../utils/ai/auth';
import { getBedrockRegionalPrefix } from '../../features/ai/utils/ai-client';

const LEGACY_ACCESS_TOKEN_SECRET_KEY = 'BallerinaAIUser';
const LEGACY_REFRESH_TOKEN_SECRET_KEY = 'BallerinaAIRefreshToken';

export const checkToken = async (): Promise<AuthCredentials | undefined> => {
    return new Promise(async (resolve, reject) => {
        try {
            // Clean up any legacy tokens on initialization
            await cleanupLegacyTokens();

            // First check if we have stored credentials
            const credentials = await getAccessToken();
            if (credentials) {
                resolve(credentials);
                return;
            }

            // No stored credentials - check if user is logged into Devant
            if (isPlatformExtensionAvailable()) {
                const isLoggedIn = await isDevantUserLoggedIn();
                if (isLoggedIn) {
                    // User is logged into Devant but no stored credentials
                    // Exchange STS token and store credentials
                    try {
                        const stsToken = await getPlatformStsToken();
                        if (stsToken) {
                            const secrets = await exchangeStsToCopilotToken(stsToken);
                            const newCredentials: AuthCredentials = {
                                loginMethod: LoginMethod.BI_INTEL,
                                secrets
                            };
                            await storeAuthCredentials(newCredentials);
                            resolve(newCredentials);
                            return;
                        }
                    } catch (exchangeError) {
                        console.error('Failed to exchange STS token during checkToken:', exchangeError);
                    }
                }
            }

            resolve(undefined);
        } catch (error) {
            reject(error);
        }
    });
};

const cleanupLegacyTokens = async (): Promise<void> => {
    try {
        const legacyToken = await extension.context.secrets.get(LEGACY_ACCESS_TOKEN_SECRET_KEY);
        const legacyRefreshToken = await extension.context.secrets.get(LEGACY_REFRESH_TOKEN_SECRET_KEY);

        if (legacyToken || legacyRefreshToken) {
            await extension.context.secrets.delete(LEGACY_ACCESS_TOKEN_SECRET_KEY);
            await extension.context.secrets.delete(LEGACY_REFRESH_TOKEN_SECRET_KEY);
        }
    } catch (error) {
        console.error('Error cleaning up legacy tokens:', error);
    }
};

export const logout = async (_isUserLogout: boolean = true) => {
    // Sign out from the WSO2 Platform extension if logged in via BI_INTEL
    const loginMethod = await getLoginMethod();
    if (loginMethod === LoginMethod.BI_INTEL && isPlatformExtensionAvailable()) {
        try {
            await vscode.commands.executeCommand('wso2.wso2-platform.sign.out');
        } catch (error) {
            console.error('Error signing out from WSO2 Platform extension:', error);
        }
    }

    // Always clear stored credentials
    await clearAuthCredentials();
};

/**
 * Initiate Devant authentication via the platform extension.
 * Returns true if login was triggered, false if platform extension is not available.
 */
export async function initiateDevantAuth(): Promise<boolean> {
    if (!isPlatformExtensionAvailable()) {
        throw new Error('WSO2 Platform extension is not installed. Please install it to use BI Copilot.');
    }

    // Trigger platform extension login command
    await vscode.commands.executeCommand('wso2.wso2-platform.sign.in');
    return true;
}

export const validateApiKey = async (apiKey: string, loginMethod: LoginMethod): Promise<AIUserToken> => {
    if (loginMethod !== LoginMethod.ANTHROPIC_KEY) {
        throw new Error('This login method is not supported. Please use SSO login instead.');
    }

    if (!apiKey || !apiKey.startsWith('sk-') || apiKey.length < 20) {
        throw new Error('Please enter a valid Anthropic API key.');
    }

    try {
        const directAnthropic = createAnthropic({
            apiKey: apiKey,
            baseURL: 'https://api.anthropic.com/v1'
        });

        await generateText({
            model: directAnthropic('claude-3-haiku-20240307'),
            maxOutputTokens: 1,
            messages: [{ role: 'user', content: 'Hi' }]
        });

        // Store credentials
        const credentials: AuthCredentials = {
            loginMethod: LoginMethod.ANTHROPIC_KEY,
            secrets: {
                apiKey: apiKey
            }
        };
        await storeAuthCredentials(credentials);

        return { credentials: credentials };

    } catch (error) {
        console.error('API key validation failed:', error);
        if (error instanceof Error) {
            if (error.message.includes('401') || error.message.includes('authentication')) {
                throw new Error('Invalid API key. Please check your key and try again.');
            } else if (error.message.includes('403')) {
                throw new Error('Your API key does not have access to Claude. Please check your Anthropic account.');
            } else if (error.message.includes('rate_limit')) {
                throw new Error('Too many requests. Please wait a moment and try again.');
            }
            throw new Error('Connection failed. Please check your internet connection and ensure your API key is valid.');
        }
        throw new Error('Validation failed. Please try again.');
    }
};

export const validateAwsCredentials = async (credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    sessionToken?: string;
}): Promise<AIUserToken> => {
    const { accessKeyId, secretAccessKey, region, sessionToken } = credentials;

    if (!accessKeyId || !secretAccessKey || !region) {
        throw new Error('AWS access key ID, secret access key, and region are required.');
    }

    if (!accessKeyId.startsWith('AKIA') && !accessKeyId.startsWith('ASIA')) {
        throw new Error('Please enter a valid AWS access key ID.');
    }

    if (secretAccessKey.length < 20) {
        throw new Error('Please enter a valid AWS secret access key.');
    }

    // List of valid AWS regions
    const validRegions = [
        'us-east-1', 'us-west-2', 'us-west-1', 'eu-west-1', 'eu-central-1',
        'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
        'ap-south-1', 'ca-central-1', 'sa-east-1', 'eu-west-2', 'eu-west-3',
        'eu-north-1', 'ap-east-1', 'me-south-1', 'af-south-1', 'ap-southeast-3'
    ];

    if (!validRegions.includes(region)) {
        throw new Error(`Invalid AWS region. Please select a valid region like us-east-1, us-west-2, etc.`);
    }

    try {
        const bedrock = createAmazonBedrock({
            region: region,
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey,
            sessionToken: sessionToken,
        });

        // Get regional prefix based on AWS region and construct model ID
        const regionalPrefix = getBedrockRegionalPrefix(region);
        const modelId = `${regionalPrefix}.anthropic.claude-3-5-haiku-20241022-v1:0`;
        const bedrockClient = bedrock(modelId);

        // Make a minimal test call to validate credentials
        await generateText({
            model: bedrockClient,
            maxOutputTokens: 1,
            messages: [{ role: 'user', content: 'Hi' }]
        });

        // Store credentials
        const authCredentials: AuthCredentials = {
            loginMethod: LoginMethod.AWS_BEDROCK,
            secrets: {
                accessKeyId,
                secretAccessKey,
                region,
                sessionToken
            }
        };
        await storeAuthCredentials(authCredentials);

        return { credentials: authCredentials };

    } catch (error) {
        console.error('AWS Bedrock validation failed:', error);
        throw new Error('Validation failed. Please check the log for more details.');
    }
};

export const validateVertexAiCredentials = async (credentials: {
    projectId: string;
    location: string;
    clientEmail: string;
    privateKey: string;
}): Promise<AIUserToken> => {
    const { projectId, location, clientEmail, privateKey } = credentials;

    if (!projectId || !location || !clientEmail || !privateKey) {
        throw new Error('GCP Project ID, location, client email, and private key are required.');
    }

    try {
        const vertexAnthropic = createVertexAnthropic({
            project: projectId,
            location: location,
            googleAuthOptions: {
                credentials: {
                    client_email: clientEmail,
                    private_key: privateKey,
                },
            },
        });

        await generateText({
            model: vertexAnthropic('claude-3-5-haiku@20241022'),
            maxOutputTokens: 1,
            messages: [{ role: 'user', content: 'Hi' }]
        });

        const authCredentials: AuthCredentials = {
            loginMethod: LoginMethod.VERTEX_AI,
            secrets: {
                projectId,
                location,
                clientEmail,
                privateKey
            }
        };
        await storeAuthCredentials(authCredentials);

        return { credentials: authCredentials };

    } catch (error) {
        console.error('Vertex AI validation failed:', error);
        if (error instanceof Error) {
            if (error.message.includes('401') || error.message.includes('authentication') || error.message.includes('UNAUTHENTICATED')) {
                throw new Error('Invalid credentials. Please check your service account email and private key.');
            } else if (error.message.includes('403') || error.message.includes('PERMISSION_DENIED')) {
                throw new Error('Permission denied. Please ensure your service account has access to Vertex AI.');
            } else if (error.message.includes('404') || error.message.includes('NOT_FOUND')) {
                throw new Error('Project or location not found. Please check your GCP Project ID and location.');
            }
        }
        throw new Error('Validation failed. Please check the log for more details.');
    }
};
