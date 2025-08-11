package io.ballerina.projectservice.core;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;

import static io.ballerina.projectservice.core.MigrateToolInvokingUtil.invokeToolMethod;

public class MuleImporter {

    private static final String MULE_TOOL_COMMAND = "migrate-mule";
    private static final String MULE_TOOL_CLASS_NAME = "mule.MuleMigrator";
    private static final String MULE_TOOL_METHOD_NAME = "migrateMule";

    private static final String PARAM_OGR_NAME = "orgName";
    private static final String PARAM_PROJECT_NAME = "projectName";
    private static final String PARAM_SOURCE_PATH = "sourcePath";
    private static final String PARAM_STATE_CALLBACK = "stateCallback";
    private static final String PARAM_LOG_CALLBACK = "logCallback";

    public static ToolExecutionResult importMule(String orgName, String packageName, String sourcePath,
                                                 Consumer<String> stateCallback, Consumer<String> logCallback) {
        Map<String, Object> args = new HashMap<>();
        args.put(PARAM_OGR_NAME, orgName);
        args.put(PARAM_PROJECT_NAME, packageName);
        args.put(PARAM_SOURCE_PATH, sourcePath);
        args.put(PARAM_STATE_CALLBACK, stateCallback);
        args.put(PARAM_LOG_CALLBACK, logCallback);
        return invokeToolMethod(MULE_TOOL_COMMAND, MULE_TOOL_CLASS_NAME, MULE_TOOL_METHOD_NAME, args);
    }

}
