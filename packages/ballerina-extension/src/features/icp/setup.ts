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

import * as https from 'https';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { workspace, window } from 'vscode';
import { extension } from '../../BalExtensionContext';
import { parse, stringify } from '@iarna/toml';

const ICP_SECRET_KEY_PREFIX = 'ICP_ORG_SECRET_';
const CREATE_ORG_SECRET_MUTATION = JSON.stringify({
    query: 'mutation CreateOrgSecret { createOrgSecret(environmentId: "750e8400-e29b-41d4-a716-446655440001") }'
});

function isLoopback(hostname: string): boolean {
    return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1';
}

function waitForPort(hostname: string, port: number, timeoutMs: number = 10000): Promise<boolean> {
    const start = Date.now();
    return new Promise((resolve) => {
        function tryConnect() {
            if (Date.now() - start > timeoutMs) {
                resolve(false);
                return;
            }
            const socket = new net.Socket();
            socket.once('connect', () => {
                socket.destroy();
                resolve(true);
            });
            socket.once('error', () => {
                socket.destroy();
                setTimeout(tryConnect, 500);
            });
            socket.connect(port, hostname);
        }
        tryConnect();
    });
}

function httpsPost(url: string, body: string, headers: Record<string, string>): Promise<{ status: number; data: any }> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const options: https.RequestOptions = {
            hostname: parsed.hostname,
            port: parsed.port || 443,
            path: parsed.pathname + parsed.search,
            method: 'POST',
            headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
            rejectUnauthorized: !isLoopback(parsed.hostname),
        };

        const req = https.request(options, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString();
                let data: any;
                try {
                    data = JSON.parse(raw);
                } catch {
                    data = raw;
                }
                resolve({ status: res.statusCode || 0, data });
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function getICPUrl(): string {
    return workspace.getConfiguration('ballerina').get<string>('icpUrl') || 'https://127.0.0.1:9445';
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
        return `${url.origin}/graphql`;
    } catch {
        return 'https://127.0.0.1:9445/graphql';
    }
}

async function getICPToken(): Promise<string> {
    const icpUrl = getICPUrl();
    const { username, password } = getICPCredentials();
    const loginUrl = `${icpUrl}/auth/login`;

    const response = await httpsPost(
        loginUrl,
        JSON.stringify({ username, password }),
        { 'Content-Type': 'application/json' }
    );

    return response.data.token;
}

async function createOrgSecret(token: string): Promise<string> {
    const graphqlUrl = getGraphQLUrl();

    const response = await httpsPost(
        graphqlUrl,
        CREATE_ORG_SECRET_MUTATION,
        {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
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
        const icpUrl = getICPUrl();
        const parsed = new URL(icpUrl);
        const port = parseInt(parsed.port || '9445', 10);
        const hostname = parsed.hostname;

        const ready = await waitForPort(hostname, port);
        if (!ready) {
            throw new Error(`ICP server not reachable at ${hostname}:${port}`);
        }

        const token = await getICPToken();
        const secret = await createOrgSecret(token);

        await storeICPSecret(projectPath, secret);
        writeSecretToConfigToml(projectPath, secret);

        return secret;
    } catch (error: any) {
        const message = error instanceof Error ? error.message : String(error);
        window.showWarningMessage(
            `Failed to provision ICP secret: ${message}. You can set it manually in Config.toml.`
        );
        return undefined;
    }
}
