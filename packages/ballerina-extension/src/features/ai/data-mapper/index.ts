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

// Main entry points for data-mapper
export * from './orchestrator';
export * from './types';
export * from './schema';
export * from './context-api';
export * from './constants';

// Export utilities from focused modules
export * from './utils/type-utils';
export * from './utils/temp-project';
export * from './utils/code-generation';
export * from './utils/model';
export * from './utils/model-optimization';
export * from './utils/extraction';
export * from './utils/repair';
export * from './utils/inline-mappings';
export * from './utils/types-generation';
export * from './utils/mapping-context';
