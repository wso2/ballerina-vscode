import { workspace } from 'vscode';

export const ICP_DEFAULT_PORT = 9446;
export const ICP_DEFAULT_URL = `https://localhost:${ICP_DEFAULT_PORT}`;

export function getICPUrl(): string {
    return workspace.getConfiguration('ballerina').get<string>('icpUrl') || ICP_DEFAULT_URL;
}

export { activateICP, isICPServerRunning, ensureICPServerRunning } from './activator';
export { provisionICPSecret, getStoredICPSecret } from './setup';
