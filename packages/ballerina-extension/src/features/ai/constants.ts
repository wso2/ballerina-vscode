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

export const CONFIG_FILE_NAME = "Config.toml";
export const CONFIGURE_DEFAULT_MODEL_COMMAND = "ballerina.configureWso2DefaultModelProvider";

/**
 * @deprecated Use {@link openAIPanelWithPrompt} from `views/ai-panel/aiMachine.ts` instead for type-safe command execution.
 * This constant is kept for backward compatibility.
 */
export const OPEN_AI_PANEL_COMMAND = "ballerina.open.ai.panel";
export const CLOSE_AI_PANEL_COMMAND = "ballerina.close.ai.panel";
export const SIGN_IN_BI_COPILOT = "Sign in to BI Copilot";
export const PROGRESS_BAR_MESSAGE_FROM_WSO2_DEFAULT_MODEL = "Fetching and saving access token for WSO2 default model provider.";
export const ERROR_NO_BALLERINA_SOURCES = "No Ballerina sources";
export const LOGIN_REQUIRED_WARNING = "Please sign in to BI Copilot to use this feature.";
export const LOGIN_REQUIRED_WARNING_FOR_DEFAULT_MODEL = "Please sign in to BI Copilot to configure the WSO2 default model provider.";
export const DEFAULT_PROVIDER_ADDED = "WSO2 default model provider configuration values were added to the Config.toml file.";

// Datamapper Constants
// Primitive data types supported by the datamapper
export enum PrimitiveType {
  STRING = "string",
  INT = "int",
  FLOAT = "float",
  DECIMAL = "decimal",
  BOOLEAN = "boolean"
}

// Nullable primitive data types
export enum NullablePrimitiveType {
  STRING = "string?",
  INT = "int?",
  FLOAT = "float?",
  DECIMAL = "decimal?",
  BOOLEAN = "boolean?"
}

// Array types for primitive data types
export enum PrimitiveArrayType {
  // Basic array types
  STRING_ARRAY = "string[]",
  STRING_ARRAY_NULLABLE = "string[]?",
  INT_ARRAY = "int[]",
  INT_ARRAY_NULLABLE = "int[]?",
  FLOAT_ARRAY = "float[]",
  FLOAT_ARRAY_NULLABLE = "float[]?",
  DECIMAL_ARRAY = "decimal[]",
  DECIMAL_ARRAY_NULLABLE = "decimal[]?",
  BOOLEAN_ARRAY = "boolean[]",
  BOOLEAN_ARRAY_NULLABLE = "boolean[]?",
  
  // Arrays with nullable elements
  STRING_OR_NULL_ARRAY = "string?[]",
  STRING_OR_NULL_ARRAY_NULLABLE = "string?[]?",
  INT_OR_NULL_ARRAY = "int?[]",
  INT_OR_NULL_ARRAY_NULLABLE = "int?[]?",
  FLOAT_OR_NULL_ARRAY = "float?[]",
  FLOAT_OR_NULL_ARRAY_NULLABLE = "float?[]?",
  DECIMAL_OR_NULL_ARRAY = "decimal?[]",
  DECIMAL_OR_NULL_ARRAY_NULLABLE = "decimal?[]?",
  BOOLEAN_OR_NULL_ARRAY = "boolean?[]",
  BOOLEAN_OR_NULL_ARRAY_NULLABLE = "boolean?[]?"
}
