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
import { extension } from "../../BalExtensionContext";
import { AUTH_CLIENT_ID, AUTH_ORG, getDevantExchangeUrl } from '../../features/ai/utils';
import axios from 'axios';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { AuthCredentials, DevantEnvSecrets, LoginMethod } from '@wso2/ballerina-core';
import { checkDevantEnvironment } from '../../views/ai-panel/utils';
import { getDevantStsToken } from '../../features/devant/activator';

export const REFRESH_TOKEN_NOT_AVAILABLE_ERROR_MESSAGE = "Refresh token is not available.";
export const TOKEN_REFRESH_ONLY_SUPPORTED_FOR_BI_INTEL = "Token refresh is only supported for BI Intelligence authentication";
export const AUTH_CREDENTIALS_SECRET_KEY = 'BallerinaAuthCredentials';

//TODO: What if user doesnt have github copilot.
//TODO: Where does auth git get triggered
export async function loginGithubCopilot() {
    try {
        // Request a session with the 'github' authentication provider
        const session = await vscode.authentication.getSession('github', ['user:email'], { createIfNone: true });
        if (session) {
            // Access the account information
            const { account, accessToken } = session;
            const { label, id } = account;

            // Output the account information
            console.log(`GitHub Account Label: ${label}`);
            console.log(`GitHub Account ID: ${id}`);

            try {
                const copilot_resp = await fetch('https://api.github.com/copilot_internal/v2/token', {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "editor-version": "Neovim/0.6.1",
                        "editor-plugin-version": "copilot.vim/1.16.0",
                        "user-agent": "GithubCopilot/1.155.0"
                    },
                });
                const copilot_resp_body: any = await copilot_resp.json();
                //TODO: What if user doesnt have github copilot.
                const copilot_token = copilot_resp_body.token;
                await extension.context.secrets.store('GITHUB_TOKEN', accessToken);
                await extension.context.secrets.store('GITHUB_COPILOT_TOKEN', copilot_token);
                console.log('GitHub Copilot authorized successfully.');
                return true;
            } catch (error) {
                console.error('Error exchanging GitHub Copilot information:', error);
                vscode.window.showErrorMessage('An error occurred while exchanging GitHub Copilot information. Make sure you have GitHub Copilot access.');
                return false;
            }
        } else {
            console.log('No GitHub session found. User may not be signed in.');
            return false;
        }
    } catch (error) {
        console.error('Error retrieving GitHub account information:', error);
        return false;
    }
}

export async function refreshGithubCopilotToken() {
    try {
        console.log("Refreshing GitHub Copilot token...");
        const accessToken = await extension.context.secrets.get('GITHUB_TOKEN');
        const copilot_resp = await fetch('https://api.github.com/copilot_internal/v2/token', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "editor-version": "Neovim/0.6.1",
                "editor-plugin-version": "copilot.vim/1.16.0",
                "user-agent": "GithubCopilot/1.155.0"
            },
        });
        const copilot_resp_body: any = await copilot_resp.json();
        const copilot_token = copilot_resp_body.token;
        await extension.context.secrets.store('GITHUB_COPILOT_TOKEN', copilot_token);
    } catch (error) {
        console.error('Error retrieving GitHub account information:', error);
    }
}

vscode.authentication.onDidChangeSessions(async e => {
    if (e.provider.id === 'github') {
        if (await copilotTokenExists()) {
            // its a logout. remove token.
            await extension.context.secrets.delete('GITHUB_COPILOT_TOKEN');
            await extension.context.secrets.delete('GITHUB_TOKEN');
        } else {
            //it could be a login(which we havent captured) or a logout 
            // vscode.window.showInformationMessage(
            //     'WSO2 Integrator: BI supports completions with GitHub Copilot.',
            //     'Login with GitHub Copilot'
            // ).then(selection => {
            //     if (selection === 'Login with GitHub Copilot') {
            //         commands.executeCommand('ballerina.login.copilot');
            //     }
            // });
        }
    }
});

async function copilotTokenExists() {
    const copilotToken = await extension.context.secrets.get('GITHUB_COPILOT_TOKEN');
    return copilotToken !== undefined && copilotToken !== '';
}

// ==================================
// Structured Auth Credentials Utils
// ==================================
export const storeAuthCredentials = async (credentials: AuthCredentials): Promise<void> => {
    const credentialsJson = JSON.stringify(credentials);
    await extension.context.secrets.store(AUTH_CREDENTIALS_SECRET_KEY, credentialsJson);
};

export const getAuthCredentials = async (): Promise<AuthCredentials | undefined> => {
    const credentialsJson = await extension.context.secrets.get(AUTH_CREDENTIALS_SECRET_KEY);
    if (!credentialsJson) {
        return undefined;
    }

    try {
        return JSON.parse(credentialsJson) as AuthCredentials;
    } catch (error) {
        console.error('Error parsing auth credentials:', error);
        return undefined;
    }
};

export const clearAuthCredentials = async (): Promise<void> => {
    await extension.context.secrets.delete(AUTH_CREDENTIALS_SECRET_KEY);
};

// ==================================
// BI Copilot Auth Utils
// ==================================
export const getLoginMethod = async (): Promise<LoginMethod | undefined> => {
    // Priority 1: Check devant environment first
    const devantCredentials = await checkDevantEnvironment();
    if (devantCredentials) {
        return devantCredentials.loginMethod;
    }

    // Priority 2: Check stored credentials
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== "") {
        return LoginMethod.ANTHROPIC_KEY;
    }
    const credentials = await getAuthCredentials();
    if (credentials) {
        return credentials.loginMethod;
    }
    return undefined;
};

