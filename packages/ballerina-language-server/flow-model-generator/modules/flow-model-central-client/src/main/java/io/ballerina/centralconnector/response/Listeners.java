package io.ballerina.centralconnector.response;

import java.util.List;

public record Listeners(String orgName, String moduleName, String version, List<Listener> listeners) {
}
