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
 * Utility class for importing Mule projects to Ballerina.
 *
 * @since 1.2.0
 */
public class MuleImporter {

    private static final String MULE_TOOL_COMMAND = "migrate-mule";
    private static final String MULE_TOOL_CLASS_NAME = "mule.MuleMigrator";
    private static final String MULE_TOOL_METHOD_NAME = "migrateMule";

    private static final String PARAM_OGR_NAME = "orgName";
    private static final String PARAM_PROJECT_NAME = "projectName";
    private static final String PARAM_SOURCE_PATH = "sourcePath";
    private static final String PARAM_FORCE_VERSION = "forceVersion";
    private static final String PARAM_MULE_MULTI_ROOT = "multiRoot";
    private static final String PARAM_STATE_CALLBACK = "stateCallback";
    private static final String PARAM_LOG_CALLBACK = "logCallback";

    public static ToolExecutionResult importMule(String orgName, String packageName, String sourcePath,
                                                 Map<String, String> parameters, Consumer<String> stateCallback,
                                                 Consumer<String> logCallback) {
        Map<String, Object> args = new HashMap<>();
        args.put(PARAM_OGR_NAME, orgName);
        args.put(PARAM_PROJECT_NAME, packageName);
        args.put(PARAM_SOURCE_PATH, sourcePath);

        Integer forceVersion = extractForceVersion(parameters);
        if (forceVersion != null) {
            args.put(PARAM_FORCE_VERSION, forceVersion);
        }
        boolean isMultiRoot = Boolean.parseBoolean(parameters.getOrDefault("multiRoot", "false"));
        args.put(PARAM_MULE_MULTI_ROOT, isMultiRoot);
        args.put(PARAM_STATE_CALLBACK, stateCallback);
        args.put(PARAM_LOG_CALLBACK, logCallback);

        return invokeToolMethod(MULE_TOOL_COMMAND, MULE_TOOL_CLASS_NAME, MULE_TOOL_METHOD_NAME, args);
    }

    private static Integer extractForceVersion(Map<String, String> parameters) {
        String forceVersionStr = parameters.get("forceVersion");
        if (forceVersionStr != null) {
            try {
                int forceVersion = Integer.parseInt(forceVersionStr);
                if (forceVersion == 3 || forceVersion == 4) {
                    return forceVersion;
                }
            } catch (NumberFormatException e) {
                // Fall through to return null
            }
        }
        return null;
    }

}
