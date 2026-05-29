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
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { FunctionModel, ServiceModel } from "@wso2/ballerina-core";
import { FileIntegrationForm, FileIntegrationFormProps } from "./index";
import { renderWithRpc } from "../../../../../test/test-utils";

import existingHandler from "./__fixtures__/existingHandler.json";
import newHandler from "./__fixtures__/newHandler.json";

// JSON fixtures are intentionally loose; cast to the real interfaces at the boundary.
const existingServiceModel = existingHandler.serviceModel as unknown as ServiceModel;
const existingFunctionModel = existingHandler.functionModel as unknown as FunctionModel;
const newServiceModel = newHandler.serviceModel as unknown as ServiceModel;

/**
 * Builds default props for an edit-mode (existing handler) render. Pass overrides
 * to tweak individual cases. onSave/onClose are jest spies by default.
 */
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

const renderForm = (overrides: Partial<FileIntegrationFormProps> = {}) => {
    const props = buildProps(overrides);
    const utils = renderWithRpc(<FileIntegrationForm {...props} />);
    return { ...utils, props };
};

describe("FileIntegrationForm", () => {
    it("renders the existing-handler fixture with Save and Cancel buttons", () => {
        renderForm();

        expect(screen.getByText("Save")).toBeInTheDocument();
        expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("calls onClose when Cancel is clicked", () => {
        const onClose = jest.fn();
        renderForm({ onClose });

        fireEvent.click(screen.getByText("Cancel"));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onSave with the function model when Save is clicked", async () => {
        const onSave = jest.fn();
        renderForm({ onSave });

        fireEvent.click(screen.getByText("Save"));

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        // Edit mode passes (functionModel, isNew=false).
        const [savedModel, openDiagram] = onSave.mock.calls[0];
        expect(savedModel.name.value).toBe("onCreate");
        expect(openDiagram).toBe(false);
    });

    it("renders in add mode from the first available variant (isNew)", () => {
        renderForm({
            isNew: true,
            functionModel: undefined,
            model: newServiceModel,
        });

        // The form initializes from the non-enabled 'onCreate' variant; Save is available.
        expect(screen.getByText("Save")).toBeInTheDocument();
        expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
});
