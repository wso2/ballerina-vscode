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
import { FileIntegrationForm } from "./index";
import { renderWithRpc, createMockRpcClient } from "../../../../../test/test-utils";
import { propsFromFixture, FileIntegrationFixture } from "./FileIntegrationForm.fixtures";

import existingHandler from "./__fixtures__/existingHandler.json";
import newHandler from "./__fixtures__/newHandler.json";
import multiVariant from "./__fixtures__/multiVariantOnCreate.json";
import contentSchemaEdit from "./__fixtures__/contentSchemaEdit.json";
import postProcess from "./__fixtures__/postProcessActions.json";
import advancedParams from "./__fixtures__/advancedParams.json";

// The type-editor modal pulls in @wso2/type-editor; the form only renders it as a
// toggled-open modal, so stub it to a marker we can assert on when isOpen.
jest.mock("../../../../../components/EntryPointTypeCreator", () => ({
    EntryPointTypeCreator: (p: any) =>
        p.isOpen ? (
            <div data-testid="type-editor-open">
                <button onClick={() => p.onTypeCreate("Order")}>mock-create-type</button>
            </div>
        ) : null,
}));

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

const renderForm = (
    fixture: FileIntegrationFixture,
    overrides: Record<string, any> = {},
    rpcClient = createMockRpcClient()
) => {
    const props = propsFromFixture(fixture, overrides);
    const utils = renderWithRpc(<FileIntegrationForm {...props} />, rpcClient);
    return { ...utils, props };
};

/**
 * Clicks Save and, if a signature-change WarningPopup appears (edits that change the
 * generated signature trigger it), confirms via "Continue". Resolves once onSave fires.
 */
const saveAndConfirm = async (onSave: jest.Mock) => {
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => {
        const cont = screen.queryByText("Continue");
        if (cont) fireEvent.click(cont);
        expect(onSave).toHaveBeenCalled();
    });
};

const dataBindingParam = (model: any) => model.parameters.find((p: any) => p.kind === "DATA_BINDING");

