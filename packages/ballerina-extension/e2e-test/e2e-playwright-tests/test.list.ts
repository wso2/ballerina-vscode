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

/// <reference types="node" />

import { test } from '@playwright/test';
import { page, extensionsFolder, newProjectPath, zipProjectSnapshot } from './utils/helpers';
import { downloadExtensionFromMarketplace } from '@wso2/playwright-vscode-tester';
import fs from 'fs';
import path from 'path';
const videosFolder = path.join(__dirname, '..', 'test-resources', 'videos');
const VIDEO_SAVE_TIMEOUT_MS = Number(process.env.BI_E2E_VIDEO_SAVE_TIMEOUT_MS ?? 20000);
const PAGE_CLOSE_TIMEOUT_MS = Number(process.env.BI_E2E_PAGE_CLOSE_TIMEOUT_MS ?? 10000);

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
    return Promise.race([
        operation,
        new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
        }),
    ]);
}

import automation from './automation/automation.spec';
import automationRun from './automation-run/automation-run.spec';
import automationDebug from './automation-debug/automation-debug.spec';
import expressionEditor from './expression-editor/expression-editor.spec';

import httpService from './api-integration/http-service.spec';
import aiChatService from './api-integration/ai-chat-service.spec';
import graphqlService from './api-integration/graphql-service.spec';
import tcpService from './api-integration/tcp-service.spec';

import kafkaIntegration from './event-integration/kafka.spec';
import rabbitmqIntegration from './event-integration/rabbitmq.spec';
import mqttIntegration from './event-integration/mqtt.spec';
import azureIntegration from './event-integration/azure.spec';
import salesforceIntegration from './event-integration/salesforce.spec';
import twillioIntegration from './event-integration/twillio.spec';
import githubIntegration from './event-integration/github.spec';

import ftpIntegration from './file-integration/ftp.spec';
import directoryIntegration from './file-integration/directory.spec';

import functionArtifact from './other-artifacts/function.spec';
import naturalFunctionArtifact from './other-artifacts/np.spec';
import connectionArtifact from './other-artifacts/connection.spec';

import configuration from './configuration/configuration.spec';
import typeTest from './type-editor/type.spec';
import serviceTest from './service-designer/service-class.spec';

import importIntegration from './import-integration/import-integration.spec';

import reusableDataMapper from './data-mapper/reusable-data-mapper.spec';
import inlineDataMapper from './data-mapper/inline-data-mapper.spec';

import diagram from './diagram/diagram.spec';

import testFunction from './test-function/test-function.spec';

test.describe.configure({ mode: 'default' });

test.beforeAll(async () => {
    if (fs.existsSync(videosFolder)) {
        fs.rmSync(videosFolder, { recursive: true, force: true });
    }
    console.log('\n' + '='.repeat(80));
    console.log('🚀 STARTING BI EXTENSION E2E TEST SUITE');
    console.log('='.repeat(80) + '\n');

    // Download VSIX if flag is set
    if (process.env.DOWNLOAD_PRERELEASE === 'true') {
        console.log('📦 Downloading BI prerelease VSIXs ...');
        try {
            await downloadExtensionFromMarketplace('wso2.ballerina@prerelease', extensionsFolder);
            await downloadExtensionFromMarketplace('wso2.ballerina-integrator@prerelease', extensionsFolder);
            console.log('✅ BI prerelease VSIXs are ready!');
        } catch (error) {
            console.error('❌ Failed to download BI prerelease VSIXs:', error);
            throw error;
        }
    }
});

// <----Automation Test---->
test.describe(automation);

// // <----Automation Run/Debug Test---->
test.describe(automationRun);
test.describe(automationDebug);

// // <----Expression Editor Test---->
test.describe(expressionEditor);

// // <----AI Chat Service Test---->
test.describe(aiChatService);

// // <----Integration as API Test---->
test.describe(httpService);
test.describe(graphqlService);
test.describe(tcpService);

// <----Event Integration Test---->
test.describe(kafkaIntegration);
test.describe(rabbitmqIntegration);
test.describe(mqttIntegration);
test.describe(azureIntegration);
test.describe(salesforceIntegration);
test.describe(twillioIntegration);
test.describe(githubIntegration);

// <----File Integration Test---->
test.describe(ftpIntegration);
test.describe(directoryIntegration);

// <----Other Artifacts Test---->
test.describe(functionArtifact);
test.describe.skip(naturalFunctionArtifact); // TODO: Enable this once the ballerina version is switchable
test.describe(connectionArtifact);
test.describe(configuration);
test.describe(typeTest);
test.describe(serviceTest);

// <----Import Integration Test---->
test.describe.skip(importIntegration);

// <----Data Mapper Test---->
test.describe(reusableDataMapper);
test.describe.skip(inlineDataMapper); // Failing due to a issue

// <----Diagram Test---->
test.describe(diagram);

// <----Test Function Test---->
test.describe(testFunction);

test.afterAll(async () => {
    console.log('\n' + '='.repeat(80));
    console.log('✅ BI EXTENSION E2E TEST SUITE COMPLETED');
    console.log('='.repeat(80));

    const dateTime = new Date().toISOString().replace(/:/g, '-');
    console.log('💾 Saving test video...');
    try {
        const activePage = page?.page;
        if (activePage) {
            const video = activePage.video();
            await withTimeout(
                activePage.close(),
                PAGE_CLOSE_TIMEOUT_MS,
                `Page close timed out after ${PAGE_CLOSE_TIMEOUT_MS}ms`
            );
            if (video) {
                fs.mkdirSync(videosFolder, { recursive: true });
                const videoFilePath = path.join(videosFolder, `test_${dateTime}.webm`);
                await withTimeout(
                    video.saveAs(videoFilePath),
                    VIDEO_SAVE_TIMEOUT_MS,
                    `Video save timed out after ${VIDEO_SAVE_TIMEOUT_MS}ms`
                );
                console.log(`✅ Video saved successfully (${videoFilePath})`);
            } else {
                console.log('ℹ️  No video available to save');
            }
        } else {
            console.log('ℹ️  No active browser page found, skipping video save');
        }
    } catch (error) {
        console.warn('⚠️  Failed to save/close test video page, continuing cleanup...', error);
    }

    // Snapshot the project when the suite is interrupted (e.g. manually stopped)
    zipProjectSnapshot('suite_teardown');

    // Clean up the test project directory
    console.log('🧹 Cleaning up test project...');
    if (fs.existsSync(newProjectPath)) {
        try {
            fs.rmSync(newProjectPath, { recursive: true, force: true });
            console.log('✅ Test project cleaned up successfully\n');
        } catch (error) {
            console.error('❌ Failed to clean up test project:', error);
            console.log('⚠️  Test project cleanup failed, but continuing...\n');
        }
    } else {
        console.log('ℹ️  Test project directory does not exist, skipping cleanup\n');
    }
});
