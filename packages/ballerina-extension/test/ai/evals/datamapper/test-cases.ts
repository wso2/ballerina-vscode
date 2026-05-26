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

const PROJECT_ROOT = path.resolve(__dirname, PATHS.PROJECT_ROOT_RELATIVE);

/**
 * Test cases for datamapper code generation
 */
export const testCases: TestCase[] = [
    {
        name: "Person to Student mapping",
        resourcePath: path.join(PROJECT_ROOT, "case1"),
        expectedFunctionName: "transform",
    },
    {
        name: "Employee to EmployeeInfo mapping",
        resourcePath: path.join(PROJECT_ROOT, "case2"),
        expectedFunctionName: "transform",
    },
    {
        name: "Student to PersonalProfile mapping",
        resourcePath: path.join(PROJECT_ROOT, "case3"),
        expectedFunctionName: "transform",
    }
];
