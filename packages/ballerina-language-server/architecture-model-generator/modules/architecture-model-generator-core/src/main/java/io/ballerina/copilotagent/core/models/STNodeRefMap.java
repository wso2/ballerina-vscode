package io.ballerina.copilotagent.core.models;

import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.ListenerDeclarationNode;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.compiler.syntax.tree.TypeDefinitionNode;

import java.util.HashMap;
import java.util.Map;

public class STNodeRefMap {
    private final Map<String, ListenerDeclarationNode> listenerNodeMap = new HashMap<>();
    private final Map<String, FunctionDefinitionNode> functionNodeMap = new HashMap<>();
    private final Map<String, ServiceDeclarationNode> serviceNodeMap = new HashMap<>();
    private final Map<String, TypeDefinitionNode> typeDefNodeMap = new HashMap<>();

    public Map<String, ListenerDeclarationNode> getListenerNodeMap() {
        return this.listenerNodeMap;
    }

    public Map<String, FunctionDefinitionNode> getFunctionNodeMap() {
        return this.functionNodeMap;
    }

    public Map<String, ServiceDeclarationNode> getServiceNodeMap() {
        return this.serviceNodeMap;
    }

    public Map<String, TypeDefinitionNode> getTypeDefNodeMap() {
        return this.typeDefNodeMap;
    }

    public void putListenerNode(String key, ListenerDeclarationNode node) {
        this.listenerNodeMap.put(key, node);
    }

    public void putFunctionNode(String key, FunctionDefinitionNode node) {
        this.functionNodeMap.put(key, node);
    }

    public void putServiceNode(String key, ServiceDeclarationNode node) {
        this.serviceNodeMap.put(key, node);
    }

    public void putTypeDefNode(String key, TypeDefinitionNode node) {
        this.typeDefNodeMap.put(key, node);
    }
}
