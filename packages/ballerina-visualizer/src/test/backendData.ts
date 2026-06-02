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

import fs from "fs";
import path from "path";

/**
 * Single source of truth for FileIntegrationForm test data: the language-server
 * service-model-generator test resources. Instead of hand-authoring frontend
 * fixtures, we read the SAME JSON cases the backend (`GetServiceModelFromSourceTest`,
 * `UpdateFunctionTest`, `AddFunctionTest`) asserts against. This keeps the form
 * tests and the LS codegen tests anchored to one ground truth for the FTP
 * integration, so a divergence in either surfaces immediately.
 *
 * Resolved relative to this file: src/test -> (../../../) packages -> sibling
 * ballerina-language-server package. Read at runtime via fs (not a static import)
 * because the resources live outside this package's tsconfig rootDir.
 */
const BACKEND_RESOURCES = path.resolve(
    __dirname,
    "../../../",
    "ballerina-language-server/service-model-generator/modules/service-model-generator-ls-extension/src/test/resources"
);

export function backendResourcesAvailable(): boolean {
    return fs.existsSync(BACKEND_RESOURCES);
}

function readJson(relPath: string): any {
    const full = path.join(BACKEND_RESOURCES, relPath);
    if (!fs.existsSync(full)) {
        throw new Error(
            `Backend LS test resource not found: ${full}\n` +
            `These frontend tests read the ballerina-language-server service-model-generator ` +
            `test resources directly. Ensure that package is checked out alongside ballerina-visualizer.`
        );
    }
    return JSON.parse(fs.readFileSync(full, "utf-8"));
}

/**
 * The FTP ServiceModel as returned by `getServiceFromSource` (the model the form
 * receives as its `model` prop, and whose `functions[]` are the base handlers the
 * form edits). Sourced from get_sm_from_source/config/ftp_service_model.json,
 * which the backend keeps in sync with the LS via its auto-updating assertion.
 */
export function loadFtpServiceModel(): any {
    return readJson("get_sm_from_source/config/ftp_service_model.json").response;
}

/** Find a handler in a ServiceModel by its `name.value` (e.g. "onFileJson"). */
export function ftpHandler(serviceModel: any, nameValue: string): any {
    const fn = (serviceModel.functions || []).find((f: any) => f?.name?.value === nameValue);
    if (!fn) {
        const names = (serviceModel.functions || []).map((f: any) => f?.name?.value).join(", ");
        throw new Error(`FTP handler '${nameValue}' not found in service model. Available: ${names}`);
    }
    return fn;
}

/**
 * A function-level backend case (update_function / add_function). `function` is
 * the handler model the LS consumes (== what the form's onSave should produce);
 * `output` is the expected source TextEdits the backend asserts.
 */
export interface BackendFnCase {
    file: string;
    description: string;
    filePath: string;
    function: any;
    output: Record<string, any[]>;
}

/** Load all FTP cases from a function-level category, sorted by filename. */
export function loadFnCases(
    category: "update_function" | "add_function",
    prefix = "ftp",
): BackendFnCase[] {
    const dir = path.join(BACKEND_RESOURCES, category, "config");
    return fs
        .readdirSync(dir)
        .filter((f) => f.includes(prefix) && f.endsWith(".json"))
        .sort()
        .map((file) => {
            const d = readJson(`${category}/config/${file}`);
            return {
                file,
                description: d.description ?? "",
                filePath: d.filePath,
                function: d.function,
                output: d.output ?? {},
            };
        });
}

/** Convenience: load a single function-level case by filename (without extension allowed). */
export function loadFnCase(
    category: "update_function" | "add_function",
    fileName: string,
): BackendFnCase {
    const file = fileName.endsWith(".json") ? fileName : `${fileName}.json`;
    const d = readJson(`${category}/config/${file}`);
    return { file, description: d.description ?? "", filePath: d.filePath, function: d.function, output: d.output ?? {} };
}

/** Load a ServiceModel from any get_sm_from_source config by filename. */
export function loadServiceModel(fileName: string): any {
    const file = fileName.endsWith(".json") ? fileName : `${fileName}.json`;
    return readJson(`get_sm_from_source/config/${file}`).response;
}

/**
 * Inventory every FTP-related config JSON across the service-model-generator test
 * categories, used by the coverage report to show which backend cases the frontend
 * exercises and which it does not. "FTP-related" = filename contains "ftp".
 */
export function inventoryFtpCases(): Record<string, string[]> {
    const categories = fs
        .readdirSync(BACKEND_RESOURCES, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

    const inventory: Record<string, string[]> = {};
    for (const cat of categories) {
        const dir = path.join(BACKEND_RESOURCES, cat, "config");
        if (!fs.existsSync(dir)) continue;
        const ftp = fs
            .readdirSync(dir)
            .filter((f) => f.endsWith(".json") && f.toLowerCase().includes("ftp"))
            .sort();
        if (ftp.length > 0) inventory[cat] = ftp;
    }
    return inventory;
}
