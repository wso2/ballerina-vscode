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
import { FileIntegrationForm } from "./index";
import { renderWithRpc } from "../../../../../test/test-utils";
import { propsFromFixture } from "./FileIntegrationForm.fixtures";
import { buildSnapshot } from "../../../../../test/snapshot-utils";
import { loadServiceModel } from "../../../../../test/backendData";

/**
 * Snapshot cases are GENERATED from the language-server's FTP `getServiceFromSource`
 * responses (get_sm_from_source/config/ftp_service_model*.json) — the RESPONSE side
 * the form renders, i.e. the real handler models the form receives as props in
 * production. No hand-authored fixtures. Each handler in each service model produces
 * one Emotion-normalized snapshot, so a structural change in the LS response (or the
 * form's rendering of it) surfaces here. See ../../../../../test/backendData.
 */
const SERVICE_MODEL_FILES = ["ftp_service_model.json", "ftp_service_model_deprecated.json"];

const cases = SERVICE_MODEL_FILES.flatMap((file) => {
    const serviceModel = loadServiceModel(file);
    return (serviceModel.functions || []).map((fn: any, i: number) => ({
        name: `${file.replace(/\.json$/, "")}__${fn?.name?.value ?? "handler"}__${i}`,
        model: serviceModel,
        functionModel: fn,
        isNew: false,
    }));
});

describe("FileIntegrationForm - snapshots (from LS getServiceFromSource responses)", () => {
    it.each(cases)("renders $name", ({ name, ...fixture }) => {
        const { container } = renderWithRpc(<FileIntegrationForm {...propsFromFixture(fixture)} />);
        expect(buildSnapshot(container)).toMatchSnapshot(name);
    });
});
