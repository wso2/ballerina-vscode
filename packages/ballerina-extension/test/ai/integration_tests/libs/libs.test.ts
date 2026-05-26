// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import * as assert from "assert";
import { commands } from "vscode";
import { setupTestEnvironment } from "./setup";
import {
    VSCODE_COMMANDS,
    transformLibraryToGetFunctionResponse,
} from "./test-helpers";
import { GenerationType } from "../../../../src/features/ai/utils/libs/libraries";

suite("Library Integration Tests", () => {
    suiteSetup(async function (): Promise<void> {
        this.timeout(120000); // 2 minutes timeout for setup and extension activation
        console.log("🔧 Setting up test environment...");
        try {
            await setupTestEnvironment();
            console.log("✓ Test environment setup completed");
        } catch (error) {
            console.error("❌ Setup failed:", error);
            throw error;
        }
    });

    suite("getAllLibraries", () => {
        test("should return array of libraries for CODE_GENERATION", async function () {
            this.timeout(10000);
            console.log("\n📝 Running test: getAllLibraries for CODE_GENERATION");
            try {
                const libraries = await commands.executeCommand(
                    VSCODE_COMMANDS.GET_ALL_LIBRARIES,
                    GenerationType.CODE_GENERATION
                ) as any[];
                console.log(`✓ Received ${libraries.length} libraries`);

                assert.ok(Array.isArray(libraries), "Should return an array");
                assert.ok(libraries.length > 0, "Should return at least one library");
                // validateLibraryListStructure(libraries);
                console.log("✓ Test passed: CODE_GENERATION libraries validated");
            } catch (error) {
                console.error("❌ Test failed:", error);
                throw error;
            }
        });
    });

    suite("toMaximizedLibrariesFromLibJson", () => {
        test("should maximize all libraries from library JSON", async function () {
            this.timeout(30000);
            console.log("\n📝 Running test: toMaximizedLibrariesFromLibJson with all libraries");
            try {
                // Step 1: Get all libraries to get their names
                console.log("Step 1: Getting all library names...");
                const allLibraries = await commands.executeCommand(
                    VSCODE_COMMANDS.GET_ALL_LIBRARIES,
                    GenerationType.CODE_GENERATION
                ) as any[];
                console.log(`✓ Found ${allLibraries.length} libraries`);

                // Step 2: Get maximized libraries for all library names
                console.log("Step 2: Getting maximized libraries...");
                const libNames = allLibraries.map((lib: any) => lib.name);
                const maximizedLibs = await commands.executeCommand(
                    VSCODE_COMMANDS.GET_MAXIMIZED_SELECTED_LIBS,
                    libNames,
                    GenerationType.CODE_GENERATION
                ) as any[];
                console.log(`✓ Received ${maximizedLibs.length} maximized libraries`);

                // Step 3: Transform libraries to GetFunctionResponse format
                console.log("Step 3: Transforming libraries to GetFunctionResponse format...");
                const functionList = maximizedLibs.map((lib: any) =>
                    transformLibraryToGetFunctionResponse(lib)
                );
                console.log(`✓ Transformed ${functionList.length} libraries`);

                // Step 4: Call toMaximizedLibrariesFromLibJson
                console.log("Step 4: Calling toMaximizedLibrariesFromLibJson...");
                const result = await commands.executeCommand(
                    VSCODE_COMMANDS.TO_MAXIMIZED_LIBRARIES_FROM_LIB_JSON,
                    functionList,
                    maximizedLibs
                ) as any[];
                console.log(`✓ Received ${result.length} maximized libraries from function`);

                // Step 5: Validate results
                console.log("Step 5: Validating results...");
                assert.ok(Array.isArray(result), "Should return an array");
                assert.ok(result.length > 0, "Should return at least one library");

                console.log("✓ Test passed: All libraries successfully maximized");
            } catch (error) {
                console.error("❌ Test failed:", error);
                throw error;
            }
        });
    });
});
