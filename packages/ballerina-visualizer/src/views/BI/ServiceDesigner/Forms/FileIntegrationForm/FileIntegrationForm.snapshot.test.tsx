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
import fs from "fs";
import path from "path";
import { FileIntegrationForm } from "./index";
import { renderWithRpc, propsFromFixture, FileIntegrationFixture } from "../../../../../test/test-utils";
import { buildSnapshot } from "../../../../../test/snapshot-utils";

/**
 * Snapshot cases are GENERATED from fixtures: every *.json in __fixtures__/ produces
 * one Emotion-normalized snapshot. To add a snapshot, drop a fixture file and run
 * `pnpm test:updateSnapshots` — no test code to write. The normalization makes these
 * survive component extraction and Emotion hash churn (only real structural changes
 * alter the snapshot).
 */
const fixturesDir = path.join(__dirname, "__fixtures__");
const fixtures: { file: string; data: FileIntegrationFixture }[] = fs
    .readdirSync(fixturesDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => ({ file, data: require(path.join(fixturesDir, file)) as FileIntegrationFixture }));

describe("FileIntegrationForm - snapshots", () => {
    it.each(fixtures)("renders fixture $file", ({ file, data }) => {
        const { container } = renderWithRpc(<FileIntegrationForm {...propsFromFixture(data)} />);
        expect(buildSnapshot(container)).toMatchSnapshot(data.name ?? file);
    });
});
