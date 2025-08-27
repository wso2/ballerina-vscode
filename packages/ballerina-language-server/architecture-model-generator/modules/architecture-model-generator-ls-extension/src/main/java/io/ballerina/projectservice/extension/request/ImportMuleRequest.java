package io.ballerina.projectservice.extension.request;

import java.util.Map;

public record ImportMuleRequest(String orgName, String packageName, String sourcePath, Map<String, String> parameters) {
}
