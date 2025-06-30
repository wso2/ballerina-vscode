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

/* Ballerina notebook extension */
export const BAL_NOTEBOOK = ".balnotebook";

/* Notebook type */
export const NOTEBOOK_TYPE = "ballerina-notebook";

/* Notebook cell scheme */
export const NOTEBOOK_CELL_SCHEME = 'vscode-notebook-cell';

/* Available mime type to render */
export const MIME_TYPE_TABLE = "ballerina-notebook/table-view";
export const MIME_TYPE_JSON = "ballerina-notebook/json-view";
export const MIME_TYPE_XML = "ballerina-notebook/xml-view";
export const CUSTOM_DESIGNED_MIME_TYPES = [
    MIME_TYPE_TABLE,
    MIME_TYPE_JSON,
    MIME_TYPE_XML
];

/* Commands for notebook*/
export const RESTART_NOTEBOOK_COMMAND = "ballerina.notebook.restartNotebook";
export const OPEN_OUTLINE_VIEW_COMMAND = "ballerina.notebook.openOutlineView";
export const OPEN_VARIABLE_VIEW_COMMAND = "ballerina.notebook.openVariableView";
export const UPDATE_VARIABLE_VIEW_COMMAND = "ballerina.notebook.refreshVariableView";
export const CREATE_NOTEBOOK_COMMAND = "ballerina.notebook.createNotebook";
export const DEBUG_NOTEBOOK_COMMAND = "ballerina.notebook.debug";
