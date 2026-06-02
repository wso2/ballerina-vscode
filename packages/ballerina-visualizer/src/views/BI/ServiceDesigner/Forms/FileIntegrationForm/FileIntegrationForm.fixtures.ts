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
