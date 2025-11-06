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

package io.ballerina.servicemodelgenerator.extension.util;

import io.ballerina.compiler.syntax.tree.FunctionBodyBlockNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.FunctionSignatureNode;
import io.ballerina.compiler.syntax.tree.MethodDeclarationNode;
import io.ballerina.compiler.syntax.tree.NodeFactory;
import io.ballerina.compiler.syntax.tree.NodeParser;
import io.ballerina.compiler.syntax.tree.ReturnTypeDescriptorNode;
import io.ballerina.compiler.syntax.tree.TreeModifier;
import io.ballerina.compiler.syntax.tree.TypeDescriptorNode;

import java.util.Optional;

public class ServiceClassModifier extends TreeModifier {
    public static final String RESOURCE = "resource";
    public static final String REMOTE = "remote";
    public static final String ERROR = "error";
    private static final FunctionBodyBlockNode DEFAULT_ERROR_BODY =
            NodeParser.parseFunctionBodyBlock("{ return error(\"Not Implemented\"); }");


    @Override
    public FunctionDefinitionNode transform(FunctionDefinitionNode functionDefinitionNode) {
        if (functionDefinitionNode.qualifierList().stream().anyMatch(qualifier ->
                qualifier.text().equals(REMOTE) || qualifier.text().equals(RESOURCE))) {
            Optional<ReturnTypeDescriptorNode> retTypeDescNode =
                    functionDefinitionNode.functionSignature().returnTypeDesc();
            if (retTypeDescNode.isEmpty()) {
                return functionDefinitionNode;
            }
            ReturnTypeDescriptorNode oldRetTypeDesc = retTypeDescNode.get();
            String returnType = oldRetTypeDesc.type().toString().trim() + "|" + ERROR;
            TypeDescriptorNode typeDescriptorNode = NodeParser.parseTypeDescriptor(returnType);
            ReturnTypeDescriptorNode retTypeDesc = NodeFactory.createReturnTypeDescriptorNode(
                    oldRetTypeDesc.returnsKeyword(), oldRetTypeDesc.annotations(), typeDescriptorNode);
            FunctionSignatureNode signatureNode = functionDefinitionNode.functionSignature();
            FunctionSignatureNode newSignature = signatureNode.modify().withReturnTypeDesc(retTypeDesc).apply();
            return functionDefinitionNode.modify()
                    .withFunctionSignature(newSignature)
                    .withFunctionBody(DEFAULT_ERROR_BODY)
                    .apply();
        }
        return functionDefinitionNode;
    }

    @Override
    public MethodDeclarationNode transform(MethodDeclarationNode methodDeclarationNode) {
        if (methodDeclarationNode.qualifierList().stream().anyMatch(qualifier ->
                qualifier.text().equals(REMOTE) || qualifier.text().equals(RESOURCE))) {
            Optional<ReturnTypeDescriptorNode> retTypeDescNode =
                    methodDeclarationNode.methodSignature().returnTypeDesc();
            if (retTypeDescNode.isEmpty()) {
                return methodDeclarationNode;
            }
            ReturnTypeDescriptorNode oldRetTypeDesc = retTypeDescNode.get();
            String returnType = oldRetTypeDesc.type().toString().trim() + "|" + ERROR;
            TypeDescriptorNode typeDescriptorNode = NodeParser.parseTypeDescriptor(returnType);
            ReturnTypeDescriptorNode retTypeDesc = NodeFactory.createReturnTypeDescriptorNode(
                    oldRetTypeDesc.returnsKeyword(), oldRetTypeDesc.annotations(), typeDescriptorNode);
            FunctionSignatureNode newSignature = methodDeclarationNode.methodSignature().modify()
                    .withReturnTypeDesc(retTypeDesc).apply();
            return methodDeclarationNode.modify()
                    .withMethodSignature(newSignature)
                    .apply();
        }
        return methodDeclarationNode;
    }
}
