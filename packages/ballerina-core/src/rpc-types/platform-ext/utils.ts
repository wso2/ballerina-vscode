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

import { DevantScopes } from "@wso2/wso2-platform-core";

const INTEGRATION_API_MODULES = ["http", "graphql", "tcp"];
const EVENT_INTEGRATION_MODULES = ["kafka", "rabbitmq", "salesforce", "trigger.github", "mqtt", "asb"];
const FILE_INTEGRATION_MODULES = ["ftp", "file"];
const AI_AGENT_MODULE = "ai";

export function findDevantScopeByModule(moduleName: string): DevantScopes | undefined {
    if (AI_AGENT_MODULE === moduleName) {
        return DevantScopes.AI_AGENT;
    } else if (INTEGRATION_API_MODULES.includes(moduleName)) {
        return DevantScopes.INTEGRATION_AS_API;
    } else if (EVENT_INTEGRATION_MODULES.includes(moduleName)) {
        return DevantScopes.EVENT_INTEGRATION;
    } else if (FILE_INTEGRATION_MODULES.includes(moduleName)) {
        return DevantScopes.FILE_INTEGRATION;
    }
}