/*
 *  Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com)
 *
 *  WSO2 LLC. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 */

package io.ballerina.flowmodelgenerator.extension.request;

/**
 * A request to add an agent chat service to the user's project.
 *
 * @param filePath          path to a .bal file in the source project
 * @param agentVariableName name of the agent module-level variable
 * @param serviceName       user-chosen name for the service path segment (defaults to agentVariableName if null)
 * @since 1.7.0
 */
public record AddAgentChatServiceRequest(String filePath, String agentVariableName, String serviceName) {
}
