package io.ballerina.copilotagent.core;

import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.FunctionSignatureNode;
import io.ballerina.compiler.syntax.tree.MethodDeclarationNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NodeList;
import io.ballerina.compiler.syntax.tree.NodeVisitor;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.copilotagent.core.models.ServiceMemberMap;

import java.util.Optional;
import java.util.stream.Collectors;

public class ServiceMethodExtractor extends NodeVisitor {

    private final ServiceMemberMap serviceMemberMap;

    public ServiceMethodExtractor(ServiceMemberMap serviceMemberMap) {
        this.serviceMemberMap = serviceMemberMap;
    }

    @Override
    public void visit(ServiceDeclarationNode serviceDeclarationNode) {
        serviceDeclarationNode.members().forEach(member -> member.accept(this));
    }

    @Override
    public void visit(FunctionDefinitionNode functionDefinitionNode) {
        Optional<String> methodKind = functionDefinitionNode.qualifierList().stream().map(q -> q.text().trim())
                .filter(q -> q.equals("resource") || q.equals("remote"))
                .findFirst();

        if (methodKind.isPresent()) {
            if (methodKind.get().equals("resource")) {
                String accessor = functionDefinitionNode.functionName().text().trim();
                String path = getPath(functionDefinitionNode.relativeResourcePath());
                String key = accessor + "#" + path;
                this.serviceMemberMap.putResourceMethod(key, functionDefinitionNode);
            } else {
                String key = functionDefinitionNode.functionName().toSourceCode().trim();
                this.serviceMemberMap.putRemoteMethod(key, functionDefinitionNode);
            }
        }
        String key =  functionDefinitionNode.functionName().toSourceCode().trim();
        this.serviceMemberMap.putObjectMethod(key, functionDefinitionNode);
    }

    private static String getPath(NodeList<Node> paths) {
        return paths.stream().map(Node::toString).map(String::trim).collect(Collectors.joining(""));
    }
}
