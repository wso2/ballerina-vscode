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

import React from 'react';
import { prettyDOM, waitFor } from "@testing-library/dom";
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CDModel } from '@wso2/ballerina-core';
import { Diagram } from '../components/Diagram';

// Import sample data
import model1 from '../stories/1-empty.json';
import model2 from '../stories/2-only-automation.json';
import model3 from '../stories/3-simple-service.json';
import model4 from '../stories/4-multiple-services.json';
import model5 from '../stories/5-connection-complex.json';
import model6 from '../stories/6-ai-agent-complex.json';
import model7 from '../stories/7-graphql-complex.json';
import model8 from '../stories/8-multiple-connections-complex.json';

// Helper function to convert sample data to CDModel format
function convertToCDModel(sampleData: any): CDModel {
    return {
        automation: sampleData.automation ? {
            ...sampleData.automation,
            connections: sampleData.automation.connections || []
        } : undefined,
        connections: sampleData.connections?.map((conn: any) => ({
            symbol: conn.symbol || conn.name,
            uuid: conn.uuid || conn.id,
            scope: conn.scope || 'GLOBAL',
            location: conn.location || {
                filePath: '',
                startLine: { line: 0, offset: 0 },
                endLine: { line: 0, offset: 0 }
            }
        })) || [],
        listeners: sampleData.listeners?.map((listener: any) => ({
            name: listener.name,
            displayName: listener.displayName || listener.name,
            type: listener.type || 'http:Listener',
            uuid: listener.uuid,
            attachedServices: listener.attachedServices || [],
            location: listener.location || {
                filePath: '',
                startLine: { line: 0, offset: 0 },
                endLine: { line: 0, offset: 0 }
            }
        })) || [],
        services: sampleData.services?.map((service: any) => ({
            name: service.name,
            displayName: service.displayName || service.name,
            type: service.type || 'http:Service',
            uuid: service.uuid,
            remoteFunctions: service.remoteFunctions || [],
            resourceFunctions: service.resourceFunctions || [],
            location: service.location || {
                filePath: '',
                startLine: { line: 0, offset: 0 },
                endLine: { line: 0, offset: 0 }
            }
        })) || []
    };
}

async function renderAndCheckSnapshot(model: CDModel, testName: string) {
    const mockProps = {
        onListenerSelect: jest.fn(),
        onServiceSelect: jest.fn(),
        onConnectionSelect: jest.fn(),
        onAutomationSelect: jest.fn(),
        onDiagramClick: jest.fn(),
        onZoomToFit: jest.fn(),
        onFunctionSelect: jest.fn(),
        onDeleteComponent: jest.fn(),
    };

    const dom = render(
        <Diagram project={model} {...mockProps} />
    );

    // Wait for diagram to render (like mi-diagram does)
    await waitFor(() => {
        const diagramElements = dom.container.querySelectorAll('[class*="diagram"], svg, canvas');
        expect(diagramElements.length).toBeGreaterThan(0);
    }, { timeout: 10000 });

    const prettyDom = prettyDOM(dom.container, 1000000, {
        highlight: false,
        filterNode(node) {
            return true;
        },
    });

    expect(prettyDom).toBeTruthy();

    // Sanitization: remove dynamic IDs and non-deterministic attributes
    const sanitizedDom = (prettyDom as string)
        .replaceAll(/\s+(marker-end|id|data-linkid|data-nodeid|appearance|aria-label|current-value)="[^"]*"/g, '')
        // Normalize emotion CSS class hashes (css-xxxxx) to stable placeholder
        .replaceAll(/\bcss-[a-z0-9]+/g, 'css-HASH')
        // Collapse duplicate css-HASH entries in class attributes
        .replaceAll(/\b(css-HASH)(\s+css-HASH)+\b/g, 'css-HASH')
        .replaceAll(/<vscode-button\s+>/g, '<vscode-button>');
    expect(sanitizedDom).toMatchSnapshot(testName);
}

describe('Component Diagram - Snapshot Tests', () => {
    test('renders empty project correctly', async () => {
        const cdModel = convertToCDModel(model1);
        await renderAndCheckSnapshot(cdModel, 'empty-project');
    }, 15000);

    test('renders only automation correctly', async () => {
        const cdModel = convertToCDModel(model2);
        await renderAndCheckSnapshot(cdModel, 'only-automation');
    }, 15000);

    test('renders simple service correctly', async () => {
        const cdModel = convertToCDModel(model3);
        await renderAndCheckSnapshot(cdModel, 'simple-service');
    }, 15000);

    test('renders multiple services correctly', async () => {
        const cdModel = convertToCDModel(model4);
        await renderAndCheckSnapshot(cdModel, 'multiple-services');
    }, 15000);

    test('renders connections complex correctly', async () => {
        const cdModel = convertToCDModel(model5);
        await renderAndCheckSnapshot(cdModel, 'connections-complex');
    }, 15000);

    test('renders ai agent complex correctly', async () => {
        const cdModel = convertToCDModel(model6);
        await renderAndCheckSnapshot(cdModel, 'ai-agent-complex');
    }, 15000);

    test('renders graphql complex correctly', async () => {
        const cdModel = convertToCDModel(model7);
        await renderAndCheckSnapshot(cdModel, 'graphql-complex');
    }, 15000);

    test('renders multiple connections complex correctly', async () => {
        const cdModel = convertToCDModel(model8);
        await renderAndCheckSnapshot(cdModel, 'multiple-connections-complex');
    }, 15000);
});
