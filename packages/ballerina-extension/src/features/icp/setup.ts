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

import axios from 'axios';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { workspace, window } from 'vscode';
import { extension } from '../../BalExtensionContext';
import { parse, stringify } from '@iarna/toml';

const ICP_SECRET_KEY_PREFIX = 'ICP_ORG_SECRET_';
const CREATE_ORG_SECRET_MUTATION = '{"query":"mutation CreateOrgSecret { createOrgSecret(environmentId: \\"750e8400-e29b-41d4-a716-446655440001\\") }"}';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

function getICPUrl(): string {
    return workspace.getConfiguration('ballerina').get<string>('icpUrl') || 'https://localhost:9445';
}

function getICPCredentials(): { username: string; password: string } {
    const config = workspace.getConfiguration('ballerina');
    return {
        username: config.get<string>('icpUsername') || 'admin',
        password: config.get<string>('icpPassword') || 'admin',
    };
}

function getGraphQLUrl(): string {
    const icpUrl = getICPUrl();
    try {
        const url = new URL(icpUrl);
        const port = parseInt(url.port || '9445', 10);
        url.port = String(port + 1);
        return `${url.origin}/graphql`;
    } catch {
        return 'https://localhost:9446/graphql';
    }
}

async function getICPToken(): Promise<string> {
    const icpUrl = getICPUrl();
    const { username, password } = getICPCredentials();

    const response = await axios.post(
        `${icpUrl}/auth/login`,
        { username, password },
        { httpsAgent, headers: { 'Content-Type': 'application/json' } }
    );

    return response.data.token;
}

async function createOrgSecret(token: string): Promise<string> {
    const graphqlUrl = getGraphQLUrl();

    const response = await axios.post(
        graphqlUrl,
        CREATE_ORG_SECRET_MUTATION,
        {
            httpsAgent,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        }
    );

    return response.data.data.createOrgSecret;
}

export async function storeICPSecret(projectPath: string, secret: string): Promise<void> {
    await extension.context.secrets.store(`${ICP_SECRET_KEY_PREFIX}${projectPath}`, secret);
}

export async function getStoredICPSecret(projectPath: string): Promise<string | undefined> {
    return extension.context.secrets.get(`${ICP_SECRET_KEY_PREFIX}${projectPath}`);
}

export function writeSecretToConfigToml(projectPath: string, secret: string): void {
    const configPath = path.join(projectPath, 'Config.toml');
    let config: Record<string, any> = {};

    if (fs.existsSync(configPath)) {
        try {
            const content = fs.readFileSync(configPath, 'utf-8');
            config = parse(content) as Record<string, any>;
        } catch (error) {
            console.error('[ICP] Error reading Config.toml:', error);
        }
    }

    if (config.wso2?.icp?.runtime?.bridge) {
        config.wso2.icp.runtime.bridge.secret = secret;
        fs.writeFileSync(configPath, stringify(config), 'utf-8');
    }
}

/**
 * Provisions an ICP secret by logging into the ICP server and calling the GraphQL API.
 * Stores the secret in VS Code SecretStorage and writes it to Config.toml.
 *
 * @returns The provisioned secret, or undefined if provisioning failed.
 */
export async function provisionICPSecret(projectPath: string): Promise<string | undefined> {
    // Check if secret already exists in keychain
    const stored = await getStoredICPSecret(projectPath);
    if (stored) {
        writeSecretToConfigToml(projectPath, stored);
        return stored;
    }

    try {
        const token = await getICPToken();
        const secret = await createOrgSecret(token);

        await storeICPSecret(projectPath, secret);
        writeSecretToConfigToml(projectPath, secret);

        return secret;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[ICP] Failed to provision secret:', message);
        window.showWarningMessage(
            `Failed to provision ICP secret: ${message}. You can set it manually in Config.toml.`
        );
        return undefined;
    }
}