describe("FileIntegrationForm - behavioral", () => {
    it("renders the existing-handler fixture with Save and Cancel", () => {
        renderForm(existingHandler);
        expect(screen.getByText("Save")).toBeInTheDocument();
        expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("calls onClose when Cancel is clicked", () => {
        const { props } = renderForm(existingHandler);
        fireEvent.click(screen.getByText("Cancel"));
        expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onSave with the function model when Save is clicked", async () => {
        const { props } = renderForm(existingHandler);
        fireEvent.click(screen.getByText("Save"));
        await waitFor(() => expect(props.onSave).toHaveBeenCalledTimes(1));
        const [savedModel, openDiagram] = (props.onSave as jest.Mock).mock.calls[0];
        expect(savedModel.name.value).toBe("onCreate");
        expect(openDiagram).toBe(false);
    });

    it("initializes in add mode from the first available variant (isNew)", () => {
        renderForm(newHandler);
        expect(screen.getByText("Save")).toBeInTheDocument();
    });

    it("shows a saving indicator while saving", () => {
        const { container } = renderForm(existingHandler, { isSaving: true });
        expect(screen.getByText("Saving...")).toBeInTheDocument();
        // The in-progress bar renders with a known id.
        expect(container.querySelector("#ftp-form-loading-bar")).toBeTruthy();
    });

    it("renders the info banner from metadata.notice", () => {
        const fm = clone(existingHandler.functionModel);
        (fm.metadata as any).notice = "Heads up: configure carefully";
        renderForm(existingHandler, { functionModel: fm });
        expect(screen.getByText("Heads up: configure carefully")).toBeInTheDocument();
    });

    it("wraps the content type in a stream when the stream toggle is enabled", async () => {
        const { props } = renderForm(multiVariant);
        fireEvent.click(screen.getByText("Stream the file content")); // checkbox label fires onChange
        await saveAndConfirm(props.onSave as jest.Mock);
        const [savedModel] = (props.onSave as jest.Mock).mock.calls[0];
        expect(dataBindingParam(savedModel).type.value).toMatch(/^stream</);
    });

    it("opens the type editor when 'Define Content Schema' is clicked", () => {
        const { container } = renderForm(multiVariant);
        // Click via the add icon (the LinkButton text + its tooltip both match the label).
        fireEvent.click(container.querySelector(".codicon-add")!);
        expect(screen.getByTestId("type-editor-open")).toBeInTheDocument();
    });

    it("applies a newly created content schema type to the binding param", async () => {
        const { container, props } = renderForm(multiVariant);
        fireEvent.click(container.querySelector(".codicon-add")!); // open type editor
        fireEvent.click(screen.getByText("mock-create-type")); // onTypeCreate("Order")
        await saveAndConfirm(props.onSave as jest.Mock);
        const [savedModel] = (props.onSave as jest.Mock).mock.calls[0];
        expect(dataBindingParam(savedModel).type.value).toMatch(/Order/);
    });

    it("cancelling the signature-change warning does not save", async () => {
        const { props } = renderForm(multiVariant);
        fireEvent.click(screen.getByText("Stream the file content")); // changes signature
        fireEvent.click(screen.getByText("Save"));
        // Warning popup is open; click its Cancel (the second "Cancel" in the tree).
        await waitFor(() => expect(screen.getByText("Continue")).toBeInTheDocument());
        const cancels = screen.getAllByText("Cancel");
        fireEvent.click(cancels[cancels.length - 1]);
        expect(props.onSave).not.toHaveBeenCalled();
        expect(screen.queryByText("Continue")).not.toBeInTheDocument();
    });

    it("opens the parameter editor when an existing content schema is edited", async () => {
        const rpc = createMockRpcClient();
        const { container } = renderForm(contentSchemaEdit, {}, rpc);
        const editIcon = container.querySelector(".codicon-edit");
        expect(editIcon).toBeTruthy();
        fireEvent.click(editIcon!);
        // ParamEditor resolves the project path on mount — proves it rendered.
        await waitFor(() => expect(rpc.__mocks.visualizer.joinProjectPath).toHaveBeenCalled());
    });

    it("resets the content schema to its placeholder when deleted", async () => {
        const { container, props } = renderForm(contentSchemaEdit);
        const trashIcon = container.querySelector(".codicon-trash");
        expect(trashIcon).toBeTruthy();
        fireEvent.click(trashIcon!);
        await saveAndConfirm(props.onSave as jest.Mock);
        const [savedModel] = (props.onSave as jest.Mock).mock.calls[0];
        // placeholder for this fixture's DATA_BINDING param is "anydata".
        expect(dataBindingParam(savedModel).type.value).toBe("anydata");
    });

    it("disables Save when a required post-process field is empty", () => {
        renderForm(postProcess); // moveTo active with empty required targetPath
        // When save is disabled the primary button surfaces the validation tooltip.
        expect(screen.getByText("Save").closest("vscode-button")).toHaveAttribute(
            "title",
            "Fix validation errors"
        );
    });

    it("toggling a post-process action off persists enabled:false on save", async () => {
        const { props } = renderForm(postProcess);
        fireEvent.click(screen.getByText("Move file after processing")); // disable the action
        await saveAndConfirm(props.onSave as jest.Mock);
        const [savedModel] = (props.onSave as jest.Mock).mock.calls[0];
        const moveTo = savedModel.properties.annotations.properties.postProcessAction.properties.moveTo;
        expect(moveTo.enabled).toBe(false);
    });

    it("expands the advanced parameters section and toggles a param on save", async () => {
        const { container, props } = renderForm(advancedParams);
        fireEvent.click(screen.getByText("Advanced Parameters")); // expand
        expect(container.querySelector(".codicon-chevron-down")).toBeTruthy();
        fireEvent.click(screen.getByText("Connection timeout")); // toggle the advanced param on
        await saveAndConfirm(props.onSave as jest.Mock);
        const [savedModel] = (props.onSave as jest.Mock).mock.calls[0];
        const advParam = savedModel.parameters.find((p: any) => p.advanced === true);
        expect(advParam.enabled).toBe(true);
    });

    it("blocks save when expression diagnostics report an error", async () => {
        const rpc = createMockRpcClient();
        rpc.__mocks.biDiagram.getExpressionDiagnostics.mockResolvedValue({
            diagnostics: [{ severity: 1, message: "invalid expression" }],
        });
        const filled = clone(postProcess);
        filled.functionModel.properties.annotations.properties.postProcessAction.properties.moveTo
            .choices[0].properties.targetPath.value = "/archive";
        const { props } = renderForm(filled, {}, rpc);
        // Typing-time diagnostics propagate and disable Save once they arrive.
        await waitFor(() =>
            expect(screen.getByText("Save").closest("vscode-button")).toHaveAttribute("disabled")
        );
        expect(props.onSave).not.toHaveBeenCalled();
    });
});
