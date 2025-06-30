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
import { AUTH_CLIENT_ID, AUTH_ORG } from '../../features/ai/utils';
import axios from 'axios';
import { jwtDecode, JwtPayload } from 'jwt-decode';
// import { StateMachineAI } from '../../../src/views/ai-panel/aiMachine';

export const ACCESS_TOKEN_SECRET_KEY = 'BallerinaAIUser';
export const REFRESH_TOKEN_SECRET_KEY = 'BallerinaAIRefreshToken';

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
        console.log(copilot_resp_body);
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
// BI Copilot Auth Utils
// ==================================
export const getAccessToken = async (): Promise<string | undefined> => {
    return new Promise(async (resolve, reject) => {
        try {
            const token = await extension.context.secrets.get(ACCESS_TOKEN_SECRET_KEY);
            if (!token) {
                resolve(undefined);
                return;
            }

            let finalToken = token;

            // Decode token and check expiration
            try {
                const decoded = jwtDecode<JwtPayload>(token);
                const now = Math.floor(Date.now() / 1000);
                if (decoded.exp && decoded.exp < now) {
                    finalToken = await getRefreshedAccessToken();
                }
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

            resolve(finalToken);
        } catch (error: any) {
            reject(error);
        }
    });
};

export const getRefreshedAccessToken = async (): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        const CommonReqHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=utf8',
            'Accept': 'application/json'
        };

        try {
            const refreshToken = await extension.context.secrets.get(REFRESH_TOKEN_SECRET_KEY);
            if (!refreshToken) {
                reject(new Error("Refresh token is not available."));
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

            await extension.context.secrets.store(ACCESS_TOKEN_SECRET_KEY, newAccessToken);
            await extension.context.secrets.store(REFRESH_TOKEN_SECRET_KEY, newRefreshToken);

            resolve(newAccessToken);
        } catch (error: any) {
            reject(error);
        }
    });
};
