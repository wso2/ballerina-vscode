package io.ballerina.projectservice.extension.response;

import io.ballerina.projectservice.core.ToolExecutionResult;

import java.util.Map;

public record ImportMuleResponse(String error, Map<String, String> textEdits, String report, Object jsonReport) {

    public static ImportMuleResponse from(ToolExecutionResult result) {
        return new ImportMuleResponse(result.error(), result.textEdits(), result.report(), result.jsonReport());
    }
}