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

import React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { Context } from "@wso2/ballerina-rpc-client";

/**
 * A minimal fake `rpcClient` for rendering visualizer components without a real
 * VS Code / language-server backend.
 *
 * It implements only the RPC surface that the component-under-test (and its
 * children) actually reach. All methods are `jest.fn()`s resolving canned,
 * empty-but-valid responses, so components render and their save/validation
 * paths run without hitting the backend. Override individual stubs per test
 * (e.g. make `getExpressionDiagnostics` return a severity-1 diagnostic) to
 * characterize error/edge paths.
 *
 * Phase 2: these canned values can be swapped for real responses captured from
 * `ballerina-language-server` without changing the wiring here.
 */
export function createMockRpcClient() {
    const biDiagram = {
        // Used by TextExpressionField's expression editor for token highlighting.
        getExpressionTokens: jest.fn().mockResolvedValue({ tokens: [] }),
        // Save-time revalidation reads `response.diagnostics`; empty => save not blocked.
        getExpressionDiagnostics: jest.fn().mockResolvedValue({ diagnostics: [] }),
        // Completions handler iterates the response array; empty => no suggestions.
        getExpressionCompletions: jest.fn().mockResolvedValue([]),
        // Used by ParamEditor when adding a new content-schema type.
        getEndOfFile: jest.fn().mockResolvedValue({ line: 0, offset: 0 }),
    };

    const visualizer = {
        joinProjectPath: jest.fn().mockResolvedValue({ path: "/project/main.bal" }),
    };

    const rpcClient = {
        getBIDiagramRpcClient: () => biDiagram,
        getVisualizerRpcClient: () => visualizer,
        // Exposed so tests can assert on / override the underlying spies.
        __mocks: { biDiagram, visualizer },
    };

    return rpcClient as any;
}

/**
 * Self-describing FileIntegrationForm fixture envelope. Hand-authored in Phase 1;
 * swappable with captured language-server responses later. `model` is the
 * ServiceModel; `serviceModel` is accepted as a legacy alias.
 */
export interface FileIntegrationFixture {
    name?: string;
    isNew?: boolean;
    selectedHandler?: string;
    filePath?: string;
    model?: any;
    serviceModel?: any;
    functionModel?: any;
}

/**
 * Maps a fixture envelope to FileIntegrationForm props, with `onSave`/`onClose`
 * as jest spies and optional per-test overrides. Used by both the snapshot
 * (auto-discovery) and behavioral test files so the mapping lives in one place.
 */
export function propsFromFixture(fx: FileIntegrationFixture, overrides: Record<string, any> = {}) {
    return {
        model: fx.model ?? fx.serviceModel,
        functionModel: fx.functionModel,
        isNew: fx.isNew ?? false,
        selectedHandler: fx.selectedHandler,
        filePath: fx.filePath ?? "/project/service.bal",
        isSaving: false,
        onSave: jest.fn(),
        onClose: jest.fn(),
        ...overrides,
    };
}

/**
 * Renders `ui` inside the real (exported) RPC `Context.Provider` with a fake
 * rpcClient, so components that call `useRpcContext()` work in jsdom tests.
 *
 * Returns the testing-library result plus the `rpcClient` used, so tests can
 * assert against `rpcClient.__mocks.*` spies.
 */
export function renderWithRpc(
    ui: React.ReactElement,
    rpcClient = createMockRpcClient(),
    options?: Omit<RenderOptions, "wrapper">
) {
    const result = render(
        <Context.Provider value={{ rpcClient }}>{ui}</Context.Provider>,
        options
    );
    return { ...result, rpcClient };
}
