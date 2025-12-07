package io.ballerina.copilotagent.core.models;

import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.MethodDeclarationNode;

import java.util.HashMap;
import java.util.Map;

public class ServiceMemberMap {

    private final Map<String, FunctionDefinitionNode> objectMethods = new HashMap<>();
    private final Map<String, FunctionDefinitionNode> resourceMethods = new HashMap<>();
    private final Map<String, FunctionDefinitionNode> remoteMethods = new HashMap<>();

    public void putObjectMethod(String key, FunctionDefinitionNode functionDefinitionNode) {
        this.objectMethods.put(key, functionDefinitionNode);
    }

    public void putResourceMethod(String key, FunctionDefinitionNode functionDefinitionNode) {
        this.resourceMethods.put(key, functionDefinitionNode);
    }

    public void putRemoteMethod(String key, FunctionDefinitionNode functionDefinitionNode) {
        this.remoteMethods.put(key, functionDefinitionNode);
    }

    public Map<String, FunctionDefinitionNode> getObjectMethods() {
        return objectMethods;
    }

    public Map<String, FunctionDefinitionNode> getResourceMethods() {
        return resourceMethods;
    }

    public Map<String, FunctionDefinitionNode> getRemoteMethods() {
        return remoteMethods;
    }
}
