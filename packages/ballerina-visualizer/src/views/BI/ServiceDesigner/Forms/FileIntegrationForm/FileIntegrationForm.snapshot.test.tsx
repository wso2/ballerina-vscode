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
import { FunctionModel, ServiceModel } from "@wso2/ballerina-core";
import { FileIntegrationForm, FileIntegrationFormProps } from "./index";
import { renderWithRpc } from "../../../../../test/test-utils";
import { buildSnapshot } from "../../../../../test/snapshot-utils";

import existingHandler from "./__fixtures__/existingHandler.json";
import newHandler from "./__fixtures__/newHandler.json";

const existingServiceModel = existingHandler.serviceModel as unknown as ServiceModel;
const existingFunctionModel = existingHandler.functionModel as unknown as FunctionModel;
const newServiceModel = newHandler.serviceModel as unknown as ServiceModel;

const buildProps = (overrides: Partial<FileIntegrationFormProps> = {}): FileIntegrationFormProps => ({
    model: existingServiceModel,
    functionModel: existingFunctionModel,
    isSaving: false,
    isNew: false,
    filePath: "/project/service.bal",
    selectedHandler: "onCreate",
    onSave: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
});

/**
 * Renders the form and returns an Emotion-normalized snapshot string. The
 * normalization makes these snapshots survive component extraction and Emotion
 * hash churn — only genuine structural changes alter the snapshot.
 */
const snapshotForm = (overrides: Partial<FileIntegrationFormProps> = {}): string => {
    const { container } = renderWithRpc(<FileIntegrationForm {...buildProps(overrides)} />);
    return buildSnapshot(container);
};

describe("FileIntegrationForm - snapshots", () => {
    it("renders the existing-handler fixture", () => {
        expect(snapshotForm()).toMatchSnapshot("existing-handler");
    });

    it("renders the new-handler fixture (isNew)", () => {
        expect(
            snapshotForm({ isNew: true, functionModel: undefined, model: newServiceModel })
        ).toMatchSnapshot("new-handler");
    });
});
