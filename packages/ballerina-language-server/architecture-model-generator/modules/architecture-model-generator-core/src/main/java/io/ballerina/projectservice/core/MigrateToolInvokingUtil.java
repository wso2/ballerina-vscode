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

import io.ballerina.projectservice.core.baltool.BalToolsUtil;

import java.io.IOException;
import java.lang.reflect.Method;
import java.net.URLClassLoader;
import java.util.HashMap;
import java.util.Map;

/**
 * Utility class to invoke methods from migration tools and converting results.
 *
 * @since 1.2.0
 */
public class MigrateToolInvokingUtil {

    private static final String KEY_ERROR = "error";
    private static final String KET_TEXT_EDITS = "textEdits";
    private static final String KEY_REPORT = "report";
    private static final String KEY_REPORT_JSON = "report-json";

    private MigrateToolInvokingUtil() {
    }

    public static ToolExecutionResult invokeToolMethod(String commandName, String className, String methodName,
                                                        Map<String, Object> args) {
        BalToolsUtil.updateOldBalToolsToml();
        URLClassLoader classLoader = BalToolsUtil.getCustomToolClassLoader(commandName);
        try {
            Class<?> toolClass = classLoader.loadClass(className);
            Method method = toolClass.getMethod(methodName, Map.class);
            Object invoke = method.invoke(null, args);
            classLoader.close();
            if (invoke instanceof Map<?, ?> mapResult) {
                return transformToolExecutionResult(mapResult);
            }
            return new ToolExecutionResult.Builder()
                    .error("Unexpected return type from migration method: " + invoke.getClass())
                    .build();
        } catch (ReflectiveOperationException e) {
            return new ToolExecutionResult.Builder()
                    .error("Error invoking migration method: " + e.getMessage())
                    .build();
        } catch (IOException e) {
            return new ToolExecutionResult.Builder()
                    .error("Error closing class loader: " + e.getMessage())
                    .build();
        }
    }

    private static ToolExecutionResult transformToolExecutionResult(Map<?, ?> mapResult) {
        ToolExecutionResult.Builder resultBuilder = new ToolExecutionResult.Builder();
        for (Map.Entry<?, ?> entry : mapResult.entrySet()) {
            if (entry.getKey() instanceof String key && entry.getValue() instanceof Object value) {
                switch (key) {
                    case KEY_ERROR -> resultBuilder.error((String) value);
                    case KET_TEXT_EDITS -> {
                        if (value instanceof Map<?, ?> textEdits) {
                            Map<String, String> edits = new HashMap<>();
                            for (Map.Entry<?, ?> textEditEntry : textEdits.entrySet()) {
                                if (textEditEntry.getKey() instanceof String editKey &&
                                        textEditEntry.getValue() instanceof String editValue) {
                                    edits.put(editKey, editValue);
                                }
                            }
                            resultBuilder.textEdits(edits);
                        }
                    }
                    case KEY_REPORT -> resultBuilder.report((String) value);
                    case KEY_REPORT_JSON -> resultBuilder.jsonReport(value);
                    default -> { }
                }
            }
        }
        return resultBuilder.build();
    }
}
