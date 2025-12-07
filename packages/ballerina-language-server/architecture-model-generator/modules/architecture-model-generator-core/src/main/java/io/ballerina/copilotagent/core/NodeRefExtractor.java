package io.ballerina.copilotagent.core;

import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.ListenerDeclarationNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NodeList;
import io.ballerina.compiler.syntax.tree.NodeVisitor;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.compiler.syntax.tree.TypeDefinitionNode;
import io.ballerina.copilotagent.core.models.STNodeRefMap;

import java.util.stream.Collectors;

public class NodeRefExtractor extends NodeVisitor {

    private final STNodeRefMap nodeRefMap;

    public NodeRefExtractor(STNodeRefMap nodeRefMap) {
        this.nodeRefMap = nodeRefMap;
    }

    @Override
    public void visit(ModulePartNode modulePartNode) {
        modulePartNode.members().forEach(member -> member.accept(this));
    }

    @Override
    public void visit(ListenerDeclarationNode listenerDeclarationNode) {
        String key = listenerDeclarationNode.variableName().text().trim();
        this.nodeRefMap.putListenerNode(key, listenerDeclarationNode);
    }

    @Override
    public void visit(ServiceDeclarationNode serviceDeclarationNode) {
        String key = getPath(serviceDeclarationNode.absoluteResourcePath()) + "#" +
                     serviceDeclarationNode.expressions();
        this.nodeRefMap.putServiceNode(key, serviceDeclarationNode);
    }

    @Override
    public void visit(FunctionDefinitionNode functionDefinitionNode) {
        String key = functionDefinitionNode.functionName().text().trim();
        this.nodeRefMap.putFunctionNode(key, functionDefinitionNode);
    }

    @Override
    public void visit(TypeDefinitionNode typeDefinitionNode) {
        String key = typeDefinitionNode.typeName().text().trim();
        this.nodeRefMap.putTypeDefNode(key, typeDefinitionNode);
    }

    private static String getPath(NodeList<Node> paths) {
        return paths.stream().map(Node::toString).map(String::trim).collect(Collectors.joining(""));
    }
}
