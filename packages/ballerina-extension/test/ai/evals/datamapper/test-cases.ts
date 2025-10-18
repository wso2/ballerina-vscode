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

import * as path from "path";
import { TestCase } from "./types";
import { PATHS } from "./utils/constants";

const RESOURCES_DIR = path.resolve(__dirname, PATHS.RESOURCES_DIR_RELATIVE);

/**
 * Test cases for datamapper code generation
 */
export const testCases: TestCase[] = [
    {
        name: "Person to Student mapping",
        resourcePath: path.join(RESOURCES_DIR, "case1"),
        schemaPath: path.join(RESOURCES_DIR, "case1", "schema.json"),
        expectedFunctionName: "transform",
    },
    {
        name: "Employee to EmployeeProfile with arrays",
        resourcePath: path.join(RESOURCES_DIR, "case2"),
        schemaPath: path.join(RESOURCES_DIR, "case2", "schema.json"),
        expectedFunctionName: "transformEmployee",
    },
    {
        name: "Customer with nested records to CustomerInfo",
        resourcePath: path.join(RESOURCES_DIR, "case3"),
        schemaPath: path.join(RESOURCES_DIR, "case3", "schema.json"),
        expectedFunctionName: "transformCustomer",
    },
    {
        name: "Product with optional fields and type conversion",
        resourcePath: path.join(RESOURCES_DIR, "case4"),
        schemaPath: path.join(RESOURCES_DIR, "case4", "schema.json"),
        expectedFunctionName: "transformProduct",
    },
    {
        name: "Multiple inputs - PersonalInfo and ContactInfo to UserAccount",
        resourcePath: path.join(RESOURCES_DIR, "case5"),
        schemaPath: path.join(RESOURCES_DIR, "case5", "schema.json"),
        expectedFunctionName: "createUserAccount",
    },
];
