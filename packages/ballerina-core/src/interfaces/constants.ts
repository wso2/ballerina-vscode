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

export enum SHARED_COMMANDS {
    FORCE_UPDATE_PROJECT_ARTIFACTS = 'ballerina.force.update.artifacts',
    SHOW_VISUALIZER = 'ballerina.show.visualizer',
    GET_STATE_CONTEXT = 'ballerina.get.stateContext',
    OPEN_BI_WELCOME = 'ballerina.open.bi.welcome',
    OPEN_BI_NEW_PROJECT = 'ballerina.open.bi.new',
    OPEN_SERVICE_FORM = 'ballerina.open.service.form',
    OPEN_AI_PANEL = 'ballerina.open.ai.panel',
    CLOSE_AI_PANEL = 'ballerina.close.ai.panel',
    OPEN_AGENT_CHAT = 'ballerina.open.agent.chat'
}

export const BI_COMMANDS = {
    BI_RUN_PROJECT: 'BI.project.run',
    BI_DEBUG_PROJECT: 'BI.project.debug',
    REFRESH_COMMAND: 'BI.project-explorer.refresh',
    FOCUS_PROJECT_EXPLORER: 'BI.project-explorer.focus',
    PROJECT_EXPLORER: 'BI.project-explorer',
    ADD_CONNECTIONS: 'BI.project-explorer.add-connection',
    DELETE_COMPONENT: 'BI.project-explorer.delete',
    ADD_ENTRY_POINT: 'BI.project-explorer.add-entry-point',
    ADD_TYPE: 'BI.project-explorer.add-type',
    VIEW_TYPE_DIAGRAM: 'BI.project-explorer.view-type-diagram',
    ADD_FUNCTION: 'BI.project-explorer.add-function',
    OPEN_TYPE_DIAGRAM: 'BI.view.typeDiagram',
    ADD_CONFIGURATION: 'BI.project-explorer.add-configuration',
    ADD_PROJECT: 'BI.project-explorer.add',
    SHOW_OVERVIEW: 'BI.project-explorer.overview',
    SWITCH_PROJECT: 'BI.project-explorer.switch-project',
    ADD_DATA_MAPPER: 'BI.project-explorer.add-data-mapper',
    BI_EDIT_TEST_FUNCTION: 'BI.test.edit.function',
    BI_ADD_TEST_FUNCTION: 'BI.test.add.function',
    BI_EDIT_TEST_FUNCTION_DEF: 'BI.test.edit.function.def',
    ADD_NATURAL_FUNCTION: 'BI.project-explorer.add-natural-function',
};