export const getAccessToken = async (): Promise<AuthCredentials | undefined> => {
    return new Promise(async (resolve, reject) => {
        try {
            // Priority 1: Check devant environment (highest priority)
            const devantCredentials = await checkDevantEnvironment();
            if (devantCredentials) {
                resolve(devantCredentials);
                return;
            }

            // Priority 2: Check stored credentials
            if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== "") {
                resolve({loginMethod: LoginMethod.ANTHROPIC_KEY, secrets: {apiKey: process.env.ANTHROPIC_API_KEY.trim()}});
                return;
            }
            const credentials = await getAuthCredentials();

            if (credentials) {
                switch (credentials.loginMethod) {
                    case LoginMethod.BI_INTEL:
                        try {
                            const { accessToken } = credentials.secrets;
                            let finalToken = accessToken;

                            // Decode token and check expiration
                            const decoded = jwtDecode<JwtPayload>(accessToken);
                            const now = Math.floor(Date.now() / 1000);
                            if (decoded.exp && decoded.exp < now) {
                                finalToken = await getRefreshedAccessToken();
                            }
                            resolve({
                                loginMethod: LoginMethod.BI_INTEL,
                                secrets: {
                                    accessToken: finalToken,
                                    refreshToken: credentials.secrets.refreshToken
                                }
                            });
                            return;
                        } catch (err) {
                            if (axios.isAxiosError(err)) {
                                const status = err.response?.status;
                                if (status === 400) {
                                    reject(new Error("TOKEN_EXPIRED"));
                                    return;
                                }
                            }
                            reject(err);
                            return;
                        }

                    case LoginMethod.ANTHROPIC_KEY:
                        resolve(credentials);
                        return;

                    case LoginMethod.DEVANT_ENV:
                        resolve(credentials);
                        return;

                    case LoginMethod.AWS_BEDROCK:
                        resolve(credentials);
                        return;

                    default:
                        const { loginMethod }: AuthCredentials = credentials;
                        reject(new Error(`Unsupported login method: ${loginMethod}`));
                        return;

                }
            }
            resolve(undefined);
        } catch (error: any) {
            reject(error);
        }
    });
};

export const getAwsBedrockCredentials = async (): Promise<{
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    sessionToken?: string;
} | undefined> => {
    const credentials = await getAuthCredentials();
    if (!credentials || credentials.loginMethod !== LoginMethod.AWS_BEDROCK) {
        return undefined;
    }
    return credentials.secrets;
};

export const getRefreshedAccessToken = async (): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        const CommonReqHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=utf8',
            'Accept': 'application/json'
        };

        try {
            const credentials = await getAuthCredentials();
            if (!credentials || credentials.loginMethod !== LoginMethod.BI_INTEL) {
                throw new Error(TOKEN_REFRESH_ONLY_SUPPORTED_FOR_BI_INTEL);
            }

            const { refreshToken } = credentials.secrets;
            if (!refreshToken) {
                reject(new Error(REFRESH_TOKEN_NOT_AVAILABLE_ERROR_MESSAGE));
                return;
            }

            const params = new URLSearchParams({
                client_id: AUTH_CLIENT_ID,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
                scope: 'openid email'
            });

            const response = await axios.post(`https://api.asgardeo.io/t/${AUTH_ORG}/oauth2/token`, params.toString(), { headers: CommonReqHeaders });

            const newAccessToken = response.data.access_token;
            const newRefreshToken = response.data.refresh_token;

            // Update stored credentials
            const updatedCredentials: AuthCredentials = {
                ...credentials,
                secrets: {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken
                }
            };
            await storeAuthCredentials(updatedCredentials);

            resolve(newAccessToken);
        } catch (error: any) {
            reject(error);
        }
    });
};

// ==================================
// Devant STS Token Exchange Utils
// ==================================

/**
 * Exchanges a Choreo STS token for a Devant Bearer token
 * @param choreoStsToken The Choreo STS token to exchange
 * @returns DevantEnvSecrets containing the access token and calculated expiry time
 */
export const exchangeStsToken = async (choreoStsToken: string): Promise<DevantEnvSecrets> => {
    try {
        const response = await axios.post(getDevantExchangeUrl(), {
            choreo_sts_token: choreoStsToken
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const { access_token, expires_in } = response.data;
        const devantEnv: DevantEnvSecrets =  {
            accessToken: access_token,
            expiresAt: Date.now() + (expires_in * 1000) // Convert seconds to milliseconds
        };

        await storeAuthCredentials({
            loginMethod: LoginMethod.DEVANT_ENV,
            secrets: devantEnv
        });
        return devantEnv;
    } catch (error: any) {
        console.error('Error exchanging STS token:', error);
        throw new Error(`Failed to exchange STS token: ${error.message}`);
    }
};

/**
 * Refreshes the Devant token by fetching a new STS token and exchanging it
 * This is called when a 401 error occurs during DEVANT_ENV authentication
 * @returns The new access token
 */
export const refreshDevantToken = async (): Promise<string> => {
    try {
        // Get fresh STS token from platform extension
        const newStsToken = await getDevantStsToken();

        if (!newStsToken) {
            throw new Error('Failed to retrieve STS token from platform extension');
        }

        // Exchange for new Bearer token
        const newSecrets = await exchangeStsToken(newStsToken);

        // Update stored credentials (this is in-memory only for DEVANT_ENV)
        // Note: checkDevantEnvironment already handles the storage, so we just return the token

        return newSecrets.accessToken;
    } catch (error: any) {
        console.error('Error refreshing Devant token:', error);
        throw error;
    }
};
