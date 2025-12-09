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

package io.ballerina.copilotagent.core;

import io.ballerina.compiler.syntax.tree.EnumDeclarationNode;
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

/**
 * Visitor to extract node references and populate the STNodeRefMap.
 *
 * @since 1.5.0
 */
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
