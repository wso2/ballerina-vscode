/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

export enum Command {
    Code = '/code',
    Tests = '/tests',
    DataMap = '/datamap',
    TypeCreator = '/typecreator',
    Healthcare = '/healthcare',
    Ask = '/ask',
    NaturalProgramming = '/natural-programming (experimental)',
    OpenAPI = '/openapi',
}

export enum TemplateId {
    // Shared
    Wildcard = 'wildcard',

    // Command.Code
    GenerateCode = 'generate-code',
    GenerateFromReadme = 'generate-from-readme',

    // Command.Tests
    TestsForService = 'tests-for-service',
    TestsForFunction = 'tests-for-function',

    // Command.DataMap
    MappingsForRecords = 'mappings-for-records',
    MappingsForFunction = 'mappings-for-function',

    // Command.TypeCreator
    TypesForAttached = 'types-for-attached',

    // Command.NaturalProgramming
    CodeDocDriftCheck = 'code-doc-drift-check',
    GenerateCodeFromRequirements = 'generate-code-from-requirements',
    GenerateTestFromRequirements = 'generate-test-from-requirements',
    GenerateCodeFromFollowingRequirements = 'generate-code-from-following-requirements',
}
