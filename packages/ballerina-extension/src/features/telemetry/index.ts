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

import TelemetryReporter from "vscode-extension-telemetry";
import { BallerinaExtension } from "../../core";
import { getLoginMethod, getBiIntelId } from "../../utils/ai/auth";

const INSTRUMENTATION_KEY = process.env.CODE_SERVER_ENV && process.env.VSCODE_CHOREO_INSTRUMENTATION_KEY ? process.env.VSCODE_CHOREO_INSTRUMENTATION_KEY : process.env.APPINSIGHTS_INSTRUMENTATION_KEY;
const isWSO2User = process.env.VSCODE_CHOREO_USER_EMAIL ? process.env.VSCODE_CHOREO_USER_EMAIL.endsWith('@wso2.com') : false;
const isAnonymous = process.env.VSCODE_CHOREO_USER_EMAIL ? process.env.VSCODE_CHOREO_USER_EMAIL.endsWith('@choreo.dev') : false;
const CORRELATION_ID = process.env.VSCODE_CHOREO_CORRELATION_ID ? process.env.VSCODE_CHOREO_CORRELATION_ID : '';
const CHOREO_COMPONENT_ID = process.env.VSCODE_CHOREO_COMPONENT_ID ? process.env.VSCODE_CHOREO_COMPONENT_ID : '';
const CHOREO_PROJECT_ID = process.env.VSCODE_CHOREO_PROJECT_ID ? process.env.VSCODE_CHOREO_PROJECT_ID : '';
const CHOREO_ORG_ID = process.env.VSCODE_CHOREO_ORG_ID ? process.env.VSCODE_CHOREO_ORG_ID : '';

// Whitelist of component names
const WHITELISTED_COMPONENTS = new Set([
    'ballerina.ai.generation',
]);

// Whitelist of specific event names
const WHITELISTED_EVENTS = new Set([
    'editor-workspace-ballerina-extension-activate',
]);

export function shouldSendToAppInsights(eventName: string, componentName: string): boolean {
    return WHITELISTED_EVENTS.has(eventName) || WHITELISTED_COMPONENTS.has(componentName);
}

export function createTelemetryReporter(ext: BallerinaExtension): TelemetryReporter {
    const reporter = new TelemetryReporter(ext.getID(), ext.getVersion(), INSTRUMENTATION_KEY);
    if (ext.context) {
        ext.context.subscriptions.push(reporter);
    }
    return reporter;
}

export async function sendTelemetryEvent(extension: BallerinaExtension, eventName: string, componentName: string,
    customDimensions: { [key: string]: string; } = {}, measurements: { [key: string]: number; } = {}) {
    // temporarily disabled in codeserver due to GDPR issue
    if (extension.isTelemetryEnabled() && !extension.getCodeServerContext().codeServerEnv) {
        // Only send whitelisted AI telemetry events to Application Insights
        if (shouldSendToAppInsights(eventName, componentName)) {
            extension.telemetryReporter.sendTelemetryEvent(eventName, await getTelemetryProperties(extension, componentName,
                customDimensions), measurements);
        }
    }
}

export async function sendTelemetryException(extension: BallerinaExtension, error: Error, componentName: string,
    params: { [key: string]: string } = {}) {
    // temporarily disabled in codeserver due to GDPR issue
    if (extension.isTelemetryEnabled() && !extension.getCodeServerContext().codeServerEnv) {
        // Only send whitelisted AI telemetry exceptions to Application Insights
        if (shouldSendToAppInsights('', componentName)) {
            extension.telemetryReporter.sendTelemetryException(error, await getTelemetryProperties(extension, componentName,
                params));
        }
    }
}

export async function getTelemetryProperties(extension: BallerinaExtension, component: string, params: { [key: string]: string; } = {})
    : Promise<{ [key: string]: string; }> {

    const userType = await getLoginMethod();
    const biIntelId = await getBiIntelId();

    return {
        ...params,
        'ballerina.version': extension ? extension.ballerinaVersion : '',
        'scope': component,
        'idpId': process.env.VSCODE_CHOREO_USER_IDP_ID ? process.env.VSCODE_CHOREO_USER_IDP_ID : '',
        'isWSO2User': isWSO2User ? 'true' : 'false',
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        'AnonymousUser': isAnonymous ? 'true' : 'false',
        'correlationId': CORRELATION_ID,
        'component': CHOREO_COMPONENT_ID,
        'project': CHOREO_PROJECT_ID,
        'org': CHOREO_ORG_ID,
        'user.login_method': userType ?? '',
        'user.bi_intel_id': biIntelId ?? '',
    };
}

export function getMessageObject(message?: string): { [key: string]: string; } {
    if (message) {
        return { 'ballerina.message': message };
    }
    return {};
}

export * from "./events";
export * from "./exceptions";
export * from "./components";
export * from "./activator";
