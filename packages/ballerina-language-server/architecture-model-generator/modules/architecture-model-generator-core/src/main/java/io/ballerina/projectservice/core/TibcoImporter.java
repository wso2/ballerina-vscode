/*
 *  Copyright (c) 2025, WSO2 LLC. (http://www.wso2.com)
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

package io.ballerina.projectservice.core;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

import static io.ballerina.projectservice.core.MigrateToolInvokingUtil.invokeToolMethod;

/**
 * Utility class to import TIBCO projects.
 *
 * @since 1.2.0
 */
public class TibcoImporter {

    private static final String TIBCO_TOOL_COMMAND = "migrate-tibco";
    private static final String TIBCO_TOOL_CLASS_NAME = "tibco.TibcoToBalConverter";
    private static final String TIBCO_TOOL_METHOD_NAME = "migrateTIBCO";

    private static final String PARAM_OGR_NAME = "orgName";
    private static final String PARAM_PROJECT_NAME = "projectName";
    private static final String PARAM_SOURCE_PATH = "sourcePath";
    private static final String PARAM_STATE_CALLBACK = "stateCallback";
    private static final String PARAM_LOG_CALLBACK = "logCallback";

    public static ToolExecutionResult importTibco(String orgName, String packageName, String sourcePath,
                                   Consumer<String> stateCallback, Consumer<String> logCallback) {
        Map<String, Object> args = new HashMap<>();
        args.put(PARAM_OGR_NAME, orgName);
        args.put(PARAM_PROJECT_NAME, packageName);
        args.put(PARAM_SOURCE_PATH, sourcePath);
        args.put(PARAM_STATE_CALLBACK, stateCallback);
        args.put(PARAM_LOG_CALLBACK, logCallback);
        return invokeToolMethod(TIBCO_TOOL_COMMAND, TIBCO_TOOL_CLASS_NAME, TIBCO_TOOL_METHOD_NAME, args);
    }

    public static void main(String[] args) {
        // Example usage
        String orgName = "exampleOrg";
        String packageName = "examplePackage";
        String sourcePath = "/Users/lakshanweerasinghe/Documents/repos/wso2-enterprise/integration-bi-migration-assistant/tibco/src/test/resources/tibco.projects/XMLTransform/Processes/main.process";

        List<String> logMessages = new ArrayList<>();
        Consumer<String> logCallback = logMessage -> {
            logMessages.add(logMessage);
            System.out.println("Log: " + logMessage);
        };

        List<String> stateMessages = new ArrayList<>();
        Consumer<String> stateCallback = state -> {
            stateMessages.add(state);
            System.out.println("State: " + state);
        };

        ToolExecutionResult result = importTibco(orgName, packageName, sourcePath,
                stateCallback, logCallback);

        System.out.println(result.report());
        System.out.println("Log Messages: " + logMessages);
        System.out.println("State Messages: " + stateMessages);
    }
}
