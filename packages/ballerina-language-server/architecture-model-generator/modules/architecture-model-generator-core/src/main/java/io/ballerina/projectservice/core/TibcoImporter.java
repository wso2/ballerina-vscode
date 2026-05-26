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

import java.util.HashMap;
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
    private static final String PARAM_TIBCO_MULTI_ROOT = "multiRoot";
    private static final String PARAM_STATE_CALLBACK = "stateCallback";
    private static final String PARAM_LOG_CALLBACK = "logCallback";

    /**
     * Imports a TIBCO project to Ballerina.
     *
     * @param orgName       The organization name for the Ballerina package
     * @param packageName   The name of the Ballerina package to create
     * @param sourcePath    The file system path to the TIBCO project
     * @param parameters    Additional parameters including multiRoot flag
     * @param stateCallback Callback for state updates during migration
     * @param logCallback   Callback for log messages during migration
     * @return The tool execution result containing text edits and reports
     */
    public static ToolExecutionResult importTibco(String orgName, String packageName, String sourcePath,
                                                  Map<String, String> parameters, Consumer<String> stateCallback,
                                                  Consumer<String> logCallback) {
        Map<String, Object> args = new HashMap<>();
        args.put(PARAM_OGR_NAME, orgName);
        args.put(PARAM_PROJECT_NAME, packageName);
        args.put(PARAM_SOURCE_PATH, sourcePath);

        boolean isMultiRoot = Boolean.parseBoolean(parameters.getOrDefault("multiRoot", "false"));
        args.put(PARAM_TIBCO_MULTI_ROOT, isMultiRoot);
        args.put(PARAM_STATE_CALLBACK, stateCallback);
        args.put(PARAM_LOG_CALLBACK, logCallback);
        return invokeToolMethod(TIBCO_TOOL_COMMAND, TIBCO_TOOL_CLASS_NAME, TIBCO_TOOL_METHOD_NAME, args);
    }
}
